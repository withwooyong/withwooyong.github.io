/**
 * 검색 매칭 — 클라이언트 번들에 들어가는 유일한 검색 로직이다.
 *
 * 🔴 **토크나이저를 쓰지 않는다.** 한국어는 조사가 낱말에 붙으므로 「랭그래프」로
 * 검색했을 때 「랭그래프를」이 걸려야 하는데, 토크나이저는 이 둘을 다른 토큰으로
 * 만든다. 같은 기전이 이 리포의 도구 함정 목록에도 있다 — `**IDOL**을` 이
 * `IDOL을` 과 매칭되지 않는 것과 같은 문제다.
 *
 * 그래서 판정은 **부분 문자열 포함**이다. 대신 1자 질의는 결과가 폭증하고 순위가
 * 무의미해지므로 2자를 하한으로 둔다.
 *
 * 🔴 **하한을 재는 대상은 질의 전체이지 토큰이 아니다.** 토큰마다 재면 「AI 훅」이
 * 「ai」 하나로 줄어 훅과 무관한 편이 쏟아지는데, 낱말이 버려졌다는 표시가 사용자에게
 * 없다 (실측 20건). 「훅 설계」가 「설계」와 완전히 같은 결과를 내기도 했다. 훅·앱·봇·폼
 * 같은 1음절 명사가 이 블로그의 주제어이므로, `tokenize` 는 **아무 토큰도 버리지 않고**
 * 문턱은 `search` 가 정규화한 질의 전체에 한 번만 적용한다.
 *
 * `fs` 도 DOM 도 모른다. 인덱스 없이 픽스처만으로 테스트된다.
 */

/** 인덱스의 편 하나. 키가 한 글자인 이유는 184편 × 2,671 헤딩만큼 반복되기 때문이다 */
export type IndexPost = {
  /** 카테고리 슬러그 */
  c: string;
  /** 편 슬러그 */
  s: string;
  /** 제목 */
  t: string;
  /** 설명 */
  d: string;
  /** 태그 */
  g: string[];
  /** 시리즈 슬러그 */
  e?: string;
  /** 시리즈 순서 */
  o?: number;
  /** 헤딩 — [텍스트, 앵커 id] */
  h: [string, string][];
};

export type SearchIndex = { v: number; posts: IndexPost[] };

/**
 * 이 파일이 읽을 줄 아는 인덱스 스키마의 판.
 *
 * 🔴 정본은 `scripts/build-search-index.mjs` 의 `SCHEMA_VERSION` 이고 이것은 그 사본이다.
 * `.mjs` 는 TypeScript 를 import 할 수 없어 상수를 공유할 수 없으므로, 둘이 조용히
 * 어긋나지 못하게 `tests/blog/search.test.ts` 가 생성기 소스에서 리터럴을 읽어 대조한다.
 * 한쪽만 바꾸면 그 케이스가 떨어진다.
 */
export const SCHEMA_VERSION = 1;

/**
 * 네트워크로 받은 JSON 이 이 파일이 다룰 수 있는 인덱스인가.
 *
 * 🔴 이것이 없으면 형태가 다른 JSON 이 `search` 안에서 던지는데, 그 예외는 렌더 중에
 * 나가므로 **팔레트가 아니라 페이지 전체가 죽는다** (실측: `search({v:2}, "…")` →
 * `TypeError: index.posts is not iterable`). `res.ok` 만 보는 실패 처리로는 이 경로를
 * 받지 못한다.
 */
export function isSearchIndex(value: unknown): value is SearchIndex {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { v?: unknown; posts?: unknown };
  return candidate.v === SCHEMA_VERSION && Array.isArray(candidate.posts);
}

export type SearchHit = {
  post: IndexPost;
  score: number;
  headings: { text: string; id: string }[];
};

export const MIN_QUERY_LENGTH = 2;
export const MAX_RESULTS = 20;
export const MAX_HEADINGS = 3;

const SCORE = { title: 100, titleFront: 50, tag: 80, heading: 40, headingFront: 20, description: 20 };

/** 유니코드 NFC · 소문자화 · 연속 공백 축약. 마크업은 인덱스를 만들 때 이미 벗겨져 있다 */
export function normalize(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * 질의를 공백으로 나눈다. **길이로 토큰을 버리지 않는다** — 1글자 토큰도 살린다.
 *
 * 빈 문자열만 걸러낸다 (정규화가 연속 공백을 이미 줄였으므로 빈 질의일 때만 생긴다).
 */
export function tokenize(query: string): string[] {
  return normalize(query)
    .split(" ")
    .filter((t) => t.length > 0);
}

/** 한 필드에서 토큰 하나가 얻는 점수. 매치가 없으면 0 */
function scoreField(field: string, token: string, base: number, frontBonus: number): number {
  const at = field.indexOf(token);
  if (at === -1) return 0;
  return at === 0 ? base + frontBonus : base;
}

function scorePost(post: IndexPost, tokens: string[]): SearchHit | null {
  const title = normalize(post.t);
  const description = normalize(post.d);
  const tags = post.g.map(normalize);
  const headings = post.h.map(([text, id]) => ({ text, id, key: normalize(text) }));

  let total = 0;
  const matched = new Map<string, { text: string; id: string }>();

  for (const token of tokens) {
    let best = 0;

    best += scoreField(title, token, SCORE.title, SCORE.titleFront);
    if (tags.some((tag) => tag === token)) best += SCORE.tag;
    best += scoreField(description, token, SCORE.description, 0);

    for (const heading of headings) {
      const gained = scoreField(heading.key, token, SCORE.heading, SCORE.headingFront);
      if (gained === 0) continue;
      best += gained;
      // 같은 헤딩이 여러 토큰에 걸려도 한 번만 단다.
      if (!matched.has(heading.id)) matched.set(heading.id, { text: heading.text, id: heading.id });
    }

    // 🔴 전 토큰 AND. 하나라도 어디에도 없으면 이 편은 결과가 아니다.
    if (best === 0) return null;
    total += best;
  }

  return { post, score: total, headings: Array.from(matched.values()).slice(0, MAX_HEADINGS) };
}

/**
 * 편 단위로 묶어 점수순으로 돌려준다.
 *
 * 동점이면 시리즈 순서 → 제목 가나다순이다. 정렬 기준이 없으면 같은 점수의 편들이
 * 빌드마다 다른 차례로 나오는데, 그러면 같은 질의가 다른 화면을 만든다.
 */
export function search(index: SearchIndex, query: string): SearchHit[] {
  // 🔴 문턱은 여기 한 곳에만 있다. 토큰마다 재면 낱말이 조용히 버려진다.
  if (normalize(query).length < MIN_QUERY_LENGTH) return [];

  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const post of index.posts) {
    const hit = scorePost(post, tokens);
    if (hit) hits.push(hit);
  }

  hits.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    const ao = a.post.o ?? Number.MAX_SAFE_INTEGER;
    const bo = b.post.o ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.post.t.localeCompare(b.post.t, "ko");
  });

  return hits.slice(0, MAX_RESULTS);
}
