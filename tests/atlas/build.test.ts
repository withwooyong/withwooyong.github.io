import { describe, expect, it } from "vitest";
import { findCategory } from "@/content/blog/categories";
import { buildGraph } from "@/lib/atlas/build";
import { atlasGraphSchema, topicId } from "@/lib/atlas/types";
import type { Post } from "@/lib/blog/types";

/**
 * 테스트용 최소 Post. 실제 로더를 안 타므로 156편에 의존하지 않는다.
 *
 * 합성 데이터라 카테고리 slug 가 `content/blog/categories.ts` 에 등록돼 있을 수도, 없을 수도
 * 있다 — 그 두 경우를 갈라 보는 것이 「토픽 노드의 표시명」 테스트다.
 */
function post(over: Partial<Post> & { slug: string; categorySlug: string }): Post {
  return {
    title: `제목 ${over.slug}`,
    description: "설명",
    category: over.categorySlug,
    tags: [],
    date: "2026-01-01",
    featured: false,
    draft: false,
    body: "",
    toc: [],
    ...over,
  } as Post;
}

describe("buildGraph", () => {
  /**
   * 필드를 전수 단언한다 — 리뷰 C-F4·F5. 뮤테이션 실측으로 `title`·`summary`·`topics`·
   * `updated`·`confidence` 를 아무 값으로 바꿔도 14 건이 전부 초록이었다.
   * 스키마가 `z.string()` 이라 **빈 문자열도 통과**하고, enum 안이면 값이 뭐든 통과한다.
   */
  it("글 1편이 artifact 노드 1개가 된다", () => {
    const g = buildGraph([
      post({ slug: "a", categorySlug: "rag", date: "2026-01-01", updated: "2026-05-05" }),
    ]);
    const n = g.nodes.find((x) => x.id === "rag/a");
    expect(n).toBeDefined();
    expect(n!.type).toBe("artifact");
    expect(n!.title).toBe("제목 a");
    expect(n!.summary).toBe("설명");
    expect(n!.origin).toBe("mine");
    expect(n!.confidence).toBe("working");
    expect(n!.topics).toEqual(["rag"]);
    expect(n!.tags).toEqual([]);
    // `date` 가 아니라 `updated` 다 — 「최근 갱신」 정렬이 여기에 걸린다
    expect(n!.updated).toBe("2026-05-05");
    expect(n!.source).toEqual({ kind: "note", ref: "/blog/rag/a/" });
  });

  it("updated 가 없으면 date 로 물러선다", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag", date: "2026-01-01" })]);
    expect(g.nodes.find((x) => x.id === "rag/a")!.updated).toBe("2026-01-01");
  });

  it("카테고리가 concept 노드 1개와 instantiates 엣지가 된다", () => {
    const g = buildGraph([
      post({ slug: "a", categorySlug: "rag" }),
      post({ slug: "b", categorySlug: "rag" }),
    ]);
    expect(g.nodes.filter((n) => n.type === "concept")).toHaveLength(1);
    expect(g.nodes.find((n) => n.id === topicId("rag"))).toBeDefined();
    const inst = g.edges.filter((e) => e.type === "instantiates");
    expect(inst).toHaveLength(2);
    // 방향까지 본다 — 리뷰 C-F1. from/to 를 뒤집어도 개수는 그대로라 14 건이 전부 초록이었다.
    // 계획서가 「instantiates — 글 → 토픽」으로 규칙을 적어 뒀고 T11 의 「이 토픽의 글」
    // 조회가 이 방향에 걸려 있다.
    expect(inst).toContainEqual({ from: "rag/a", to: topicId("rag"), type: "instantiates" });
    expect(inst).toContainEqual({ from: "rag/b", to: topicId("rag"), type: "instantiates" });
  });

  it("태그는 노드가 되지 않는다 — D-2", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag", tags: ["벡터", "임베딩"] })]);
    expect(g.nodes).toHaveLength(2); // 글 1 + 토픽 1
    expect(g.nodes.find((n) => n.id === "rag/a")!.tags).toEqual(["벡터", "임베딩"]);
  });

  it("본문 링크가 extends 엣지가 되고, 중복은 한 번만 센다", () => {
    const g = buildGraph([
      post({
        slug: "a",
        categorySlug: "rag",
        body: "[x](/blog/rag/b/) 그리고 다시 [y](/blog/rag/b/#앵커)",
      }),
      post({ slug: "b", categorySlug: "rag" }),
    ]);
    const ext = g.edges.filter((e) => e.type === "extends");
    expect(ext).toHaveLength(1);
    expect(ext[0]).toMatchObject({ from: "rag/a", to: "rag/b" });
  });

  it("대상이 없는 링크는 엣지가 되지 않는다", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag", body: "[x](/blog/rag/없음/)" })]);
    expect(g.edges.filter((e) => e.type === "extends")).toHaveLength(0);
  });

  /**
   * 리뷰 C-F2 [심각] — 위 「대상이 없는 링크」는 **존재하지 않는 slug** 만 본다.
   * draft 로 내려간 글은 다른 경로다. `published` 를 `posts` 대신 `all` 에서 만드는
   * 뮤테이션이 14 건을 전부 통과했고, 그때 노드가 없는 대상으로 엣지가 생긴다(dangling).
   * 오늘 156 편에 published → draft 링크가 없어 잠복 중이다 — 글 하나를 draft 로 내리는 날 터진다.
   */
  it("draft 를 가리키는 링크는 엣지가 되지 않는다", () => {
    const g = buildGraph([
      post({ slug: "a", categorySlug: "rag", body: "[x](/blog/rag/z/)" }),
      post({ slug: "z", categorySlug: "rag", draft: true }),
    ]);
    expect(g.edges.filter((e) => e.type === "extends")).toHaveLength(0);
  });

  it("자기 자신을 가리키는 링크는 엣지가 되지 않는다", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag", body: "[x](/blog/rag/a/)" })]);
    expect(g.edges.filter((e) => e.type === "extends")).toHaveLength(0);
  });

  it("series 가 seriesOrder 순으로 이웃을 잇는다", () => {
    const g = buildGraph([
      post({ slug: "c", categorySlug: "rag", series: "S", seriesOrder: 3 }),
      post({ slug: "a", categorySlug: "rag", series: "S", seriesOrder: 1 }),
      post({ slug: "b", categorySlug: "rag", series: "S", seriesOrder: 2 }),
    ]);
    const seq = g.edges.filter((e) => e.type === "sequence");
    expect(seq).toHaveLength(2);
    expect(seq).toContainEqual({ from: "rag/a", to: "rag/b", type: "sequence" });
    expect(seq).toContainEqual({ from: "rag/b", to: "rag/c", type: "sequence" });
  });

  /**
   * 리뷰 C-F3 — `if (!p.series) continue` 를 지워도 14 건이 전부 초록이었다.
   * 그러면 series 없는 글이 `undefined` 키 하나로 묶여 한 줄 사슬이 된다:
   * 실측 `sequenceEdges` 99 → 118, 엣지 1,053 → 1,072.
   */
  it("series 가 없는 글끼리는 sequence 엣지를 만들지 않는다", () => {
    const g = buildGraph([
      post({ slug: "a", categorySlug: "rag" }),
      post({ slug: "b", categorySlug: "rag" }),
    ]);
    expect(g.edges.filter((e) => e.type === "sequence")).toHaveLength(0);
  });

  it("draft 는 그래프에 들어가지 않는다", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag", draft: true })]);
    expect(g.nodes.filter((n) => n.type === "artifact")).toHaveLength(0);
  });

  /**
   * 계획서 착수 전 발견 ② — draft 테스트가 artifact 개수만 보면, 카테고리 목록을
   * 필터 전 배열에서 뽑아도 초록이다. 그러면 엣지가 하나도 없는 고아 토픽 노드가 남는다.
   * T7 실측 기록 ②가 T8 로 넘긴 「글 0 편 카테고리」와 같은 문제다.
   */
  it("초안만 있는 카테고리는 토픽 노드도 만들지 않는다", () => {
    const g = buildGraph([
      post({ slug: "a", categorySlug: "rag" }),
      post({ slug: "z", categorySlug: "glossary", draft: true }),
    ]);
    expect(g.nodes.find((n) => n.id === topicId("glossary"))).toBeUndefined();
    expect(g.nodes.filter((n) => n.type === "concept")).toHaveLength(1);
    expect(g.meta.counts.concept).toBe(1);
  });

  /**
   * 계획서 착수 전 발견 ① — T10 은 `{t.title}` 을, T11 은 `title={node.title}` ·
   * `description={node.summary}` 를 그대로 렌더한다. slug 를 넣으면 한글 사이트에
   * 「rag」가 뜨고 노드 상세의 meta description 이 「1편」이 된다.
   */
  it("토픽 노드는 카테고리 표시명과 설명을 쓴다", () => {
    const g = buildGraph([
      post({ slug: "a", categorySlug: "rag", date: "2026-01-01", updated: "2026-05-05" }),
    ]);
    const t = g.nodes.find((n) => n.id === topicId("rag"))!;
    const registered = findCategory("rag")!;
    // 리뷰 C-F4·F5 — 아래 4개는 뮤테이션을 전부 통과시켰던 자리다.
    // 특히 `topics` 는 `lib/atlas/types.ts` 가 「토픽 노드는 자기 자신을 담는다」로
    // 규칙을 적어 뒀는데 검사가 없었다.
    expect(t.origin).toBe("derived");
    expect(t.confidence).toBe("settled");
    expect(t.topics).toEqual(["rag"]);
    expect(t.updated).toBe("2026-05-05");
    // 출처가 레지스트리인지 — 표시명·설명을 하드코딩하면 카테고리 문구를 고칠 때마다 깨진다
    expect(t.title).toBe(registered.name);
    expect(t.summary).toBe(registered.description);
    // 폴백과 구분되는지 — 위 두 줄만으로는 slug 를 그대로 넣어도 통과할 수 없어야 한다
    expect(t.title).not.toBe("rag");
    expect(t.summary).not.toBe("1편");
  });

  it("등록되지 않은 카테고리는 slug 와 편수로 물러선다", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "미등록" })]);
    const t = g.nodes.find((n) => n.id === topicId("미등록"))!;
    expect(t.title).toBe("미등록");
    expect(t.summary).toBe("1편");
  });

  it("meta.latest 는 빌드 시각이 아니라 글의 최신 updated 다", () => {
    const g = buildGraph([
      post({ slug: "a", categorySlug: "rag", date: "2026-01-01", updated: "2026-05-05" }),
      post({ slug: "b", categorySlug: "rag", date: "2026-03-03" }),
    ]);
    expect(g.meta.latest).toBe("2026-05-05");
  });

  /**
   * 리뷰 A1 — `build.ts` 는 「시계를 보지 않는다」로 결정론을 막았는데 **입력 순서**는 안 막았다.
   * 실측: 156편 중 154편이 날짜 동률이라 사실상 전체 순서를 `loader.ts` 의
   * `title.localeCompare(t, "ko")` 가 정한다. 타이브레이커를 코드포인트로 바꾸자
   * 156칸 중 125칸이 이동했다 — 로컬 Windows 와 CI Linux 의 ICU 데이터가 다르면
   * 내용이 같아도 산출물 해시가 흔들리고 `check-baseline` 이 흔들린다.
   * 입력 순서도 입력이다.
   */
  it("입력 순서가 달라도 바이트 단위로 같은 그래프를 낸다", () => {
    const posts = [
      post({ slug: "a", categorySlug: "rag", body: "[x](/blog/search-engineering/c/)" }),
      post({ slug: "b", categorySlug: "rag", series: "S1", seriesOrder: 1 }),
      post({ slug: "c", categorySlug: "search-engineering", series: "S1", seriesOrder: 2 }),
      post({ slug: "d", categorySlug: "search-engineering", series: "S2", seriesOrder: 1 }),
      post({ slug: "e", categorySlug: "rag", series: "S2", seriesOrder: 2, body: "[y](/blog/rag/a/)" }),
    ];
    const forward = JSON.stringify(buildGraph(posts));
    const reversed = JSON.stringify(buildGraph(posts.slice().reverse()));
    expect(reversed).toBe(forward);
  });

  it("노드와 엣지가 정준 순서로 정렬된다", () => {
    const g = buildGraph([
      post({ slug: "z", categorySlug: "search-engineering", body: "[x](/blog/rag/a/)" }),
      post({ slug: "a", categorySlug: "rag" }),
    ]);
    const ids = g.nodes.map((n) => n.id);
    expect(ids).toEqual([...ids].sort());
    const keys = g.edges.map((e) => `${e.type} ${e.from} ${e.to}`);
    expect(keys).toEqual([...keys].sort());
  });

  it("스키마를 통과한다", () => {
    const g = buildGraph([
      post({ slug: "a", categorySlug: "rag", body: "[x](/blog/rag/b/)" }),
      post({ slug: "b", categorySlug: "rag" }),
    ]);
    expect(() => atlasGraphSchema.parse(g)).not.toThrow();
  });
});

