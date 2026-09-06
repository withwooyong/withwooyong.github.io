/**
 * WCAG 2.1 상대 휘도와 대비비 계산.
 *
 * 이 저장소는 다크 모드에서 대비 1.06 인 검색 팔레트를 프로덕션에 배포한 적이 있다.
 * 그때 결함이 배포까지 간 이유는 색이 틀렸기 때문이 아니라 **아무도 재지 않았기** 때문이므로,
 * 색을 고르는 자리가 아니라 검사가 도는 자리에 계산식을 둔다.
 *
 * 공식은 WCAG 2.1 의 정의를 그대로 옮긴 것이다.
 *   상대 휘도 L = 0.2126 R + 0.7152 G + 0.0722 B
 *   대비비   = (L(밝은 쪽) + 0.05) / (L(어두운 쪽) + 0.05)
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

/** WCAG AA 가 일반 크기 본문에 요구하는 최소 대비비. 도식의 글자는 14px 이므로 큰 글씨가 아니다. */
export const AA_TEXT = 4.5;

/** WCAG 1.4.11 이 테두리·선 같은 비텍스트 요소에 요구하는 최소 대비비. */
export const AA_NON_TEXT = 3;

/** `#rgb` 와 `#rrggbb` 를 0~255 세 성분으로 푼다. 그 밖의 표기는 계산할 수 없으므로 거부한다. */
export function parseHex(hex: string): [number, number, number] {
  const body = hex.trim().replace(/^#/, "");

  const full = body.length === 3 ? body.replace(/./g, (c) => c + c) : body;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`hex 색이 아닙니다: ${hex}`);
  }

  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** sRGB 한 성분(0~255)을 선형 값으로 되돌린다. 감마 보정을 벗기지 않으면 휘도가 과대평가된다. */
function linearize(component: number): number {
  const c = component / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** 상대 휘도. 검정이 0, 흰색이 1 이다. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * 두 색의 대비비. 1(같은 색)부터 21(검정과 흰색)까지다.
 *
 * 인자의 순서는 결과에 영향을 주지 않는다. 밝은 쪽을 분자에 두는 것은 호출부가 아니라 이 함수의 몫이다.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}
