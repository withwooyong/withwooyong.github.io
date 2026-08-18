import { describe, expect, it } from "vitest";
import { validateFrontmatter } from "@/lib/blog/frontmatter";

const valid = {
  title: "Elasticsearch 아키텍처",
  description: "클러스터 계층부터 색인 내부 동작까지 정리한다.",
  category: "search-engineering",
  // 통제 어휘(content/blog/tags.ts) 안의 태그만 쓴다. "search"는 어휘에 없어 fixture로 못 쓴다.
  tags: ["elasticsearch", "search-architecture"],
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

  it("태그가 소문자 영문 슬러그가 아니면 오류를 던진다", () => {
    // 태그는 /blog/tags/<태그>/ URL 경로가 된다.
    expect(() => validateFrontmatter({ ...valid, tags: ["Redis"] }, "a.md")).toThrow(/tags/);
    expect(() => validateFrontmatter({ ...valid, tags: ["CI/CD"] }, "a.md")).toThrow(/tags/);
    expect(() => validateFrontmatter({ ...valid, tags: ["멀티에이전트"] }, "a.md")).toThrow(/tags/);
    expect(() => validateFrontmatter({ ...valid, tags: ["spring boot"] }, "a.md")).toThrow(/tags/);
    expect(() => validateFrontmatter({ ...valid, tags: ["node.js"] }, "a.md")).toThrow(/tags/);
    expect(() => validateFrontmatter({ ...valid, tags: ["ci_cd"] }, "a.md")).toThrow(/tags/);
  });

  it("오류 메시지에 위반한 태그 값이 들어간다", () => {
    // 128편 배치에서 어느 태그가 문제인지 알 수 없으면 찾을 수 없다.
    expect(() => validateFrontmatter({ ...valid, tags: ["Redis"] }, "a.md")).toThrow(/Redis/);
  });

  it("올바른 슬러그는 통과한다", () => {
    // k8s는 형식은 옳지만 어휘 밖이라(§13-3 표기 통일: k8s → kubernetes) 여기 못 쓴다.
    const tags = ["redis", "ci-cd", "cqrs", "kubernetes", "ab-testing", "search-ranking"];
    expect(validateFrontmatter({ ...valid, tags }, "a.md").tags).toEqual(tags);
  });

  it("통제 어휘에 없는 태그는 오류를 던진다", () => {
    // 형식은 맞지만 어휘 밖 — 동의어 분산을 막는다.
    expect(() => validateFrontmatter({ ...valid, tags: ["redis-cache"] }, "a.md")).toThrow(/어휘/);
    expect(() => validateFrontmatter({ ...valid, tags: ["fastapi"] }, "a.md")).toThrow(/어휘/);
    expect(() => validateFrontmatter({ ...valid, tags: ["k8s"] }, "a.md")).toThrow(/어휘/);
  });

  it("어휘 오류 메시지에 위반한 태그 값이 전부 들어간다", () => {
    expect(() => validateFrontmatter({ ...valid, tags: ["k8s", "fastapi"] }, "a.md"))
      .toThrow(/k8s.*fastapi|fastapi.*k8s/);
  });

  it("통제 어휘 안의 태그는 통과한다", () => {
    const tags = ["redis", "kubernetes", "caching", "troubleshooting"];
    expect(validateFrontmatter({ ...valid, tags }, "a.md").tags).toEqual(tags);
  });

  it("series가 있는데 seriesOrder가 없으면 오류를 던진다", () => {
    expect(() => validateFrontmatter({ ...valid, series: "s" }, "a.md")).toThrow(/seriesOrder/);
  });

  it("featured/draft 기본값을 채우지 않는다 — 명시를 강제한다", () => {
    const { featured, ...rest } = valid;
    expect(() => validateFrontmatter(rest, "a.md")).toThrow(/featured/);
  });

  it("값이 없는 선택 필드는 키 자체를 만들지 않는다", () => {
    // Next.js가 props를 JSON 직렬화할 때 undefined 키가 있으면 빌드가 실패한다.
    const result = validateFrontmatter(valid, "a.md");
    expect(Object.keys(result)).not.toContain("updated");
    expect(Object.keys(result)).not.toContain("series");
    expect(Object.keys(result)).not.toContain("seriesOrder");
  });

  it("값이 있는 선택 필드는 그대로 실린다", () => {
    const withOptional = { ...valid, updated: "2026-08-07" };
    const result = validateFrontmatter(withOptional, "a.md");
    expect(result.updated).toBe("2026-08-07");
  });

  it("series가 있으면 seriesOrder와 함께 실린다", () => {
    const withSeries = { ...valid, series: "rag-pipeline", seriesOrder: 2 };
    const result = validateFrontmatter(withSeries, "a.md");
    expect(result.series).toBe("rag-pipeline");
    expect(result.seriesOrder).toBe(2);
  });

  it("스키마에 없는 키가 있으면 던진다", () => {
    expect(() => validateFrontmatter({ ...valid, source: "원본 문서명" }, "a.md")).toThrow(
      /스키마에 없는 키/,
    );
  });

  it("스키마 외 키 오류에 위반한 키 이름이 전부 들어간다", () => {
    expect(() => validateFrontmatter({ ...valid, source: "x", legacy: 1 }, "a.md")).toThrow(
      /source, legacy/,
    );
  });

  it("선택 필드는 스키마 외 키로 잡지 않는다", () => {
    const withOptional = { ...valid, updated: "2026-08-18", series: "s", seriesOrder: 1 };
    expect(validateFrontmatter(withOptional, "a.md")).toMatchObject({ series: "s", seriesOrder: 1 });
  });
});
