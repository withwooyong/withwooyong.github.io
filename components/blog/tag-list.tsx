import Link from "next/link";
import { cn } from "@/lib/utils";

export function TagList({ tags, size = "md" }: { tags: string[]; size?: "sm" | "md" }) {
  if (tags.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            href={`/blog/tags/${encodeURIComponent(tag)}/`}
            className={cn(
              "inline-block rounded-md bg-slate-100 font-medium text-slate-600 transition-colors hover:bg-blue-100 hover:text-blue-700",
              "dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-950 dark:hover:text-blue-300",
              size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs"
            )}
          >
            {tag}
          </Link>
        </li>
      ))}
    </ul>
  );
}
