// lib/design/accent-area.ts
//
// GC-9(설계서 §5.2): 액센트(--signal)는 첫 화면 픽셀의 5% 이하여야 한다.
// 「5%」는 눈대중으로 지킬 수 없는 규칙이다 — SVG 가 `preserveAspectRatio="xMidYMid slice"`
// 로 크롭되면 **같은 도형이 뷰포트 비율에 따라 전혀 다른 면적을 차지한다.**
// 그래서 규칙을 산문이 아니라 계측기로 둔다.

/** viewBox 좌표계의 원. r 은 반지름이며 좌표와 같은 단위다. */
export type Circle = { x: number; y: number; r: number };

/** CSS 픽셀 단위의 뷰포트. */
export type Viewport = { width: number; height: number };

export type AccentAreaOptions = {
  /** 정사각 viewBox 한 변. `<svg viewBox="0 0 100 100">` 이면 100. */
  viewBox?: number;
  /**
   * 축당 격자 샘플 수. 총 표본은 samples². 기본 1000 은 1e6 표본으로,
   * 24개 원 기준 수백 ms 안에 끝나면서 소수 둘째 자리까지 안정된다.
   */
  samples?: number;
};

const DEFAULT_VIEW_BOX = 100;
const DEFAULT_SAMPLES = 1000;

/**
 * `preserveAspectRatio="xMidYMid slice"` 로 정사각 viewBox 를 뷰포트에 채웠을 때,
 * 원들의 **합집합**이 덮는 뷰포트 픽셀 비율 [0,1] 을 격자 적분으로 구한다.
 *
 * slice 기하:
 *   scale   = max(W/viewBox, H/viewBox)      — 짧은 쪽을 기준으로 넘치게 확대한다
 *   보이는 영역 = (W/scale) × (H/scale)       — 이것이 실제로 화면에 남는 viewBox 부분이다
 *   xMidYMid 이므로 그 영역은 viewBox 중앙에 놓인다
 *
 * 겹침은 한 번만 센다(표본 하나가 원 하나라도 만나면 즉시 계상하고 다음 표본으로 간다).
 * 면적을 원별로 더하면 겹칠수록 과대평가되어 GC-9 판정이 보수적인 쪽으로 거짓말한다 —
 * 「위반」쪽 거짓말이라 안전해 보이지만, 연출을 지울 근거가 되므로 똑같이 해롭다.
 */
export function accentAreaRatio(
  circles: Circle[],
  viewport: Viewport,
  options: AccentAreaOptions = {},
): number {
  const viewBox = options.viewBox ?? DEFAULT_VIEW_BOX;
  const samples = options.samples ?? DEFAULT_SAMPLES;

  if (circles.length === 0) {
    return 0;
  }
  const { width, height } = viewport;
  if (!(width > 0) || !(height > 0) || !(viewBox > 0) || !(samples > 0)) {
    return 0;
  }

  const scale = Math.max(width / viewBox, height / viewBox);
  const visibleW = width / scale;
  const visibleH = height / scale;
  const originX = (viewBox - visibleW) / 2;
  const originY = (viewBox - visibleH) / 2;

  // 반지름 제곱을 미리 접어 둔다 — 안쪽 루프에서 sqrt 도 곱셈도 하지 않기 위해서다.
  const cx = circles.map((c) => c.x);
  const cy = circles.map((c) => c.y);
  const cr = circles.map((c) => c.r);
  const cr2 = circles.map((c) => c.r * c.r);

  let hits = 0;
  for (let iy = 0; iy < samples; iy += 1) {
    const y = originY + ((iy + 0.5) / samples) * visibleH;

    // 이 행(y)에 걸칠 수 있는 원만 남긴다. 24개 중 대개 서넛이라 안쪽 루프가 그만큼 짧아진다.
    const row: number[] = [];
    for (let k = 0; k < cx.length; k += 1) {
      if (Math.abs(y - cy[k]) <= cr[k]) {
        row.push(k);
      }
    }
    if (row.length === 0) {
      continue;
    }

    for (let ix = 0; ix < samples; ix += 1) {
      const x = originX + ((ix + 0.5) / samples) * visibleW;
      for (const k of row) {
        const dx = x - cx[k];
        const dy = y - cy[k];
        if (dx * dx + dy * dy <= cr2[k]) {
          hits += 1;
          break; // 합집합 — 몇 개에 걸리든 표본 하나는 한 번만 센다
        }
      }
    }
  }

  return hits / (samples * samples);
}
