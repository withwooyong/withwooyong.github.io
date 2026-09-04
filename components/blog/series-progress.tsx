import type { SeriesContext } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { Layers } from "lucide-react";
import Link from "next/link";

type Props = {
  /** 시리즈에 속하지 않는 편이면 null 이 넘어온다 (실측 20편) */
  context: SeriesContext | null;
  categorySlug: string;
  currentSlug: string;
};

/**
 * 「n편 중 k번째」와 시리즈 목차.
 *
 * SeriesNav(이전·다음) 위에 놓인다. 이전·다음은 「바로 옆이 무엇인가」에 답하고
 * 이것은 「전체 중 어디인가」에 답한다 — 41개 시리즈 164편이 데이터로만 있고
 * 화면에 드러나지 않던 것을 여는 자리다.
 */
export function SeriesProgress({ context, categorySlug, currentSlug }: Props) {
  if (!context) return null;

  const { series, posts, position } = context;

  return (
    <section
      className="mt-14 rounded-lg border border-slate-200 p-4 dark:border-slate-800"
      aria-labelledby="series-progress-heading"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="series-progress-heading" className="flex min-w-0 items-center gap-2 text-sm font-bold break-keep">
          <Layers className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
          <span className="min-w-0">{series.name}</span>
        </h2>
        <p className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {posts.length}편 중 {position}번째
        </p>
      </div>

      <ol className="mt-3 space-y-1">
        {posts.map((post) => {
          const here = post.slug === currentSlug;
          return (
            <li key={post.slug} className="flex gap-2">
              <span
                className={cn(
                  "w-5 shrink-0 text-right text-xs tabular-nums",
                  here ? "text-blue-700 dark:text-blue-300" : "text-slate-400 dark:text-slate-500"
                )}
              >
                {post.seriesOrder}
              </span>
              {here ? (
                <span
                  aria-current="page"
                  className="min-w-0 text-sm font-semibold leading-snug break-keep text-blue-700 dark:text-blue-300"
                >
                  {post.title}
                </span>
              ) : (
                <Link
                  href={`/blog/${categorySlug}/${post.slug}/`}
                  className="min-w-0 text-sm leading-snug break-keep text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
                >
                  {post.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
