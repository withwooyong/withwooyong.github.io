import { PostMeta } from "@/components/blog/post-meta";
import { TagList } from "@/components/blog/tag-list";
import type { PostSummary } from "@/lib/blog/types";
import Link from "next/link";

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="border-b border-slate-200 py-6 last:border-0 dark:border-slate-800">
      <PostMeta post={post} />
      <h2 className="mt-2 text-lg font-bold leading-snug break-keep sm:text-xl">
        <Link
          href={`/blog/${post.categorySlug}/${post.slug}/`}
          className="hover:text-blue-600 dark:hover:text-blue-400"
        >
          {post.title}
        </Link>
      </h2>
      <p className="mt-2 text-sm leading-relaxed break-keep text-slate-600 dark:text-slate-300">{post.description}</p>
      <div className="mt-3">
        <TagList tags={post.tags} size="sm" />
      </div>
    </article>
  );
}
