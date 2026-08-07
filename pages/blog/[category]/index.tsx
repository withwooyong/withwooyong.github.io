import { BlogShell } from "@/components/blog/blog-shell";
import { PostCard } from "@/components/blog/post-card";
import { serializable } from "@/components/blog/serialize";
import { SiteHead } from "@/components/site-head";
import { blogCategories, findCategory, type BlogCategory } from "@/content/blog/categories";
import { getPostsByCategory } from "@/lib/blog/loader";
import type { PostSummary } from "@/lib/blog/types";
import type { GetStaticPaths, GetStaticProps } from "next";

type Props = { category: BlogCategory; posts: PostSummary[] };

export const getStaticPaths: GetStaticPaths = () => ({
  paths: blogCategories.map((c) => ({ params: { category: c.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = ({ params }) => {
  const slug = String(params?.category);
  const category = findCategory(slug);
  if (!category) throw new Error(`[blog] 없는 카테고리입니다: ${slug}`);

  return { props: serializable({ category, posts: getPostsByCategory(slug) }) };
};

export default function BlogCategoryPage({ category, posts }: Props) {
  return (
    <>
      <SiteHead
        title={`${category.name} | 기술 노트`}
        description={category.description}
        path={`/blog/${category.slug}/`}
      />

      <BlogShell activeCategory={category.slug}>
        <div className="max-w-4xl">
          <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
            <h1 className="text-2xl font-bold break-keep sm:text-3xl">{category.name}</h1>
            <p className="mt-2 text-sm leading-relaxed break-keep text-slate-600 dark:text-slate-300">
              {category.description}
            </p>
            <p className="mt-2 text-xs tabular-nums text-slate-400 dark:text-slate-500">{posts.length}편</p>
          </header>

          <div>
            {posts.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </div>
      </BlogShell>
    </>
  );
}
