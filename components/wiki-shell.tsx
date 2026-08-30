import { ThemeToggle } from "@/components/theme-toggle";
import type { TocEntry, WikiDoc } from "@/lib/wiki";
import { cn } from "@/lib/utils";
import { BookOpen, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type WikiShellProps = {
  docs: WikiDoc[];
  activeSlug?: string;
  toc?: TocEntry[];
  children: ReactNode;
};

function DocList({ docs, activeSlug, onNavigate }: { docs: WikiDoc[]; activeSlug?: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {docs.map((d, i) => {
        const active = d.slug === activeSlug;
        return (
          <li key={d.slug}>
            <Link
              href={`/product-lead-wiki/${d.slug}/`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <span className="shrink-0 tabular-nums text-slate-400 dark:text-slate-600">{String(i).padStart(2, "0")}</span>
              <span className="break-keep leading-snug">{d.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function WikiShell({ docs, activeSlug, toc, children }: WikiShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="shrink-0 rounded-md border border-slate-200 p-2 lg:hidden dark:border-slate-700"
              aria-expanded={open}
              aria-label={open ? "문서 목록 닫기" : "문서 목록 열기"}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Link href="/product-lead-wiki/" className="flex min-w-0 items-center gap-2 font-semibold">
              <BookOpen className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
              <span className="truncate text-sm">플랫폼 코어 목표 설계 위키</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/product-lead-loadmap/"
              className="hidden text-sm text-slate-600 hover:text-blue-600 sm:block dark:text-slate-300 dark:hover:text-blue-400"
            >
              요약 페이지
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {open ? (
        <div className="border-b border-slate-200 bg-white px-3 py-3 lg:hidden sm:px-4 dark:border-slate-800 dark:bg-slate-950">
          <DocList docs={docs} activeSlug={activeSlug} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[90rem] gap-8 px-3 sm:px-4">
        {/* 좌측 — 문서 목록 */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-20 py-8" aria-label="문서 목록">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">문서</p>
            <DocList docs={docs} activeSlug={activeSlug} />
          </nav>
        </aside>

        {/* 본문 */}
        <main id="main" className="min-w-0 flex-1 py-6 sm:py-8">
          {children}
        </main>

        {/* 우측 — 목차 */}
        {toc && toc.length > 0 ? (
          <aside className="hidden w-56 shrink-0 xl:block">
            <nav className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto py-8" aria-label="이 문서의 목차">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">목차</p>
              <ul className="space-y-1.5 border-l border-slate-200 dark:border-slate-800">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className={cn(
                        "-ml-px block border-l border-transparent py-0.5 text-sm leading-snug break-keep text-slate-500 transition-colors hover:border-blue-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400",
                        t.depth === 2 ? "pl-3 font-medium" : "pl-6"
                      )}
                    >
                      {t.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
