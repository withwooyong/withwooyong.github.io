import { describe, expect, it } from "vitest";
import {
  GRAPH_NEIGHBOR_LIMIT,
  buildLinkIndex,
  buildLocalGraph,
  extractOutboundIds,
  pickCategoryHubId,
  postId,
} from "@/lib/blog/graph";
import type { GraphSource } from "@/lib/blog/graph";

/** 테스트용 발행본을 만든다. 실제 Post 중 그래프가 쓰는 네 필드만 필요하다 */
function post(categorySlug: string, slug: string, title: string, body = ""): GraphSource {
  return { categorySlug, slug, title, body };
}

describe("링크 추출", () => {
  it("본문의 편 링크를 뽑는다", () => {
    expect(extractOutboundIds("[가](/blog/rag/a/) 를 본다")).toEqual(["rag/a"]);
  });

  it("앵커와 질의를 떼어 낸다", () => {
    expect(extractOutboundIds("[가](/blog/rag/a/#어떤-제목)")).toEqual(["rag/a"]);
    expect(extractOutboundIds("[가](/blog/rag/a/?x=1)")).toEqual(["rag/a"]);
  });

  it("슬래시가 없어도 같은 id 를 낸다", () => {
    expect(extractOutboundIds("[가](/blog/rag/a)")).toEqual(["rag/a"]);
  });

  it("카테고리 인덱스 링크는 편이 아니다", () => {
    expect(extractOutboundIds("[가](/blog/rag/)")).toEqual([]);
  });

  it("블로그 밖의 링크는 뽑지 않는다", () => {
    expect(extractOutboundIds("[가](https://example.com/blog/rag/a/)")).toEqual([]);
    expect(extractOutboundIds("[가](/about/)")).toEqual([]);
  });

  it("표 안의 링크도 뽑는다 — GFM 확장이 켜져 있어야 한다", () => {
    const md = "| 무엇 | 어디 |\n| --- | --- |\n| 가 | [나](/blog/rag/a/) |\n";
    expect(extractOutboundIds(md)).toEqual(["rag/a"]);
  });

  it("참조식 링크도 뽑는다", () => {
    expect(extractOutboundIds("[가][ref] 를 본다\n\n[ref]: /blog/rag/a/\n")).toEqual(["rag/a"]);
  });

  it("🔴 코드 블록 안의 링크는 뽑지 않는다 — 예시는 약속이 아니다", () => {
    const md = "```md\n[가](/blog/rag/a/)\n```\n";
    expect(extractOutboundIds(md)).toEqual([]);
  });

  it("🔴 인라인 코드 안의 링크도 뽑지 않는다", () => {
    expect(extractOutboundIds("`[가](/blog/rag/a/)` 라고 쓴다")).toEqual([]);
  });
});

describe("링크 지형", () => {
  it("실재하지 않는 대상은 지형에 넣지 않는다", () => {
    const posts = [post("rag", "a", "가", "[없다](/blog/rag/zzz/)")];
    const links = buildLinkIndex(posts);
    expect(Array.from(links.get("rag/a")!)).toEqual([]);
  });

  it("자기 자신을 가리키는 링크는 넣지 않는다", () => {
    const posts = [post("rag", "a", "가", "[자기](/blog/rag/a/)")];
    expect(Array.from(buildLinkIndex(posts).get("rag/a")!)).toEqual([]);
  });

  it("같은 편을 여러 번 가리켜도 한 번만 센다", () => {
    const posts = [post("rag", "a", "가", "[나](/blog/rag/b/) [나](/blog/rag/b/)"), post("rag", "b", "나")];
    expect(Array.from(buildLinkIndex(posts).get("rag/a")!)).toEqual(["rag/b"]);
  });
});

