import { describe, expect, it } from "vitest";
import { validateFrontmatter } from "@/lib/blog/frontmatter";

const valid = {
  title: "Elasticsearch 아키텍처",
  description: "클러스터 계층부터 색인 내부 동작까지 정리한다.",
  category: "search-engineering",
  tags: ["elasticsearch", "search"],
  date: "2026-07-25",
  featured: false,
  draft: false,
};

describe("validateFrontmatter", () => {
  it("올바른 frontmatter를 통과시킨다", () => {
    expect(validateFrontmatter(valid, "a.md")).toMatchObject(valid);
  });

  it("필수 필드가 없으면 파일명을 포함한 오류를 던진다", () => {
    const { title, ...rest } = valid;
    expect(() => validateFrontmatter(rest, "posts/a.md")).toThrow(/posts\/a\.md.*title/);
  });

  it("존재하지 않는 카테고리면 오류를 던진다", () => {
    expect(() => validateFrontmatter({ ...valid, category: "nope" }, "a.md")).toThrow(/카테고리/);
  });

  it("date가 YYYY-MM-DD 형식이 아니면 오류를 던진다", () => {
    expect(() => validateFrontmatter({ ...valid, date: "2026/07/25" }, "a.md")).toThrow(/date/);
  });

  it("tags가 비어 있으면 오류를 던진다", () => {
    expect(() => validateFrontmatter({ ...valid, tags: [] }, "a.md")).toThrow(/tags/);
  });

  it("tags가 7개 이상이면 오류를 던진다", () => {
    const tags = ["a", "b", "c", "d", "e", "f", "g"];
    expect(() => validateFrontmatter({ ...valid, tags }, "a.md")).toThrow(/tags/);
  });

  it("series가 있는데 seriesOrder가 없으면 오류를 던진다", () => {
    expect(() => validateFrontmatter({ ...valid, series: "s" }, "a.md")).toThrow(/seriesOrder/);
  });

  it("featured/draft 기본값을 채우지 않는다 — 명시를 강제한다", () => {
    const { featured, ...rest } = valid;
    expect(() => validateFrontmatter(rest, "a.md")).toThrow(/featured/);
  });
});
