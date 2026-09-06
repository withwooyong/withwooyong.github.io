import type { GraphEdge } from "@/lib/blog/types";

/**
 * 지역 그래프의 좌표 계산.
 *
 * 🔴 이 모듈은 **클라이언트에서 돈다.** 빌드 전용 모듈(`loader.ts` · `graph.ts`)을 절대
 * import 하지 않는다 — `node:fs` 와 마크다운 파서가 클라이언트 번들에 들어간다.
 *
 * 🔴 난수를 전혀 쓰지 않는다. 초기 배치가 인덱스로만 정해지므로 같은 입력에 항상 같은
 * 좌표가 나오고, 그래서 스냅숏 검사가 성립한다. 씨앗조차 필요 없다.
 */

export type LayoutInput = {
  /** 중심 노드의 id. 좌표가 고정되어 항상 화면 한가운데에 온다 */
  centerId: string;
  /** 중심을 포함한 모든 노드의 id. **순서가 초기 배치를 정하므로** 호출부에서 안정적이어야 한다 */
  nodeIds: string[];
  edges: GraphEdge[];
};

export type LayoutOptions = {
  width: number;
  height: number;
  /** 노드 중심 사이에 두고 싶은 최소 간격(픽셀) */
  minGap: number;
  /** 시뮬레이션 반복 횟수. 수렴 판정을 두지 않고 고정 횟수로 끊는다 */
  ticks: number;
};

export type LayoutPoint = { id: string; x: number; y: number };

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  width: 200,
  height: 180,
  minGap: 26,
  ticks: 300,
};

/** 두 노드가 이보다 가까우면 겹친 것으로 보고 밀어낸다 */
const EPSILON = 0.01;

/**
 * 두 노드가 정확히 겹쳤을 때 밀어낼 방향.
 *
 * 🔴 **이 가드를 `layout` 안에 인라인으로 두지 않고 순수 함수로 뽑은 이유**가 있다.
 * 흩어져 있으면 통째로 지워도 케이스가 전부 통과할 수 있다 — 겹침이 우연히 일어나지
 * 않는 입력만 검사하면 가드가 없어도 결과가 같기 때문이다. 함수로 뽑으면 가드 자체를
 * 직접 검사할 수 있다.
 *
 * 인덱스로 각도를 만들므로 난수가 아니며, 같은 쌍에는 항상 같은 방향이 나온다.
 */
export function separationVector(i: number, j: number): { dx: number; dy: number } {
  const angle = (2 * Math.PI * ((i * 31 + j * 17) % 97)) / 97;
  return { dx: Math.cos(angle) * EPSILON, dy: Math.sin(angle) * EPSILON };
}

