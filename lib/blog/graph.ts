import type { Root, RootContent } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import type { GraphEdge, GraphNode, LocalGraph } from "@/lib/blog/types";

/**
 * 편과 편을 잇는 링크의 정본.
 *
 * 🔴 이 모듈이 판정의 유일한 자리다. `tests/blog/content/links.test.ts` 도 자기 정규식을
 * 두지 않고 여기를 쓴다. 같은 질문에 답하는 코드가 갈라지면 한쪽만 고쳐지고 나머지가
 * 낡는다 — 금칙어 목록이 코드와 문서로 갈라져 거짓 0 이 사실로 기록된 적이 있다.
 *
 * 🔴 판정을 정규식으로 근사하지 않는다. `mdast` 를 쓰는 이유는 **코드 블록과 인라인
 * 코드가 저절로 빠지기 때문**이다. 정규식으로 세면 본문에 인쇄된 예시 링크가 연결선이 된다.
 *
 * ⚠️ 이 파일은 빌드 시점에만 돈다. 컴포넌트가 import 하면 파서가 클라이언트 번들에 들어간다.
 */

/**
 * 사이드바 폭 224픽셀에 담기는 이웃의 수.
 *
 * 실측 분포가 중앙값 6 · 상위 10% 12 · 최대 30 이므로, 12에서 끊으면 약 90% 의 편이
 * 이웃을 전부 보게 된다. 이 상수를 바꾸면 페이지 용량과 화면 밀도가 함께 움직인다.
 */
export const GRAPH_NEIGHBOR_LIMIT = 12;

/** 그래프가 쓰는 발행본의 부분집합. `Post` 전체를 요구하지 않아 테스트가 가벼워진다 */
export type GraphSource = { categorySlug: string; slug: string; title: string; body: string };

/** 편 id 에서 그 편이 가리키는 편 id 들로 가는 인접 목록. 방향을 보존한다 */
export type LinkIndex = Map<string, Set<string>>;

/** `<categorySlug>/<slug>` */
export function postId(post: { categorySlug: string; slug: string }): string {
  return `${post.categorySlug}/${post.slug}`;
}

/**
 * `/blog/<category>/<slug>/#앵커` 에서 `<category>/<slug>` 를 뽑는다.
 *
 * 조각이 둘이 아니면 null 이다 — `/blog/rag/` 는 카테고리 인덱스이지 편이 아니므로
 * 편 대 편 관계를 만들지 않는다.
 */
function toPostId(url: string): string | null {
  if (!url.startsWith("/blog/")) return null;
  const path = url.split(/[#?]/)[0].replace(/\/$/, "");
  const parts = path.slice("/blog/".length).split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return `${parts[0]}/${parts[1]}`;
}

/** 본문에서 편을 가리키는 링크의 id 를 등장 순서대로 뽑는다. 중복을 제거하지 않는다 */
export function extractOutboundIds(body: string): string[] {
  const ids: string[] = [];
  const tree: Root = fromMarkdown(body, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });

  const walk = (node: Root | RootContent): void => {
    // `definition` 은 참조식 링크(`[가][ref]` 와 `[ref]: /경로`)의 URL 을 담은 노드다.
    // `link` 만 보면 그 형식이 통째로 빠진다.
    if ((node.type === "link" || node.type === "definition") && node.url) {
      const id = toPostId(node.url);
      if (id) ids.push(id);
    }
    const children = "children" in node ? (node.children as RootContent[]) : [];
    for (const child of children) walk(child);
  };
  walk(tree);
  return ids;
}

/**
 * 발행본 전량의 링크 지형을 만든다.
 *
 * 🔴 **빌드당 한 번만 부른다.** 184편의 본문을 파싱하는 데 실측 1,426 ms 가 들며,
 * 페이지마다 다시 만들면 빌드가 약 262초 늘어난다. 메모이제이션은 `loader.ts` 가 맡는다.
 */
export function buildLinkIndex(posts: GraphSource[]): LinkIndex {
  const known = new Set(posts.map(postId));
  const index: LinkIndex = new Map();

  for (const post of posts) {
    const from = postId(post);
    const targets = new Set<string>();
    for (const to of extractOutboundIds(post.body)) {
      // 실재하지 않는 대상은 죽은 링크다. 링크 검사가 따로 잡으므로 여기서는 버린다.
      if (to !== from && known.has(to)) targets.add(to);
    }
    index.set(from, targets);
  }
  return index;
}

/** 중심 기준의 관계 순위. 낮을수록 먼저 남는다 */
function neighborRank(id: string, outgoing: Set<string>, incoming: Set<string>): number {
  if (outgoing.has(id) && incoming.has(id)) return 0;
  if (outgoing.has(id)) return 1;
  return 2;
}

/**
 * 한 편을 중심으로 한 지역 그래프를 만든다.
 *
 * 이웃이 상한을 넘으면 자르되 **무엇이 남는지가 결정론적**이어야 한다.
 * 양방향으로 이어진 편을 먼저 남기고, 같은 순위끼리는 제목순으로 정렬한다.
 */
export function buildLocalGraph(
  posts: GraphSource[],
  links: LinkIndex,
  centerId: string,
  limit: number = GRAPH_NEIGHBOR_LIMIT
): LocalGraph {
  const byId = new Map<string, GraphSource>(posts.map((p) => [postId(p), p]));
  const center = byId.get(centerId);
  // 조용히 빈 그래프를 내면 화면이 비어 있는 이유를 찾을 수 없다.
  if (!center) throw new Error(`[blog] 그래프의 중심 편을 찾지 못했습니다: ${centerId}`);

  const outgoing = links.get(centerId) ?? new Set<string>();
  const incoming = new Set<string>();
  for (const entry of Array.from(links)) {
    const [from, targets] = entry;
    if (from !== centerId && targets.has(centerId)) incoming.add(from);
  }

  const candidates = Array.from(new Set(Array.from(outgoing).concat(Array.from(incoming))))
    .filter((id) => byId.has(id))
    .sort((a, b) => {
      const gap = neighborRank(a, outgoing, incoming) - neighborRank(b, outgoing, incoming);
      if (gap !== 0) return gap;
      return byId.get(a)!.title.localeCompare(byId.get(b)!.title, "ko");
    });

  const kept = candidates.slice(0, limit);
  const shown = new Set<string>(kept);
  shown.add(centerId);

  const edges: GraphEdge[] = [];
  for (const from of Array.from(shown)) {
    for (const to of Array.from(links.get(from) ?? new Set<string>())) {
      // 그려지지 않는 노드로 나가는 선은 허공을 가리킨다.
      if (shown.has(to)) edges.push({ from, to });
    }
  }
  edges.sort((a, b) => (a.from === b.from ? a.to.localeCompare(b.to) : a.from.localeCompare(b.from)));

  return {
    center: toNode(center),
    neighbors: kept.map((id) => toNode(byId.get(id)!)),
    edges,
    hiddenCount: candidates.length - kept.length,
  };
}

function toNode(post: GraphSource): GraphNode {
  return { id: postId(post), categorySlug: post.categorySlug, slug: post.slug, title: post.title };
}
