// lib/hero/atlas-nodes.ts
//
// 히어로 배경 아틀라스의 **정본 데이터**. 좌표·엣지·액센트 판정은 여기에만 있다.
// components/hero-atlas.tsx 는 이것을 읽어 그리고, tests/design/accent-area.test.ts 는
// 이것을 읽어 잰다 — 둘이 같은 배열을 보기 때문에 「그리는 것」과 「재는 것」이 어긋나지 않는다.
// 복제하면 그 순간 GC-9 검사가 거짓말을 시작한다.
//
// 좌표는 손으로 고정한 값이다. **무작위로 만들지 마라** — 빌드마다 달라지면
// 스냅샷도 실측치도 재현되지 않는다.

import type { Circle } from "@/lib/design/accent-area";

export type { Circle };

/**
 * viewBox 0 0 100 100 좌표계의 노드 24개.
 *
 * 배치 의도: 왼쪽 위에서 오른쪽 아래로 흐르는 성긴 격자. 큰 노드(r≥3.2)는 시선이 먼저
 * 닿는 가운데 띠에 두고, 가장자리는 작은 노드로 채워 크롭될 때 손실이 적게 한다.
 */
const NODES: readonly Circle[] = [
  { x: 12, y: 22, r: 3.2 }, { x: 24, y: 14, r: 2.4 }, { x: 33, y: 30, r: 4.0 },
  { x: 18, y: 44, r: 2.6 }, { x: 42, y: 20, r: 2.8 }, { x: 52, y: 34, r: 3.6 },
  { x: 61, y: 18, r: 2.4 }, { x: 70, y: 30, r: 3.0 }, { x: 82, y: 22, r: 2.6 },
  { x: 88, y: 40, r: 3.4 }, { x: 74, y: 48, r: 2.4 }, { x: 60, y: 52, r: 4.2 },
  { x: 46, y: 60, r: 2.8 }, { x: 30, y: 58, r: 3.0 }, { x: 16, y: 66, r: 2.4 },
  { x: 38, y: 76, r: 3.2 }, { x: 54, y: 80, r: 2.6 }, { x: 68, y: 70, r: 2.8 },
  { x: 84, y: 62, r: 2.4 }, { x: 92, y: 76, r: 3.0 }, { x: 26, y: 86, r: 2.6 },
  { x: 48, y: 92, r: 2.4 }, { x: 72, y: 88, r: 3.2 }, { x: 90, y: 12, r: 2.4 },
];

const EDGES: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 5],
  [11, 12], [12, 13], [13, 3], [13, 14], [12, 15], [15, 16], [16, 17], [17, 10], [17, 18], [18, 19],
  [15, 20], [16, 21], [21, 22], [22, 19], [8, 23],
];

/** 노드 24개. 인덱스가 곧 식별자다 — `HERO_EDGES` 와 `isAccentNode` 가 이 순서를 참조한다. */
export const HERO_NODES: readonly Circle[] = NODES;

/** 엣지. `[a, b]` 는 `HERO_NODES` 의 인덱스 쌍이다. */
export const HERO_EDGES: readonly (readonly [number, number])[] = EDGES;

/**
 * 점등이 끝났을 때의 반지름 배율.
 *
 * 1.0 이면 「켜졌다」가 색으로만 읽혀 다크에서 거의 안 보인다. 1.5 를 넘으면 큰 노드끼리
 * 붙어 격자가 뭉개진다. 1.18 은 그 사이에서 **크기 변화가 알아볼 만한 최소치**다.
 */
export const HERO_GROWTH = 1.18;

