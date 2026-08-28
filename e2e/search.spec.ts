import { expect, test, type Locator, type Page } from "@playwright/test";
import { SHELL_HOME, SHELL_MARKER, gotoWithShell, shellIsMounted } from "./shell-gate";

/**
 * `⌘K` 검색 E2E.
 *
 * 팔레트는 `components/site-shell.tsx` 에 마운트되므로 **셸이 붙은 페이지에서만** 존재한다.
 * 아틀라스·검색 계획서 **T13**(「/atlas 조립 · 셸 부착」)이 `/atlas/` 에 셸을 붙였으므로
 * 아래 팔레트 검사는 지금 전부 돈다. **skip 이 하나라도 보이면 셸이 사라진 것이다.**
 *
 * ⚠️ 게이트를 지우지 마라. 「셸이 없어서 조용하다」와 「팔레트가 고장났다」는 다른 실패이고,
 *    이 파일의 빨강은 **정확히 하나**를 뜻해야 한다. 그 대응이 `shell-gate.ts` 의 게이트와
 *    아래 센티넬의 쌍이다 — 게이트가 skip 을 내면 센티넬이 대신 빨개진다.
 *
 * ⚠️ `shell.spec.ts` 에도 같은 모양의 셸 센티넬이 있다. **중복이 아니라 의도다.**
 *    센티넬의 임무는 「이 파일의 skip 이 정당한가」를 그 파일 안에서 답하는 것이라,
 *    스위트마다 하나씩 있어야 한다. 다른 파일의 센티넬을 믿고 여기서 빼면
 *    `search.spec.ts` 만 열어 본 사람에게는 10건의 침묵을 설명할 것이 없다.
 *    두 센티넬은 메시지가 달라 무엇이 잠들어 있는지를 각자 말한다.
 *
 * ⚠️ **센티넬-게이트 쌍은 「전부 돌릴 때」만 성립한다.** 센티넬이 별도 `describe` 라
 *    `-g "검색 팔레트"` 같은 필터를 걸면 센티넬이 통째로 빠지고 **`4 skipped` · 종료코드 0** —
 *    완벽한 조용한 초록이 된다(2026-08-27 실측). 필터 실행의 초록을 근거로 삼지 마라.
 */

/**
 * 로케이터 3종은 **전부 실측으로 정해졌다.** 「이게 자연스럽다」로 고르면 조용히 틀린다.
 *
 * 2026-08-26 · T5 (이 구조를 그대로 옮긴 Playwright 픽스처 · 계획서 §「T5 실측 기록」④):
 *
 *   | 로케이터                                            | 결과 |
 *   | --------------------------------------------------- | ---: |
 *   | getByRole("dialog", { name: "사이트 검색", exact })  |    1 |
 *   | locator('[role="dialog"]')                          |  **2** ← 숨은 모바일 드로어를 함께 센다
 *   | getByRole("textbox", { name: "검색어" })            |  **0** ← 입력이 role="combobox" 다
 *   | getByLabel("검색어", { exact: true })               |    1 |
 *   | 다이얼로그 안 getByRole("link")                      |    2 |
 *
 * ① `locator('[role="dialog"]')` 는 **숨김을 무시하고 센다.** 이 리포의 모바일 드로어는
 *    닫혀도 DOM 에 남으므로 2가 나온다. 「다이얼로그가 하나뿐이다」를 그 로케이터로 쓰면
 *    영원히 실패한다. 접근성 로케이터(`getByRole`)는 `display:none` 을 빼고 세어 1이다.
 * ② 입력에는 `role="combobox"` 가 있다(`aria-expanded`·`aria-controls` 때문). combobox 는
 *    textbox 를 **상속하지 않으므로** `getByRole("textbox")` 로 잡히지 않는다.
 * ③ `exact: true` 를 뺀 `name` 은 **부분 문자열 매칭**이라 접근명이 오염돼도 초록이 나온다.
 *    이 리포에서 실제로 확인한 함정이다(`CLAUDE.md` 함정표).
 *
 * ⚠️ 위 표의 「첫 href」는 **픽스처의 값**이고 실인덱스와 다르다. 2026-08-27 에 실서버로
 *    잰 「임베딩」 1위는 `/blog/rag/rag-pipeline-retrieval/` 다. 표를 실측 랭킹으로 읽지 마라.
 */
