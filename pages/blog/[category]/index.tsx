import { BlogShell } from "@/components/blog/blog-shell";
import { PostCard } from "@/components/blog/post-card";
import { SiteHead } from "@/components/site-head";
import { findCategory, type BlogCategory } from "@/content/blog/categories";
import {
  getBlogTree,
  getCategoryGraph,
  getPostsByCategory,
  getPublishedCategories,
} from "@/lib/blog/loader";
import type { BlogTree, LocalGraph, PostSummary } from "@/lib/blog/types";
import type { GetStaticPaths, GetStaticProps } from "next";

type Props = {
  tree: BlogTree;
  category: BlogCategory;
  posts: PostSummary[];
  /**
   * 이 카테고리의 허브 편을 중심으로 한 지역 그래프. 그릴 것이 없으면 null 이다.
   *
   * getStaticProps 는 `undefined` 를 직렬화하지 못하므로 선택 필드가 아니라 `null` 을 받는다.
   */
  graph: LocalGraph | null;
};

// 글이 있는 카테고리만 경로를 만든다. 빈 카테고리는 페이지 자체가 생기지 않으므로
// out/을 스캔하는 sitemap 생성기에서도 자동으로 빠진다.
export const getStaticPaths: GetStaticPaths = () => ({
  paths: getPublishedCategories().map((c) => ({ params: { category: c.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = ({ params }) => {
  const slug = String(params?.category);
  const category = findCategory(slug);
  if (!category) throw new Error(`[blog] 없는 카테고리입니다: ${slug}`);

  return {
    props: {
      tree: getBlogTree(slug),
      category,
      posts: getPostsByCategory(slug),
      graph: getCategoryGraph(slug),
    },
  };
};

export default function BlogCategoryPage({ tree, category, posts, graph }: Props) {
  return (
    <>
      <SiteHead
        title={`${category.name} | 기술 노트`}
        description={category.description}
        path={`/blog/${category.slug}/`}
      />

      <BlogShell tree={tree} graph={graph ? { data: graph, variant: "category" } : undefined}>
        <div className="max-w-4xl">
          <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
            <h1 className="text-2xl font-bold break-keep sm:text-3xl">{category.name}</h1>
            <p className="mt-2 text-sm leading-relaxed break-keep text-slate-600 dark:text-slate-300">
              {category.description}
            </p>
            <p className="mt-2 text-xs tabular-nums text-slate-500 dark:text-slate-400">{posts.length}편</p>
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
