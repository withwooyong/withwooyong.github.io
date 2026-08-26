import { expect, test } from "@playwright/test";
import { activeLinkHrefs } from "./raw-html";
import { SHELL_MARKER, focusedLabel, gotoWithShell } from "./shell-gate";

/**
 * 셸이 **붙어 있어야** 밟을 수 있는 검사들.
 *
 * T8 시점에는 셸이 어느 페이지에도 안 붙어 있어 전부 skip 된다. T10~T11 에서 저절로 켜진다.
 * 이 파일이 통째로 조용한 것이 정상인지 아닌지는 **같은 파일 맨 위의 센티넬**이 알려 준다.
 */

const MOBILE = { width: 390, height: 844 }; // iPhone 14 세로
const LANDSCAPE = { width: 932, height: 430 }; // iPhone 14 Pro Max 가로 — md(768) 를 넘는다

/**
 * 게이트가 여는 경로 전부.
 *
 * ⚠️ `gotoWithShell` 에 새 경로를 넘길 때는 **반드시 여기에도 넣어라.**
 *    2026-08-26 실측: 센티넬이 `/` 하나만 볼 때, `/work/` 에 셸을 안 붙이면
 *    asPath 검사가 **영원히 조용한 skip** 이 되고 빨간 것이 하나도 없었다.
 *    (`/` 표지 주입 + `/work/` 를 표지 없이 만든 상태 → 센티넬 초록, asPath skip.)
 *    셸이 붙는 시점이 경로마다 다르므로 센티넬도 경로마다 있어야 한다.
 *
 *    2026-08-26: `/` 와 `/work/` 를 빼고 `/atlas/` 하나로 옮겼다.
 *    - `/` 는 아틀라스·검색 계획서의 GC-11 이 `pages/index.tsx` 수정을 금지해 셸이 안 붙는다.
 *    - `/work/` 는 선행 계획서 T11 로 이월돼 라우트 자체가 없다.
 *    셸이 처음 붙는 곳은 `/atlas/` 이고 그 태스크는 아틀라스·검색 계획서 T11 이다.
 *    그때까지 이 센티넬 2건(desktop·mobile)이 빨간 것이 정상이며, 그 빨강이
 *    아래 검사들이 조용히 skip 되고 있다는 사실을 드러내는 유일한 장치다.
 */
const SHELL_PATHS = ["/atlas/"];

/**
 * 게이트를 통과하지 **않는** 유일한 검사들. 이 파일의 skip 을 감시하는 것이 임무다.
 *
 * T8~T10 사이에는 빨간 것이 정상이다. 셸이 그 경로에 붙는 순간 초록이 되고,
 * 그와 동시에 아래 검사들이 켜진다. 반대로 표지가 지워지면 아래가 조용히 skip 되는 대신
 * 여기가 빨개진다 — 그것이 이 스위트에서 skip 을 써도 되는 유일한 근거다.
 */
test.describe("셸 센티넬 (게이트를 통과하지 않는다)", () => {
  for (const path of SHELL_PATHS) {
    test(`셸이 ${path} 에 붙어 있다 — 이게 빨간 동안 이 파일은 skip 된다`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.locator(SHELL_MARKER),
        `${path} 에 data-site-shell 이 없다. 셸을 붙이는 태스크 이전이면 정상이고, 그 뒤면 회귀다`,
      ).toHaveCount(1);
    });
  }
});

