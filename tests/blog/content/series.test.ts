import { describe, expect, it } from "vitest";
import { blogSeries, findSeries, seriesOfCategory, type BlogSeries } from "@/content/blog/series";
import { blogCategories } from "@/content/blog/categories";
import { readPosts } from "@/lib/blog/loader";

/**
 * 시리즈 정의와 발행본의 전량 대조.
 *
 * 🔴 케이스 5가 먼저다. 대조군이 0개면 나머지 넷은 영원히 통과한다 —
 * 이 리포에서 자기 검사 21/21 안의 한 케이스가 정확히 그 상태였다.
 */
describe("시리즈 정의", () => {
  const posts = readPosts();
  const withSeries = posts.filter((p) => p.series);

  it("🔴 대조군이 40개 이상이다 (0건 가드)", () => {
    const used = new Set(withSeries.map((p) => p.series));
    expect(used.size, "시리즈를 쓰는 편을 하나도 읽지 못했다").toBeGreaterThanOrEqual(40);
    expect(blogSeries.length).toBeGreaterThanOrEqual(40);
  });

  it("발행본의 모든 series 값이 series.ts 에 있다", () => {
    for (const post of withSeries) {
      expect(findSeries(post.series as string), `${post.categorySlug}/${post.slug}`).toBeDefined();
    }
  });

  it("series.ts 의 모든 항목이 1편 이상을 갖는다", () => {
    for (const s of blogSeries) {
      const n = withSeries.filter((p) => p.series === s.slug).length;
      expect(n, `고아 정의: ${s.slug}`).toBeGreaterThan(0);
    }
  });

  it("categorySlug 가 실제 편들의 카테고리와 일치한다", () => {
    for (const s of blogSeries) {
      expect(blogCategories.some((c) => c.slug === s.categorySlug), `없는 카테고리: ${s.categorySlug}`).toBe(true);
      for (const post of withSeries.filter((p) => p.series === s.slug)) {
        expect(post.categorySlug, `${s.slug} 가 카테고리를 넘나든다`).toBe(s.categorySlug);
      }
    }
  });

  it("seriesOrder 가 1..n 연속이고 중복이 없다", () => {
    for (const s of blogSeries) {
      const orders = withSeries
        .filter((p) => p.series === s.slug)
        .map((p) => p.seriesOrder as number)
        .sort((a, b) => a - b);
      expect(orders, `${s.slug} 의 순서에 구멍이나 중복이 있다`).toEqual(
        orders.map((_, i) => i + 1)
      );
    }
  });

  it("seriesOfCategory 가 order 오름차순으로 돌려준다", () => {
    // 🔴 blogSeries 는 이미 카테고리별 오름차순으로 나열돼 있어, 함수 반환값을
    // 다시 정렬해 자기 자신과 비교하면 정렬 로직을 지워도 통과한다. 그래서
    // order 를 일부러 뒤섞은 픽스처로 검사한다 — 이것이 진짜 정렬을 지킨다.
    const shuffled: BlogSeries[] = [
      { slug: "c-third", name: "c-third", categorySlug: "x", order: 30 },
      { slug: "a-first", name: "a-first", categorySlug: "x", order: 10 },
      { slug: "b-second", name: "b-second", categorySlug: "x", order: 20 },
    ];
    expect(seriesOfCategory("x", shuffled).map((s) => s.slug)).toEqual([
      "a-first",
      "b-second",
      "c-third",
    ]);

    // 실데이터에서도 오름차순인지 함께 확인한다.
    for (const c of blogCategories) {
      const list = seriesOfCategory(c.slug);
      const sorted = [...list].sort((a, b) => a.order - b.order);
      expect(list).toEqual(sorted);
    }
  });
});
