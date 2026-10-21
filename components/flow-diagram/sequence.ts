/**
 * 흐름도 「순서 재생」의 순수 계산부. DOM 과 React 를 모른다.
 *
 * 규칙
 *  - 같은 order 의 엣지는 동시에 시작한다.
 *  - 다음 order 는 앞 order 의 모든 엣지가 끝난 뒤(= 가장 긴 duration 이 지난 뒤) 시작한다.
 *  - 마지막 order 가 끝나면 REST_SECONDS 쉬고 처음부터 반복한다.
 * 시간 단위는 전부 초다.
 */

/** 엣지 duration 을 생략했을 때의 이동 시간(초) */
export const DEFAULT_EDGE_DURATION = 0.8;
/** 마지막 order 가 끝난 뒤 처음으로 돌아가기 전의 쉬는 시간(초) */
export const REST_SECONDS = 2;
/** 도착 노드의 맥박 길이(초) */
export const PULSE_SECONDS = 0.4;
/** 맥박 정점의 확대율 */
export const PULSE_SCALE = 1.06;

export type SequenceEdgeInput = { order?: number; duration?: number };

export type OrderWindow = { order: number; start: number; end: number };

export type Schedule = {
  /** order 오름차순. order 가 하나도 없으면 빈 배열 */
  windows: OrderWindow[];
  /** 입력 엣지와 같은 순서. order 가 없는 엣지는 null */
  edgeStarts: Array<number | null>;
  edgeEnds: Array<number | null>;
  /** 마지막 order 가 끝나는 시각 */
  playSeconds: number;
  /** playSeconds + 쉬는 시간. 반복 한 바퀴의 길이 */
  cycleSeconds: number;
};

export type NodeStatus = "idle" | "busy" | "done";

function hasOrder(order: number | undefined): order is number {
  return typeof order === "number" && Number.isFinite(order);
}

/** duration 이 양수가 아니면 기본값. 검증기가 빌드 타임에 막지만 런타임 안전장치를 둔다 */
export function edgeDuration(edge: SequenceEdgeInput): number {
  const d = edge.duration;
  return typeof d === "number" && Number.isFinite(d) && d > 0 ? d : DEFAULT_EDGE_DURATION;
}

/** order 가 하나라도 있는 스펙인가. 순서 모드 진입 조건 */
export function hasSequence(edges: SequenceEdgeInput[]): boolean {
  return edges.some((edge) => hasOrder(edge.order));
}

export function computeSchedule(
  edges: SequenceEdgeInput[],
  restSeconds: number = REST_SECONDS,
): Schedule {
  const orders = Array.from(
    new Set(edges.filter((e) => hasOrder(e.order)).map((e) => e.order as number)),
  ).sort((a, b) => a - b);

  const windows: OrderWindow[] = [];
  let cursor = 0;
  for (const order of orders) {
    const longest = Math.max(
      ...edges.filter((e) => e.order === order).map((e) => edgeDuration(e)),
    );
    windows.push({ order, start: cursor, end: cursor + longest });
    cursor += longest;
  }

  const windowByOrder = new Map(windows.map((w) => [w.order, w]));
  const edgeStarts = edges.map((e) => (hasOrder(e.order) ? windowByOrder.get(e.order)!.start : null));
  const edgeEnds = edges.map((e, i) => {
    const start = edgeStarts[i];
    return start === null ? null : start + edgeDuration(e);
  });

  return {
    windows,
    edgeStarts,
    edgeEnds,
    playSeconds: cursor,
    cycleSeconds: windows.length === 0 ? 0 : cursor + restSeconds,
  };
}

/**
 * 시각 t 에 보여 줄 단계의 인덱스(windows 의 위치).
 * atEnd 가 true 면 경계(t 가 어떤 order 의 시작과 같을 때)에서 앞 단계를 고른다.
 * 한 단계를 끝까지 재생하고 멈춘 순간이 바로 그 경계이기 때문이다.
 */
export function stepIndexAt(schedule: Schedule, t: number, atEnd = false): number {
  let index = 0;
  schedule.windows.forEach((w, i) => {
    if (atEnd ? w.start < t : w.start <= t) index = i;
  });
  return index;
}

/** 도착 노드별로, 그 노드로 들어오는 순서 엣지의 [시작, 끝] 목록 */
export function inboundWindows(
  edges: Array<SequenceEdgeInput & { to: string }>,
  schedule: Schedule,
): Map<string, Array<{ start: number; end: number }>> {
  const result = new Map<string, Array<{ start: number; end: number }>>();
  edges.forEach((edge, i) => {
    const start = schedule.edgeStarts[i];
    const end = schedule.edgeEnds[i];
    if (start === null || end === null) return;
    const list = result.get(edge.to) ?? [];
    list.push({ start, end });
    result.set(edge.to, list);
  });
  return result;
}

