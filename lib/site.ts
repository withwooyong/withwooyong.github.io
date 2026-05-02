/**
 * GitHub Pages 등 정적 호스트의 절대 URL 기준.
 * 로컬·미리보기는 환경변수로 덮어쓸 수 있다.
 */
export function getSiteOrigin(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  return "https://withwooyong.github.io";
}

export function absoluteUrl(path: string): string {
  const origin = getSiteOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${p}`;
}