describe("지역 그래프 조립", () => {
  it("나가는 링크와 들어오는 링크를 모두 이웃으로 삼는다", () => {
    const posts = [
      post("rag", "c", "다", "[가](/blog/rag/a/)"),
      post("rag", "a", "가", "[나](/blog/rag/b/)"),
      post("rag", "b", "나"),
    ];
    const g = buildLocalGraph(posts, buildLinkIndex(posts), "rag/a");
    expect(g.neighbors.map((n) => n.id).sort()).toEqual(["rag/b", "rag/c"]);
    expect(g.hiddenCount).toBe(0);
  });

  it("🔴 이웃끼리의 연결선도 담는다", () => {
    const posts = [
      post("rag", "a", "가", "[나](/blog/rag/b/) [다](/blog/rag/c/)"),
      post("rag", "b", "나", "[다](/blog/rag/c/)"),
      post("rag", "c", "다"),
    ];
    const g = buildLocalGraph(posts, buildLinkIndex(posts), "rag/a");
    expect(g.edges).toContainEqual({ from: "rag/b", to: "rag/c" });
  });

  it("그려지지 않는 편으로 나가는 연결선은 담지 않는다", () => {
    const posts = [
      post("rag", "a", "가", "[나](/blog/rag/b/)"),
      post("rag", "b", "나", "[먼곳](/blog/rag/z/)"),
      post("rag", "z", "먼곳"),
    ];
    const g = buildLocalGraph(posts, buildLinkIndex(posts), "rag/a", 1);
    expect(g.neighbors.map((n) => n.id)).toEqual(["rag/b"]);
    expect(g.edges.some((e) => e.to === "rag/z")).toBe(false);
  });

  it("상한을 넘으면 자르고 잘린 수를 남긴다", () => {
    const links = ["b", "c", "d"].map((s) => `[${s}](/blog/rag/${s}/)`).join(" ");
    const posts = [
      post("rag", "a", "가", links),
      post("rag", "b", "나"),
      post("rag", "c", "다"),
      post("rag", "d", "라"),
    ];
    const g = buildLocalGraph(posts, buildLinkIndex(posts), "rag/a", 2);
    expect(g.neighbors).toHaveLength(2);
    expect(g.hiddenCount).toBe(1);
  });

  it("🔴 자를 때 양방향 이웃을 먼저 남긴다", () => {
    const posts = [
      post("rag", "a", "가", "[나](/blog/rag/b/) [다](/blog/rag/c/)"),
      post("rag", "b", "나"),
      post("rag", "c", "다", "[가](/blog/rag/a/)"),
    ];
    // rag/c 는 양방향(a 가 가리키고 c 도 a 를 가리킨다), rag/b 는 나가는 방향뿐이다.
    const g = buildLocalGraph(posts, buildLinkIndex(posts), "rag/a", 1);
    expect(g.neighbors.map((n) => n.id)).toEqual(["rag/c"]);
  });

  it("같은 순위끼리는 제목순으로 안정 정렬한다", () => {
    const posts = [
      post("rag", "a", "가", "[하](/blog/rag/x/) [나](/blog/rag/y/)"),
      post("rag", "x", "하"),
      post("rag", "y", "나"),
    ];
    const g = buildLocalGraph(posts, buildLinkIndex(posts), "rag/a", 1);
    expect(g.neighbors.map((n) => n.id)).toEqual(["rag/y"]);
  });

  it("중심 편이 없으면 던진다 — 조용히 빈 그래프를 내지 않는다", () => {
    expect(() => buildLocalGraph([], new Map(), "rag/없음")).toThrow();
  });

  it("상한 기본값이 12 다", () => {
    expect(GRAPH_NEIGHBOR_LIMIT).toBe(12);
  });

  it("postId 는 카테고리와 슬러그를 슬래시로 잇는다", () => {
    expect(postId({ categorySlug: "rag", slug: "a" })).toBe("rag/a");
  });
});

/**
 * 카테고리의 허브 편 선정.
 *
 * 카테고리 목록 페이지에는 「지금 보고 있는 편」이 없으므로 중심을 골라야 한다.
 * 🔴 판정이 결정론적이어야 한다 — 빌드마다 중심이 바뀌면 같은 커밋에서 다른 화면이 나온다.
 */
