import { findCategory } from "@/content/blog/categories";
import type { PostSummary } from "@/lib/blog/types";
import Link from "next/link";

/**
 * Pick으로 필요한 필드만 요구한다. 그러면 Post도 PostSummary도 그대로 넘길 수 있다 —
 * 구조적 타이핑 덕분에 호출부에서 캐스팅할 일이 없다.
 */
type PostMetaProps = { post: Pick<PostSummary, "categorySlug" | "date" | "updated"> };

export function PostMeta({ post }: PostMetaProps) {
  const category = findCategory(post.categorySlug);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      {category ? (
        <Link
          href={`/blog/${category.slug}/`}
          className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          {category.name}
        </Link>
      ) : null}
      <time dateTime={post.date} className="tabular-nums">
        {post.date}
      </time>
      {post.updated && post.updated !== post.date ? (
        <span className="tabular-nums">수정 {post.updated}</span>
      ) : null}
    </div>
  );
}