export function layout(input: LayoutInput, options: LayoutOptions = DEFAULT_LAYOUT_OPTIONS): LayoutPoint[] {
  const { centerId, nodeIds, edges } = input;
  const { width, height, minGap, ticks } = options;
  const count = nodeIds.length;

  const indexOf = new Map<string, number>();
  nodeIds.forEach((id, i) => indexOf.set(id, i));

  // 🔴 **`graph.ts` 의 buildLocalGraph 와 같은 방침이다.** 종전에는 `?? 0` 으로 0번 노드를
  // 대신 중심에 놓았는데, 그러면 화면에는 그래프가 **그려지되 중심이 다른 편**이 된다.
  // 조용히 틀린 화면은 원인을 찾을 수 없다.
  //
  // 던져도 프로덕션에 도달하지 않는다: 이 위젯은 정적 export 라 빌드 시점에도 렌더되고,
  // 입력은 buildLocalGraph 의 출력에서만 오며 그쪽이 이미 중심의 실존을 보장한다.
  // 그러므로 이 오류가 나는 상황은 배포될 화면이 아니라 **깨져야 할 빌드**다.
  const centerIndex = indexOf.get(centerId);
  if (centerIndex === undefined) {
    throw new Error(`[blog] 그래프 좌표 계산: 중심 노드가 nodeIds 에 없습니다: ${centerId}`);
  }

  // 초기 배치 — 중심은 원점, 나머지는 원주 위에 인덱스 순서대로 균등 배치한다.
  const radius = Math.min(width, height) / 3;
  const others = nodeIds.filter((id) => id !== centerId);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const id of nodeIds) {
    if (id === centerId) {
      xs.push(0);
      ys.push(0);
      continue;
    }
    const k = others.indexOf(id);
    const angle = (2 * Math.PI * k) / Math.max(1, others.length);
    xs.push(radius * Math.cos(angle));
    ys.push(radius * Math.sin(angle));
  }

  const vx = nodeIds.map(() => 0);
  const vy = nodeIds.map(() => 0);

  // 연결선을 인덱스 쌍으로 바꾼다. 배치에는 방향이 필요 없다.
  const springs: number[][] = [];
  for (const edge of edges) {
    const a = indexOf.get(edge.from);
    const b = indexOf.get(edge.to);
    if (a === undefined || b === undefined || a === b) continue;
    springs.push([a, b]);
  }

  const REPULSION = minGap * minGap * 8;
  const SPRING = 0.02;
  const REST = minGap * 1.8;
  const GRAVITY = 0.012;
  const DAMPING = 0.82;

  for (let t = 0; t < ticks; t++) {
    const fx = nodeIds.map(() => 0);
    const fy = nodeIds.map(() => 0);

    // 반발력 — 모든 쌍. 노드가 최대 13개이므로 쌍이 78개다.
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        let dx = xs[i] - xs[j];
        let dy = ys[i] - ys[j];
        let d2 = dx * dx + dy * dy;
        if (d2 < EPSILON * EPSILON) {
          const push = separationVector(i, j);
          dx = push.dx;
          dy = push.dy;
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const f = REPULSION / d2;
        fx[i] += (dx / d) * f;
        fy[i] += (dy / d) * f;
        fx[j] -= (dx / d) * f;
        fy[j] -= (dy / d) * f;
      }
    }

    // 인력 — 연결선으로 이어진 쌍.
    for (const spring of springs) {
      const a = spring[0];
      const b = spring[1];
      const dx = xs[b] - xs[a];
      const dy = ys[b] - ys[a];
      const d = Math.sqrt(dx * dx + dy * dy) || EPSILON;
      const f = (d - REST) * SPRING;
      fx[a] += (dx / d) * f;
      fy[a] += (dy / d) * f;
      fx[b] -= (dx / d) * f;
      fy[b] -= (dy / d) * f;
    }

    // 중심 수렴력 — 화면 밖으로 흩어지는 것을 막는다.
    for (let i = 0; i < count; i++) {
      fx[i] -= xs[i] * GRAVITY;
      fy[i] -= ys[i] * GRAVITY;
    }

    // 갱신. 중심 노드는 움직이지 않는다.
    for (let i = 0; i < count; i++) {
      if (i === centerIndex) continue;
      vx[i] = (vx[i] + fx[i]) * DAMPING;
      vy[i] = (vy[i] + fy[i]) * DAMPING;
      xs[i] += vx[i];
      ys[i] += vy[i];
    }
  }

  return toViewBox(nodeIds, xs, ys, centerIndex, options);
}

/**
 * 모델 좌표를 뷰박스 좌표로 옮긴다.
 *
 * 중심 노드가 화면 한가운데에 오도록 평행이동한 뒤, 가장 먼 노드가 여백 안에 들어오도록
 * **축소만** 한다. 확대하면 노드가 둘뿐인 그래프가 화면을 가득 채워 어색해진다.
 *
 * ⚠️ 여기에 `isFinite` 폴백을 두지 마라. NaN 을 조용히 가운데 좌표로 바꾸면 「좌표가
 * 전부 유한하다」는 검사가 무엇도 지키지 못하는 검사가 된다.
 */
function toViewBox(
  nodeIds: string[],
  xs: number[],
  ys: number[],
  centerIndex: number,
  options: LayoutOptions
): LayoutPoint[] {
  const { width, height, minGap } = options;
  const pad = minGap / 2 + 2;
  const cx = xs[centerIndex];
  const cy = ys[centerIndex];

  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < nodeIds.length; i++) {
    maxX = Math.max(maxX, Math.abs(xs[i] - cx));
    maxY = Math.max(maxY, Math.abs(ys[i] - cy));
  }

  const scale = Math.min(
    maxX > 0 ? (width / 2 - pad) / maxX : 1,
    maxY > 0 ? (height / 2 - pad) / maxY : 1,
    1
  );

  // `scale` 이 두 축의 한계 중 작은 쪽을 따르므로 결과는 언제나 여백 안이다.
  // ⚠️ 여기에 clamp 를 덧대지 마라. 증명으로 이미 안전한 자리에 가드를 두면
  // **어떤 케이스도 죽일 수 없는 가지**가 하나 생긴다.
  return nodeIds.map((id, i) => ({
    id,
    x: width / 2 + (xs[i] - cx) * scale,
    y: height / 2 + (ys[i] - cy) * scale,
  }));
}
