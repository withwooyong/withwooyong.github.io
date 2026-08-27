import { expect, test } from "@playwright/test";
import { canonicalHrefs } from "./raw-html";

/**
 * 셸에 **의존하지 않는** 검사만 여기 둔다.
 * 셸이 붙어야 밟을 수 있는 것은 shell.spec.ts 에 있고, 그쪽은 게이트로 잠겨 있다.
 *
 * ⚠️ 셸 센티넬을 여기로 옮기지 마라. shell.spec.ts 안에 있어야 한다.
 *    2026-08-26 실측: 센티넬이 이 파일에 있던 동안 `npx playwright test e2e/shell.spec.ts`
 *    만 돌리면 **16 skip · 종료코드 0** 이었다. 셸을 고치는 중에 그 파일만 돌리는 것은
 *    가장 자연스러운 행동인데, 그게 통째로 조용한 초록이 된다.
 *    감시자는 감시 대상과 **같은 파일**에 있어야 한다.
 */

/**
 * 테마 4종 — 계획서 T6 의 수동 확인 표(「번쩍임 없음 · 다크 기본 · 저장값 우선 · 저장소 차단」)를
 * 그대로 자동화한 것이다. 표의 네 행과 아래 네 테스트가 1:1 로 대응한다.
 *
 * 넷 다 `_document.tsx` 의 THEME_SCRIPT · CRITICAL_STYLE 만 상대하므로 셸이 필요 없다.
 * 토글 **버튼**을 눌러 보는 것은 헤더가 있어야 하므로 shell.spec.ts 쪽에 있다.
 */
