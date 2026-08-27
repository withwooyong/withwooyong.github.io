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
  it("글 1편이 artifact 노드 1개가 된다", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag" })]);
    const n = g.nodes.find((x) => x.id === "rag/a");
    expect(n).toBeDefined();
    expect(n!.type).toBe("artifact");
    expect(n!.origin).toBe("mine");
    expect(n!.source).toEqual({ kind: "note", ref: "/blog/rag/a/" });
  });

  it("카테고리가 concept 노드 1개와 instantiates 엣지가 된다", () => {
    const g = buildGraph([
      post({ slug: "a", categorySlug: "rag" }),
      post({ slug: "b", categorySlug: "rag" }),
    ]);
    expect(g.nodes.filter((n) => n.type === "concept")).toHaveLength(1);
    expect(g.nodes.find((n) => n.id === topicId("rag"))).toBeDefined();
    expect(g.edges.filter((e) => e.type === "instantiates")).toHaveLength(2);
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
    const g = buildGraph([post({ slug: "a", categorySlug: "rag" })]);
    const t = g.nodes.find((n) => n.id === topicId("rag"))!;
    const registered = findCategory("rag")!;
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
    // counts 가 실제 배열과 갈리지 않는지 — 여기가 갈리면 T10 이 잘못된 규모로 렌더러를 고른다
    expect(g.nodes).toHaveLength(counts.artifact + counts.concept);
    expect(g.edges).toHaveLength(
      counts.extendsEdges + counts.instantiatesEdges + counts.sequenceEdges,
    );
    // 빌드 시각이 아니라 글의 날짜다. 시계를 보면 이 형식이 깨진다
    expect(g.meta.latest).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    expect(atlasGraphSchema.parse(g)).toBeTruthy();
  });
});
