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

/**
 * 노션 경력기술서의 공개 게시 주소.
 *
 * app.notion.com / www.notion.so 형식은 워크스페이스 내부 주소라 방문자에게
 * 로그인 화면이 뜬다. 반드시 공개 게시 호스트(*.notion.site)를 쓸 것.
 *
 * 노션 페이지를 새로 만들면 여기와 public/notion/index.html 두 곳만 고치면 된다.
 * 외부에 배포된 주소는 withwooyong.github.io/notion 하나뿐이라 그대로 둬도 된다.
 */
export const NOTION_RESUME_URL =
  "https://fortunate-ghost-cf6.notion.site/Ted-3a5845b3742d8113a393e327716ec4a3";