describe("카테고리 허브", () => {
  it("피인용이 가장 많은 편을 고른다", () => {
    const posts = [
      post("rag", "a", "가", "[다](/blog/rag/c/)"),
      post("rag", "b", "나", "[다](/blog/rag/c/)"),
      post("rag", "c", "다"),
    ];
    expect(pickCategoryHubId(posts, buildLinkIndex(posts), "rag")).toBe("rag/c");
  });

  it("피인용은 카테고리 밖에서 온 것도 센다", () => {
    const posts = [
      post("ai-agent", "z", "저", "[다](/blog/rag/c/)"),
      post("rag", "a", "가"),
      post("rag", "c", "다"),
    ];
    // rag/c 는 rag 안에서는 아무도 가리키지 않지만 밖에서 한 번 인용된다.
    expect(pickCategoryHubId(posts, buildLinkIndex(posts), "rag")).toBe("rag/c");
  });

  it("🔴 그 카테고리의 편만 후보다", () => {
    const posts = [
      post("ai-agent", "z", "저"),
      post("rag", "a", "가", "[저](/blog/ai-agent/z/)"),
      post("rag", "b", "나", "[저](/blog/ai-agent/z/)"),
      post("rag", "c", "다", "[가](/blog/rag/a/)"),
    ];
    // 피인용 최다는 ai-agent/z(2회)지만 rag 의 허브는 rag/a(1회)여야 한다.
    expect(pickCategoryHubId(posts, buildLinkIndex(posts), "rag")).toBe("rag/a");
  });

  it("🔴 피인용이 같으면 나가는 링크가 많은 편을 고른다", () => {
    const posts = [
      post("rag", "a", "가", "[나](/blog/rag/b/)"),
      post("rag", "b", "나", "[다](/blog/rag/c/) [저](/blog/ai-agent/z/)"),
      post("rag", "c", "다", "[라](/blog/rag/d/)"),
      post("rag", "d", "라", "[가](/blog/rag/a/)"),
      post("ai-agent", "z", "저"),
    ];
    // 순환으로 네 편의 피인용이 1회씩 같고, 나가는 링크만 rag/b 가 2개로 많다.
    // 사전순 1등은 rag/a 이므로, 2차 기준이 실제로 작동해야만 rag/b 가 나온다.
    expect(pickCategoryHubId(posts, buildLinkIndex(posts), "rag")).toBe("rag/b");
  });

  it("🔴 둘 다 같으면 id 사전순으로 고른다 — 순서가 흔들리면 안 된다", () => {
    const posts = [
      post("rag", "b", "나"),
      post("rag", "a", "가"),
      post("rag", "c", "다"),
    ];
    // 셋 다 피인용 0회·나가는 링크 0개다. 입력 순서와 무관하게 같은 답이 나와야 한다.
    expect(pickCategoryHubId(posts, buildLinkIndex(posts), "rag")).toBe("rag/a");
    const reversed = posts.slice().reverse();
    expect(pickCategoryHubId(reversed, buildLinkIndex(reversed), "rag")).toBe("rag/a");
  });

  it("편이 없는 카테고리는 null 이다 — 던지지 않는다", () => {
    const posts = [post("rag", "a", "가")];
    expect(pickCategoryHubId(posts, buildLinkIndex(posts), "search-engineering")).toBeNull();
  });

  it("자기 자신을 가리키는 링크는 피인용으로 세지 않는다", () => {
    const posts = [
      post("rag", "a", "가", "[가](/blog/rag/a/)"),
      post("rag", "b", "나", "[가](/blog/rag/a/)"),
      post("rag", "c", "다"),
    ];
    // buildLinkIndex 가 이미 자기 링크를 버리므로 rag/a 의 피인용은 1회다.
    const links = buildLinkIndex(posts);
    expect(links.get("rag/a")?.has("rag/a")).toBe(false);
    expect(pickCategoryHubId(posts, links, "rag")).toBe("rag/a");
  });
});