/**
 * 위 단위 테스트는 전부 합성 데이터다. 실제 156편으로 돌려 규모와 불변식을 함께 본다.
 *
 * 실측 수치(노드 162 · 엣지 1,053)를 **단언하지 않는 것은 의도다** — 글이 한 편 늘 때마다
 * 깨지는 테스트는 회귀 신호가 아니라 잡음이 된다. 대신 ① 내용이 늘어도 성립하는 불변식을
 * 단언하고 ② 현재 규모는 출력한다. T10 의 렌더러 임계가 이 수에 걸려 있다.
 *
 * ⚠️ vitest 기본 리포터는 **비-TTY(파이프·CI)에서 console.log 를 삼킨다.** 규모를 보려면
 *    `npx vitest run tests/atlas/build.test.ts --reporter=verbose` 로 돌려라.
 *    `npm test | grep 노드` 는 0건을 내는데, 그것은 「출력이 없다」가 아니라 「못 읽었다」다.
 */
describe("실데이터", () => {
  it("규모를 출력하고 불변식을 지킨다", async () => {
    const { readPosts } = await import("@/lib/blog/loader");
    const posts = readPosts();
    const g = buildGraph(posts);

    console.log(JSON.stringify(g.meta.counts, null, 2));
    console.log(`노드 ${g.nodes.length} · 엣지 ${g.edges.length}`);

    const { counts } = g.meta;
    // readPosts 는 draft 를 이미 걸러 낸다 — 글 1편 = artifact 노드 1개
    expect(counts.artifact).toBe(posts.length);
    // 글마다 소속 토픽이 정확히 하나
    expect(counts.instantiatesEdges).toBe(counts.artifact);
    // 토픽 노드 = 글이 있는 카테고리 수. 등록 12개가 아니다
    expect(counts.concept).toBe(new Set(posts.map((p) => p.categorySlug)).size);
    expect(g.nodes).toHaveLength(counts.artifact + counts.concept);

    // ⚠️ `edges.length === extends + instantiates + sequence` 는 **항등식이라 뺐다.**
    //    counts 를 그 edges 배열에서 필터해 만들었으니 항상 참이다 — 리뷰 A·C 가 같은 자리를
    //    지목했다. 아래는 배열을 다시 세지 않고 **성질**을 본다.

    // 엣지 양끝이 전부 실재하는 노드다 — dangling 0 (리뷰 C-F2). T9 가 이것을 게이트로 승격한다
    const nodeIds = new Set(g.nodes.map((n) => n.id));
    expect(g.edges.filter((e) => !nodeIds.has(e.from) || !nodeIds.has(e.to))).toEqual([]);

    // instantiates 는 전부 글 → 토픽 방향이다 (리뷰 C-F1)
    const topicIds = new Set(g.nodes.filter((n) => n.type === "concept").map((n) => n.id));
    const inst = g.edges.filter((e) => e.type === "instantiates");
    expect(inst.filter((e) => !topicIds.has(e.to) || topicIds.has(e.from))).toEqual([]);

    // 정준 순서 — 입력 순서가 바뀌어도 산출물이 같아야 한다 (리뷰 A1)
    const ids = g.nodes.map((n) => n.id);
    expect(ids).toEqual([...ids].sort());

    // 빌드 시각이 아니라 글의 날짜다. 시계를 보면 이 형식이 깨진다
    expect(g.meta.latest).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // ⚠️ `.toBeTruthy()` 를 쓰지 마라 — 리뷰 C-F6. zod v4 의 `.parse` 는 성공하면 **항상**
    //    객체를 돌려주므로 falsy 가 될 수 없다. 실질 게이트는 throw 뿐이다.
    expect(() => atlasGraphSchema.parse(g)).not.toThrow();
  });
});
