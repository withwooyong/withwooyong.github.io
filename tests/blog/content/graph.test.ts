import { describe, expect, it } from "vitest";
import { readPosts } from "@/lib/blog/loader";
import { buildLinkIndex, buildLocalGraph, postId } from "@/lib/blog/graph";
import { layout } from "@/lib/blog/graph-layout";

/**
 * 발행본 전량에 대한 그래프 불변식.
 *
 * 위젯이 화면에서 비어 보이는 원인은 대개 오류가 아니라 조용한 값이다 —
 * 이웃이 0개이거나 좌표가 NaN 이면 SVG 는 아무 말 없이 아무것도 그리지 않는다.
 */
const posts = readPosts();
const links = buildLinkIndex(posts);

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
