import { BlogShell } from "@/components/blog/blog-shell";
import { PostMeta } from "@/components/blog/post-meta";
import { SeriesNav } from "@/components/blog/series-nav";
import { TagList } from "@/components/blog/tag-list";
import { Markdown } from "@/components/markdown";
import { SiteHead } from "@/components/site-head";
import { getAdjacentPosts, getAllPosts, getPost } from "@/lib/blog/loader";
import { absoluteUrl } from "@/lib/site";
import type { Post, PostSummary } from "@/lib/blog/types";
import type { GetStaticPaths, GetStaticProps } from "next";

type Props = {
  post: Post;
  prev: PostSummary | null;
  next: PostSummary | null;
};

export const getStaticPaths: GetStaticPaths = () => ({
  paths: getAllPosts().map((p) => ({ params: { category: p.categorySlug, slug: p.slug } })),
  fallback: false,
});

/**
 * frontmatter의 선택 필드(updated·series·seriesOrder·source)는 값이 없어도 키가 남아
 * `undefined`가 된다. Next.js는 props를 __NEXT_DATA__에 JSON으로 직렬화하는데
 * JSON에는 undefined가 없어 빌드가 실패한다. 직렬화 왕복으로 그 키들을 떨어뜨린다.
 *
 * Post·PostSummary는 문자열·불리언·숫자·배열만 담으므로 왕복해도 손실이 없다.
 */
function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const getStaticProps: GetStaticProps<Props> = ({ params }) => {
  const category = String(params?.category);
  const slug = String(params?.slug);
  const post = getPost(category, slug);
  const { prev, next } = getAdjacentPosts(category, slug);

  return { props: serializable({ post, prev, next }) };
};

export default function BlogPostPage({ post, prev, next }: Props) {
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

      <BlogShell activeCategory={post.categorySlug} toc={post.toc}>
        <article className="max-w-4xl">
          <header className="space-y-3 border-b border-slate-200 pb-6 dark:border-slate-800">
            <PostMeta post={post} />
            <h1 className="text-2xl font-bold leading-[1.3] break-keep sm:text-3xl md:text-4xl">{post.title}</h1>
            <p className="text-sm text-slate-500 break-keep sm:text-base dark:text-slate-400">{post.description}</p>
            <TagList tags={post.tags} />
          </header>

          <Markdown>{post.body}</Markdown>

          {post.source ? (
            <p className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-400 break-keep dark:border-slate-800 dark:text-slate-500">
              학습 출처: {post.source}
            </p>
          ) : null}

          <SeriesNav prev={prev} next={next} />
        </article>
      </BlogShell>
    </>
  );
}
