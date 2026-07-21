import type { FlowEdge, FlowLane, FlowNode, FlowSpec, Point } from "./types";

/** 왼쪽 여백 */
const MARGIN_LEFT = 16;
/** 오른쪽 여백. 비인접 엣지가 우회하는 통로로도 쓰인다 */
const MARGIN_RIGHT = 28;
/** 2열일 때 열 사이 간격 */
const COL_GAP = 10;
/** 첫 밴드/노드 위의 상단 여백, 그리고 마지막 노드 아래의 하단 여백 */
const EDGE_MARGIN_Y = 16;
/** 레인 라벨 띠 높이 */
const LANE_BAND_H = 28;
/** 행 사이 세로 간격 */
const GAP_Y = 26;
/** sub 라벨이 있는 노드의 높이 */
const NODE_H_WITH_SUB = 52;
/** sub 라벨이 없는 노드의 높이 */
const NODE_H = 44;
/** 우회 통로에서 엣지끼리 겹치지 않도록 나눠 쓰는 트랙 수 */
const BYPASS_TRACKS = 4;
/** 우회 트랙 사이 간격 */
const BYPASS_TRACK_GAP = 6;
/** 첫 번째(가장 오른쪽) 우회 트랙이 오른쪽 끝에서 떨어진 거리 */
const BYPASS_TRACK_EDGE = 4;

type Group = {
  lane?: FlowLane;
  nodes: FlowNode[];
};

/**
 * 좁은 화면용 2열(340px 미만이면 1열) 레이아웃으로 스펙을 재배치한다. 원본 spec은 건드리지 않는다.
 * 규칙 요약(task-7C-brief 참고):
 *  - 노드 순서는 엣지 기준 위상 정렬(레인이 있으면 레인 내부에서만), 그 순서를 좌→우로 채우고
 *    행이 차면 다음 행 왼쪽으로 내려간다(지그재그 없음)
 *  - 노드 높이는 sub 유무로 44/52. 같은 행에 섞이면 행 높이는 그 행의 최댓값을 쓴다
 *  - 정렬 순서상 인접한 두 노드를 잇는 엣지는 직선(waypoints 없음)
 *  - 비인접 엣지는 오른쪽 여백 통로로 우회하되, 엣지마다 최대 4개 트랙에 x를 나눠 배분해 겹치지 않게 한다
 *  - viewBox는 { w: width, h: 계산된 총 높이 }, minWidth는 생략(가로 스크롤 금지)
 */
export function toStackedSpec(spec: FlowSpec, width: number): FlowSpec {
  const groups = buildGroups(spec);

  const cols = width >= 340 ? 2 : 1;
  const nodeW = (width - MARGIN_LEFT - MARGIN_RIGHT - COL_GAP * (cols - 1)) / cols;

  const newLanes: FlowLane[] = [];
  const newNodes: FlowNode[] = [];

  let cursorY = EDGE_MARGIN_Y;

  for (const group of groups) {
    if (group.lane) {
      newLanes.push({ id: group.lane.id, label: group.lane.label, y: cursorY, h: LANE_BAND_H });
      cursorY += LANE_BAND_H;
    }

    for (let i = 0; i < group.nodes.length; i += cols) {
      const rowNodes = group.nodes.slice(i, i + cols);
      const rowH = Math.max(...rowNodes.map((node) => (node.sub ? NODE_H_WITH_SUB : NODE_H)));

      rowNodes.forEach((node, col) => {
        const h = node.sub ? NODE_H_WITH_SUB : NODE_H;
        const x = MARGIN_LEFT + col * (nodeW + COL_GAP);
        newNodes.push({ ...node, x, y: cursorY, w: nodeW, h });
      });

      cursorY += rowH + GAP_Y;
    }
  }

  // 마지막 행 뒤에 붙은 트레일링 간격을 하단 여백으로 치환한다
  const totalHeight = newNodes.length > 0 ? cursorY - GAP_Y + EDGE_MARGIN_Y : cursorY;

  const orderIndex = new Map(newNodes.map((node, index) => [node.id, index]));
  const nodeById = new Map(newNodes.map((node) => [node.id, node]));

  // 비인접(우회) 엣지에만 순서대로 트랙을 배분한다. 트랙은 4개를 순환한다.
  let bypassCount = 0;
  const newEdges: FlowEdge[] = spec.edges.map((edge) => {
    const trackX = width - BYPASS_TRACK_EDGE - (bypassCount % BYPASS_TRACKS) * BYPASS_TRACK_GAP;
    const { edge: builtEdge, isBypass } = buildEdge(edge, orderIndex, nodeById, trackX);
    if (isBypass) bypassCount += 1;
    return builtEdge;
  });

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
  trackX: number,
): { edge: FlowEdge; isBypass: boolean } {
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
    return { edge: base, isBypass: false };
  }

  const adjacent = Math.abs(fromIndex - toIndex) === 1;
  if (adjacent) return { edge: base, isBypass: false };

  const waypoints: Point[] = [
    { x: trackX, y: fromNode.y + fromNode.h / 2 },
    { x: trackX, y: toNode.y + toNode.h / 2 },
  ];

  return { edge: { ...base, waypoints }, isBypass: true };
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
    // 이미 앞선 레인에 배정된 노드는 제외한다.
    // 레인 y 범위가 서로 겹치면 한 노드가 두 레인에 중복 배치되어
    // React key 중복과 nodeById 덮어쓰기로 엣지 연결이 깨진다.
    const laneNodes = spec.nodes.filter(
      (node) =>
        !assigned.has(node.id) && node.y >= lane.y && node.y + node.h <= lane.y + lane.h,
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