function palette(page: Page): Locator {
  return page.getByRole("dialog", { name: "사이트 검색", exact: true });
}

function searchInput(page: Page): Locator {
  return page.getByLabel("검색어", { exact: true });
}

/**
 * 결과 목록 안의 링크 전부.
 *
 * ⚠️ 「다이얼로그 안 링크」로 쓰지 마라 — 계획서 초안이 그렇게 돼 있었다.
 *    조사 제안(「벡터를」 → 「벡터」)은 지금 `<button>` 이라 `getByRole("link")` 를
 *    오염시키지 않지만, **그건 구현이 우연히 그런 것이지 계약이 아니다.** 초안대로 두면
 *    제안을 `<a>` 로 바꾸는 순간 이 검사가 빨개지고, 메시지는 「링크의 href 가 /blog/ 가
 *    아니다」라고만 말한다 — 원인을 가리키지 않는 빨강이다.
 *
 *    `role="listbox"`(결과 목록) 안으로 좁히면 그 결합이 **아예 없어진다.** 제안이
 *    링크가 되든 버튼으로 남든 이 검사는 같은 것을 본다.
 */
function resultLinks(page: Page): Locator {
  return palette(page)
    .getByRole("listbox", { name: "검색 결과", exact: true })
    .getByRole("link");
}

test.describe("검색 센티넬 (게이트를 통과하지 않는다)", () => {
  test(`셸이 ${SHELL_HOME} 에 붙어 있다 — 이게 빨간 동안 이 파일의 팔레트 검사 6종은 skip 된다`, async ({
    page,
  }) => {
    await page.goto(SHELL_HOME);

    /*
     * ⚠️ 센티넬은 게이트와 **똑같은 술어**로 판정해야 한다.
     *
     *    `expect(locator).toHaveCount(1)` 은 5초까지 **재시도**하는데 게이트
     *    (`shellIsMounted`)는 `count()` 를 **즉시 한 번** 본다. 두 술어를 섞으면
     *    「표지가 하이드레이션 이후에 생기는」 구현에서 **센티넬은 초록인데 게이트는 계속
     *    skip** 인 상태가 만들어진다 — `shell-gate.ts` 가 경고하는 그 상태가 경로가 아니라
     *    **타이밍**으로 재현된다. 오늘은 표지가 정적 HTML 에 있어 안 터지지만, T13 이
     *    `pages/atlas/index.tsx` 에 `dynamic(..., { ssr: false })` 를 쓰면 그날 터진다.
     *
     *    그래서 ①은 게이트 술어 그대로, ②만 별도로 둔다.
     */
    expect(
      await shellIsMounted(page),
      `${SHELL_HOME} 에 data-site-shell 이 없다. 셸을 붙이는 T13 이전이면 정상이고, 그 뒤면 회귀다`,
    ).toBe(true);

    // ② 셸이 두 번 마운트되는 회귀는 게이트가 못 잡는다(둘 다 「> 0」이다). 여기서 잡는다.
    await expect(
      page.locator(SHELL_MARKER),
      "data-site-shell 이 2개 이상이다 — 셸이 중첩 마운트됐다",
    ).toHaveCount(1);
  });

  /**
   * 이건 셸과 무관하다 — T3(Pagefind 파이프라인)의 산출물이므로 **지금 초록이어야 한다.**
   *
   * 게이트에 넣지 않는 이유가 그것이다. 인덱스가 깨진 것을 셸 미부착과 같은 침묵으로
   * 덮으면, T13 에서 팔레트를 켜는 순간 「팔레트가 고장났다」로 읽히는 빨강이 나온다.
   * 원인은 빌드 파이프라인인데 화면을 뒤지게 된다.
   *
   * `pagefind` 는 **아무것도 색인하지 않아도 종료코드 0 이다**(`CLAUDE.md`). 그래서
   * 파일의 존재가 아니라 **내용**을 본다 — 한국어가 잡혔는지까지.
   */
  test("pagefind 인덱스가 배포물에 있고 한국어가 잡혀 있다", async ({ page }) => {
    const res = await page.request.get("/pagefind/pagefind-entry.json");
    expect(
      res.status(),
      "pagefind 인덱스가 out/ 에 없다. npm run build 끝의 `npx pagefind --site out` 을 확인하라",
    ).toBe(200);

    const body = await res.json();
    const langs = Object.keys(body.languages ?? {});
    expect(
      langs.some((l) => l.toLowerCase().startsWith("ko")),
      `한국어 인덱스가 없다. 잡힌 언어: ${langs.join(", ") || "(없음)"}`,
    ).toBe(true);
  });
});

