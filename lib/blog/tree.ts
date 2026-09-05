import type { BlogCategory } from "@/content/blog/categories";
import { seriesOfCategory, type BlogSeries } from "@/content/blog/series";
import {
  STANDALONE_SLUG,
  type BlogTree,
  type PostSummary,
  type TreeCategory,
  type TreePost,
  type TreeSeries,
} from "@/lib/blog/types";

/**
 * 카테고리 → 시리즈 → 편의 3단 트리를 만든다.
 *
 * 🔴 **순수 함수이고 `fs` 를 모른다.** 그래야 픽스처로 단위 테스트할 수 있고, 실제
 * 발행본 184편이 아니라 몇 편짜리 표본으로 정렬 규칙을 고정할 수 있다.
 *
 * 펼침 범위는 `expanded` 하나뿐이다. 전체 트리를 항상 싣지 않는 이유는 설계서 §2-2 에 있다.
 *
 * @param posts      날짜 내림차순으로 정렬된 편 목록 (readPosts 의 출력 순서)
 * @param categories 표시할 카테고리. 호출부가 getPublishedCategories 로 걸러 넘긴다
 * @param series     시리즈 정의 전량
 * @param expanded   펼칠 카테고리 슬러그. 없으면 null
 */
export function buildTree(
  posts: PostSummary[],
  categories: BlogCategory[],
  series: BlogSeries[],
  expanded: string | null
): BlogTree {
  const nodes: TreeCategory[] = [];

  for (const category of categories) {
    const mine = posts.filter((p) => p.categorySlug === category.slug);
    // 편이 0편인 카테고리는 페이지도 없다. 트리에 이름만 남기면 죽은 링크가 된다.
    if (mine.length === 0) continue;

    nodes.push({
      slug: category.slug,
      name: category.name,
      count: mine.length,
      series: category.slug === expanded ? groupBySeries(mine, series, category.slug) : [],
    });
  }

  return { categories: nodes, expanded };
}

function toTreePost(post: PostSummary): TreePost {
  return { slug: post.slug, title: post.title, seriesOrder: post.seriesOrder ?? null };
}

/**
 * 한 카테고리의 편들을 시리즈로 묶는다. 독립편은 맨 뒤의 가짜 시리즈 하나로 모은다.
 *
 * 🔴 정의되지 않은 `series` 값을 만나면 **던진다.** 슬러그를 그대로 이름으로 쓰면
 * 화면에 `rag-pipeline` 같은 영문이 찍히는데, 그것은 조용한 불일치다 —
 * 이 리포가 반복해서 겪은 실패의 모양이다. tests/blog/content/series.test.ts 가
 * 먼저 잡지만, 그 검사를 지워도 빌드가 서도록 여기에도 둔다.
 */
function groupBySeries(posts: PostSummary[], series: BlogSeries[], categorySlug: string): TreeSeries[] {
  // 🔴 필터·정렬을 여기 다시 적지 않는다. 인라인으로 복제해 두었더니 series.ts 의
  // 뒤섞은 픽스처 케이스가 화면을 그리는 이 경로를 지키지 못했다. `series` 를 주입
  // 인자로 그대로 넘기므로 이 함수는 여전히 순수하고 `fs` 를 모른다.
  const defined = seriesOfCategory(categorySlug, series);
  const out: TreeSeries[] = [];

  for (const post of posts) {
    if (!post.series) continue;
    if (!defined.some((s) => s.slug === post.series)) {
      throw new Error(
        `[blog] ${categorySlug}/${post.slug}: series.ts 에 없는 시리즈입니다: ${post.series}`
      );
    }
  }

  for (const s of defined) {
    const members = posts
      .filter((p) => p.series === s.slug)
      .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
    if (members.length === 0) continue;
    out.push({ slug: s.slug, name: s.name, posts: members.map(toTreePost) });
  }

  // 독립편은 posts 가 들어온 순서(날짜 내림차순)를 그대로 유지한다.
  const standalone = posts.filter((p) => !p.series);
  if (standalone.length > 0) {
    out.push({ slug: STANDALONE_SLUG, name: "독립편", posts: standalone.map(toTreePost) });
  }

  return out;
}
