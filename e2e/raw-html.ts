/**
 * 배포물 **원문**에서 값을 뽑는 도구.
 *
 * 이 스위트가 DOM 말고 원문을 따로 재는 이유는 실측 때문이다 — 산출물에서
 * `<link rel="canonical">` 을 통째로 지워도 DOM 검사는 **초록이었다.** next/head 가
 * 하이드레이션 때 다시 꽂아 넣기 때문이다. 그런데 슬랙·카카오톡 언펄과 상당수 크롤러는
 * **JS 를 돌리기 전 HTML** 을 읽는다. 즉 DOM 만 재면 그 독자들을 못 본다.
 * 리포의 `check-forbidden:built` 가 존재하는 이유와 같은 구조다.
 *
 * ⚠️ `String.prototype.matchAll` 을 쓰지 마라. tsconfig 의 `target` 이 `es5` 라
 *    이터레이터 전개가 `TS2802` 로 막히고, **tsconfig 는 이 리포에서 동결이다**(CLAUDE.md:
 *    target 을 바꾸면 프로젝트 전체가 재방출돼 「기존 페이지 불변」 보장이 깨진다).
 *    배열 반복은 es5 에서도 다운레벨되므로 `match(/…/g)` + `for…of` 로 간다.
 */
function hrefsOf(html: string, tagPattern: RegExp): string[] {
  const tags = html.match(tagPattern);
  if (!tags) return [];
  const hrefs: string[] = [];
  for (const tag of tags) {
    const href = tag.match(/\bhref="([^"]*)"/);
    if (href) hrefs.push(href[1]);
  }
  return hrefs;
}

/**
 * 정적 HTML 안의 canonical href 들.
 *
 * 개수를 그대로 돌려주는 것이 중요하다 — 0(누락)과 2 이상(중복 선언)은 서로 다른 결함이고,
 * 둘 다 「자기 자신을 가리키는가」와 별개로 잘못이다.
 */
export function canonicalHrefs(html: string): string[] {
  return hrefsOf(html, /<link[^>]*\brel="canonical"[^>]*>/g);
}

/**
 * 정적 HTML 안에서 `aria-current="page"` 로 표시된 `<a>` 의 href 들.
 *
 * 헤더가 데스크톱 내비와 드로어 **양쪽**에 같은 항목을 렌더하므로 보통 2건 이상 나온다.
 * 그래서 개수로 판정하지 말고 「전부 같은 곳을 가리키는가」로 판정한다.
 */
export function activeLinkHrefs(html: string): string[] {
  return hrefsOf(html, /<a\b[^>]*\baria-current="page"[^>]*>/g);
}