test.describe("헤더 (셸 부착 시 켜짐)", () => {
  test("내비가 Work · Blog · About 셋을 노출한다", async ({ page }) => {
    await gotoWithShell(page, "/");
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await expect(nav.getByRole("link", { name: "Work" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Blog" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "About" })).toBeVisible();
  });

  /**
   * 미완성 라우트는 내비에 없다. `/atlas` 는 단계 4, 검색은 단계 3 이다.
   *
   * ⚠️ 이건 **0 을 기대하는 검사**라 페이지가 통째로 비어도 통과한다.
   *    게이트가 없으면 「셸이 없어서 0」과 「Atlas 가 없어서 0」이 같은 초록이 된다.
   *    이 테스트가 의미를 갖는 것은 게이트를 통과했을 때뿐이다.
   *
   * ⚠️ `<header>` 로 스코프한다. 페이지 전체를 보면 **본문**에 Atlas 를 소개하는 링크가
   *    생기는 순간 거짓 빨강이 된다 — 이 규칙이 막으려는 것은 죽은 **내비 항목**이지
   *    아틀라스라는 단어가 아니다.
   */
  test("미완성 라우트는 내비에 없다", async ({ page }) => {
    await gotoWithShell(page, "/");
    await expect(page.locator("header").getByRole("link", { name: "Atlas" })).toHaveCount(0);
  });

  test("본문 건너뛰기 링크가 포커스에서 드러난다", async ({ page }) => {
    await gotoWithShell(page, "/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "본문으로 건너뛰기" });
    await expect(skip).toBeFocused();
    // sr-only 는 있어도 안 보인다. focus:not-sr-only 가 실제로 드러내는지까지 본다.
    await expect(skip).toBeInViewport();
  });
});

test.describe("테마 토글 버튼 (셸 부착 시 켜짐)", () => {
  /**
   * 「버튼 → 저장값」 경로. 「저장값 → 첫 페인트」는 smoke.spec.ts 가 본다.
   *
   * ⚠️ 이 버튼의 **접근명이 CSS 로 갈린다.** components/theme-toggle.tsx 가 sr-only span 둘을
   *    둘 다 렌더하고 `dark:hidden` / `dark:inline` 로만 가른다. Tailwind 가 그 두 규칙을 안 실으면
   *    이름이 두 문구의 연결이 되어 여기가 **0 건**이 되는데, 화면에는 「버튼이 없다」로 읽힌다.
   *    실제 원인은 CSS 다. 2026-08-26 실측으로 두 규칙이 산출물 CSS 에 있는 것은 확인했다.
   */
  test("누르면 라이트가 되고 리로드해도 유지된다", async ({ page }) => {
    await gotoWithShell(page, "/");
    await page.getByRole("button", { name: "라이트 모드로 전환" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    // 이름이 반대로 뒤집혔는지까지 본다 — 라이트에서는 「다크 모드로 전환」이어야 한다.
    await expect(page.getByRole("button", { name: "다크 모드로 전환" })).toBeVisible();
  });
});

/**
 * T7 이 고쳤지만 **실제로 밟아 보지는 못한** 셋. 셸이 페이지에 없어 재현할 수 없었다.
 * 커밋 232d220 · 4e922cc 의 근거가 여기서 처음으로 검증된다.
 */
test.describe("T7 미검증 항목 (셸 부착 시 켜짐)", () => {
  /**
   * ① 회전 · 리사이즈로 md 경계를 넘으면 드로어가 **상태까지** 닫힌다.
   *
   * 원래 버그: 드로어와 햄버거가 둘 다 `md:hidden` 이라 768px 이상이 되면 **둘 다 사라지는데
   * menuOpen 은 true 로 남았다.** 그러면 body.overflow="hidden" 이 유지돼 전 사이트 스크롤이
   * 잠기고, 닫을 수 있는 보이는 컨트롤이 0개가 된다.
   *
   * ⚠️ `#mobile-nav` 가 안 보이는 것으로 판정하지 마라. 그건 `md:hidden` 때문에
   *    **버그가 있어도 참**이다. 봐야 할 것은 둘이다 —
   *      (가) body 의 스크롤 잠금이 풀렸는가       ← 갇힘의 실체
   *      (나) 모바일 폭으로 되돌렸을 때 닫혀 있는가 ← 「감춰진 것」이 아니라 「꺼진 것」이라는 증거
   */
  test("드로어를 연 채 회전해 md 를 넘으면 스크롤 잠금이 풀리고 상태도 꺼진다", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE);
    await gotoWithShell(page, "/");

    await page.getByRole("button", { name: "메뉴 열기" }).click();
    await expect(page.locator("#mobile-nav")).toBeVisible();
    /*
     * ⚠️ `expect(await evaluate(...))` 로 한 번만 재지 마라. 드로어가 **보이는** 것은 커밋 시점이고
     *    `body.style.overflow="hidden"` 은 그 뒤 passive effect 다(site-header.tsx 의 menuOpen 이펙트).
     *    폴링 없이 재면 그 사이에 걸려 **거짓 빨강**이 난다. 아래 회전 뒤 단정과 형태를 맞춘다.
     */
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow), {
        message: "드로어를 열었는데 body 스크롤이 안 잠겼다",
      })
      .toBe("hidden");

    await page.setViewportSize(LANDSCAPE); // 회전

    // (가) 갇힘의 실체 — 스크롤 잠금이 남아 있으면 전 사이트가 멈춘다
    await expect
      .poll(
        () => page.evaluate(() => document.body.style.overflow),
        { message: "회전 후에도 body 스크롤이 잠겨 있다" },
      )
      .not.toBe("hidden");

    await page.setViewportSize(MOBILE); // 되돌린다

    // (나) 상태가 정말 꺼졌는지 — 감춰졌을 뿐이면 여기서 드로어가 다시 열린 채 나타난다
    await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeVisible();
    await expect(page.locator("#mobile-nav")).toBeHidden();
  });

  /**
   * ② 드로어가 열려 있을 때 Tab 순환이 **헤더 바까지** 묶는다.
   *
   * 원래 버그: 순환 목록을 드로어에서만 모았다. 그런데 헤더는 sticky z-50 이고 드로어는 z-40 이라
   * 헤더가 드로어 **위에** 뜬다 — 로고 · 테마 토글이 화면에 **보이는데** 키보드로는 갈 수 없었다.
   *
   * 순서를 그대로 못박는다. 이 테스트가 지키는 것이 바로 **DOM 순서**이기 때문이다.
   * NAV 가 바뀌면 여기도 같이 바뀌어야 하는 게 맞다.
   *
   * 390px 에서 순환에 드는 것: 헤더 바의 [로고 · 토글 · 햄버거] + 드로어의 [Work · Blog · About · EN].
   * 데스크톱 내비(`hidden md:flex`)와 헤더의 EN(`hidden sm:inline`)은 offsetParent 필터가 걸러 낸다.
   */
  test("드로어가 열리면 Tab 이 헤더 바와 드로어를 한 바퀴로 묶는다", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await gotoWithShell(page, "/");
    await page.getByRole("button", { name: "메뉴 열기" }).click();

    // 열릴 때 포커스는 버튼이 아니라 드로어 첫 항목으로 간다
    await expect(page.locator("#mobile-nav a").first()).toBeFocused();

    const seen = [await focusedLabel(page)];
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press("Tab");
      seen.push(await focusedLabel(page));
    }

    expect(seen).toEqual([
      "Work",
      "Blog",
      "About",
      "EN",
      "허우용 Ted", // ← 헤더 바. 여기가 빠지면 T7 의 누수가 되살아난 것이다
      "라이트 모드로 전환",
      "메뉴 닫기",
      "Work", // 여덟 번째에 처음으로 돌아온다 = 한 바퀴가 정확히 7
    ]);

    /*
     * 역방향의 경계. 지금 포커스는 Work 이고, head 는 로고다.
     * Work → 햄버거 → 토글 → 로고(head) 까지는 브라우저 기본 동작이고,
     * **네 번째**에서 비로소 핸들러가 개입해 tail(드로어의 EN)로 감아야 한다.
     * 앞의 셋만 눌러 보면 경계를 한 번도 안 밟는다.
     */
    const back = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Shift+Tab");
      back.push(await focusedLabel(page));
    }
    expect(back).toEqual(["메뉴 닫기", "라이트 모드로 전환", "허우용 Ted", "EN"]);
  });

  /**
   * ③ 서버가 그린 aria-current 와 하이드레이션 후의 aria-current 가 같다.
   *
   * `SiteHeader` 의 활성 판정은 `useRouter().asPath` 하나에 달려 있다(`isActive`).
   * 정적 export 에서 그 값이 서버(프리렌더)와 클라이언트에서 어긋나면 —
   * 예컨대 서버가 `/work`, 클라이언트가 `/work/` 를 보면 — `startsWith("/work/")` 가
   * 한쪽에서만 참이 되어 활성 표시가 **하이드레이션 직후에 튄다.**
   *
   * 이 어긋남은 화면에서 한 프레임짜리라 사람이 못 잡는다. 그래서 두 시점을 따로 재서 맞대 본다.
   *
   * ⚠️ **콘솔의 React 하이드레이션 오류로 잡으려 하지 마라.** 여기 그 코드가 있었는데 지웠다.
   *    실측 2026-08-26: 「did not match」는 개발 번들에만 있는 문구이고
   *    (`react-dom.development.js` 2건 · `react-dom.production.min.js` **0건**),
   *    축약 코드 #418·#425 는 **텍스트** 불일치용이다. 프로덕션 React 18 은 **속성** 불일치를
   *    콘솔에도 축약 코드에도 남기지 않는다. 그런데 이 테스트의 주제가 바로 `aria-current`
   *    **속성**이다 — 즉 그 단정은 결함이 있어도 반드시 빈 배열이었다. 있으나 마나가 아니라
   *    **있으면 해로운** 검사다. 「하이드레이션 오류도 본다」는 안심을 주면서 아무것도 안 보므로.
   *
   * ⚠️ 뒤 시점(하이드레이션 후)은 정보량이 적다. 실측: `/en/` 에서 `router.asPath` 가 load 시점부터
   *    `"/en/"` 이고 800ms 뒤에도 그대로다 — 클라이언트 asPath 는 움직이지 않는다.
   *    **위험한 쪽은 앞 시점(서버가 그린 정적 HTML)이다.** 그래서 그쪽을 원문으로 직접 잰다.
   */
  test("정적 HTML 과 하이드레이션 후의 활성 표시가 같다 (asPath 표류)", async ({ page }) => {
    // ⚠️ 게이트를 **맨 앞에** 둔다. 아래 단정을 먼저 쓰면 셸이 없는 동안 skip 이 아니라
    //    실패가 나고, 「아직 안 붙었다」가 「asPath 가 틀렸다」로 둔갑한다. 실제로 그렇게 났었다.
    await gotoWithShell(page, "/work/");

    // ① 하이드레이션 전 — JS 를 태우지 않고 문서 그대로 받는다
    const res = await page.request.get("/work/");
    // ⚠️ 상태 코드를 먼저 본다. serve 는 404 에도 404.html 본문을 돌려주므로, 이게 없으면
    //    「페이지가 없다」가 「서버의 asPath 가 어긋난다」로 오진된다.
    expect(res.ok(), "/work/ 가 200 이 아니다 — asPath 이전에 페이지가 없다").toBe(true);

    // 헤더는 데스크톱 내비와 드로어 **양쪽**에 같은 항목을 렌더한다. 그래서 개수가 아니라
    // 「활성으로 표시된 href 의 집합」을 본다 — 렌더 위치가 늘어도 안 깨지고,
    // 「엉뚱한 링크가 활성」과 「아무것도 활성이 아님」은 둘 다 잡힌다.
    const active = activeLinkHrefs(await res.text());
    expect(
      active.length,
      "정적 HTML 에 활성 링크가 없다 — 서버의 asPath 가 NAV href 와 어긋난다",
    ).toBeGreaterThan(0);
    expect(
      active.filter((href) => href !== "/work/"),
      "활성으로 표시됐는데 /work/ 가 아닌 링크",
    ).toEqual([]);

    // ② 하이드레이션 후 — 앞과 같은 값이어야 한다
    const current = page.locator('nav[aria-label="주요 메뉴"] a[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute("href", "/work/");
  });

  /**
   * ①의 짝 — 정상 경로로 닫았을 때 정리(cleanup)가 도는지.
   *
   * 스크롤 잠금 해제와 포커스 복귀는 둘 다 `useEffect` 의 정리 함수에 있다.
   * ①은 그 정리가 **리사이즈로** 도는 경우이고, 여기는 **Escape 로** 도는 경우다.
   * 정리 함수 자체가 깨지면 둘 다 빨개지므로 원인이 좁혀진다.
   */
  test("Escape 로 닫으면 스크롤이 풀리고 포커스가 햄버거로 돌아온다", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await gotoWithShell(page, "/");

    await page.getByRole("button", { name: "메뉴 열기" }).click();
    /*
     * ⚠️ 클릭 직후 바로 Escape 를 보내지 마라. document 의 keydown 리스너는 passive effect 안에서
     *    붙는다(site-header.tsx 의 menuOpen 이펙트). 이펙트가 아직이면 키가 허공으로 가고
     *    **거짓 빨강**이 난다. 같은 이펙트가 드로어 첫 항목에 focus() 하므로, 그걸 이펙트 완료 신호로 쓴다.
     *    (탭 순회 테스트는 이 대기를 이미 갖고 있었고 여기만 없었다.)
     */
    await expect(page.locator("#mobile-nav a").first()).toBeFocused();
    await page.keyboard.press("Escape");

    await expect(page.locator("#mobile-nav")).toBeHidden();
    await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  });
});
