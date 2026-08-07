import type { PostSummary } from "@/lib/blog/types";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

export function SeriesNav({ prev, next }: { prev: PostSummary | null; next: PostSummary | null }) {
  if (!prev && !next) return null;

  return (
    <nav
      className="mt-14 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between dark:border-slate-800"
      aria-label="이전 다음 글"
    >
      {prev ? (
        <Link
          href={`/blog/${prev.categorySlug}/${prev.slug}/`}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span className="break-keep">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/blog/${next.categorySlug}/${next.slug}/`}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 sm:justify-end dark:text-slate-300 dark:hover:text-blue-400"
        >
          <span className="break-keep">{next.title}</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
