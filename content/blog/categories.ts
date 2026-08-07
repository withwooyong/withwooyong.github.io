/**
 * 블로그 카테고리 정의 — 단일 소스.
 *
 * slug는 URL이 되므로 한 번 정하면 바꾸지 않는다. 소문자 영문과 하이픈만 쓴다.
 * name은 화면에 보이는 한글 표시명이다.
 *
 * 143편 전수 조사로 12개가 확정됐다.
 * 확정 사양은 docs/superpowers/specs/2026-08-07-tech-blog-requirements.md §13-1 참조.
 *
 * order는 URL이 아니라 정렬값이라 언제든 바꿀 수 있다. 배치 원리는
 * "지금 무엇을 하는 사람인가(10~30) → 그것을 뒷받침하는 실증(40~70) → 폭(80~110) → 참고(120)"다.
 */
export type BlogCategory = {
  slug: string;
  name: string;
  description: string;
  /** 목록에서의 정렬 순서. 작을수록 앞. 중간 삽입을 위해 10 단위로 둔다 */
  order: number;
};

export const blogCategories: BlogCategory[] = [
  // 10~30 정체성
  {
    slug: "ai-transformation",
    name: "AI 전환 조직",
    description: "AI를 개인기가 아닌 조직 역량으로 만드는 운영철학·역할설계·도입 로드맵",
    order: 10,
  },
  {
    slug: "agentic-coding",
    name: "에이전틱 코딩",
    description:
      "Claude Code로 짓는 개발 워크플로 — 컨텍스트 엔지니어링, MCP·Skills·Hooks, 멀티에이전트",
    order: 20,
  },
  {
    slug: "ai-agent",
    name: "AI 에이전트",
    description:
      "LangGraph·CrewAI 프레임워크 비교부터 멀티에이전트 패턴과 2026 에이전트 아키텍처 담론까지",
    order: 30,
  },
  // 40~70 실증
  {
    slug: "rag",
    name: "RAG · 검색증강생성",
    description: "RAG 파이프라인 8단계와 문서 파싱, Agentic RAG의 자기교정, GraphRAG",
    order: 40,
  },
  {
    slug: "search-engineering",
    name: "검색 엔지니어링",
    description: "Elasticsearch 아키텍처와 한글 검색 구현, 클러스터 운영과 트러블슈팅",
    order: 50,
  },
  {
    slug: "high-traffic",
    name: "대용량 트래픽",
    description: "동시성 제어·캐시·EDA·CDC로 푸는 트래픽 문제와 무중단 마이그레이션",
    order: 60,
  },
  {
    slug: "backend-engineering",
    name: "백엔드 엔지니어링",
    description: "DB 모델링·확장부터 Spring Batch, DDD·헥사고날, 그리고 기술 선택의 근거",
    order: 70,
  },
  // 80~110 폭
  {
    slug: "platform-architecture",
    name: "플랫폼 아키텍처",
    description: "공통 어드민·BFF, 인가 중앙화, i18n과 글로벌 서비스, 플랫폼 성과지표",
    order: 80,
  },
  {
    slug: "python-ml-serving",
    name: "Python · ML 서빙",
    description:
      "Django·FastAPI 기반 데이터 파이프라인과 추천 모델 서빙, private LLM과 vLLM 배포",
    order: 90,
  },
  {
    slug: "product-management",
    name: "프로덕트 매니지먼트",
    description: "커머스·핀테크·B2B SaaS 등 도메인별 프로덕트 실무와 PM/PO 직무론",
    order: 100,
  },
  {
    slug: "ai-product-planning",
    name: "AI 제품 기획",
    description: "AI를 비평가로 세우는 기획 하네스, 세컨드 브레인, AI 제품의 COGS와 그라운딩",
    order: 110,
  },
  // 120 참고
  {
    slug: "glossary",
    name: "용어사전",
    description: "AI·인프라·플랫폼 용어와 직책·직급 체계 정리",
    order: 120,
  },
];

export function findCategory(slug: string): BlogCategory | undefined {
  return blogCategories.find((c) => c.slug === slug);
}

export function sortedCategories(): BlogCategory[] {
  return [...blogCategories].sort((a, b) => a.order - b.order);
}
