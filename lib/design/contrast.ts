// lib/design/contrast.ts

/** sRGB 성분(0~255)을 선형 광도로 변환한다. WCAG 2.x 정의. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** `#rrggbb` 를 [r, g, b] 정수 배열로. 3자리 축약형도 받는다. */
export function parseHex(hex: string): [number, number, number] {
  if (typeof hex !== "string") {
    throw new Error(`hex 색이 아니다: ${hex}`);
  }
  const h = hex.trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`hex 색이 아니다: ${hex}`);
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG 상대 휘도. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 명도 대비. 항상 1 이상이며 순서에 무관하다. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
