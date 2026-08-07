/**
 * 태그 통제 어휘 — 단일 소스. **닫힌 집합이다.**
 *
 * 변환자는 이 목록에서만 고른다. 목록 밖 문자열은 어떤 이유로도 쓰지 않는다.
 * 확정 사양은 docs/superpowers/specs/2026-08-07-tech-blog-requirements.md §13-3 참조.
 *
 * ## 왜 닫힌 집합인가
 *
 * 태그는 그대로 /blog/tags/<태그>/ URL이 되고 getPostsByTag는 정확 일치로 모은다.
 * 형식 검증(TAG_SLUG)만으로는 `redis`와 `redis-cache`, `kubernetes`와 `k8s`가
 * 각각 별개의 태그 페이지로 갈라지는 것을 막지 못한다 — 둘 다 형식은 옳기 때문이다.
 * 128편을 여러 배치로 나눠 변환하므로, 배치마다 표기가 흔들리면 태그 축이 무너진다.
 * 사람이 128편을 검수하는 것보다 빌드에서 막는 것이 싸다.
 *
 * ## 새 태그 추가 조건 (4개 전부 충족해야 한다)
 *
 *   1. 3편 이상이 달 수 있다
 *   2. 그중 2편 이상이 서로 다른 카테고리에 속한다 (교차성)
 *   3. 기존 태그의 상하위 개념으로 대체 불가하다
 *   4. `^[a-z0-9-]+$` 형식을 만족한다
 *
 * **변환자는 새 태그를 스스로 추가하지 않는다.** 후보와 근거만 기록해 컨트롤러에게 넘긴다 —
 * 변환자는 자기 문서만 보므로 조건 ①②를 검증할 수 없다. 실제로 `django`가 조건 ①은
 * 만족했지만 단일 카테고리 전용이라 ②에서 탈락해 82 → 81종이 됐다.
 *
 * ## 부여 규칙 요약
 *
 * 문서당 4개 권장(허용 3~5, 상한 6은 예외). **같은 패싯에서 최대 2개** — 방치하면
 * AI 계열 문서의 태그 4개가 전부 패싯 C가 되어 교차성을 잃는다.
 * 카테고리 슬러그와 중복 금지(단 `rag`·`agentic-coding`은 교차 가치가 커서 예외).
 */

/** 패싯 A — 기술 스택. 고유명사로 된 제품·언어·프레임워크 (15) */
const STACK = [
  "elasticsearch",
  "redis",
  "kafka",
  "kubernetes",
  "docker",
  "aws",
  "spring",
  "java",
  "python",
  "langchain",
  "langgraph",
  "mcp",
  "nosql",
  "nori",
  "lucene",
] as const;

/** 패싯 B — 엔지니어링 개념. 스택에 종속되지 않는 문제·기법 (21) */
const ENGINEERING = [
  "caching",
  "concurrency",
  "performance-tuning",
  "load-testing",
  "observability",
  "troubleshooting",
  "ci-cd",
  "deployment",
  "database",
  "distributed-systems",
  "event-driven",
  "batch-processing",
  "data-pipeline",
  "cdc",
  "cqrs",
  "microservices",
  "api-design",
  "authentication",
  "security",
  "scalability",
  "migration",
] as const;

/** 패싯 C — AI/LLM 개념. 벤더·모델명은 넣지 않는다 — 시간이 지나면 죽는다 (17) */
const AI = [
  "rag",
  "llm",
  "ai-agent",
  "multi-agent",
  "agentic-rag",
  "embedding",
  "vector-database",
  "prompt-engineering",
  "context-engineering",
  "claude-code",
  "ai-governance",
  "evaluation",
  "human-in-the-loop",
  "model-serving",
  "knowledge-graph",
  "ai-automation",
  "machine-learning",
] as const;

/** 패싯 D — 프로덕트·조직. 도메인과 일하는 방식 (18) */
const PRODUCT = [
  "product-strategy",
  "product-discovery",
  "prd",
  "product-metrics",
  "data-driven",
  "ab-testing",
  "user-research",
  "commerce",
  "payments",
  "saas",
  "global-service",
  "ott",
  "startup",
  "team-building",
  "org-design",
  "engineering-leadership",
  "career",
  "knowledge-management",
] as const;

/** 패싯 E — 검색·추천. 저자의 20년 축이라 별도 패싯으로 둔다 (9) */
const SEARCH = [
  "search-architecture",
  "search-ranking",
  "search-quality",
  "search-internals",
  "indexing",
  "korean-nlp",
  "autocomplete",
  "cluster-ops",
  "recommender-systems",
] as const;

/**
 * 패싯 F — 기타 (1).
 *
 * `terminology`는 `glossary` 카테고리 슬러그와의 이름 충돌을 피하려고 개명한 것이다.
 */
const MISC = ["terminology"] as const;

/**
 * 표기 통일 — 아래 표기는 **쓰지 않는다.** 어휘에 없으므로 빌드가 막는다.
 * 한 저자가 같은 개념을 여러 표기로 쓴 것이 143편 실측에서 확인됐다.
 *
 *   kubernetes      ← k8s, 쿠버네티스
 *   llm             ← gpt, chatgpt, claude, openai, ollama
 *   observability   ← monitoring, 모니터링, 관측성, elk, prometheus
 *   ci-cd           ← ci/cd  (슬래시는 URL 경로 구분자라 사용 불가)
 *   rag/agentic-rag ← self-rag, crag, adaptive-rag, graphrag
 *   troubleshooting ← 장애대응, 장애시나리오, 디버깅
 *   authentication  ← 인증, 인가, oauth2, jwt, opa
 */
export const blogTags: readonly string[] = [
  ...STACK,
  ...ENGINEERING,
  ...AI,
  ...PRODUCT,
  ...SEARCH,
  ...MISC,
];

/** 조회용. 검증은 편당 최대 6회 도는 뜨거운 경로라 배열 순회 대신 Set을 쓴다 */
const TAG_SET: ReadonlySet<string> = new Set(blogTags);

export function isKnownTag(tag: string): boolean {
  return TAG_SET.has(tag);
}