test.describe("테마", () => {
  test("스타일시트가 하나도 안 도착해도 첫 페인트가 이미 테마색이다 (번쩍임 없음)", async ({
    page,
  }) => {
    /*
     * head 의 렌더 차단 스타일시트 셋 중 **둘이 서드파티**다(구글폰트 · jsdelivr).
     * 그게 늦으면 늦는 만큼 흰 캔버스가 그대로 보인다 — CRITICAL_STYLE 이 그걸 막는다.
     * 전부 막아 CRITICAL_STYLE 만 남긴 상태에서 배경을 재면, 막는 것이 정말 그것인지 드러난다.
     *
     * 이 검사가 실제로 잡는지는 변이로 증명했다 — 2026-08-26, 산출물에서 CRITICAL_STYLE 만
     * 지우고 돌리니 rgba(0, 0, 0, 0) 으로 빨개졌고 되돌리니 다시 초록이 됐다.
     * (CLAUDE.md 의 「증명하고 나서 0 을 믿는다」)
     *
     * URL 패턴이 아니라 resourceType 으로 거른다. 구글폰트 URL 은 `/css2?family=…` 로 끝나
     * 확장자가 없어서, .css 로 끝나는 글로브를 쓰면 그것만 통과해 검사가 무력해진다.
     */
    const blocked: string[] = [];
    await page.route("**/*", (route) => {
      if (route.request().resourceType() === "stylesheet") {
        blocked.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });

    await page.goto("/");

    /*
     * 막는 데 성공했는지부터 확인한다. 안 막혔는데 색만 맞으면 이 테스트는
     * 「막았다고 믿는 초록」이 된다 — CRITICAL_STYLE 을 지워도 globals.css 가 같은 색을 낸다.
     *
     * ⚠️ `document.styleSheets` 로 판정하지 마라. 2026-08-26 실측: 중단된 <link> 도
     *    **껍데기 시트로 목록에 남는다**(href 는 있고 cssRules 접근은 던진다).
     *    그래서 「href 있는 시트 0건」은 정상 상태에서도 거짓이다 — 실제로 그렇게 짰다가 틀렸다.
     *    관측 가능한 사실은 「중단이 발동했는가」쪽이다.
     */
    // 「1개」로 못박지 않는다. 지금은 페이지 CSS 청크가 하나지만 늘어날 수 있고,
    // 그러면 검사가 **거짓 빨강**을 낸다. 위험한 방향은 0 쪽뿐이다.
    expect(
      blocked.filter((u) => u.includes("/_next/static/css/")).length,
      "앱 자체 CSS 가 안 막혔다 — 배경색이 globals.css 에서 왔을 수 있다",
    ).toBeGreaterThan(0);

    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor),
      "CRITICAL_STYLE 이 없으면 여기가 rgba(0, 0, 0, 0) 이 된다",
    ).toBe("rgb(8, 8, 10)"); // #08080a = --n0 다크
  });

  test("저장값이 없으면 다크로 뜬다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("저장값이 라이트면 라이트로 뜨고 리로드해도 유지된다", async ({ page }) => {
    // 토글 버튼을 거치지 않고 저장값을 직접 심는다 — 여기서 보는 것은
    // 「저장값 → 첫 페인트」 계약이고, 「버튼 → 저장값」은 shell.spec.ts 가 본다.
    await page.addInitScript(() => localStorage.setItem("portfolio-theme", "light"));

    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    // 라이트 배경도 CRITICAL_STYLE 이 클래스 선택자로 쥐고 있다는 것까지 본다.
    // documentElement.style 로 박았다면 토글이 그 인라인을 못 이겨 여기가 어긋난다.
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor),
    ).toBe("rgb(247, 247, 248)"); // #f7f7f8 = --n0 라이트

    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("저장소가 막혀 있어도 예외 없이 다크로 뜬다", async ({ page }) => {
    /*
     * 시크릿 창 + 사이트 데이터 차단이면 localStorage 접근 자체가 SecurityError 를 던진다.
     * THEME_SCRIPT 의 catch 분기가 그때 다크로 떨어뜨리는데, **다른 어떤 검사도 그 분기를 밟지 않는다.**
     * 여기서 스크립트가 통째로 죽으면 dark 클래스가 아예 안 붙어 빨개진다 — 그게 이 검사의 값어치다.
     */
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("접근이 차단됨", "SecurityError");
        },
      });
    });

    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("라우트", () => {
  // 2026-08-26: /work/ · /about/ 을 뺐다. 선행 계획서 T11·T12 로 이월돼 당분간 라우트가 없고,
  // 그 빨강을 켜 두면 앞으로 만들 화면의 빨강과 섞여 아무 정보도 주지 않는다.
  // 두 라우트를 되살리는 태스크에서 여기에도 다시 넣어라.
  for (const path of ["/", "/blog/", "/en/"]) {
    test(`${path} 가 200 으로 응답한다`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `${path} 응답 코드`).toBe(200);
    });
  }

  /**
   * canonical 이 자기 자신을 가리키는지 — **정적 HTML 과 하이드레이션 후 둘 다** 본다.
   *
   * `SiteHead` 의 path 는 선택 인자이고 기본값이 "/" 다. 안 넘겨도 빌드와 tsc 가 통과하므로
   * 사람이 못 잡는다 — 결과는 「이 페이지는 홈의 사본」이라는 신호를 검색엔진에 보내는 것이다.
   *
   * ⚠️ DOM 만 보면 안 된다. 2026-08-26 실측: 산출물에서 `<link rel="canonical">` 을 통째로
   *    지워도 이 검사가 **초록이었다** — next/head 가 하이드레이션 때 다시 꽂아 넣기 때문이다.
   *    그런데 슬랙·카카오톡 언펄과 상당수 크롤러는 **JS 를 돌리기 전 HTML** 을 읽는다.
   *    즉 DOM 만 재면 이 검사가 걱정하는 바로 그 독자를 못 본다.
   *    이 리포의 `check-forbidden:built` 가 존재하는 이유와 같은 구조다 — 소스가 깨끗한 것이
   *    산출물이 깨끗하다는 뜻은 아니다.
   *
   * ⚠️ `toContain(path)` 로 재지 마라. canonical 은 절대 URL 이라 path 가 "/" 면 무엇이든 통과한다.
   *    pathname 을 **정확히** 비교한다.
   */
  // 2026-08-26: 위 배열과 같은 이유로 /work/ · /about/ 을 뺐다. 라우트가 없는 경로의
  // canonical 을 재면 "canonical 이 틀렸다" 가 아니라 "페이지가 없다" 로 실패해 축이 어긋난다.
  for (const path of ["/blog/"]) {
    test(`${path} 의 canonical 이 자기 자신을 가리킨다`, async ({ page }) => {
      // ① 배포물 그대로 — JS 를 태우지 않는다
      const res = await page.request.get(path);
      expect(res.ok(), `${path} 가 200 이 아니다 — canonical 이전에 페이지가 없다`).toBe(true);
      const staticHrefs = canonicalHrefs(await res.text());
      expect(staticHrefs, `${path} 의 정적 HTML 안 canonical`).toHaveLength(1);
      expect(new URL(staticHrefs[0]).pathname, `${path} 의 정적 canonical`).toBe(path);

      // ② 하이드레이션 후 — next/head 가 다른 값으로 덮어쓰는 경우를 잡는다
      await page.goto(path);
      const href = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(href!).pathname, `${path} 의 하이드레이션 후 canonical`).toBe(path);
    });
  }
});
