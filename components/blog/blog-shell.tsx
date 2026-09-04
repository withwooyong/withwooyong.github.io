import { CategoryTree } from "@/components/blog/category-tree";
import { ThemeToggle } from "@/components/theme-toggle";
import type { BlogTree, TocEntry } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { Menu, PenLine, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type BlogShellProps = {
  /**
   * 사이드바 트리. 현재 카테고리만 펼쳐진 상태로 넘어온다(getBlogTree).
   *
   * 이 컴포넌트는 클라이언트에서도 렌더되므로 파일시스템을 읽을 수 없다 —
   * 호출하는 쪽의 getStaticProps 가 넘겨야 한다.
   * **선택 인자로 두지 않는다.** 폴백을 두면 한 페이지에서 빠뜨렸을 때
   * 그 페이지만 다르게 보이는 불일치가 조용히 생긴다.
   * 필수로 두면 빠뜨린 곳이 타입 오류로 드러난다.
   */
  tree: BlogTree;
  /** 본문 페이지에서만 넘어온다. 현재 편이 속한 시리즈를 펼쳐 그린다 */
  activePostSlug?: string;
  toc?: TocEntry[];
  children: ReactNode;
};

export function BlogShell({ tree, activePostSlug, toc, children }: BlogShellProps) {
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
              aria-label={open ? "카테고리 닫기" : "카테고리 열기"}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Link href="/blog/" className="flex min-w-0 items-center gap-2 font-semibold">
              <PenLine className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
              <span className="truncate text-sm">기술 노트</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {/*
              폭에 상관없이 항상 보여야 한다. 검색으로 포스트에 직접 들어온 방문자에게는
              이 링크가 포트폴리오로 가는 유일한 경로다 (요구사항 FR-4.3).
              위키(wiki-shell)는 noindex라 sm:block으로 숨겨도 됐지만 블로그는 색인된다.
            */}
            <Link
              href="/"
              className="shrink-0 text-sm text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              포트폴리오
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {open ? (
        <div className="border-b border-slate-200 bg-white px-3 py-3 lg:hidden sm:px-4 dark:border-slate-800 dark:bg-slate-950">
          <CategoryTree tree={tree} activePostSlug={activePostSlug} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[90rem] gap-8 px-3 sm:px-4">
        {/* 좌측 — 카테고리 */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-20 py-8" aria-label="카테고리">
            <p className="mb-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              카테고리
            </p>
            <CategoryTree tree={tree} activePostSlug={activePostSlug} />
          </nav>
        </aside>

        {/* 본문 */}
        <main id="main" className="min-w-0 flex-1 py-6 sm:py-8">
          {children}
        </main>

        {/* 우측 — 목차 */}
        {toc && toc.length > 0 ? (
          <aside className="hidden w-56 shrink-0 xl:block">
            <nav className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto py-8" aria-label="이 글의 목차">
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
