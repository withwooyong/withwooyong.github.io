/**
 * 블로그 콘텐츠 타입 — 발행본 md와 페이지 사이의 계약.
 *
 * 로직이 없는 선언 전용 모듈이다. `fs`에 의존하지 않으므로 클라이언트에서 import해도 안전하다.
 */

import type { BlogSeries } from "@/content/blog/series";

/** 발행본 md의 YAML frontmatter. 요구사항 문서 §6-3 스키마와 1:1 대응한다. */
export type PostFrontmatter = {
  title: string;
  description: string;
  category: string;
  tags: string[];
  /** YYYY-MM-DD. 원본의 '작성 기준일' */
  date: string;
  /** YYYY-MM-DD. 변환·수정일 */
  updated?: string;
  /** 분할된 시리즈 식별자. 1차에서는 사용하지 않는다 */
  series?: string;
  seriesOrder?: number;
  /**
   * 편의 역할. 지도편은 카테고리 전체를 가리키는 것이 목적이라 들어오는 링크가 없어도 정상이다.
   * 링크 검사(tests/blog/content/links.test.ts)가 이 값으로 고립 판정에서 제외한다.
   */
  role?: "map";
  featured: boolean;
  draft: boolean;
};

export type TocEntry = { depth: 2 | 3; text: string; id: string };

/** frontmatter + 파일 경로에서 유도한 값 + 본문 */
export type Post = PostFrontmatter & {
  /** 파일명(확장자 제외). URL의 마지막 조각 */
  slug: string;
  /** 디렉터리명. category 필드와 일치해야 한다 */
  categorySlug: string;
  /** frontmatter를 제외한 마크다운 본문 */
  body: string;
  toc: TocEntry[];
};

/**
 * 목록 화면에서 쓰는 축약형.
 *
 * Next.js는 getStaticProps가 반환한 props를 HTML에 JSON으로 직렬화해 심는다.
 * 목록 페이지에 본문까지 넣으면 페이지 용량이 그만큼 커지므로 body·toc를 뺀다.
 */
export type PostSummary = Omit<Post, "body" | "toc">;

/** 시리즈에 속하지 않은 편을 묶는 가짜 시리즈의 슬러그. 실제 시리즈와 충돌하지 않도록 접두사를 둔다 */
export const STANDALONE_SLUG = "__standalone";

/** 트리의 잎. 링크를 만드는 데 필요한 최소한만 담는다 — 페이지 HTML 에 직렬화되기 때문이다 */
export type TreePost = {
  slug: string;
  title: string;
  /** 시리즈에 속하지 않으면 null */
  seriesOrder: number | null;
};

export type TreeSeries = {
  slug: string;
  name: string;
  posts: TreePost[];
};

export type TreeCategory = {
  slug: string;
  name: string;
  count: number;
  /**
   * 펼친 카테고리에만 채워진다. 나머지는 **빈 배열**이다.
   *
   * 전체 트리를 항상 싣는 안은 페이지당 약 18 KB 를 184편 × 4종 라우트 전부에 얹고
   * 발행본이 늘수록 같이 는다. 카테고리를 넘나드는 이동은 검색이 맡는다.
   */
  series: TreeSeries[];
};

export type BlogTree = {
  categories: TreeCategory[];
  /** 펼친 카테고리의 슬러그. 블로그 홈처럼 현재 카테고리가 없으면 null */
  expanded: string | null;
};

/**
 * 본문 페이지의 「n편 중 k번째」에 쓰는 시리즈 문맥.
 *
 * 🔴 이 타입이 loader.ts 가 아니라 여기에 사는 이유는 컴포넌트가 그것을 쓰기 때문이다.
 * 컴포넌트가 `@/lib/blog/loader` 를 가리키면 `node:fs` 가 클라이언트 번들에 들어간다.
 */
export type SeriesContext = {
  series: BlogSeries;
  posts: TreePost[];
  /** 1부터 센다. posts 안에서 현재 편이 몇 번째인가 */
  position: number;
};
