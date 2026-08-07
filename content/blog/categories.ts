/**
 * 블로그 카테고리 정의 — 단일 소스.
 *
 * slug는 URL이 되므로 한 번 정하면 바꾸지 않는다. 소문자 영문과 하이픈만 쓴다.
 * name은 화면에 보이는 한글 표시명이다.
 *
 * 2차에서 나머지 11개 카테고리를 여기에 추가한다.
 * 재편안은 docs/superpowers/specs/2026-08-07-tech-blog-requirements.md §7 참조.
 */
export type BlogCategory = {
  slug: string;
  name: string;
  description: string;
  /** 목록에서의 정렬 순서. 작을수록 앞. 중간 삽입을 위해 10 단위로 둔다 */
  order: number;
};

export const blogCategories: BlogCategory[] = [
  {
    slug: "search-engineering",
    name: "검색 엔지니어링",
    description: "Elasticsearch 아키텍처와 한글 검색 구현, 클러스터 운영과 트러블슈팅",
    order: 10,
  },
];

export function findCategory(slug: string): BlogCategory | undefined {
  return blogCategories.find((c) => c.slug === slug);
}

export function sortedCategories(): BlogCategory[] {
  return [...blogCategories].sort((a, b) => a.order - b.order);
}
