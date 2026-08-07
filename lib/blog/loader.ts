import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { sortedCategories, type BlogCategory } from "@/content/blog/categories";
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

      // 개행을 LF로 정규화한다. Windows에서 git이 md를 CRLF로 체크아웃하므로,
      // 그대로 두면 같은 커밋에서도 빌드 플랫폼에 따라 산출물이 달라진다
      // (body는 props로 __NEXT_DATA__에 직렬화되어 HTML에 실린다).
      const body = content.replace(/\r\n/g, "\n").trim();
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

export function getPostsByCategory(categorySlug: string, root?: string): PostSummary[] {
  return readPosts(root)
    .filter((p) => p.categorySlug === categorySlug)
    .map(toSummary);
}

/**
 * 글이 1편 이상인 카테고리만. 빈 카테고리는 페이지도 목록도 만들지 않는다.
 *
 * categories.ts에는 12개가 등록돼 있지만 이는 변환 시 frontmatter의 category가
 * validateFrontmatter를 통과하기 위한 것이고, 실제 글은 그중 일부에만 있다.
 * 등록된 전부를 노출하면 글 0편인 카테고리 페이지가 생성돼 sitemap에 실리고 색인되는데,
 * 빈 페이지가 색인되면 "콘텐츠 없음"으로 평가받아 사이트 품질 신호에 영향을 준다.
 *
 * draft는 readPosts가 이미 걸러내므로, 초안만 있는 카테고리도 0편으로 취급돼 제외된다.
 * 정렬은 sortedCategories()의 order를 그대로 따른다 — 글 수나 디렉터리 순서가 아니다.
 *
 * @param root 콘텐츠 루트. 테스트에서 픽스처를 주입하기 위한 선택 인자다.
 */
export function getPublishedCategories(root?: string): BlogCategory[] {
  const posts = readPosts(root);
  return sortedCategories().filter((c) => posts.some((p) => p.categorySlug === c.slug));
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

/** 정렬이 끝난 목록에서 slug의 앞뒤를 집는다. */
function neighbors(
  list: PostSummary[],
  slug: string
): { prev: PostSummary | null; next: PostSummary | null } {
  const i = list.findIndex((p) => p.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? list[i - 1] : null,
    next: i < list.length - 1 ? list[i + 1] : null,
  };
}

/**
 * 이전/다음 글. 시리즈에 속한 글이면 시리즈를 우선한다.
 *
 * - `series`가 있으면 같은 시리즈 안에서 `seriesOrder` 순으로 잇는다.
 * - `series`가 없으면 종전대로 카테고리 목록 순서(날짜 내림차순)의 이웃이다.
 *
 * 시리즈를 분기하는 이유는 카테고리 정렬이 시리즈 순서를 보존하지 못하기 때문이다.
 * 분할된 긴 글은 한 원본에서 나오므로 date가 전부 같고, 그러면 readPosts의 정렬이
 * 제목 localeCompare 타이브레이커로 넘어간다. 결과적으로 카테고리 순서가 제목 가나다순이
 * 되어 같은 시리즈의 편들이 서로 떨어지고, 사이에 무관한 시리즈의 글이 끼어든다.
 * (실제로 2차 rag 카테고리에서 시리즈 소속 23편 중 22편의 이웃이 다른 시리즈를 가리켰다.
 *  1차에는 시리즈가 없어 이 경로가 한 번도 실행되지 않았다.)
 *
 * 시리즈는 닫힌 단위로 둔다 — 1편의 prev와 마지막 편의 next는 null이다.
 * 시리즈 밖으로 넘기면 "이전 글"의 뜻이 시리즈 내부(같은 글의 앞 부분)와
 * 외부(무관한 다른 글)에서 달라져 읽는 사람이 혼란스럽다.
 *
 * @param root 콘텐츠 루트. 테스트에서 픽스처를 주입하기 위한 선택 인자다.
 */
export function getAdjacentPosts(
  categorySlug: string,
  slug: string,
  root?: string
): { prev: PostSummary | null; next: PostSummary | null } {
  const list = getPostsByCategory(categorySlug, root);
  const current = list.find((p) => p.slug === slug);
  if (!current) return { prev: null, next: null };

  if (current.series) {
    // seriesOrder는 series가 있으면 반드시 있다(validateFrontmatter가 강제한다).
    // ?? 0은 타입 좁히기용이며 실제로 쓰이는 경로가 아니다.
    const siblings = list
      .filter((p) => p.series === current.series)
      .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
    return neighbors(siblings, slug);
  }

  return neighbors(list, slug);
}
