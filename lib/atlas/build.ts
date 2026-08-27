import { findCategory } from "@/content/blog/categories";
import { outboundKeys, postKey } from "@/lib/atlas/links";
import type { AtlasEdge, AtlasGraph, AtlasNode } from "@/lib/atlas/types";
import { topicId } from "@/lib/atlas/types";
import type { Post } from "@/lib/blog/types";

/**
 * 글 목록에서 아틀라스 그래프를 만든다. 설계서 §7.3 · 계획서 T8.
 *
 * **순수 함수다** — 파일을 읽지도 쓰지도 않고 시계도 보지 않는다. 호출자는 `getStaticProps` 이고,
 * 정적 export 라 빌드 시점에 한 번 돈다. 그래서 `graph.json` 도 생성기 CLI 도 없다 —
 * `lib/blog/loader.ts` 가 TypeScript + `@/` 별칭이라 순수 Node 스크립트(`.mjs`)가 못 읽는데,
 * 별칭이 그대로 도는 곳에서 부르면 그 문제 자체가 없다.
 *
 * ⚠️ 시계를 보지 않는 것이 조건이다. `meta.latest` 에 빌드 시각을 넣으면 내용이 그대로여도
 *    값이 매번 달라져 산출물 해시가 바뀌고 `check-baseline` 이 영원히 빨개진다.
 *
 * ⚠️ tsconfig 의 `target` 이 es5 라 Map·Set 을 for-of 로 직접 돌면 TS2802 다.
 *    배열 for-of 는 안전하지만 Map·Set 순회는 전부 `Array.from` 으로 배열화한 뒤 돈다.
 *    vitest 는 esbuild 로 타입을 벗겨 내 통과시키지만 `tsc --noEmit` 은 잡는다.
 *
 * ⚠️ 토픽 노드는 **글이 1편 이상인 카테고리에만** 생긴다. `content/blog/categories.ts` 의
 *    등록은 12 개지만 글이 있는 것은 6 개고, 나머지를 노드로 만들면 엣지가 하나도 없는
 *    고아 노드 6 개가 그래프에 뜬다. 화면에서 빈 카테고리를 빼는 것은 이 리포의 전례다
 *    (`getPublishedCategories`). 입력이 `Post[]` 뿐이라 구조적으로도 그렇게 될 수 없다.
 */
export function buildGraph(all: Post[]): AtlasGraph {
  const posts = all.filter((p) => !p.draft);
  const published = new Set(posts.map(postKey));

  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];

  // ── artifact 노드 — 글 1편 = 노드 1개 ──────────────────────
  for (const p of posts) {
    nodes.push({
      id: postKey(p),
      type: "artifact",
      title: p.title,
      summary: p.description,
      origin: "mine",
      confidence: "working",
      topics: [p.categorySlug],
      tags: p.tags ?? [],
      source: { kind: "note", ref: `/blog/${postKey(p)}/` },
      updated: p.updated ?? p.date,
    });
  }

  // ── concept 노드 — 카테고리만. 태그는 노드가 아니다(D-2) ────
  //
  // 표시명·설명은 `content/blog/categories.ts` 에서 가져온다. T10 은 `{t.title}` 을,
  // T11 은 `title={node.title}` · `description={node.summary}` 를 그대로 렌더하므로
  // slug 를 넣으면 한글 사이트에 「rag」가 뜨고 노드 상세의 meta description 이 「12편」이 된다.
  // 미등록 slug 는 렌더가 깨지지 않게 slug·편수로 물러선다.
  const categories = Array.from(new Set(posts.map((p) => p.categorySlug))).sort();
  for (const c of categories) {
    const members = posts.filter((p) => p.categorySlug === c);
    const registered = findCategory(c);
    nodes.push({
      id: topicId(c),
      type: "concept",
      title: registered?.name ?? c,
      summary: registered?.description ?? `${members.length}편`,
      origin: "derived",
      confidence: "settled",
      topics: [c],
      tags: [],
      updated: members.reduce((m, p) => ((p.updated ?? p.date) > m ? (p.updated ?? p.date) : m), ""),
    });
  }

  // ── instantiates — 글 → 토픽 ────────────────────────────────
  for (const p of posts) {
    edges.push({ from: postKey(p), to: topicId(p.categorySlug), type: "instantiates" });
  }

  // ── extends — 본문 링크. 고유 (from,to) 쌍만 ────────────────
  const seen = new Set<string>();
  for (const p of posts) {
    const from = postKey(p);
    for (const to of outboundKeys(p)) {
      if (to === from) continue; // 자기 참조
      if (!published.has(to)) continue; // 대상 없음 — 링크 무결성 테스트가 따로 잡는다
      const k = `${from}->${to}`;
      if (seen.has(k)) continue; // 같은 글을 여러 번 링크해도 엣지는 하나
      seen.add(k);
      edges.push({ from, to, type: "extends" });
    }
  }

  // ── sequence — series 안에서 seriesOrder 순 이웃 ────────────
  const series = new Map<string, Post[]>();
  for (const p of posts) {
    if (!p.series) continue;
    const arr = series.get(p.series) ?? [];
    arr.push(p);
    series.set(p.series, arr);
  }
  for (const group of Array.from(series.values())) {
    const ordered = group.slice().sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
    for (let i = 0; i < ordered.length - 1; i++) {
      edges.push({ from: postKey(ordered[i]), to: postKey(ordered[i + 1]), type: "sequence" });
    }
  }

  // ── 정준 순서 — 리뷰 A1 ─────────────────────────────────────
  //
  // 시계를 안 보는 것만으로는 결정론이 안 된다. **입력 순서도 입력이다.**
  // 실측: 156 편 중 154 편이 날짜 동률이라 사실상 전체 순서를 `lib/blog/loader.ts` 의
  // `title.localeCompare(t, "ko")` 가 정한다. 타이브레이커를 코드포인트로 바꾸자
  // 156 칸 중 125 칸이 이동했다 — 로컬 Windows 와 CI Linux 의 ICU 데이터가 다르면
  // 내용이 같아도 산출물 해시가 달라지고 `check-baseline` 이 흔들린다.
  //
  // ⚠️ 여기서 `localeCompare` 를 쓰면 막으려던 것을 다시 들인다. 코드포인트 비교여야 한다.
  nodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  edges.sort((a, b) => {
    if (a.type !== b.type) return a.type < b.type ? -1 : 1;
    if (a.from !== b.from) return a.from < b.from ? -1 : 1;
    if (a.to !== b.to) return a.to < b.to ? -1 : 1;
    return 0;
  });

  const latest = posts.reduce((m, p) => {
    const d = p.updated ?? p.date;
    return d > m ? d : m;
  }, "");

  return {
    nodes,
    edges,
    meta: {
      latest,
      counts: {
        artifact: posts.length,
        concept: categories.length,
        extendsEdges: edges.filter((e) => e.type === "extends").length,
        instantiatesEdges: edges.filter((e) => e.type === "instantiates").length,
        sequenceEdges: edges.filter((e) => e.type === "sequence").length,
      },
    },
  };
}
