import Link from "next/link";
import { NOTION_RESUME_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * 포커스 표시. 헤더와 같은 문자열이다.
 *
 * ⚠️ 문자열을 동적으로 조립하지 마라 — Tailwind 추출기가 못 읽어 규칙이 생성되지 않는다.
 * ⚠️ `focus:` 가 아니라 `focus-visible:` 이다.
 */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n0";

export function SiteFooter() {
  return (
    <footer className="border-t border-n4 bg-n2">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-body text-n6 break-keep">허우용 · Ted — 백엔드 · 플랫폼 리더</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="푸터 메뉴">
          <Link
            href="/blog/"
            className={cn("rounded-sm text-body text-n6 hover:text-n9 transition-interactive", FOCUS_RING)}
          >
            Blog
          </Link>
          <a
            href={NOTION_RESUME_URL}
            className={cn(
              "rounded-sm text-body text-n6 hover:text-n9 transition-interactive break-keep",
              FOCUS_RING,
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            이력서
          </a>
          <a
            href="mailto:withwooyong@gmail.com"
            className={cn("rounded-sm text-body text-n6 hover:text-n9 transition-interactive", FOCUS_RING)}
          >
            withwooyong@gmail.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
