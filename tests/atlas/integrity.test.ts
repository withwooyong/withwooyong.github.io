import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/atlas/build";
import { postKey } from "@/lib/atlas/links";
import { atlasGraphSchema } from "@/lib/atlas/types";
import { readPosts } from "@/lib/blog/loader";
import type { AtlasGraph, AtlasNode } from "@/lib/atlas/types";

/**
 * 그래프 무결성 게이트. 설계서 §11 · 계획서 T9.
 *
 * *「스키마 검증을 빌드 중단으로 두는 이유는 **깨진 엣지가 화면에 보이지 않기 때문**이다.
 *   노드가 하나 덜 그려져도 사람 눈은 잡지 못한다. 사람이 못 잡는 오류는 기계가 막아야 한다.」*
 *
 * ⚠️ 아래 「자기검사」 묶음을 지우지 마라. 검사기가 실제로 잡는지 증명하지 않은 초록은
 *    이 리포에서 반복해서 거짓 0 을 만들었다 — 검사 자체가 고장 나도 초록이 나오기 때문이다.
 *
 * ⚠️ **판정 로직은 아래 헬퍼 하나뿐이다.** 무결성 쪽과 자기검사 쪽이 **같은 함수**를 부른다.
 *    계획서 초안은 양쪽에 같은 식을 복붙했는데, 그러면 무결성 로직을 고칠 때 자기검사는
 *    **옛 로직**을 증명하게 된다 — 자기검사가 있는데도 거짓 0 이 통과하는 모양이다.
 *    새 검사를 넣을 때도 헬퍼를 먼저 만들고 양쪽이 그것을 부르게 하라.
 *
 * ⚠️ `target: es5` 이고 `downlevelIteration` 이 없다. Map·Set 을 for-of 로 돌거나 스프레드하면
 *    TS2802 다 — vitest 는 esbuild 로 타입을 벗겨 통과시키지만 `tsc --noEmit` 이 잡는다.
 *    Map·Set 순회는 전부 `Array.from` 으로 배열화한 뒤 돈다.
 *
 * **이 파일은 `pre-commit`(`content/blog/` 를 건드리는 커밋)과 CI 양쪽에서 돈다.**
 * 훅 쪽은 `.githooks/pre-commit` 의 `tests/atlas` 줄이다 — 지우면 새 글의 링크 누락이
 * 커밋·푸시를 통과해 **배포 단계에서** 터진다.
 */

const posts = readPosts(); // draft 는 loader 가 이미 걸러 낸다
const graph = buildGraph(posts);

/**
 * 글 id → `role`. `AtlasNode` 에는 `role` 이 **없어서** 원본 글에서 다시 끌어온다.
 *
 * 스키마에 필드를 더하는 것은 T7 의 일이지 이 태스크의 일이 아니다. 다만 그래프만으로는
 * 「이 글이 최상위 지도인가」를 알 수 없다는 사실 자체를 T10·T11 이 알아야 한다 —
 * 진입점·강조 표시를 그래프에서 뽑으려면 그때 스키마에 `role` 을 올려야 한다.
 *
 * ⚠️ 이 맵의 키는 `postKey(p)` 이고 노드 id 도 `postKey(p)` 다(`lib/atlas/build.ts`).
 *    **같은 함수를 쓴다는 것이 유일한 보장**이라 규칙이 갈리면 키가 통째로 어긋나고,
 *    그러면 아래 검사가 「role: map 이 아니다」라며 **지도 글을 지목한다** — 오진이다.
 *    무결성 첫 검사가 그 정합성을 먼저 못 박는다.
 */
const roleOf = new Map<string, string | undefined>(posts.map((p) => [postKey(p), p.role]));

/** 자기검사 픽스처. `nodes[0]` 은 정렬 결과에 기대는 우연이라 타입으로 고른다. */
const sampleArtifact = graph.nodes.filter((n) => n.type === "artifact")[0];
const sampleTopic = graph.nodes.filter((n) => n.type === "concept")[0];

// ── 판정 로직 — 무결성과 자기검사가 공유한다 ───────────────────────────