/**
 * 액센트로 삼는 노드 — 반지름 상위 6개(내림차순).
 *
 * ⚠️ 「큰 노드를 통째로 --signal 로 칠한다」(안 A)는 이 기하에서 GC-9 을 못 지킨다.
 *    실측(격자 적분, HERO_GROWTH=1.18 적용): 여기 고른 **상위 6개를 통째로** 칠하면
 *    desktop 5.606% / mobile 5.383% 로 양쪽 다 5% 를 넘는다.
 *    모바일이 특히 불리하다 — 393×851 은 세로로 길어 slice 가 viewBox 가로의 46% 만
 *    보여주는데, 분모가 절반 이하로 줄어드는 동안 **큰 노드는 가운데에 몰려 있어**
 *    분자는 그대로이기 때문이다. 상위 3·4·5개의 모바일 값이 4.412% 로 전부 같은 것도
 *    그 때문이다 — 4·5번째 노드가 크롭 밖이라 기여가 0 이다.
 *
 * ⚠️ **이 근거는 한 번 흔들렸다(2026-08-28 정정).** 원래 이 자리에는 「상위 3개만 칠해도
 *    desktop 4.74% / mobile 5.78%」라고 적혀 있었는데, 지금 모델로 다시 재면
 *    **3.623% / 4.412%** 다. 즉 **상위 3개는 더 이상 5% 를 넘지 않는다** — 그 수치를
 *    그대로 두면 「안 A 를 왜 버렸나」가 거짓 근거 위에 서게 된다.
 *    원인은 계측기가 아니라 성장 배율이다. 4.74/5.78 은 `HERO_GROWTH` 가 **1.35** 이던
 *    시절의 값이고(1.35 로 재면 4.745% / 5.780% 로 소수 둘째 자리까지 일치한다),
 *    그 뒤 1.18 로 내려가면서 수치만 낡았다. 같은 모델로 잰 채택안 값(1.017% / 0.952%)이
 *    아래 주석과 정확히 맞는 것이 「모델은 맞고 수치만 낡았다」의 증거다.
 *    그래서 안 A 기각 근거를 상위 3개가 아니라 **채택 집합 전체(상위 6개)** 로 다시 세웠다.
 *
 * 재현 — tests/ 아래에 임시 `*.test.ts` 를 두고
 * `npx vitest run <파일> --disableConsoleIntercept` 로 돌린다:
 *   const top = HERO_NODES.map((c) => ({ ...c, r: c.r * HERO_GROWTH }))
 *     .sort((a, b) => b.r - a.r).slice(0, 6);
 *   console.log(accentAreaRatio(top, { width: 1280, height: 720 }),
 *               accentAreaRatio(top, { width: 393, height: 851 }));
 *
 * 그래서 채택한 것이 「안 B」다 — **큰 --n7 원 안의 작은 --signal 코어**.
 * 「불이 켜졌다」는 큰 원이 읽어 주고, 면적은 코어만 든다.
 */
const ACCENT_INDICES: readonly number[] = [11, 2, 5, 9, 0, 15];

const ACCENT_SET = new Set(ACCENT_INDICES);

/**
 * 액센트 코어의 반지름 비율 — 점등 완료 반지름 대비.
 *
 * 면적은 비율의 **제곱**으로 준다. 0.42 는 면적을 17.6% 로 줄인다.
 * 가장 작은 액센트(r=3.2 → 코어 1.59)도 100 단위 viewBox 에서 눈에 잡히는 크기다.
 *
 * 이 조합(상위 6개 · 코어 0.42)의 실측: desktop 1.02% · mobile 0.95%.
 * GC-9(5%) 대비 5배 여유다 — 문구가 길어져 뷰포트가 더 좁아져도 견딘다.
 */
export const HERO_ACCENT_CORE_RATIO = 0.42;

/** 점등 완료 상태의 원 전체 — 반지름이 `HERO_GROWTH` 배가 된 것. */
export function litCircles(): Circle[] {
  return NODES.map((n) => ({ x: n.x, y: n.y, r: n.r * HERO_GROWTH }));
}

/** 인덱스 `i` 가 액센트 노드인가. 렌더러가 색을 고를 때 쓴다. */
export function isAccentNode(i: number): boolean {
  return ACCENT_SET.has(i);
}

/**
 * 인덱스 `i` 의 액센트 코어 반지름(점등 완료 기준). 액센트가 아니면 0.
 *
 * 렌더러도 계측기도 **이 함수 하나**를 통해 코어 크기를 얻는다. 양쪽이 각자
 * `r * GROWTH * RATIO` 를 적으면 한쪽만 고쳐질 수 있고, 그때 GC-9 은 조용히 틀린다.
 */
export function accentCoreRadius(i: number): number {
  const node = NODES[i];
  if (!node || !ACCENT_SET.has(i)) {
    return 0;
  }
  return node.r * HERO_GROWTH * HERO_ACCENT_CORE_RATIO;
}

/**
 * 실제로 `--signal` 로 칠해지는 기하 — **GC-9 의 검사 대상이다.**
 *
 * 렌더러가 그리는 것과 정확히 같아야 한다. 링(stroke)으로 바꾸고 싶어지면
 * 이 함수의 계약(채움 원 배열)부터 바뀌어야 한다 — 링은 면적이 둘레×두께라
 * 원 배열로 표현되지 않고, 그러면 이 계측기가 실물보다 크게 잰다.
 */
export function accentCircles(): Circle[] {
  return ACCENT_INDICES.map((i) => ({
    x: NODES[i].x,
    y: NODES[i].y,
    r: accentCoreRadius(i),
  }));
}
