import type { FlowEdge, FlowLane, FlowNode, FlowSpec, Point } from "./types";

/** 좌우 여백 */
const MARGIN_X = 16;
/** 첫 밴드/노드 위의 상단 여백, 그리고 마지막 노드 아래의 하단 여백 */
const EDGE_MARGIN_Y = 16;
/** 레인 라벨 띠 높이 */
const LANE_BAND_H = 28;
/** 노드 사이 세로 간격 */
const GAP_Y = 26;
/** sub 라벨이 있는 노드의 높이 */
const NODE_H_WITH_SUB = 52;
/** sub 라벨이 없는 노드의 높이 */
const NODE_H = 44;
/** 인접하지 않은 노드를 잇는 엣지가 우회하는 여유폭(노드 우변 기준) */
const BYPASS_GAP = 12;

type Group = {
  lane?: FlowLane;
  nodes: FlowNode[];
};

/**
 * 좁은 화면용 세로 1열 레이아웃으로 스펙을 재배치한다. 원본 spec은 건드리지 않는다.
 * 규칙 요약(task-7B-brief 참고):
 *  - 노드 순서는 엣지 기준 위상 정렬(레인이 있으면 레인 내부에서만)
 *  - 노드는 1열, 폭 width-32, 높이는 sub 유무로 44/52, 간격 26
 *  - 인접하지 않은 노드를 잇는 엣지는 열 오른쪽으로 우회하는 경유점 2개를 생성
 *  - viewBox는 { w: width, h: 계산된 총 높이 }, minWidth는 생략(가로 스크롤 금지)
 */
export function toStackedSpec(spec: FlowSpec, width: number): FlowSpec {
  const groups = buildGroups(spec);

  const nodeW = width - MARGIN_X * 2;

  const newLanes: FlowLane[] = [];
  const newNodes: FlowNode[] = [];

  let cursorY = EDGE_MARGIN_Y;

  for (const group of groups) {
    if (group.lane) {
      newLanes.push({ id: group.lane.id, label: group.lane.label, y: cursorY, h: LANE_BAND_H });
      cursorY += LANE_BAND_H;
    }
    for (const node of group.nodes) {
      const h = node.sub ? NODE_H_WITH_SUB : NODE_H;
      newNodes.push({ ...node, x: MARGIN_X, y: cursorY, w: nodeW, h });
      cursorY += h + GAP_Y;
    }
  }

  // 마지막 노드 뒤에 붙은 트레일링 간격을 하단 여백으로 치환한다
  const totalHeight = newNodes.length > 0 ? cursorY - GAP_Y + EDGE_MARGIN_Y : cursorY;

  const orderIndex = new Map(newNodes.map((node, index) => [node.id, index]));
  const nodeById = new Map(newNodes.map((node) => [node.id, node]));

  const newEdges: FlowEdge[] = spec.edges.map((edge) => buildEdge(edge, orderIndex, nodeById, nodeW));

  return {
    id: spec.id,
    title: spec.title,
    desc: spec.desc,
    viewBox: { w: width, h: totalHeight },
    lanes: newLanes.length > 0 ? newLanes : undefined,
    nodes: newNodes,
    edges: newEdges,
    legend: spec.legend,
  };
}

function buildEdge(
  edge: FlowEdge,
  orderIndex: Map<string, number>,
  nodeById: Map<string, FlowNode>,
  nodeW: number,
): FlowEdge {
  const base: FlowEdge = {
    from: edge.from,
    to: edge.to,
    kind: edge.kind,
    label: edge.label,
    bidirectional: edge.bidirectional,
    animated: edge.animated,
  };

  const fromIndex = orderIndex.get(edge.from);
  const toIndex = orderIndex.get(edge.to);
  const fromNode = nodeById.get(edge.from);
  const toNode = nodeById.get(edge.to);

  if (fromIndex === undefined || toIndex === undefined || !fromNode || !toNode) {
    // 검증기가 빌드 타임에 막지만 런타임 안전장치를 둔다
    return base;
  }

  const adjacent = Math.abs(fromIndex - toIndex) === 1;
  if (adjacent) return base;

  const routeX = MARGIN_X + nodeW + BYPASS_GAP;
  const waypoints: Point[] = [
    { x: routeX, y: fromNode.y + fromNode.h / 2 },
    { x: routeX, y: toNode.y + toNode.h / 2 },
  ];

  return { ...base, waypoints };
}

/** 레인 유무에 따라 노드를 그룹으로 나눈다. 각 그룹 내부에서만 위상 정렬한다 */
function buildGroups(spec: FlowSpec): Group[] {
  if (!spec.lanes || spec.lanes.length === 0) {
    return [{ nodes: topoSortNodes(spec.nodes, spec.edges) }];
  }

  const sortedLanes = [...spec.lanes].sort((a, b) => a.y - b.y);
  const assigned = new Set<string>();
  const groups: Group[] = [];

  for (const lane of sortedLanes) {
    const laneNodes = spec.nodes.filter(
      (node) => node.y >= lane.y && node.y + node.h <= lane.y + lane.h,
    );
    for (const node of laneNodes) assigned.add(node.id);
    groups.push({ lane, nodes: topoSortNodes(laneNodes, spec.edges) });
  }

  const leftover = spec.nodes.filter((node) => !assigned.has(node.id));
  if (leftover.length > 0) {
    groups.push({ nodes: topoSortNodes(leftover, spec.edges) });
  }

  return groups;
}

/**
 * 주어진 노드 집합을, 그 안에서만 닫힌 엣지를 기준으로 위상 정렬한다.
 * 사이클 등으로 진행이 막히면(진입차수 0인 노드가 더 없으면) 남은 노드를
 * 원래 (y, x) 순서로 이어 붙이고 종료한다 — 노드를 누락하거나 무한루프에
 * 빠지는 일이 없도록 한다.
 */
function topoSortNodes(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  if (nodes.length === 0) return [];

  const ids = new Set(nodes.map((node) => node.id));
  const relevantEdges = edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to));

  const inDegree = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  const adjacency = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  for (const edge of relevantEdges) {
    adjacency.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  // 사이클로 막혔을 때 쓸 원래 (y, x) 순서
  const fallbackOrder = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x);

  const remaining = new Set(ids);
  const order: FlowNode[] = [];
  const byId = new Map(nodes.map((node) => [node.id, node]));

  while (remaining.size > 0) {
    const zero = fallbackOrder.filter(
      (node) => remaining.has(node.id) && (inDegree.get(node.id) ?? 0) === 0,
    );

    if (zero.length === 0) {
      // 사이클: 남은 노드를 (y, x) 순서로 이어 붙이고 종료한다
      for (const node of fallbackOrder) {
        if (remaining.has(node.id)) {
          order.push(node);
          remaining.delete(node.id);
        }
      }
      break;
    }

    for (const node of zero) {
      order.push(node);
      remaining.delete(node.id);
      for (const nextId of adjacency.get(node.id) ?? []) {
        if (remaining.has(nextId)) {
          inDegree.set(nextId, (inDegree.get(nextId) ?? 0) - 1);
        }
      }
    }
  }

  // byId는 fallbackOrder/order 구성에 이미 사용된 노드 참조와 동일한 객체를 보장하기 위한 용도
  return order.map((node) => byId.get(node.id) ?? node);
}