/** 실재하지 않는 노드를 가리키는 엣지. 사람 눈에 보이지 않는 결함의 대표다. */
function danglingEdges(g: AtlasGraph): string[] {
  const ids = new Set(g.nodes.map((n) => n.id));
  return g.edges.filter((e) => !ids.has(e.from) || !ids.has(e.to)).map((e) => `${e.from}->${e.to}`);
}

/** 중복 노드 id. 같은 id 가 둘이면 `/atlas/[...id]` 가 어느 쪽을 그릴지 정해지지 않는다. */
function duplicateIds(g: AtlasGraph): string[] {
  const ids = g.nodes.map((n) => n.id);
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

/**
 * URL 로 못 쓰는 id.
 *
 * ⚠️ 초안의 `/[\s?#]/` 는 **비ASCII 를 통과시킨다**(T8 리뷰 B-F5). 오늘은 162 노드가 전부
 *    ASCII 라 두 패턴의 결과가 같지만, 한글 slug 가 1편만 들어오면 `source.ref` 와
 *    `getStaticPaths` 가 갈린다. 자기검사 ⑤ 가 그 차이를 대조군으로 고정한다.
 */
function urlUnsafeIds(g: AtlasGraph): string[] {
  return g.nodes.filter((n) => encodeURI(n.id) !== n.id).map((n) => n.id);
}

/**
 * 같은 `(from, to, type)` 이 두 번 이상.
 *
 * `buildGraph` 는 `extends` **만** dedupe 한다. `instantiates`·`sequence` 는 구조적으로
 * 한 번씩만 push 되지만 그것은 코드의 성질이지 보장이 아니다 — 여기가 그 보장이다.
 */
function duplicateEdgeKeys(g: AtlasGraph): string[] {
  const seen = new Set<string>();
  const dup: string[] = [];
  for (const e of g.edges) {
    const k = `${e.from}|${e.to}|${e.type}`;
    if (seen.has(k)) dup.push(k);
    else seen.add(k);
  }
  return dup;
}

/**
 * 글마다 소속 토픽으로 가는 `instantiates` 가 **정확히 하나**인지. 0 도 2 도 결함이다.
 *
 * ⚠️ 이것이 계획서가 *「0이면 매핑이 깨진 것이다」* 로 잡으려던 바로 그 검사다. 초안은
 *    그것을 「차수 0 인 artifact」로 썼는데 **구조적으로 항상 0** 이라 죽은 검사였고,
 *    대상을 inbound 0 으로 바꾼 것만으로는 **되살아나지 않았다** — 뮤테이션 M7 실측:
 *    `instantiates` 생성을 통째로 지워도 artifact 의 inbound 0 은 4 로 **불변**이고
 *    게이트는 초록이었다. `instantiates` 는 `to` 가 토픽이라 글의 inbound 에 기여하지 않는다.
 *    그래서 이 검사와 아래 `emptyTopicIds` 를 따로 둔다. 자기검사 ⑨ 이 그 관계를 고정한다.
 */
function instantiatesArityErrors(g: AtlasGraph): string[] {
  const count = new Map<string, number>(
    g.nodes.filter((n) => n.type === "artifact").map((n) => [n.id, 0])
  );
  for (const e of g.edges) {
    if (e.type !== "instantiates") continue;
    if (count.has(e.from)) count.set(e.from, (count.get(e.from) ?? 0) + 1);
  }
  return Array.from(count.entries())
    .filter((pair) => pair[1] !== 1)
    .map((pair) => `${pair[0]}: ${pair[1]}개`);
}

/** 글이 하나도 안 붙은 토픽 노드. `buildGraph` 는 글이 있는 카테고리만 노드로 만든다. */
function emptyTopicIds(g: AtlasGraph): string[] {
  const inbound = new Map<string, number>(g.nodes.map((n) => [n.id, 0]));
  for (const e of g.edges) inbound.set(e.to, (inbound.get(e.to) ?? 0) + 1);
  return g.nodes.filter((n) => n.type === "concept" && (inbound.get(n.id) ?? 0) === 0).map((n) => n.id);
}

/** 아무도 인용하지 않는 artifact 노드 (inbound 차수 0 — 실질적으로 `extends`·`sequence` 다). */
function inboundZeroArtifacts(g: AtlasGraph): AtlasNode[] {
  const inbound = new Map<string, number>(g.nodes.map((n) => [n.id, 0]));
  for (const e of g.edges) inbound.set(e.to, (inbound.get(e.to) ?? 0) + 1);
  return g.nodes.filter((n) => n.type === "artifact" && (inbound.get(n.id) ?? 0) === 0);
}

/** inbound 0 인데 지도 글이 아닌 것 — 진짜 고아다. */
function strandedNonMapIds(g: AtlasGraph, roles: Map<string, string | undefined>): string[] {
  return inboundZeroArtifacts(g)
    .filter((n) => roles.get(n.id) !== "map")
    .map((n) => n.id);
}

/** `meta.counts` 5 필드가 실제 배열과 어긋난 곳. 어긋난 **필드 이름과 양쪽 값**을 낸다. */
function countMismatches(g: AtlasGraph): string[] {
  const c = g.meta.counts;
  const actual = {
    artifact: g.nodes.filter((n) => n.type === "artifact").length,
    concept: g.nodes.filter((n) => n.type === "concept").length,
    extendsEdges: g.edges.filter((e) => e.type === "extends").length,
    instantiatesEdges: g.edges.filter((e) => e.type === "instantiates").length,
    sequenceEdges: g.edges.filter((e) => e.type === "sequence").length,
  };
  return Object.keys(actual)
    .filter((k) => c[k as keyof typeof actual] !== actual[k as keyof typeof actual])
    .map((k) => `${k}: meta=${c[k as keyof typeof actual]} 실제=${actual[k as keyof typeof actual]}`);
}

// ── 무결성 ────────────────────────────────────────────────────────────

describe("그래프 무결성", () => {
  /**
   * 이 검사가 **맨 앞**인 이유 — 아래 「아무도 인용하지 않는 글」 검사가 `roleOf` 의 키에
   * 기대는데, 키가 어긋나면 그 검사는 조용히 죽지 않고 **지도 글을 범인으로 지목한다.**
   * 오진은 무해한 초록보다 나쁘다. 원인을 여기서 먼저 이름 붙인다.
   */
  it("roleOf 의 키가 실제 글 노드 id 와 1:1 이다", () => {
    const artifactIds = new Set(graph.nodes.filter((n) => n.type === "artifact").map((n) => n.id));
    const strays = Array.from(roleOf.keys()).filter((k) => !artifactIds.has(k));
    expect(strays, `postKey 와 노드 id 규칙이 갈렸다: ${strays.slice(0, 5).join(", ")}`).toHaveLength(0);
    expect(roleOf.size, "글 수와 role 맵 크기가 다르다").toBe(artifactIds.size);
  });

  it("스키마를 통과한다", () => {
    // ⚠️ `.toBeTruthy()` 를 쓰지 마라 — zod v4 의 `.parse` 는 성공하면 **항상** 객체를
    //    돌려주므로 falsy 가 될 수 없다. 실질 게이트는 throw 뿐이다.
    expect(() => atlasGraphSchema.parse(graph)).not.toThrow();
  });

  it("id 가 중복되지 않는다", () => {
    const dup = duplicateIds(graph);
    expect(dup, `중복 id: ${dup.join(", ")}`).toHaveLength(0);
  });

  it("모든 엣지의 양끝이 실재하는 노드다", () => {
    const dangling = danglingEdges(graph);
    expect(dangling, "없는 노드를 가리키는 엣지").toHaveLength(0);
  });

  it("id 가 URL 로 쓸 수 있는 모양이다", () => {
    const bad = urlUnsafeIds(graph);
    expect(bad, "URL 에 못 쓰는 id").toHaveLength(0);
  });

  it("같은 (from, to, type) 엣지가 두 번 들어가지 않는다", () => {
    const dup = duplicateEdgeKeys(graph);
    expect(dup, "중복 엣지").toHaveLength(0);
  });

  it("counts 5 필드가 전부 실제 배열 길이와 맞는다", () => {
    const wrong = countMismatches(graph);
    expect(wrong, `어긋난 counts: ${wrong.join(" · ")}`).toHaveLength(0);
  });

  it("글마다 소속 토픽으로 가는 instantiates 가 정확히 하나다", () => {
    const wrong = instantiatesArityErrors(graph);
    expect(wrong, `instantiates 개수가 1이 아닌 글: ${wrong.slice(0, 5).join(" · ")}`).toHaveLength(0);
  });

  it("글이 하나도 안 붙은 토픽 노드가 없다", () => {
    const empty = emptyTopicIds(graph);
    expect(empty, `글 0편인 토픽 노드: ${empty.join(", ")}`).toHaveLength(0);
  });

  /**
   * ⚠️ 초안은 「고립된 artifact 노드가 없다」를 **차수 0** 으로 셌고, 그것은 **죽은 검사**였다
   *    (T8 리뷰 B-F7) — `buildGraph` 가 모든 글에 `instantiates` 를 하나씩 붙이므로
   *    차수 0 인 artifact 는 구조적으로 나올 수가 없다. 항상 초록이라 고장도 드러나지 않는다.
   *
   * **inbound 0** 으로 바꾸면 실측이 나온다. 2026-08-27 실측 4 편이고 **전부 `role: "map"`** 이다:
   *
   * | 글 | outbound |
   * | --- | --- |
   * | `agentic-coding/topic-map-reading-paths` | 31 |
   * | `rag/rag-knowledge-map` | 23 |
   * | `ai-transformation/ai-transformation-knowledge-map` | 12 |
   * | `search-engineering/search-system-overview` | 7 |
   *
   * ⚠️ 계획서 리뷰 A4 는 이 값을 `30·26·22·6` 으로 적었는데 **낡았다.** A2 커밋(`7d12581`)이
   *    코드 펜스 안 예시 링크를 엣지에서 걷어낸 뒤의 실측이 위 표다.
   *
   * ⚠️ **T10·T11 이 알아야 할 사실** — 이 4 편은 최대 허브인데 **들어오는 화살표가 하나도 없다.**
   *    계획서 T11 의 `NodePanel` 은 `e.from === id || e.to === id` 로 **무방향**이라 하위 글
   *    상세에서는 이 4 편이 「이어짐」으로 뜬다. 도달 자체가 막히는 것은 아니다.
   *    영구히 비는 것은 **방향을 따르는 자리**다 — 「이 글을 인용한 글」 같은 백링크 목록과,
   *    화살표를 따라가는 그래프 탐색. 그 자리를 만들 때 이 4 편의 빈칸을 설계에 넣어라.
   *
   * 여기서 단언하는 것은 「고립이 없다」가 아니라 **「고립된 것은 전부 지도 글이다」** 다.
   * **새 글은 정의상 인용해 줄 글이 없으므로 이 검사에 걸린다 — 그것이 의도다.**
   * 「누가 이 글로 들어오는가」를 정하지 않은 글은 아틀라스에서 떠 있는 점이 된다.
   * 그래서 에러 메시지가 조치를 직접 말한다.
   */
  it("아무도 인용하지 않는 글은 전부 지도 글(role: map)이다", () => {
    const stranded = strandedNonMapIds(graph, roleOf);
    const hint =
      `아무도 인용하지 않는 글 ${stranded.length}편: ${stranded.join(", ")}\n` +
      `⇒ 둘 중 하나를 하라. ① 이 글을 본문에서 링크하는 글을 만든다(권장 — 독자가 여기로 들어오는 길이 생긴다) ` +
      `② 이 글이 그 카테고리의 최상위 지도라면 frontmatter 에 role: map 을 붙인다. ` +
      `②는 빨강을 끄는 스위치가 아니라 「이 글이 이 카테고리의 입구다」라는 선언이다 — 입구가 아니면 ①을 하라`;
    expect(stranded, hint).toHaveLength(0);
  });

  it("지도 글 중 inbound 0 인 것이 실제로 존재한다 — 위 검사가 공회전이 아님을 고정한다", () => {
    // 이 단언이 없으면 「고립된 글이 아예 없어서」 초록인 경우와 구분되지 않는다.
    // 초안의 차수 0 검사가 정확히 그 상태였다.
    expect(inboundZeroArtifacts(graph).length).toBeGreaterThan(0);
  });
});

// ── 자기검사 ──────────────────────────────────────────────────────────

/**
 * 자기검사 — 검사기가 정말 잡는지 증명한다.
 *
 * 일부러 깨뜨린 그래프를 **위와 같은 헬퍼**에 넣어 실패가 나오는지 본다.
 * 이게 없으면 「발견 0건」이 참인지 검사가 고장 난 것인지 구분할 수 없다.
 *
 * ⚠️ **모든 케이스에 대조군을 붙인다.** 「깨진 쪽이 빨갛다」만 재면 픽스처가 엉뚱해서
 *    빨간 경우와 구분되지 않는다. `not.toContain` 류는 특히 위험하다 — 픽스처 타입이
 *    틀려도 **항상 참**이라 공회전한다. 실제로 초안의 ⑦ 이 그랬다(뮤테이션 리뷰 F2).
 */
describe("자기검사 — 깨진 그래프를 잡는가", () => {
  const broken = (over: Partial<AtlasGraph>): AtlasGraph => ({ ...graph, ...over });
  const withRole = (id: string, role: string): Map<string, string | undefined> => {
    const m = new Map<string, string | undefined>(Array.from(roleOf.entries()));
    m.set(id, role);
    return m;
  };

  it("① 없는 노드를 가리키는 엣지를 잡는다", () => {
    const g = broken({ edges: [...graph.edges, { from: sampleArtifact.id, to: "없는/노드", type: "extends" }] });
    expect(danglingEdges(g).length).toBeGreaterThan(0);
    expect(danglingEdges(graph)).toHaveLength(0); // 대조군
  });

  it("② 중복 id 를 잡는다", () => {
    const g = broken({ nodes: [...graph.nodes, sampleArtifact] });
    expect(duplicateIds(g).length).toBeGreaterThan(0);
    expect(duplicateIds(graph)).toHaveLength(0); // 대조군
  });

  it("③ 스키마 위반을 잡는다", () => {
    const g = broken({ nodes: [...graph.nodes, { ...sampleArtifact, id: "x", type: "없는타입" as never }] });
    expect(() => atlasGraphSchema.parse(g)).toThrow();
  });

  it("④ 공백이 든 id 를 잡는다", () => {
    const g = broken({ nodes: [...graph.nodes, { ...sampleArtifact, id: "공백 있는/id" }] });
    expect(urlUnsafeIds(g)).toContain("공백 있는/id");
  });

  it("⑤ 한글만 든 id 도 잡는다 — 초안의 /[\\s?#]/ 는 이것을 통과시켰다", () => {
    const g = broken({ nodes: [...graph.nodes, { ...sampleArtifact, id: "토픽/한글슬러그" }] });
    expect(urlUnsafeIds(g)).toContain("토픽/한글슬러그");
    // 대조 — 초안 패턴은 이 id 를 문제로 보지 않는다. 그래서 encodeURI 로 바꿨다(B-F5).
    expect(g.nodes.filter((n) => /[\s?#]/.test(n.id))).toHaveLength(0);
  });

  it("⑥ 아무도 인용하지 않는 평범한 글을 잡는다", () => {
    const g = broken({ nodes: [...graph.nodes, { ...sampleArtifact, id: "rag/떠도는-글" }] });
    // 엣지를 하나도 주지 않았으므로 inbound 0 이고, roleOf 에 없으니 지도 글도 아니다
    expect(strandedNonMapIds(g, roleOf)).toContain("rag/떠도는-글");
    expect(strandedNonMapIds(graph, roleOf)).toHaveLength(0); // 대조군
  });

  it("⑦ 같은 글이라도 role: map 이면 봐준다 — 검사가 과하지 않음을 고정한다", () => {
    const g = broken({ nodes: [...graph.nodes, { ...sampleArtifact, id: "rag/새-지도" }] });
    // ⚠️ 차등 대조다. role 을 주기 **전에는** 반드시 잡혀야 한다 — 이 줄이 없으면
    //    픽스처가 artifact 가 아닐 때도 아래 not.toContain 이 참이라 공회전한다.
    expect(strandedNonMapIds(g, roleOf)).toContain("rag/새-지도");
    expect(strandedNonMapIds(g, withRole("rag/새-지도", "map"))).not.toContain("rag/새-지도");
  });

  it("⑧ 중복 엣지를 잡는다", () => {
    const g = broken({ edges: [...graph.edges, graph.edges[0]] });
    expect(duplicateEdgeKeys(g).length).toBeGreaterThan(0);
    expect(duplicateEdgeKeys(graph)).toHaveLength(0); // 대조군
  });

  /**
   * ⚠️ **이 케이스가 두 검사를 나눠 둔 이유를 증명한다** — 뮤테이션 M7 실측.
   *    `instantiates` 를 통째로 지우면 매핑이 완전히 깨진 것인데, **inbound 0 검사는 초록이다.**
   *    `instantiates` 의 `to` 는 토픽이라 글의 inbound 에 1도 기여하지 않기 때문이다.
   *    마지막 단언이 그 사실을 못 박는다 — 지우면 두 검사를 하나로 합치고 싶어진다.
   */
  it("⑨ instantiates 가 통째로 사라지면 잡는다 — 그리고 inbound 0 검사는 못 잡는다", () => {
    const g = broken({ edges: graph.edges.filter((e) => e.type !== "instantiates") });
    expect(instantiatesArityErrors(g).length).toBeGreaterThan(0);
    expect(emptyTopicIds(g).length).toBeGreaterThan(0);
    expect(strandedNonMapIds(g, roleOf), "inbound 0 검사가 이것을 잡았다면 위 주석이 낡은 것이다").toHaveLength(0);
    expect(instantiatesArityErrors(graph)).toHaveLength(0); // 대조군
  });

  it("⑩ instantiates 가 둘 붙어도 잡는다 — 글은 카테고리 하나에만 속한다", () => {
    const other = graph.nodes.filter((n) => n.type === "concept" && !sampleArtifact.topics.includes(n.topics[0]))[0];
    const g = broken({ edges: [...graph.edges, { from: sampleArtifact.id, to: other.id, type: "instantiates" }] });
    expect(instantiatesArityErrors(g).join(" ")).toContain(sampleArtifact.id);
  });

  it("⑪ 글이 하나도 안 붙은 토픽 노드를 잡는다", () => {
    const g = broken({ nodes: [...graph.nodes, { ...sampleTopic, id: "topic/글없는카테고리" }] });
    expect(emptyTopicIds(g)).toContain("topic/글없는카테고리");
    expect(emptyTopicIds(graph)).toHaveLength(0); // 대조군
  });

  /**
   * ⚠️ counts 자기검사가 **5 필드 전부** 있어야 하는 이유 — T8 뮤테이션 실측에서
   *    `instantiatesEdges`·`sequenceEdges` 를 0 으로 고정해도 단위 테스트가 초록이었다.
   *    초안의 무결성 검사가 3 필드만 봤기 때문이다.
   */
  it("⑫ counts 5 필드 어느 하나가 틀려도 잡는다", () => {
    const fields = ["artifact", "concept", "extendsEdges", "instantiatesEdges", "sequenceEdges"] as const;
    for (const f of fields) {
      const g = broken({
        meta: { ...graph.meta, counts: { ...graph.meta.counts, [f]: graph.meta.counts[f] + 1 } },
      });
      const wrong = countMismatches(g);
      expect(wrong.length, `${f} 를 틀리게 했는데 못 잡았다`).toBeGreaterThan(0);
      expect(wrong.join(" "), `${f} 를 지목하지 못했다`).toContain(f);
    }
    expect(countMismatches(graph)).toHaveLength(0); // 대조군
  });

  it("⑬ roleOf 키가 어긋나면 잡는다 — 오진의 원인을 이름 붙인다", () => {
    const artifactIds = new Set(graph.nodes.filter((n) => n.type === "artifact").map((n) => n.id));
    const strays = Array.from(withRole("없는키/x", "map").keys()).filter((k) => !artifactIds.has(k));
    expect(strays).toContain("없는키/x");
  });
});
