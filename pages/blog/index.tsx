import { BlogShell } from "@/components/blog/blog-shell";
import { PostCard } from "@/components/blog/post-card";
import { SiteHead } from "@/components/site-head";
import type { BlogCategory } from "@/content/blog/categories";
import { getPostSummaries, getPublishedCategories } from "@/lib/blog/loader";
import type { PostSummary } from "@/lib/blog/types";
import Link from "next/link";
import type { GetStaticProps } from "next";

type CategoryWithCount = BlogCategory & { count: number };

type Props = {
  categories: CategoryWithCount[];
  featured: PostSummary[];
  recent: PostSummary[];
};

export const getStaticProps: GetStaticProps<Props> = () => {
  const posts = getPostSummaries();

  return {
    props: {
      // 글이 있는 카테고리만. 여기서 세는 count는 항상 1 이상이 된다.
      categories: getPublishedCategories().map((c) => ({
        ...c,
        count: posts.filter((p) => p.categorySlug === c.slug).length,
      })),
      featured: posts.filter((p) => p.featured),
      recent: posts.slice(0, 10),
    },
  };
};

export default function BlogHomePage({ categories, featured, recent }: Props) {
  return (
    <>
      <SiteHead
        title="기술 노트"
        description="검색 엔지니어링, 대용량 트래픽, AI 에이전트 등 플랫폼 기술을 주제별로 정리한 기술 노트."
        path="/blog/"
      />

      <BlogShell categories={categories}>
        <div className="max-w-4xl space-y-12">
          <header className="space-y-2">
            <h1 className="text-2xl font-bold break-keep sm:text-3xl">기술 노트</h1>
            <p className="text-sm leading-relaxed break-keep text-slate-600 sm:text-base dark:text-slate-300">
              직접 구축하고 운영하며 정리한 플랫폼 기술 기록입니다. 주제별로 묶어 두었습니다.
            </p>
          </header>

          <section aria-labelledby="categories-heading">
            <h2 id="categories-heading" className="mb-4 text-lg font-bold break-keep">
              주제
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/blog/${c.slug}/`}
                    className="block rounded-lg border border-slate-200 p-4 transition-colors hover:border-blue-400 dark:border-slate-800 dark:hover:border-blue-600"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold break-keep">{c.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {c.count}편
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed break-keep text-slate-500 dark:text-slate-400">
                      {c.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {featured.length > 0 ? (
            <section aria-labelledby="featured-heading">
              <h2 id="featured-heading" className="mb-2 text-lg font-bold break-keep">
                먼저 읽어볼 글
              </h2>
              <div>
                {featured.map((p) => (
                  <PostCard key={`${p.categorySlug}/${p.slug}`} post={p} />
                ))}
              </div>
            </section>
          ) : null}

          <section aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="mb-2 text-lg font-bold break-keep">
              최근 글
            </h2>
            <div>
              {recent.map((p) => (
                <PostCard key={`${p.categorySlug}/${p.slug}`} post={p} />
              ))}
            </div>
          </section>
        </div>
      </BlogShell>
    </>
  );
}
