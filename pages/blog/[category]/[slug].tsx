import { BlogShell } from "@/components/blog/blog-shell";
import { PostMeta } from "@/components/blog/post-meta";
import { SeriesNav } from "@/components/blog/series-nav";
import { SeriesProgress } from "@/components/blog/series-progress";
import { TagList } from "@/components/blog/tag-list";
import { Markdown } from "@/components/markdown";
import { SiteHead } from "@/components/site-head";
import { getAdjacentPosts, getAllPosts, getBlogTree, getPost, getSeriesContext } from "@/lib/blog/loader";
import { absoluteUrl } from "@/lib/site";
import type { BlogTree, Post, PostSummary, SeriesContext } from "@/lib/blog/types";
import type { GetStaticPaths, GetStaticProps } from "next";

type Props = {
  tree: BlogTree;
  post: Post;
  seriesContext: SeriesContext | null;
  prev: PostSummary | null;
  next: PostSummary | null;
};

export const getStaticPaths: GetStaticPaths = () => ({
  paths: getAllPosts().map((p) => ({ params: { category: p.categorySlug, slug: p.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = ({ params }) => {
  const category = String(params?.category);
  const slug = String(params?.slug);
  const post = getPost(category, slug);
  const { prev, next } = getAdjacentPosts(category, slug);

  return {
    props: {
      tree: getBlogTree(category),
      post,
      seriesContext: getSeriesContext(category, slug),
      prev,
      next,
    },
  };
};

export default function BlogPostPage({ tree, post, seriesContext, prev, next }: Props) {
  const path = `/blog/${post.categorySlug}/${post.slug}/`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { "@type": "Person", name: "허우용" },
    url: absoluteUrl(path),
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <SiteHead
        title={`${post.title} | 기술 노트`}
        description={post.description}
        path={path}
        jsonLd={jsonLd}
      />

      <BlogShell tree={tree} activePostSlug={post.slug} toc={post.toc}>
        <article className="max-w-4xl">
          <header className="space-y-3 border-b border-slate-200 pb-6 dark:border-slate-800">
            <PostMeta post={post} />
            <h1 className="text-2xl font-bold leading-[1.3] break-keep sm:text-3xl md:text-4xl">{post.title}</h1>
            <p className="text-sm text-slate-500 break-keep sm:text-base dark:text-slate-400">{post.description}</p>
            <TagList tags={post.tags} />
          </header>

          <Markdown>{post.body}</Markdown>

          <SeriesProgress context={seriesContext} categorySlug={post.categorySlug} currentSlug={post.slug} />

          <SeriesNav prev={prev} next={next} />
        </article>
      </BlogShell>
    </>
  );
}