/**
 * ⚠️ **하이드레이션 경합 — 쟀다. 결론: 대기를 넣지 않는다.**
 *
 * 아래 검사들은 전부 `page.goto` 직후에 키를 친다. 그런데 팔레트의 `keydown` 리스너는
 * `command-palette.tsx` 의 `useEffect` 안에서 `window` 에 붙는다 — 즉 **하이드레이션 후에야
 * 존재한다.** 반면 게이트가 보는 `data-site-shell` 은 **SSR 산출물에 이미 있어
 * 하이드레이션을 전혀 증명하지 않는다.** 이론상 그 창에 keydown 이 떨어지면 유실된다.
 *
 * 실측 2026-08-27 (Task 12) — `npx playwright test e2e/search.spec.ts --repeat-each=30`,
 * desktop·mobile 합계 **480 회 중 479 통과**. 유일한 실패는 keydown 유실이 아니라
 * `page.goto` 가 `/atlas/` 의 `load` 를 30 초 안에 못 받은 **정적 서버 포화**였다
 * (같은 조건에서 `atlas.spec.ts` 360 회도 같은 서명으로 1 건). 즉 **키 유실 0/840.**
 *
 * 그래서 대기를 넣지 않는다. 「안 열리면 다시 누른다」는 어차피 못 쓴다 —
 * `Ctrl+K` 가 토글이라 두 번째 입력이 팔레트를 닫는다. 재측정이 필요하면 위 명령 그대로다.
 */