/**
 * 도착 노드의 상태.
 *  - 첫 도착 엣지가 출발하기 전: idle
 *  - 들어오는 엣지가 하나라도 이동 중이거나 아직 남았다: busy (처리 중)
 *  - 들어오는 엣지가 전부 끝났다: done (완료)
 */
export function nodeStatusAt(
  inbound: Array<{ start: number; end: number }> | undefined,
  t: number,
): NodeStatus {
  if (!inbound || inbound.length === 0) return "idle";
  const firstStart = Math.min(...inbound.map((w) => w.start));
  const lastEnd = Math.max(...inbound.map((w) => w.end));
  if (t >= lastEnd) return "done";
  if (t >= firstStart) return "busy";
  return "idle";
}

export type PacketFrame = { offset: number; opacity: number; offsetDistance: string };

/**
 * 패킷 하나의 키프레임. 한 바퀴(cycle) 전체를 duration 으로 쓰고,
 * [start, end] 구간에서만 보이며 0% → 100% 로 움직인다.
 * 모든 패킷이 같은 길이의 한 바퀴를 공유하므로 currentTime 하나로 전부 이동·일시정지할 수 있다.
 */
export function packetKeyframes(start: number, end: number, cycle: number): PacketFrame[] {
  const at = (seconds: number) => Math.min(1, Math.max(0, seconds / cycle));
  const frames: PacketFrame[] = [];
  if (start > 0) {
    frames.push({ offset: 0, opacity: 0, offsetDistance: "0%" });
    frames.push({ offset: at(start), opacity: 0, offsetDistance: "0%" });
  }
  frames.push({ offset: at(start), opacity: 1, offsetDistance: "0%" });
  frames.push({ offset: at(end), opacity: 1, offsetDistance: "100%" });
  frames.push({ offset: at(end), opacity: 0, offsetDistance: "100%" });
  if (at(end) < 1) frames.push({ offset: 1, opacity: 0, offsetDistance: "100%" });
  return frames;
}

export type PulseFrame = { offset: number; scale: number };

/**
 * 도착 노드의 맥박 키프레임. arrivals 는 엣지가 끝나는 시각들.
 * 앞 맥박이 끝나기 전에 또 도착하면 그 도착은 앞 맥박에 합친다.
 */
export function pulseKeyframes(
  arrivals: number[],
  cycle: number,
  pulseSeconds: number = PULSE_SECONDS,
): PulseFrame[] {
  const at = (seconds: number) => Math.min(1, Math.max(0, seconds / cycle));
  const frames: PulseFrame[] = [{ offset: 0, scale: 1 }];
  let lastEnd = 0;
  for (const arrival of Array.from(new Set(arrivals)).sort((a, b) => a - b)) {
    if (arrival < lastEnd) continue;
    frames.push({ offset: at(arrival), scale: 1 });
    frames.push({ offset: at(arrival + pulseSeconds / 2), scale: PULSE_SCALE });
    frames.push({ offset: at(arrival + pulseSeconds), scale: 1 });
    lastEnd = arrival + pulseSeconds;
  }
  frames.push({ offset: 1, scale: 1 });
  return frames;
}

/**
 * 바깥이 단계를 정하는 모드(activeOrder)의 노드 상태.
 * 도착 노드마다 들어오는 순서 엣지를 모아, 엣지가 시작했는지 · 끝났는지로 판정한다.
 *  - order < activeOrder 인 엣지는 끝났다.
 *  - order === activeOrder 인 엣지는 시작했고, activeDone 이 true 일 때만 끝났다.
 *  - order > activeOrder 인 엣지는 아직 시작하지 않았다.
 * 들어오는 엣지가 전부 끝났으면 done, 하나라도 시작했으면 busy, 아니면 idle 이다.
 * idle 인 노드는 결과에 넣지 않는다. activeOrder 가 줄면 그 이전 상태가 그대로 나온다.
 */
export function nodeStatusesAtOrder(
  edges: Array<SequenceEdgeInput & { to: string }>,
  activeOrder: number,
  activeDone: boolean,
): Record<string, NodeStatus> {
  const inbound = new Map<string, number[]>();
  for (const edge of edges) {
    if (!hasOrder(edge.order)) continue;
    const list = inbound.get(edge.to) ?? [];
    list.push(edge.order);
    inbound.set(edge.to, list);
  }
  const result: Record<string, NodeStatus> = {};
  inbound.forEach((orders, id) => {
    const allEnded = orders.every((o) => o < activeOrder || (o === activeOrder && activeDone));
    const anyStarted = orders.some((o) => o <= activeOrder);
    if (allEnded) result[id] = "done";
    else if (anyStarted) result[id] = "busy";
  });
  return result;
}

/** 한 order 단계의 길이(초): 그 order 엣지 중 가장 긴 duration. 그 order 의 엣지가 없으면 0 */
export function stepSeconds(edges: SequenceEdgeInput[], order: number): number {
  const durations = edges.filter((e) => e.order === order).map((e) => edgeDuration(e));
  return durations.length === 0 ? 0 : Math.max(...durations);
}
