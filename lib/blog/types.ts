/**
 * 블로그 콘텐츠 타입 — 발행본 md와 페이지 사이의 계약.
 *
 * 로직이 없는 선언 전용 모듈이다. `fs`에 의존하지 않으므로 클라이언트에서 import해도 안전하다.
 */

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
  featured: boolean;
  draft: boolean;
  /** 학습 출처 표기 */
  source?: string;
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
