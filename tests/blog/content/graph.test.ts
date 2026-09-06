import { describe, expect, it } from "vitest";
import { getCategoryGraph, getPublishedCategories, readPosts } from "@/lib/blog/loader";
import {
  GRAPH_NEIGHBOR_LIMIT,
  buildLinkIndex,
  buildLocalGraph,
  pickCategoryHubId,
  postId,
} from "@/lib/blog/graph";
import { layout } from "@/lib/blog/graph-layout";

/**
 * 발행본 전량에 대한 그래프 불변식.
 *
 * 위젯이 화면에서 비어 보이는 원인은 대개 오류가 아니라 조용한 값이다 —
 * 이웃이 0개이거나 좌표가 NaN 이면 SVG 는 아무 말 없이 아무것도 그리지 않는다.
 */
const posts = readPosts();
const links = buildLinkIndex(posts);

/**
 * 카테고리마다 허브를 뽑아 그래프를 조립한다.
 *
 * ⚠️ `getCategoryGraph` 를 카테고리마다 부르면 링크 지형을 여덟 번 다시 만든다 —
 * 개발·테스트 환경에서는 캐시가 꺼져 있어 184편을 그때마다 다시 파싱한다.
 * 지형은 위에서 한 번 만든 것을 나눠 쓰고, 배선 자체는 아래에서 한 번만 확인한다.
 */
const categories = getPublishedCategories();
const hubs = categories.map((c) => {
  const hubId = pickCategoryHubId(posts, links, c.slug);
  return { slug: c.slug, hubId, graph: hubId ? buildLocalGraph(posts, links, hubId) : null };
});

/**
 * 🔴 **`getCategoryGraph` 호출은 `it` 안에 두지 않는다.**
 *
 * 이 함수는 자기 링크 지형을 다시 만드는데(개발·테스트에서는 캐시가 꺼져 있다) 184편을
 * 파싱하는 데 실측 1.4초가 든다. 케이스 안에서 부르면 기본 타임아웃 5,000 ms 를 넘나들며,
 * 실제로 **같은 코드가 한 번은 12/12 로 통과하고 다음 실행에서 2건이 타임아웃으로 떨어졌다.**
 * 준비를 모듈 평가로 옮기면 케이스는 값만 본다. 타임아웃을 늘려 덮지 않는다.
 */
const firstSlug = categories[0].slug;
const wiredGraph = getCategoryGraph(firstSlug);
const missingGraph = getCategoryGraph("있을-리-없는-카테고리");

describe("발행본 그래프", () => {
  it("발행본을 읽었다", () => {
    // 0편이면 아래 검사가 전부 공허참이 된다.
    expect(posts.length).toBeGreaterThan(0);
  });

  it("모든 편에 이웃이 하나 이상 있다", () => {
    const empty: string[] = [];
    for (const post of posts) {
      const graph = buildLocalGraph(posts, links, postId(post));
      if (graph.neighbors.length === 0) empty.push(postId(post));
    }
    expect(empty, `이웃 없는 편 ${empty.length}편`).toEqual([]);
  });

  it("🔴 모든 편에서 좌표가 유한하다", () => {
    const broken: string[] = [];
    for (const post of posts) {
      const graph = buildLocalGraph(posts, links, postId(post));
      const nodeIds = [graph.center.id].concat(graph.neighbors.map((n) => n.id));
      for (const point of layout({ centerId: graph.center.id, nodeIds, edges: graph.edges })) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) broken.push(`${postId(post)} -> ${point.id}`);
      }
    }
    expect(broken, `좌표가 유한하지 않은 자리 ${broken.length}곳`).toEqual([]);
  });

  it("연결선의 양 끝이 전부 그려지는 노드다", () => {
    const dangling: string[] = [];
    for (const post of posts) {
      const graph = buildLocalGraph(posts, links, postId(post));
      const shown = new Set([graph.center.id].concat(graph.neighbors.map((n) => n.id)));
      for (const edge of graph.edges) {
        if (!shown.has(edge.from) || !shown.has(edge.to)) dangling.push(`${postId(post)}: ${edge.from} -> ${edge.to}`);
      }
    }
    expect(dangling, `허공을 가리키는 연결선 ${dangling.length}개`).toEqual([]);
  });

  it("이웃 수가 상한을 넘지 않는다", () => {
    const over = posts
      .map((p) => buildLocalGraph(posts, links, postId(p)))
      .filter((g) => g.neighbors.length > 12)
      .length;
    expect(over).toBe(0);
  });
});

/**
 * 카테고리 목록 페이지의 그래프.
 *
 * 본문 그래프와 달리 중심을 코드가 고르므로, **고르지 못하는 카테고리가 하나라도 있으면**
 * 그 페이지만 위젯 없이 배포된다. 화면에서는 「원래 그런 것」과 구분되지 않는다.
 */
describe("카테고리 그래프", () => {
  it("발행된 카테고리를 읽었다", () => {
    // 0개면 아래 검사가 전부 공허참이 된다.
    expect(categories.length).toBeGreaterThan(0);
  });

  it("모든 카테고리에서 허브가 뽑힌다", () => {
    const missing = hubs.filter((h) => h.hubId === null).map((h) => h.slug);
    expect(missing, `허브를 고르지 못한 카테고리 ${missing.length}개`).toEqual([]);
  });

  it("🔴 허브는 그 카테고리에 속한 편이다", () => {
    const stray = hubs
      .filter((h) => h.hubId !== null && h.hubId.split("/")[0] !== h.slug)
      .map((h) => `${h.slug} -> ${h.hubId}`);
    expect(stray, `남의 카테고리 편을 허브로 고른 자리 ${stray.length}곳`).toEqual([]);
  });

  it("모든 카테고리 그래프에 이웃이 하나 이상 있다", () => {
    const empty = hubs.filter((h) => (h.graph?.neighbors.length ?? 0) === 0).map((h) => h.slug);
    expect(empty, `이웃 없는 카테고리 ${empty.length}개`).toEqual([]);
  });

  it("카테고리 그래프의 이웃 수도 상한을 넘지 않는다", () => {
    const over = hubs
      .filter((h) => (h.graph?.neighbors.length ?? 0) > GRAPH_NEIGHBOR_LIMIT)
      .map((h) => h.slug);
    expect(over, `상한 ${GRAPH_NEIGHBOR_LIMIT} 을 넘은 카테고리 ${over.length}개`).toEqual([]);
  });

  it("🔴 loader 의 배선이 이어져 있다 — 페이지가 실제로 부르는 함수다", () => {
    // 위 조립은 부품을 직접 이어 붙인 것이라, 페이지가 부르는 경로가 끊겨도 통과한다.
    expect(wiredGraph, `${firstSlug} 의 그래프`).not.toBeNull();
    expect(wiredGraph!.center.categorySlug).toBe(firstSlug);
  });

  it("편이 없는 카테고리는 null 이다", () => {
    expect(missingGraph).toBeNull();
  });
});
