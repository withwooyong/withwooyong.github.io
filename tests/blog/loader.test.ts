import path from "node:path";
import { describe, expect, it } from "vitest";
import { readPosts } from "@/lib/blog/loader";

const FIXTURES = path.join(__dirname, "fixtures");

describe("readPosts", () => {
  it("draft:true인 글을 제외한다", () => {
    const posts = readPosts(FIXTURES);
    expect(posts.map((p) => p.slug)).not.toContain("draft");
  });

  it("date 내림차순으로 정렬한다", () => {
    const posts = readPosts(FIXTURES);
    expect(posts.map((p) => p.slug)).toEqual(["ok", "older"]);
  });

  it("디렉터리명을 categorySlug로 쓴다", () => {
    const posts = readPosts(FIXTURES);
    expect(posts.every((p) => p.categorySlug === "search-engineering")).toBe(true);
  });

  it("frontmatter를 제외한 본문만 body에 담는다", () => {
    const post = readPosts(FIXTURES).find((p) => p.slug === "ok")!;
    expect(post.body).toContain("## 첫 절");
    expect(post.body).not.toContain("title:");
  });

  it("본문에서 목차를 만든다", () => {
    const post = readPosts(FIXTURES).find((p) => p.slug === "ok")!;
    expect(post.toc).toEqual([{ depth: 2, text: "첫 절", id: "첫-절" }]);
  });

  it("잘못된 frontmatter는 파일명과 함께 던진다", () => {
    expect(() => readPosts(path.join(__dirname, "fixtures-invalid"))).toThrow(/bad\.md/);
  });
});
