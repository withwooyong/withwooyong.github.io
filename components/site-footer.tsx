import Link from "next/link";
import { NOTION_RESUME_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-n4 bg-n2">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-body text-n6 break-keep">허우용 · Ted — 백엔드 · 플랫폼 리더</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="푸터 메뉴">
          <Link href="/blog/" className="text-body text-n6 hover:text-n9 transition-interactive">
            Blog
          </Link>
          <a
            href={NOTION_RESUME_URL}
            className="text-body text-n6 hover:text-n9 transition-interactive"
            target="_blank"
            rel="noopener noreferrer"
          >
            이력서
          </a>
          <a
            href="mailto:withwooyong@gmail.com"
            className="text-body text-n6 hover:text-n9 transition-interactive"
          >
            withwooyong@gmail.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
