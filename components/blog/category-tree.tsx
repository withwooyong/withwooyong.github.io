import { STANDALONE_SLUG, type BlogTree, type TreeSeries } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Props = {
  tree: BlogTree;
  /** 본문 페이지에서만 넘어온다. 현재 편이 속한 시리즈를 펼친 채로 그린다 */
  activePostSlug?: string;
  onNavigate?: () => void;
};

function seriesHasPost(series: TreeSeries, slug?: string): boolean {
  return !!slug && series.posts.some((p) => p.slug === slug);
}

export function CategoryTree({ tree, activePostSlug, onNavigate }: Props) {
  return (
    <ul className="space-y-1">
      {tree.categories.map((category) => {
        const active = category.slug === tree.expanded;

        return (
          <li key={category.slug}>
            <Link
              href={`/blog/${category.slug}/`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-baseline justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors break-keep",
                active
                  ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <span className="min-w-0">{category.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-400 dark:text-slate-500">
                {category.count}
              </span>
            </Link>

            {category.series.length > 0 ? (
              <ul className="mt-0.5 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-800">
                {category.series.map((series) => (
                  <li key={series.slug}>
                    <details open={seriesHasPost(series, activePostSlug)}>
                      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-100 break-keep dark:text-slate-400 dark:hover:bg-slate-800">
                        <span className="min-w-0">
                          {series.slug === STANDALONE_SLUG ? "독립편" : series.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-400 dark:text-slate-500">
                          {series.posts.length}
                        </span>
                      </summary>
                      <ul className="mt-0.5 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-800">
                        {series.posts.map((post) => {
                          const here = post.slug === activePostSlug;
                          return (
                            <li key={post.slug}>
                              <Link
                                href={`/blog/${category.slug}/${post.slug}/`}
                                onClick={onNavigate}
                                aria-current={here ? "page" : undefined}
                                className={cn(
                                  "block rounded-md px-2 py-1 text-xs leading-snug transition-colors break-keep",
                                  here
                                    ? "font-semibold text-blue-700 dark:text-blue-300"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                )}
                              >
                                {post.seriesOrder !== null ? (
                                  <span className="mr-1 tabular-nums text-slate-400 dark:text-slate-500">
                                    {post.seriesOrder}.
                                  </span>
                                ) : null}
                                {post.title}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}

      <li>
        <Link
          href="/blog/tags/"
          onClick={onNavigate}
          className="mt-2 block rounded-md border-t border-slate-200 px-3 pt-3 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          태그 전체
        </Link>
      </li>
    </ul>
  );
}
