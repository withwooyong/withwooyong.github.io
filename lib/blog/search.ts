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

/** 질의를 공백으로 나누고 짧은 토큰을 버린다 */
export function tokenize(query: string): string[] {
  return normalize(query)
    .split(" ")
    .filter((t) => t.length >= MIN_QUERY_LENGTH);
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
