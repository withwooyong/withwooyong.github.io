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
 *
 * 아틀라스 노드 상세도 같은 이유로 뺀다. 실측 2026-08-27 (인덱스 242 → 405, `/atlas/` 163 편입):
 * 쿼리 8종의 상위 10 에 들어온 `/atlas/…` 는 **17건이고 그 17건 전부**가 같은 목록 안에
 * `/blog/…` 원문을 이미 가진 중복이었다(최대 40% · 「RAG」·「컨텍스트」). 노드 상세가
 * 글의 제목·요약을 그대로 싣기 때문이다. 정보를 0 만큼 더하면서 서로 다른 글을 그만큼 밀어낸다.
 * 원문보다 위로 온 적은 한 번도 없으므로 **랭킹이 아니라 중복이 문제**이고, 그래서
 * 랭킹 조정이 아니라 제외로 푼다.
 *
 * ⚠️ 이 함수는 `scripts/generate-sitemap.mjs` 의 EXCLUDE 와 **같은 목록이 아니다.**
 *    sitemap 은 **검색엔진 노출**을, 이 함수는 **사이트 내부 검색**을 정한다.
 *    한쪽을 고칠 때 다른 쪽을 따라 고치지 마라.
 *
 * ⚠️ **2026-08-28(T13) 에 이 문단의 전제가 깨졌다. 낡은 근거를 남기지 않으려고 사실대로 적는다.**
 *    원래는 「저쪽이 빼는 `product-lead-wiki`·`product-lead-loadmap`·`notion` 8건을 여기서는
 *    남긴다 — 사이트 안에서는 갈 만한 곳이기 때문」이라고 돼 있었다. T13 이 `product-lead*`
 *    9 URL 을 `/work/` 로 보내는 리다이렉트 스텁으로 접으면서 그 8건 중 7건이 **갈 만한 곳이
 *    아니게 됐다** — 결과를 눌러 봐야 즉시 `/work/` 로 튕긴다.
 *
 *    그럼에도 **이 함수는 그 7건을 모르고, 알 필요도 없다.** 차단이 상류로 올라갔기 때문이다 —
 *    스텁 5개(정적 3 + wiki 2)가 `data-pagefind-ignore="all"` 을 달아 **Pagefind 색인에
 *    아예 들어오지 않는다.** 실측(2026-08-28, `npm run build` 직후): 색인 페이지 407 → 398,
 *    `out/pagefind/fragment` 안의 `/product-lead*` URL 0건.
 *    여기에 `/product-lead/` 규칙을 더하면 **이미 비어 있는 것을 거르는 죽은 가지**가 된다.
 *
 *    남아서 이 함수를 통과하는 리다이렉트는 `/notion/` 1건뿐이고, 그것은 그대로 남긴다 —
 *    외부 경력기술서로 가는 정상 목적지라 검색 결과에 있어도 손해가 아니다.
 */
export function isIndexNoise(url: string): boolean {
  if (!url) return false;
  // `/404/` 와 `/404.html` 이 둘 다 인덱싱돼 있다. **정확히 그 둘만** 잡는다 —
  // 접두 매칭(`indexOf("/404") === 0`)은 `/404-postmortem/` 같은 슬러그가 생기는 날
  // 정상 글을 조용히 삼킨다.
  if (url === "/404/" || url === "/404.html") return true;
  if (url.indexOf("/blog/tags/") === 0) return true;
  // 아틀라스는 **노드 상세만** 뺀다. `/atlas/` 목록 자체는 1건뿐이고 넓은 쿼리에서 좋은
  // 목적지라 남긴다 — **아틀라스에 한해서는** `scripts/generate-sitemap.mjs` 의
  // `/^atlas\/.+/` 와 같은 경계다(그 파일의 나머지 EXCLUDE 와는 다르다 — 위 주석 참조).
  // 접두에 슬래시를 붙여 두면 `/atlas-postmortem/` 같은 슬러그가 생겨도 걸리지 않는다.
  if (url.indexOf("/atlas/") === 0 && url !== "/atlas/") return true;
  return false;
}
