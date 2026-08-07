import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { validateFrontmatter } from "@/lib/blog/frontmatter";
import { buildToc } from "@/lib/toc";
import type { Post, PostSummary } from "@/lib/blog/types";

/**
 * 발행본 마크다운 로더 — 빌드 타임 전용.
 *
 * getStaticProps/getStaticPaths에서만 호출할 것. 클라이언트 번들에 fs가 들어가면 안 된다.
 *
 * content/blog/<category>/<slug>.md 구조를 스캔한다. 디렉터리명이 곧 카테고리 슬러그이며,
 * frontmatter의 category 필드와 일치해야 한다.
 */
const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

/** 테스트에서 다른 루트를 넘길 수 있도록 인자로 받는다. */
export function readPosts(root: string = CONTENT_DIR): Post[] {
  if (!fs.existsSync(root)) return [];

  const posts: Post[] = [];

  for (const categorySlug of fs.readdirSync(root)) {
    const categoryDir = path.join(root, categorySlug);
    if (!fs.statSync(categoryDir).isDirectory()) continue;

    for (const fileName of fs.readdirSync(categoryDir)) {
      if (!fileName.endsWith(".md")) continue;

      const filePath = path.join(categoryDir, fileName);
      const rel = `${categorySlug}/${fileName}`;
      const raw = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(raw);

      const fm = validateFrontmatter(data, rel);

      // 디렉터리와 필드가 어긋나면 URL과 메타데이터가 불일치한다.
      // 카테고리가 하나뿐인 1차에서는 이 경로를 테스트로 태울 수 없다 —
      // 다른 값을 넣으면 validateFrontmatter의 "알 수 없는 카테고리"에서 먼저 걸린다.
      // 카테고리가 2개 이상이 되는 2차에서 테스트를 추가한다.
      if (fm.category !== categorySlug) {
        throw new Error(`[blog] ${rel}: 디렉터리(${categorySlug})와 category 필드(${fm.category})가 다릅니다`);
      }

      if (fm.draft) continue;

      const body = content.trim();
      posts.push({
        ...fm,
        slug: fileName.replace(/\.md$/, ""),
        categorySlug,
        body,
        toc: buildToc(body),
      });
    }
  }

  // 날짜 내림차순. 같은 날이면 제목순으로 안정 정렬한다.
  return posts.sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title, "ko") : b.date.localeCompare(a.date)));
}

function toSummary(post: Post): PostSummary {
  const { body, toc, ...summary } = post;
  return summary;
}

export function getAllPosts(): Post[] {
  return readPosts();
}

export function getPostSummaries(): PostSummary[] {
  return readPosts().map(toSummary);
}

export function getPost(categorySlug: string, slug: string): Post {
  const post = readPosts().find((p) => p.categorySlug === categorySlug && p.slug === slug);
  if (!post) throw new Error(`[blog] 없는 글입니다: ${categorySlug}/${slug}`);
  return post;
}

export function getPostsByCategory(categorySlug: string): PostSummary[] {
  return readPosts()
    .filter((p) => p.categorySlug === categorySlug)
    .map(toSummary);
}

export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of readPosts()) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  // tsconfig의 target이 es5라 Map 이터레이터를 전개(spread)하면 --downlevelIteration을 요구한다.
  // Array.from은 그 제약을 받지 않으므로 컴파일 옵션을 건드리지 않고 배열로 만든다.
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (a.count === b.count ? a.tag.localeCompare(b.tag) : b.count - a.count));
}

export function getPostsByTag(tag: string): PostSummary[] {
  return readPosts()
    .filter((p) => p.tags.includes(tag))
    .map(toSummary);
}

/** 같은 카테고리 안에서 이전/다음 글. 목록과 같은 정렬을 쓴다. */
export function getAdjacentPosts(
  categorySlug: string,
  slug: string
): { prev: PostSummary | null; next: PostSummary | null } {
  const list = getPostsByCategory(categorySlug);
  const i = list.findIndex((p) => p.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? list[i - 1] : null,
    next: i < list.length - 1 ? list[i + 1] : null,
  };
}
