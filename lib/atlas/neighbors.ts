import type { AtlasEdgeType, AtlasGraph, AtlasNode, AtlasNodeType } from "@/lib/atlas/types";

/**
 * 노드 하나의 이웃을 「표시용」으로 뽑는다. 설계서 §7 · 계획서 T11.
 *
 * **왜 컴포넌트가 아니라 여기인가.** 이웃을 쓰는 자리가 둘이다 —
 * `/atlas` 목록(브라우저에서 선택이 바뀔 때마다 계산)과 `/atlas/<id>` 상세(빌드 시점에 한 번).
 * 같은 화면 문구가 두 경로에서 다르게 나오면 안 되므로 규칙을 한 곳에 둔다.
 * jsdom 이 없어 `.tsx` 안의 로직에는 게이트를 못 거는 이 리포에서는, 순수 함수로 빼는 것이
 * **테스트를 걸 수 있는 유일한 방법**이기도 하다(`tests/atlas/neighbors.test.ts`).
 *
 * ⚠️ `@/lib/atlas/types` 에서 **값**을 가져오지 마라 — `zod` 가 브라우저 번들에 실린다.
 *    `import type` 이라야 트랜스파일러가 지운다(`isolatedModules: true`).
 *
 * ⚠️ 이름이 같은 `neighborsOf` 가 `@/lib/atlas/layout` 에도 있다. 그쪽은 **강조용**이라
 *    `Set<string>` 을 내고 엣지 타입을 버린다. 이쪽은 **표시용**이라 타입별로 나눠 남긴다.
 *    한쪽으로 합치면 렌더러가 필요 없는 문자열을 지고, 패널이 필요한 타입을 잃는다.
 */

/**
 * 화면에 그릴 이웃 1건. **네 필드뿐이다.**
 *
 * 이웃에 `AtlasNode` 를 통째로 담지 않는 이유는 페이로드다. Next 는 `getStaticProps` 의
 * props 를 `__NEXT_DATA__` 인라인과 `_next/data/*.json` 에 **두 번** 쓴다 —
 * 계획서 초안대로 그래프 전체(226,605B)를 심으면 163 페이지 × 2 로 +70MB 다.
 * `tests/atlas/neighbors.test.ts` 의 예산 테스트가 그 차이를 차등 대조로 붙들고 있다.
 */
export type AtlasNeighbor = {
  /** 엣지 타입. 같은 이웃이라도 타입이 다르면 별건이다. */
  type: AtlasEdgeType;
  /** 이웃 노드의 id(=URL 조각). */
  id: string;
  title: string;
  /** 이웃 노드의 종류. 「토픽/글」 표기를 패널이 이걸로 고른다. */
  nodeType: AtlasNodeType;
};

/** `/atlas/<id>` 가 받는 props. **`graph` 는 없다** — 위 주석의 페이로드 이유. */
export type AtlasNodeDetail = {
  node: AtlasNode;
  neighbors: AtlasNeighbor[];
};

/**
 * 코드포인트 비교. `localeCompare` 가 **아니다.**
 *
 * `localeCompare` 는 ICU 로케일에 따라 결과가 달라져 빌드 머신마다 산출물 해시가 흔들린다
 * (`check-baseline` 이 영원히 빨개진다). `lib/atlas/build.ts` 의 `edges.sort` 도 같은 이유로
 * 코드포인트 비교를 쓴다 — 두 곳이 어긋나면 그래프와 패널의 순서가 서로 다르게 나온다.
 */
function byCodePoint(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * `nodeId` 에 이어진 이웃들. 방향은 보지 않는다.
 *
 * 규칙 (전부 `tests/atlas/neighbors.test.ts` 가 못박는다):
 *
 * | # | 규칙 | 왜 |
 * | --- | --- | --- |
 * | ① | `from`·`to` 어느 쪽이든 이웃으로 잡는다 | 「이어짐」은 방향이 없는 표시다 |
 * | ② | 같은 `(type, {a,b} 무순서)` 는 1건 | 실측 양방향 `extends` 쌍 **179개**. 안 지우면 같은 글이 두 번 뜨고, key 가 달라 React 경고도 안 난다 |
 * | ③ | 타입이 다르면 남긴다 | `extends` 와 `sequence` 는 다른 관계다 |
 * | ④ | 그래프에 없는 id 는 버린다 | 제목도 링크도 만들 수 없다 |
 * | ⑤ | 없는 `nodeId` 는 `[]` | 호출부가 분기 하나로 끝나게 |
 * | ⑥ | 정렬은 type → id 코드포인트 | 빌드마다 같은 바이트가 나와야 한다 |
 * | ⑦ | self-loop 제외 | 자기 자신은 이웃이 아니다 |
 *
 * ②가 이 함수의 존재 이유다 — 나머지는 그것을 안전하게 만드는 부속이다.
 */
export function neighborsOf(graph: AtlasGraph, nodeId: string): AtlasNeighbor[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  // ⑤ 없는 노드. 엣지가 dangling 인 그래프에서 「존재하지 않는 노드의 이웃」을 만들지 않는다.
  if (!byId.has(nodeId)) return [];

  const seen = new Set<string>();
  const out: AtlasNeighbor[] = [];

  for (const edge of graph.edges) {
    // ① 방향 무관.
    if (edge.from !== nodeId && edge.to !== nodeId) continue;
    const otherId = edge.from === nodeId ? edge.to : edge.from;

    // ⑦ self-loop. `from === to === nodeId` 면 otherId 가 자기 자신이 된다.
    if (otherId === nodeId) continue;

    // ④ dangling.
    const other = byId.get(otherId);
    if (!other) continue;

    // ② 무방향 dedupe. 쌍을 정렬해 키를 만들면 A→B 와 B→A 가 같은 키가 된다.
    const pair = nodeId < otherId ? `${nodeId}~${otherId}` : `${otherId}~${nodeId}`;
    const key = `${edge.type}|${pair}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // ③ 타입을 키에 넣었으므로 타입이 다르면 별건으로 남는다.
    out.push({ type: edge.type, id: other.id, title: other.title, nodeType: other.type });
  }

  // ⑥ type 먼저, 같으면 이웃 id 로. 위 dedupe 가 (type, id) 를 유일하게 만들어 두므로
  //    이 비교로 순서가 완전히 결정된다 — 정렬 안정성에 기대지 않는다.
  out.sort((a, b) => byCodePoint(a.type, b.type) || byCodePoint(a.id, b.id));
  return out;
}

/**
 * `/atlas/<id>` 의 `getStaticProps` 가 그대로 돌려줄 props.
 *
 * ⚠️ **`graph` 를 넣지 마라.** 넣으면 산출물이 +70MB 다(위 `AtlasNeighbor` 주석).
 *    `tests/atlas/neighbors.test.ts` 가 `not.toHaveProperty("graph")` 로 직접 잡는다.
 */
export function nodeDetailProps(graph: AtlasGraph, nodeId: string): AtlasNodeDetail | null {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  return { node, neighbors: neighborsOf(graph, nodeId) };
}
