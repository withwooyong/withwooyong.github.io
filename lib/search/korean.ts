/**
 * 한국어 검색 질의 보정과 결과 잡음 판정.
 *
 * 규칙은 전부 실제 인덱스(242건) 위에서 측정해 정한 것이다. 임의로 넓히지 마라 —
 * `tests/search/collect-and-korean.test.ts` 의 오작동 대조군 20개가 그 방어선이다.
 */

/**
 * 조사 목록. **긴 것부터** 검사하므로 순서가 곧 우선순위다.
 *
 * 「도」는 일부러 없다 — 속도·빈도·제도·유사도·강도·밀도가 전부 오작동한다.
 * 실측: 대조군 20개 중 유일한 오작동이 「유사도」→「유사」였고, 「도」를 빼자 0건이 됐다.
 */
const PARTICLES = [
  "에서는",
  "으로는",
  "에게는",
  "이라는",
  "라는",
  "에서",
  "으로",
  "에게",
  "한테",
  "부터",
  "까지",
  "처럼",
  "보다",
  "마다",
  "이나",
  "라도",
  "든지",
  "이란",
  "란",
  "이며",
  "이고",
  "은",
  "는",
  "이",
  "가",
  "을",
  "를",
  "의",
  "에",
  "로",
  "와",
  "과",
  "만",
  "나",
];

/** 조사를 떼기 전 어절이 가져야 하는 최소 길이. 2글자 명사(평가·속도)를 보호한다. */
const MIN_WORD_LENGTH = 3;

/** 조사를 뗀 나머지가 가져야 하는 최소 길이. */
const MIN_STEM_LENGTH = 2;

/**
 * 마지막 어절의 조사를 뗀다. 뗄 수 없으면 입력을 그대로(trim 만) 돌려준다.
 *
 * 한국어 조사는 어절 끝에 붙으므로 **마지막 어절에만** 적용한다.
 * 실측 효과: 벡터가 3→56 · 검색엔진을 2→19 · 프롬프트를 44→131.
 */
export function stripParticle(query: string): string {
  const trimmed = query.trim();
  if (trimmed.length === 0) return trimmed;

  const words = trimmed.split(/\s+/);
  const last = words[words.length - 1];

  // 2글자 이하 어절은 건드리지 않는다. 조사처럼 끝나는 명사가 너무 많다.
  if (last.length < MIN_WORD_LENGTH) return trimmed;

  for (let i = 0; i < PARTICLES.length; i += 1) {
    const particle = PARTICLES[i];
    const stemLength = last.length - particle.length;
    if (stemLength < MIN_STEM_LENGTH) continue;
    if (last.slice(stemLength) !== particle) continue;

    words[words.length - 1] = last.slice(0, stemLength);
    return words.join(" ").trim();
  }

  return trimmed;
}

/**
 * 검색 결과로 보여줄 값어치가 없는 URL 인가.
 *
 * 인덱스 242건 중 태그 목록이 65건이라, 결과가 적은 쿼리일수록 태그가 상위를 뒤덮는다.
 * (실측: 「검색엔진」 상위 10 = 글 3 / 태그 4 / 카테고리 1 / 인덱스 1 / 페이지 1)
 *
 * 카테고리 목록(`/blog/ai-agent/`)과 `/blog/` 인덱스는 **남긴다** — 합쳐 7건뿐이라
 * 결과를 뒤덮지 못하고, 넓은 쿼리에서는 오히려 좋은 목적지다.
 */
export function isIndexNoise(url: string): boolean {
  if (!url) return false;
  // `/404/` 와 `/404.html` 이 둘 다 인덱싱돼 있다. **정확히 그 둘만** 잡는다 —
  // 접두 매칭(`indexOf("/404") === 0`)은 `/404-postmortem/` 같은 슬러그가 생기는 날
  // 정상 글을 조용히 삼킨다.
  if (url === "/404/" || url === "/404.html") return true;
  if (url.indexOf("/blog/tags/") === 0) return true;
  return false;
}