test.describe("검색 팔레트 (셸 부착 시 켜짐)", () => {
  test("Ctrl+K 로 열리고 Escape 로 닫힌다", async ({ page }) => {
    await gotoWithShell(page, SHELL_HOME);

    // 열기 전에는 DOM 에 아예 없다 — 팔레트는 `if (!open) return null` 이다.
    await expect(palette(page)).toHaveCount(0);

    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(palette(page)).toHaveCount(0);
  });

  /**
   * `Ctrl+K` 는 **토글**이다.
   *
   * 구현(`command-palette.tsx`)이 「토글이다 — 열린 상태에서 다시 누르면 닫힌다(계획서 원안)」
   * 라고 주석까지 달아 둔 명시적 계약인데 계획서 초안에는 검사가 없었다. 위 검사는
   * Escape 로만 닫아 보므로, 토글 분기가 통째로 사라져도 초록이다.
   *
   * 이 분기는 리팩터가 가장 먼저 깨뜨리는 곳이기도 하다 — 「열기」로 단순화하면 동작이
   * 바뀌었다는 신호가 어디에도 안 남는다.
   */
  test("Ctrl+K 는 토글이다 — 열린 상태에서 다시 누르면 닫힌다", async ({ page }) => {
    await gotoWithShell(page, SHELL_HOME);

    await page.keyboard.press("Control+k");
    await expect(palette(page)).toBeVisible();

    await page.keyboard.press("Control+k");
    await expect(palette(page)).toHaveCount(0);
  });

  /**
   * 본문 키워드로 글이 잡힌다 — 설계서 G4.
   *
   * **1위가 아니라 결과 집합을 본다.** 초안은 첫 링크의 href 가 `/^\/blog\//` 인지 봤는데,
   * 그 형태에는 실측으로 확인된 결함이 둘 있었다(2026-08-27 리뷰).
   *
   *   ① **주석이 내건 보증이 거짓이었다.** 초안은 「`isIndexNoise` 가 사라지면 첫 결과가
   *      태그 목록이 되어 이 검사가 잡는다」고 적었는데, 태그 페이지는 전부
   *      `/blog/tags/…` 라 `/^\/blog\//` 를 **그대로 통과한다.** 필터를 통째로 지워도
   *      「임베딩」 1위는 `/blog/rag/rag-pipeline-retrieval/` 그대로다 —
   *      **그 보증은 성립한 적이 없다.** 필터의 회귀 방어는 `tests/search/` 의
   *      `isIndexNoise` 단위 테스트가 이미 경계 케이스까지 들고 있다. E2E 가 흉내 낼 일이 아니다.
   *
   *   ② **T13 이 만든 `/atlas/` 는 실제로 상위를 잠식했다 — 그리고 필터로 막았다.**
   *      빌드 끝의 `npx pagefind --site out` 이 노드 상세 162 장을 자동 색인해 인덱스가
   *      242 → 405 가 됐고, 실측 2026-08-27 (Task 12) 쿼리 8종의 상위 10 에 들어온
   *      `/atlas/…` 17 건은 **전부** 같은 목록에 `/blog/…` 원문을 가진 중복이었다
   *      (최대 40% — 「RAG」·「컨텍스트」. 「임베딩」은 2위였다). `isIndexNoise` 가
   *      노드 상세를 빼면서 해소됐다.
   *      (필터를 통과하면서 `/blog/` 로 시작하지 않는 페이지는 이미 12건 있다 —
   *       `/`·`/en/`·`/notion/`·`/product-lead*` 등. 오늘은 그 12건이 「임베딩」 0회라 통과한다.)
   *
   * 결과 **집합** 안에 글로 가는 링크가 하나라도 있으면 G4 는 충족된다. 이 형태는
   * 랭킹이 바뀌어도, 글이 늘어도, `/atlas/` 가 편입돼도 깨지지 않으면서 여전히
   * 「검색이 동작하고 글로 연결된다」를 증명한다. 개수를 기대하지 않는 이유도 같다 —
   * 개수는 글이 한 편 늘 때마다 빨개지고, 그 빨강은 회귀가 아니라 집필이다.
   */
  test("본문 키워드로 글이 잡힌다 — G4", async ({ page }) => {
    await gotoWithShell(page, SHELL_HOME);
    await page.keyboard.press("Control+k");
    await searchInput(page).fill("임베딩");

    const links = resultLinks(page);
    // Pagefind 는 인덱스와 조각을 네트워크로 받는다. 기본 5초로는 모자란다.
    await expect(links.first()).toBeVisible({ timeout: 10_000 });

    const hrefs = await links.evaluateAll((els) =>
      els.map((el) => el.getAttribute("href") ?? ""),
    );
    expect(
      hrefs.some((href) => href.startsWith("/blog/")),
      `결과에 글로 가는 링크가 없다. 받은 href: ${hrefs.join(" · ") || "(0건)"}`,
    ).toBe(true);
  });

  /**
   * **주 이동 모델** — 화살표로 고르고 Enter 로 간다. `command-palette.tsx` 는 포커스를
   * 입력에 고정한 채 `aria-activedescendant` 로만 선택을 옮기므로(§8.4), 이 경로가 깨지면
   * 키보드 사용자에게 결과 목록은 **읽을 수만 있고 갈 수는 없는** 것이 된다.
   *
   * 이 1종만 E2E 에 둔다(계획서 T6 실측 ⑥ 이 미검증 6종 중 이것만 「반드시」로 지정했다).
   * `router.push` **후** 포커스를 옮기는 코드라 셸과 라우트가 둘 다 있어야 의미가 있는데,
   * T13 이 `/atlas/` 에 셸을 붙이고 T16 이 헤더에 올린 지금이 그 시점이다.
   * 나머지 5종(Tab 트랩 순환 · 조사 제안 · `safeExcerpt` · axe · 합성 `KeyboardEvent`)은
   * ⑥ 이 「단위 테스트가 맞다」·「검사하지 않기로」로 분류했다.
   *
   * ⚠️ 「두 번째 결과로 간다」로 쓰지 마라. `sel` 초기값이 바뀌면 조용히 다른 것을 검사한다.
   *    지금 선택된 것이 무엇인지 `aria-selected` 로 읽고 **그것**에 도달했는지를 본다.
   */
  test("ArrowDown → Enter 로 글에 도달하고 포커스가 #main 으로 간다", async ({ page }) => {
    await gotoWithShell(page, SHELL_HOME);
    await page.keyboard.press("Control+k");
    await searchInput(page).fill("임베딩");

    await expect(resultLinks(page).first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("ArrowDown");

    const selectedLink = palette(page)
      .getByRole("option", { selected: true })
      .getByRole("link");
    const href = await selectedLink.getAttribute("href");
    expect(href, "선택된 결과가 없다 — ArrowDown 이 선택을 옮기지 않았다").toBeTruthy();
    expect(href, `선택된 결과가 글이 아니다: ${href}`).toMatch(/^\/blog\//);

    await page.keyboard.press("Enter");

    // ① 팔레트는 닫히고 ② **고른 그 글**에 도달한다.
    await expect(palette(page)).toHaveCount(0);
    await page.waitForURL(`**${href}`);

    // ③ 포커스는 헤더 검색 버튼이 아니라 본문으로 간다.
    //
    // ⚠️ 여기서 재는 `#main` 은 **도착지의 것**이다. 이 검사는 `/atlas/`(SiteShell) 에서
    //    검색해 `/blog/…` 로 가는데, 블로그 라우트는 전부 `BlogShell` 만 쓴다 — 즉 실제로
    //    포커스를 받는 자리는 `components/blog/blog-shell.tsx` 의 `<main tabIndex={-1}>` 이고
    //    `site-shell.tsx` 의 것은 이 경로에 등장하지 않는다. 2026-08-27 실측: 전자를 지우면
    //    이 검사가 2건 빨개지고, 후자를 지워도 **62 passed** 로 살아남았다.
    //    `site-shell.tsx` 쪽 `<main>` 의 방어는 `e2e/atlas.spec.ts` 의 스킵 링크 검사가 한다.
    await expect(
      page.locator("#main"),
      "포커스가 #main 에 없다 — 키보드 사용자가 새 글이 아니라 이전 위치 앞에 서게 된다",
    ).toBeFocused();
  });

  /**
   * **블로그가 아닌 도착지의 `<main>` 도 포커스를 받는다.**
   *
   * 위 검사는 `/blog/…` 에서 끝나므로 `components/blog/blog-shell.tsx` 의 `<main>` 만 지킨다.
   * 여기서는 그 밖의 도착지를 본다.
   *
   * ⚠️ **2026-08-28(T13) 에 전제가 하나 깨졌다. 낡은 근거를 남기지 않으려고 사실대로 적는다.**
   *
   *    T13 이전의 대상 넷은 `/product-lead/` · `/product-lead-v2/` · `/product-lead-loadmap/` ·
   *    `/product-lead-wiki/admin/` 이었고, 그 넷은 **서로 다른 소스 파일 넷**이 각자 그린
   *    `<main tabIndex={-1}>` 이었다. 「하나로 줄이면 나머지 셋의 커버리지가 0 이 된다」가
   *    그때의 존재 이유였다. T13 이 그 9 URL 을 `/work/` 로 접으면서 그 넷은 전부 사라졌다.
   *
   *    지금 `<main tabIndex={-1}>` 을 그리는 파일은 **둘뿐**이다 —
   *    `components/blog/blog-shell.tsx` 와 `components/site-shell.tsx`.
   *    아래 두 대상(`/work/` · `/about/`)은 자기 `<main>` 이 없고 **둘 다 후자를 공유한다.**
   *    즉 **「서로 다른 소스 파일」 전제는 더 이상 성립하지 않는다.**
   *
   *    | 무엇 | T13 이후 |
   *    | --- | --- |
   *    | 지키는 것 | 팔레트로 **셸이 유지된 채** 이동했을 때도 도착지 `<main>` 이 포커스를 받는다. 위 `/blog/…` 검사는 `SiteShell`→`BlogShell` 로 셸이 **갈리는** 경로라, 같은 `<main>` DOM 노드가 그대로 남는 이 경로를 재지 못한다 |
   *    | 못 지키게 된 것 | **파일별 커버리지.** 두 대상이 같은 `<main>` 을 쓰므로 하나를 지워도 다른 하나가 대신 빨개진다. `site-shell.tsx` 의 `tabIndex={-1}` 뮤턴트는 여기서 **2건이 함께** 죽지, 서로 독립으로 죽지 않는다 |
   *    | 다른 데서 지키는 것 | `site-shell.tsx` 의 `<main>` 자체는 `e2e/atlas.spec.ts` 의 스킵 링크 검사도 함께 방어한다 |
   *
   * ⚠️ 순위를 기대하지 않는다. **href 로 링크를 지목**하므로 랭킹이 흔들려도 살아 있고,
   *    `lib/search/collect.ts` 의 `DEFAULT_MAX_LOAD = 24` 안에만 들면 된다.
   *    2026-08-28 실측(갓 만든 `out/pagefind`): 「커머스」→ `/work/` 1위(전체 3건),
   *    「논문」→ `/about/` 1위(전체 20건). 둘 다 여유가 크다.
   *    그 대신 결과가 아예 없으면 로케이터가 못 찾아 빨개진다 — 조용한 초록이 되지 않는다.
   *
   * ⚠️ 좌클릭이어야 한다. `command-palette.tsx` 의 `<a onClick>` 은 수식키·보조 버튼 클릭을
   *    브라우저에 넘기므로(새 탭 열기 보존), 그때는 `go()` 가 불리지 않아 포커스도 안 옮겨진다.
   */
  const NON_BLOG_TARGETS = [
    { query: "커머스", href: "/work/", source: "components/site-shell.tsx" },
    { query: "논문", href: "/about/", source: "components/site-shell.tsx" },
  ];

  /**
   * **전수 대조를 먼저 둔다.**
   *
   * 아래 `for` 는 `NON_BLOG_TARGETS` 가 빈 배열이면 **아무것도 단정하지 않고 초록**이다.
   * 목록이 줄어드는 사고를 이 한 줄이 잡는다 — T13 이 넷 중 넷을 갈아치웠으므로
   * 다음에도 같은 일이 일어난다고 봐야 한다.
   */
  test("블로그 밖 도착지 검사 대상이 2개다 — 목록이 줄면 아래 루프가 조용히 초록이 된다", () => {
    expect(NON_BLOG_TARGETS.length, "NON_BLOG_TARGETS 개수").toBe(2);
    expect(new Set(NON_BLOG_TARGETS.map((t) => t.href)).size, "href 에 중복이 있다").toBe(2);
  });

  for (const { query, href, source } of NON_BLOG_TARGETS) {
    test(`검색으로 ${href} 에 가면 포커스가 #main 으로 간다 (${source})`, async ({ page }) => {
      await gotoWithShell(page, SHELL_HOME);
      await page.keyboard.press("Control+k");
      await searchInput(page).fill(query);

      const link = resultLinks(page).and(page.locator(`a[href="${href}"]`));
      await expect(
        link,
        `「${query}」 결과에 ${href} 가 없다 — 인덱스에서 빠졌거나 상위 24 밖으로 밀렸다`,
      ).toBeVisible({ timeout: 10_000 });

      await link.click();
      await page.waitForURL(`**${href}`);

      await expect(
        page.locator("#main"),
        `${href} 의 <main> 이 포커스를 못 받았다 — ${source} 의 tabIndex={-1} 이 없으면 focus() 가 조용한 무동작이다`,
      ).toBeFocused();
    });
  }
  test("`/` 단독으로도 열린다", async ({ page }) => {
    await gotoWithShell(page, SHELL_HOME);
    await page.keyboard.press("/");
    await expect(palette(page)).toBeVisible();
  });

  /**
   * 입력 중에는 `/` 가 팔레트를 열지 않는다.
   *
   * 두 가지를 함께 본다.
   *   - 다이얼로그가 **하나뿐**이다. 중첩해 열리면 안 된다.
   *   - `/` 가 **입력값이 된다**. 핸들러가 `preventDefault` 를 부르면 글자가 삼켜져
   *     「검색」에 머문다 — 열리지도 않고 타이핑도 안 되는 최악의 조합이라, 개수만
   *     보는 검사는 그 상태를 초록으로 통과시킨다.
   */
  test("입력 중에는 `/` 가 팔레트를 열지 않는다", async ({ page }) => {
    await gotoWithShell(page, SHELL_HOME);
    await page.keyboard.press("Control+k");

    const input = searchInput(page);
    await input.fill("검색");
    await input.press("/");

    await expect(palette(page)).toHaveCount(1);
    await expect(input).toHaveValue("검색/");
  });
});
