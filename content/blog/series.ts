/**
 * 블로그 시리즈 정의 — 단일 소스.
 *
 * `categories.ts` 와 같은 자리·같은 모양이다. 새 관례를 만들지 않는다.
 *
 * slug 는 발행본 frontmatter 의 `series` 값과 정확히 같아야 한다. 대조는
 * tests/blog/content/series.test.ts 가 발행본 전량에 대해 한다.
 *
 * name 은 사이드바 트리의 중간 층에 찍히는 한글 표시명이다. 이것이 없어서
 * 41개 시리즈가 데이터로만 있고 화면에 드러나지 않았다.
 *
 * order 는 URL 이 아니라 정렬값이라 언제든 바꿀 수 있다. 카테고리 안에서
 * 「기초 → 심화 → 사례 → Q&A」 순으로 둔다.
 */
export type BlogSeries = {
  slug: string;
  name: string;
  categorySlug: string;
  /** 카테고리 안에서의 정렬 순서. 작을수록 앞. 중간 삽입을 위해 10 단위로 둔다 */
  order: number;
};

export const blogSeries: BlogSeries[] = [
  // agentic-coding — 8개 · 28편
  { slug: "claude-md-context", name: "CLAUDE.md 와 컨텍스트 설계", categorySlug: "agentic-coding", order: 10 },
  { slug: "rules-hooks-skills", name: "규칙 · 훅 · 스킬", categorySlug: "agentic-coding", order: 20 },
  { slug: "claude-code-tools", name: "Claude Code 도구와 권한", categorySlug: "agentic-coding", order: 30 },
  { slug: "claude-code-extensions", name: "Claude Code 확장 메커니즘", categorySlug: "agentic-coding", order: 40 },
  { slug: "subagent-design", name: "서브에이전트 설계", categorySlug: "agentic-coding", order: 50 },
  { slug: "agent-definition-catalog", name: "에이전트 정의 카탈로그", categorySlug: "agentic-coding", order: 60 },
  { slug: "agent-operations", name: "에이전트 팀 운영", categorySlug: "agentic-coding", order: 70 },
  { slug: "agentic-coding-qna", name: "에이전틱 코딩 Q&A", categorySlug: "agentic-coding", order: 80 },

  // ai-agent — 15개 · 50편
  { slug: "agent-fundamentals", name: "에이전트 기초", categorySlug: "ai-agent", order: 10 },
  { slug: "langgraph-core", name: "LangGraph 핵심", categorySlug: "ai-agent", order: 20 },
  { slug: "langchain-fundamentals", name: "LangChain 기초", categorySlug: "ai-agent", order: 30 },
  { slug: "crewai-autogen", name: "CrewAI · AutoGen", categorySlug: "ai-agent", order: 40 },
  { slug: "multi-agent-patterns", name: "멀티에이전트 패턴", categorySlug: "ai-agent", order: 50 },
  { slug: "agent-architecture-2025", name: "2025 에이전트 아키텍처", categorySlug: "ai-agent", order: 60 },
  { slug: "self-correcting-rag", name: "자기교정 RAG", categorySlug: "ai-agent", order: 70 },
  { slug: "agent-harness", name: "Agent Harness", categorySlug: "ai-agent", order: 80 },
  { slug: "loop-engineering", name: "Loop Engineering", categorySlug: "ai-agent", order: 90 },
  { slug: "llm-app-trends", name: "LLM 앱 개발 동향", categorySlug: "ai-agent", order: 100 },
  { slug: "chatgpt-clone", name: "ChatGPT 클론 만들기", categorySlug: "ai-agent", order: 110 },
  { slug: "perplexity-clone", name: "Perplexity 클론 만들기", categorySlug: "ai-agent", order: 120 },
  { slug: "coding-agent", name: "코딩 에이전트", categorySlug: "ai-agent", order: 130 },
  { slug: "report-automation", name: "리포트 자동화", categorySlug: "ai-agent", order: 140 },
  { slug: "ai-agent-qna", name: "AI 에이전트 Q&A", categorySlug: "ai-agent", order: 150 },

  // ai-product-planning — 1개 · 9편
  { slug: "planning-harness", name: "기획 하네스", categorySlug: "ai-product-planning", order: 10 },

  // ai-transformation — 1개 · 3편
  { slug: "department-agents", name: "부서별 에이전트 설계", categorySlug: "ai-transformation", order: 10 },

  // backend-engineering — 8개 · 43편
  { slug: "database-fundamentals", name: "데이터베이스 기초", categorySlug: "backend-engineering", order: 10 },
  { slug: "database-scaling", name: "데이터베이스 확장", categorySlug: "backend-engineering", order: 20 },
  { slug: "redis-cache", name: "Redis 캐시", categorySlug: "backend-engineering", order: 30 },
  { slug: "spring-batch", name: "Spring Batch", categorySlug: "backend-engineering", order: 40 },
  { slug: "websocket-realtime", name: "WebSocket 실시간", categorySlug: "backend-engineering", order: 50 },
  { slug: "kafka-notification-center", name: "Kafka 알림센터", categorySlug: "backend-engineering", order: 60 },
  { slug: "auth-service-on-kubernetes", name: "쿠버네티스 인증 서비스", categorySlug: "backend-engineering", order: 70 },
  { slug: "cicd-automation", name: "CI/CD 자동화", categorySlug: "backend-engineering", order: 80 },

  // product-management — 2개 · 9편
  { slug: "product-management-domains", name: "도메인별 프로덕트 매니지먼트", categorySlug: "product-management", order: 10 },
  { slug: "product-management-practice", name: "프로덕트 실무 — 지표 · 데이터 · 팀 · 협업", categorySlug: "product-management", order: 20 },

  // rag — 7개 · 23편
  { slug: "rag-core-concepts", name: "RAG 핵심 개념", categorySlug: "rag", order: 10 },
  { slug: "rag-pipeline", name: "RAG 파이프라인", categorySlug: "rag", order: 20 },
  { slug: "document-parsing", name: "문서 파싱", categorySlug: "rag", order: 30 },
  { slug: "agentic-rag", name: "Agentic RAG", categorySlug: "rag", order: 40 },
  { slug: "dify-workflow", name: "Dify 워크플로우", categorySlug: "rag", order: 50 },
  { slug: "langgraph-modularization", name: "LangGraph 모듈화", categorySlug: "rag", order: 60 },
  { slug: "rag-qna", name: "RAG Q&A", categorySlug: "rag", order: 70 },
];

export function findSeries(slug: string): BlogSeries | undefined {
  return blogSeries.find((s) => s.slug === slug);
}

/**
 * @param source 시리즈 목록. 테스트에서 픽스처를 주입하기 위한 선택 인자다.
 */
export function seriesOfCategory(categorySlug: string, source: BlogSeries[] = blogSeries): BlogSeries[] {
  return source.filter((s) => s.categorySlug === categorySlug).sort((a, b) => a.order - b.order);
}
