import { describe, expect, it } from "vitest";
import { buildTree } from "@/lib/blog/tree";
import { STANDALONE_SLUG, type PostSummary } from "@/lib/blog/types";
import type { BlogCategory } from "@/content/blog/categories";
import type { BlogSeries } from "@/content/blog/series";

const CATEGORIES: BlogCategory[] = [
  { slug: "rag", name: "RAG · 검색증강생성", description: "d", order: 40 },
  { slug: "search-engineering", name: "검색 엔지니어링", description: "d", order: 50 },
];

const SERIES: BlogSeries[] = [
  { slug: "rag-pipeline", name: "RAG 파이프라인", categorySlug: "rag", order: 20 },
  { slug: "rag-core-concepts", name: "RAG 핵심 개념", categorySlug: "rag", order: 10 },
];

function post(over: Partial<PostSummary>): PostSummary {
  return {
    title: "제목",
    description: "설명",
    category: "rag",
    categorySlug: "rag",
    slug: "s",
    tags: [],
    date: "2026-01-01",
    featured: false,
    draft: false,
    ...over,
  } as PostSummary;
}

const POSTS: PostSummary[] = [
  post({ slug: "p2", title: "파이프라인 2", series: "rag-pipeline", seriesOrder: 2 }),
  post({ slug: "p1", title: "파이프라인 1", series: "rag-pipeline", seriesOrder: 1 }),
  post({ slug: "c1", title: "핵심 1", series: "rag-core-concepts", seriesOrder: 1 }),
  post({ slug: "alone", title: "혼자 있는 편" }),
  post({ slug: "se1", title: "검색 편", category: "search-engineering", categorySlug: "search-engineering" }),
];

describe("buildTree", () => {
  it("펼치지 않은 카테고리는 이름과 편수만 갖는다", () => {
    const tree = buildTree(POSTS, CATEGORIES, SERIES, null);
    expect(tree.categories.map((c) => [c.slug, c.count, c.series.length])).toEqual([
      ["rag", 4, 0],
      ["search-engineering", 1, 0],
    ]);
  });

  it("펼친 카테고리만 시리즈를 채운다", () => {
    const tree = buildTree(POSTS, CATEGORIES, SERIES, "rag");
    expect(tree.expanded).toBe("rag");
    expect(tree.categories[0].series.map((s) => s.slug)).toEqual([
      "rag-core-concepts",
      "rag-pipeline",
      STANDALONE_SLUG,
    ]);
    expect(tree.categories[1].series).toEqual([]);
  });

  it("시리즈는 order 오름차순이고 독립편이 맨 뒤다", () => {
    const tree = buildTree(POSTS, CATEGORIES, SERIES, "rag");
    const last = tree.categories[0].series[tree.categories[0].series.length - 1];
    expect(last.slug).toBe(STANDALONE_SLUG);
    expect(last.name).toBe("독립편");
    expect(last.posts.map((p) => p.slug)).toEqual(["alone"]);
  });

  it("시리즈 안의 편은 seriesOrder 오름차순이다", () => {
    const tree = buildTree(POSTS, CATEGORIES, SERIES, "rag");
    const pipeline = tree.categories[0].series.find((s) => s.slug === "rag-pipeline");
    expect(pipeline?.posts.map((p) => p.slug)).toEqual(["p1", "p2"]);
  });

  it("독립편이 없으면 그 묶음을 만들지 않는다", () => {
    const only = POSTS.filter((p) => p.series);
    const tree = buildTree(only, CATEGORIES, SERIES, "rag");
    expect(tree.categories[0].series.some((s) => s.slug === STANDALONE_SLUG)).toBe(false);
  });

  it("편이 0편인 카테고리는 트리에 넣지 않는다", () => {
    const tree = buildTree([], CATEGORIES, SERIES, null);
    expect(tree.categories).toEqual([]);
  });

  it("🔴 정의되지 않은 series 값을 만나면 던진다", () => {
    const orphan = [post({ slug: "x", series: "없는-시리즈", seriesOrder: 1 })];
    expect(() => buildTree(orphan, CATEGORIES, SERIES, "rag")).toThrow(/없는-시리즈/);
  });
});
