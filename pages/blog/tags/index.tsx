import { BlogShell } from "@/components/blog/blog-shell";
import { SiteHead } from "@/components/site-head";
import { getAllTags } from "@/lib/blog/loader";
import Link from "next/link";
import type { GetStaticProps } from "next";

type Props = { tags: { tag: string; count: number }[] };

export const getStaticProps: GetStaticProps<Props> = () => ({
  props: { tags: getAllTags() },
});

export default function BlogTagIndexPage({ tags }: Props) {
  return (
    <>
      <SiteHead title="태그 | 기술 노트" description="기술 노트의 전체 태그 목록." path="/blog/tags/" />

      <BlogShell>
        <div className="max-w-4xl">
          <h1 className="text-2xl font-bold break-keep sm:text-3xl">태그</h1>
          <ul className="mt-6 flex flex-wrap gap-2">
            {tags.map(({ tag, count }) => (
              <li key={tag}>
                <Link
                  href={`/blog/tags/${encodeURIComponent(tag)}/`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-800 dark:hover:border-blue-600 dark:hover:text-blue-400"
                >
                  <span>{tag}</span>
                  <span className="tabular-nums text-xs text-slate-400 dark:text-slate-500">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </BlogShell>
    </>
  );
}
