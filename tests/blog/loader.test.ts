import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAdjacentPosts,
  getPublishedCategories,
  readPosts,
  shouldCachePosts,
} from "@/lib/blog/loader";

const FIXTURES = path.join(__dirname, "fixtures");

// 시리즈 픽스처는 별도 루트에 둔다. FIXTURES에 넣으면 "date 내림차순으로 정렬한다"가
// 목록 전체를 ["ok", "older"]로 단정하고 있어 깨진다.
const FIXTURES_SERIES = path.join(__dirname, "fixtures-series");

// 정렬 픽스처도 별도 루트다. 디렉터리 알파벳순과 category order가 어긋나는
// 두 카테고리를 담는다 — FIXTURES는 카테고리가 하나뿐이라 정렬을 검증할 수 없다.
const FIXTURES_ORDER = path.join(__dirname, "fixtures-order");

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

describe("getPublishedCategories", () => {
  it("글이 있는 카테고리만 반환한다", () => {
    const cats = getPublishedCategories(FIXTURES);
    expect(cats.map((c) => c.slug)).toEqual(["search-engineering"]);
  });

  it("order 순서를 유지한다", () => {
    const cats = getPublishedCategories(FIXTURES);
    const orders = cats.map((c) => c.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it("디렉터리 알파벳순이 아니라 order 순으로 정렬한다", () => {
    // FIXTURES는 카테고리가 하나뿐이라 위 단언이 어떤 구현으로도 통과한다.
    // 이 픽스처는 두 순서가 어긋나도록 골랐다 —
    // 디렉터리 알파벳순은 agentic-coding < ai-transformation이지만
    // order는 ai-transformation(10) < agentic-coding(20)이다.
    // readdirSync 순서를 그대로 흘려보내는 구현은 여기서 걸린다.
    const cats = getPublishedCategories(FIXTURES_ORDER);
    expect(cats.map((c) => c.slug)).toEqual(["ai-transformation", "agentic-coding"]);
  });

  it("draft만 있는 카테고리는 제외한다", () => {
    // 픽스처의 rag/draft-only.md는 draft:true라 발행되지 않는다.
    // 디렉터리는 존재하므로, 제외의 근거가 "디렉터리 없음"이 아니라
    // "발행 글 0편"임을 이 단언이 실제로 검증한다.
    const cats = getPublishedCategories(FIXTURES);
    expect(cats.every((c) => c.slug !== "rag")).toBe(true);
  });
});

describe("getAdjacentPosts", () => {
  it("시리즈 글의 이전/다음은 같은 시리즈 안에서 seriesOrder 순이다", () => {
    // 실제 문제: 원본 날짜가 전부 같아 제목 가나다순으로 정렬되면서 시리즈가 흩어졌다.
    // 픽스처도 같은 조건을 만든다 — 3편의 date가 전부 2026-07-26이고
    // 제목 가나다순("가나" < "나다" < "하나")은 seriesOrder와 2→3→1로 어긋난다.
    const first = getAdjacentPosts("search-engineering", "series-1", FIXTURES_SERIES);
    expect(first.prev).toBeNull();
    expect(first.next?.slug).toBe("series-2");

    const middle = getAdjacentPosts("search-engineering", "series-2", FIXTURES_SERIES);
    expect(middle.prev?.slug).toBe("series-1");
    expect(middle.next?.slug).toBe("series-3");

    const last = getAdjacentPosts("search-engineering", "series-3", FIXTURES_SERIES);
    expect(last.prev?.slug).toBe("series-2");
    expect(last.next).toBeNull();
  });

  it("시리즈 글의 이웃은 시리즈 밖으로 나가지 않는다", () => {
    const first = getAdjacentPosts("search-engineering", "series-1", FIXTURES_SERIES);
    const last = getAdjacentPosts("search-engineering", "series-3", FIXTURES_SERIES);
    // 같은 카테고리에 ok.md·older.md가 있지만 시리즈 경계를 넘지 않는다
    expect(first.prev).toBeNull();
    expect(last.next).toBeNull();
  });

  it("series가 없는 글은 카테고리 내 날짜순 이웃을 유지한다", () => {
    // 기존 동작 회귀 방지. ok(2026-07-25)의 이웃은 카테고리 목록 순서 그대로다 —
    // 앞은 같은 카테고리에서 가장 늦은 series-1(2026-07-26, 제목 "하나"),
    // 뒤는 older(2026-06-01). 시리즈 글이 이웃으로 나오는 것은 의도된 동작이다.
    const ok = getAdjacentPosts("search-engineering", "ok", FIXTURES_SERIES);
    expect(ok.prev?.slug).toBe("series-1");
    expect(ok.next?.slug).toBe("older");
  });
});

describe("편 목록 캐시", () => {
  it("프로덕션 빌드에서만 캐시한다", () => {
    expect(shouldCachePosts("production")).toBe(true);
  });

  it("개발 서버에서는 캐시하지 않는다 — 편을 고치면 새로고침만으로 반영되어야 한다", () => {
    expect(shouldCachePosts("development")).toBe(false);
  });

  it("테스트에서는 캐시하지 않는다 — 케이스끼리 결과를 물려받으면 안 된다", () => {
    expect(shouldCachePosts("test")).toBe(false);
  });

  it("환경 변수가 비어 있으면 캐시하지 않는다 — 모르면 안전한 쪽으로 간다", () => {
    expect(shouldCachePosts(undefined)).toBe(false);
  });

  it("🔴 픽스처 루트를 넘기면 다른 픽스처의 결과가 섞이지 않는다", () => {
    const fixtures = readPosts(FIXTURES).map((p) => p.slug).sort();
    const order = readPosts(FIXTURES_ORDER).map((p) => p.slug).sort();
    const again = readPosts(FIXTURES).map((p) => p.slug).sort();

    expect(again).toEqual(fixtures);
    expect(again).not.toEqual(order);
  });

  it("🔴 픽스처 루트는 부를 때마다 다시 읽는다 — 캐시를 나눠 쓰면 픽스처가 서로를 덮는다", () => {
    expect(readPosts(FIXTURES)).not.toBe(readPosts(FIXTURES));
  });
});
