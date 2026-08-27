/**
 * Pagefind excerpt 새니타이저.
 *
 * UI 는 `excerpt` 를 `dangerouslySetInnerHTML` 로 넣는다 — `<mark>` 하이라이트를
 * 살려야 하기 때문이다. 그런데 pagefind 의 content 는 **이스케이프되지 않은 채**
 * 저장된다(조각 242개를 inflate 해 스캔한 실측: `&lt;` 0건, 원시 `<td>` 9건 · `<img` 3건).
 *
 * 오늘 인덱스에는 `<script`·`onerror=`·`javascript:`·`<iframe` 이 0건이라 XSS 는 없다.
 * 다만 **깨진 렌더는 오늘도 재현되고**, 그런 예제 코드를 담은 글이 한 편 올라오면
 * 그날로 XSS 가 열린다. 그래서 인덱스 상태와 무관하게 여기서 막는다.
 */

/**
 * excerpt 에서 무속성 `<mark>` 만 남기고 나머지 태그를 무력화한다.
 *
 * `<` `>` 를 엔티티로 바꾼 뒤 `<mark>`·`</mark>` 만 되살리는 방식이라,
 * 본문 코드블록의 `<img ...>` 같은 것은 **글자 그대로 보인다** — 조용히 사라지는 것보다 낫다.
 *
 * `&` 는 **일부러 건드리지 않는다.** pagefind content 가 이스케이프돼 있지 않으므로
 * `&` 를 다시 이스케이프하면 본문의 `&` 가 `&amp;` 로 보이는 이중 이스케이프가 된다.
 * (부작용: 원문이 정말로 `&lt;mark&gt;` 라는 글자를 담고 있으면 진짜 `<mark>` 로 되살아난다.
 *  실측상 인덱스 전체에 `&lt;` 가 0건이고, 되살아나 봐야 무속성 `<mark>` 뿐이라 무해하다.)
 */
export function safeExcerpt(html: string): string {
  if (!html) return "";

  const escaped = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // 무속성 소문자 태그만 되살린다. `<mark class="x">`·`<mark onclick=...>` 은 텍스트로 남는다.
  return escaped
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}
