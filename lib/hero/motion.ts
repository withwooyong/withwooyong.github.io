// lib/hero/motion.ts
//
// 히어로 스크롤 연출의 **순수 산식**. DOM 을 모른다 — 그래서 vitest(environment: "node")
// 에서 그대로 검사된다. 훅(lib/use-scroll-progress.ts)은 이 파일을 부르는 얇은 어댑터일 뿐이다.
//
// 결함 [4] 의 처방이 이 파일의 존재 이유다. 이전 구현은 `stagger` 안의 리터럴 0.6 과
// `NODES.length` 가 곱해져 **0.6667 이라는 종료 경계**를 만들었는데, 그 값이 코드 어디에도
// 상수로 없었다. 스크롤의 33.3% 가 완전히 정적이라는 사실을 아무도 몰랐고,
// 노드를 하나 늘리면 그 경계가 조용히 움직였다.

/**
 * 점등과 문구 교체가 **완전히 끝나는** 진행도.
 *
 * 0.72 를 고른 이유는 둘이다.
 *   ① 남는 28% 는 「놓을 자리」다. 연출이 p=1 에서 끝나면 마지막 프레임이 스크롤을 멈춘
 *      순간에만 잠깐 보인다 — 다 본 것을 다시 볼 수가 없다. 300vh 껍데기에서 28% 는
 *      약 84vh, 완성된 화면을 한 화면 높이만큼 붙들어 준다.
 *   ② 그렇다고 절반 아래로 내리면 아직 한참 스크롤이 남았는데 아무 일도 안 일어나
 *      「고장 났나」로 읽힌다. 0.6667 이던 구값보다 살짝 늦춘 것이 그 이유다.
 *
 * **값 자체보다 중요한 것은 이것이 상수라는 사실이다.** 항목 수(`total`)를 바꿔도
 * 종료 경계는 여기서만 움직인다 — tests/hero/motion.test.ts 가 그걸 잠근다.
 */
export const MOTION_END = 0.72;

/**
 * 항목 하나가 0 → 1 로 점등되는 데 쓰는 구간의 길이 — `MOTION_END` 대비 비율.
 *
 * 크면 항목들이 겹쳐 한꺼번에 켜지는 것처럼 보이고, 작으면 딱딱 끊긴다.
 * 0.35 는 앞뒤 항목이 3분의 1쯤 겹치는 정도다.
 */
const LIT_SPAN_RATIO = 0.35;

/** 항목 하나의 점등 구간 길이(진행도 단위). */
const LIT_SPAN = MOTION_END * LIT_SPAN_RATIO;

/** 마지막 항목이 점등을 **시작**하는 지점. 여기에 `LIT_SPAN` 을 더하면 정확히 `MOTION_END` 다. */
const LAST_START = MOTION_END - LIT_SPAN;

/**
 * 문구 교체가 끝나는 지점 — `MOTION_END` 보다 **엄격히 앞선다.**
 *
 * 정적 구간([MOTION_END, 1])에서 새 문구가 나타나면 「끝났다」는 신호가 거짓이 된다.
 * 0.85 는 마지막 문구가 점등 완료보다 한 박자 먼저 자리를 잡게 하는 여유다.
 */
const LINE_END = MOTION_END * 0.85;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) {
    return 0;
  }
  // `<= 0` 인 이유: -0 을 그대로 돌려주면 `toBe(0)`(Object.is) 이 실패한다.
  // 0 나눗셈이 아니라 **음의 0 나눗셈**(-0/1200)에서 나오는 값이라 눈에 띄지 않는다.
  return v <= 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * 진행도 `p` 에서 `total` 개 중 `i` 번 항목이 얼마나 점등됐는가 — [0,1].
 *
 * 항목들은 `[0, LAST_START]` 구간에 균등하게 출발점을 나눠 갖고, 각자 `LIT_SPAN` 만큼
 * 걸려 끝난다. 그래서 **마지막 항목의 종료가 `total` 과 무관하게 항상 `MOTION_END`** 다.
 * `total` 이 24 든 48 이든 7 이든 경계가 움직이지 않는 것이 결함 [4] 의 처방이다.
 *
 * 순서는 보존된다 — 출발점이 `i` 에 대해 단조 증가하므로 같은 `p` 에서 앞선 항목이
 * 항상 더(또는 같이) 점등돼 있다.
 */
export function stagger(p: number, i: number, total: number): number {
  if (!Number.isFinite(p) || total <= 0) {
    return 0;
  }
  // 항목이 하나면 그것이 곧 마지막 항목이다 — 나눗셈 대신 종료 경계에 맞춘다.
  const start = total <= 1 ? LAST_START : (i / (total - 1)) * LAST_START;
  return clamp01((p - start) / LIT_SPAN);
}

/**
 * 진행도 `p` 에서 활성인 문구의 인덱스 — [0, lineCount-1].
 *
 * `LINE_END` 까지를 `lineCount` 등분한다. 마지막 문구는 `LINE_END` 의
 * `(lineCount-1)/lineCount` 지점에서 이미 활성이 되므로, 정적 구간에는 물론이고
 * `MOTION_END` 에 닿기 한참 전에 교체가 끝난다.
 */
export function activeLineIndex(p: number, lineCount: number): number {
  if (lineCount <= 0) {
    return 0;
  }
  if (!Number.isFinite(p) || p <= 0) {
    return 0;
  }
  const idx = Math.floor((p / LINE_END) * lineCount);
  return Math.min(Math.max(idx, 0), lineCount - 1);
}

/**
 * 스티키 히어로의 스크롤 진행도 — [0,1].
 *
 * `rectTop` 은 껍데기 요소의 `getBoundingClientRect().top` 이다. 껍데기가 뷰포트 상단에
 * 닿았을 때 0, 안쪽 스티키가 다 흘러 나갔을 때 1 이다.
 *
 * `travel` 이 0 이하면 스크롤로 진행시킬 거리가 없다는 뜻이므로 **1(완성 상태)** 로 둔다 —
 * 0 으로 두면 짧은 화면에서 연출이 영원히 시작되지 않은 채로 남는다.
 */
export function scrollProgress(
  rectTop: number,
  elementHeight: number,
  viewportHeight: number,
): number {
  const travel = elementHeight - viewportHeight;
  if (!(travel > 0)) {
    return 1;
  }
  return clamp01(-rectTop / travel);
}
