import { BlogShell } from "@/components/blog/blog-shell";
import { PostCard } from "@/components/blog/post-card";
import { SiteHead } from "@/components/site-head";
import { getAllTags, getPostsByTag } from "@/lib/blog/loader";
import type { PostSummary } from "@/lib/blog/types";
import type { GetStaticPaths, GetStaticProps } from "next";

type Props = { tag: string; posts: PostSummary[] };

export const getStaticPaths: GetStaticPaths = () => ({
  paths: getAllTags().map(({ tag }) => ({ params: { tag } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = ({ params }) => {
  const tag = String(params?.tag);
  return { props: { tag, posts: getPostsByTag(tag) } };
};

export default function BlogTagPage({ tag, posts }: Props) {
  return (
    <>
      <SiteHead
        title={`${tag} | 기술 노트`}
        description={`${tag} 태그가 붙은 글 ${posts.length}편.`}
        path={`/blog/tags/${encodeURIComponent(tag)}/`}
      />

      <BlogShell>
        <div className="max-w-4xl">
          <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">태그</p>
            <h1 className="mt-1 text-2xl font-bold break-keep sm:text-3xl">{tag}</h1>
            <p className="mt-2 text-xs tabular-nums text-slate-400 dark:text-slate-500">{posts.length}편</p>
          </header>

          <div>
            {posts.map((p) => (
              <PostCard key={`${p.categorySlug}/${p.slug}`} post={p} />
            ))}
          </div>
        </div>
      </BlogShell>
    </>
  );
}
