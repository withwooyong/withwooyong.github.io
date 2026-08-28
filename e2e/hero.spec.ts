import { expect, test } from "@playwright/test";

/**
 * 히어로(components/hero.tsx) 의 E2E.
 *
 * ⚠️ **T10 이전에는 이 파일 전체가 빨갛고, 그것이 정상이다.** 히어로는 만들어졌지만
 *    아직 어느 페이지에도 붙어 있지 않다 — `pages/index.tsx` 재작성이 T10 의 일이다.
 *    T10 직후에 처음으로 돌린다. 그때까지 「빨강 = 회귀」로 읽지 마라.
 *
 * ⚠️ `getByRole(role, { name })` 은 기본이 **부분 문자열 매칭**이다. `exact: true` 없이는
 *    접근명이 길어지거나 aria-hidden 을 통째로 지워도 초록이 된다
 *    (2026-08-26 이 리포의 대조군 실측). 이 파일의 이름 매칭은 전부 `exact: true` 다.
 */

const HOME = "/";

/**
 * 히어로 문구 셋 — `components/hero.tsx` 의 `LINES` 와 **한 글자도 다르면 안 된다.**
 * 여기에 다시 적는 이유는 그것이 검사의 요점이기 때문이다. 컴포넌트에서 import 해 오면
 * 「컴포넌트가 자기 자신과 같다」를 검사하게 되어 문구가 바뀌어도 초록이 된다.
 */
const LINES = [
  "20년간 만든 것은 서비스가 아니라 조직이었다.",
  "30명이 함께 굴린 교육·커머스 플랫폼. 두 번 다시 세운 검색.",
  "그 판단은 글 156편으로 남아 있다.",
] as const;

/** h1 의 접근명 — 세 문장 전체다. 결함 [3] 의 처방을 잠근다. */
const H1_NAME = LINES.join(" ");

const METRIC_VALUES = ["20년", "30명", "156편"] as const;

/** 히어로 껍데기는 300vh 다. 안쪽 sticky 가 100vh 이므로 스크롤 거리는 200vh. */
async function scrollToHeroEnd(page: import("@playwright/test").Page) {
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
}

test.describe("히어로", () => {
  test("첫 화면에 문구 ①과 지표 3개가 보인다", async ({ page }) => {
    await page.goto(HOME);

    // 시각 레이어의 문구는 aria-hidden 이지만 텍스트 선택자에는 잡힌다.
    // `exact: true` 라 h1 안의 sr-only(세 문장 연결)와는 매칭되지 않는다.
    await expect(page.getByText(LINES[0], { exact: true })).toBeVisible();

    // ②③ 은 아직 안 보여야 한다. `invisible`(visibility:hidden) 이 함께 걸려 있어야
    // toBeVisible 이 false 가 된다 — opacity-0 뿐이면 여기가 초록이 되지 않는다.
    await expect(page.getByText(LINES[2], { exact: true })).toBeHidden();

    for (const value of METRIC_VALUES) {
      await expect(page.getByText(value, { exact: true })).toBeVisible();
    }
  });

  test("스크롤하면 시각적으로 문구 ③ 이 나타난다", async ({ page }) => {
    await page.goto(HOME);
    await expect(page.getByText(LINES[2], { exact: true })).toBeHidden();

    await scrollToHeroEnd(page);

    // 진행도는 requestAnimationFrame 뒤에 반영된다 — 재시도하는 단정으로 기다린다.
    await expect(page.getByText(LINES[2], { exact: true })).toBeVisible();
    await expect(page.getByText(LINES[0], { exact: true })).toBeHidden();
  });

  test("첫 로드에 three.js·3D 번들을 받지 않는다", async ({ page }) => {
    const urls: string[] = [];
    page.on("request", (req) => urls.push(req.url()));

    await page.goto(HOME, { waitUntil: "networkidle" });

    /*
     * ⚠️ 이 검사는 **0 을 기대한다.** 리스너가 죽어 있어도, 페이지가 404 여도 초록이다.
     *    그래서 먼저 「무언가를 실제로 봤다」를 증명한다 — 이게 없으면 아래 0 건은
     *    거짓 음성과 구분되지 않는다(CLAUDE.md 의 계수기 증명 규칙).
     *
     * ⚠️ 그런데 그 증명으로도 **부족했다.** three.js 는 이 리포의 의존성이 아니다
     *    (`grep -niE "three|drei|babylon" package.json` = 0건). 번들 요청이 있고 3D 가
     *    없다는 것은 **히어로를 통째로 지워도 참**이라, 이 검사만은 히어로를 하나도
     *    참조하지 않은 채 초록이었다 — 파일 머리의 「T10 이전에는 전부 빨갛다」는
     *    센티넬이 이 검사에 대해서만 거짓이었다(2026-08-28 뮤테이션 리뷰 F7).
     *
     *    처방(a): **히어로가 실제로 렌더된 것을 먼저 단언한다.** 검사 대상을 바꾸는 것보다
     *    이쪽이 최소 수정이고, 센티넬 주석의 주장을 참으로 되돌린다 — 히어로가 붙기
     *    전에는 여기서 정직하게 빨개지고, 붙은 뒤에야 번들 검사로 넘어간다.
     */
    await expect(page.getByText(LINES[0], { exact: true })).toBeVisible();
    await expect(page.locator("h1")).toHaveCount(1);

    expect(urls.length, "요청을 하나도 기록하지 못했다 — 리스너가 죽었다").toBeGreaterThan(5);
    expect(
      urls.filter((u) => /\/_next\/static\/.+\.js/.test(u)).length,
      "Next 번들 요청이 0건이다 — 페이지가 제대로 뜨지 않았다",
    ).toBeGreaterThan(0);

    const heavy = urls.filter((u) =>
      /three|webgl|orbitcontrols|react-three|drei|babylon|\.glb|\.gltf/i.test(u),
    );
    expect(heavy, `3D 관련 리소스를 받았다: ${heavy.join(", ")}`).toEqual([]);
  });

  test("h1 이 하나뿐이고 세 문장 전체를 담는다", async ({ page }) => {
    await page.goto(HOME);

    /*
     * 결함 [3] 회귀 방지. 이전 구현은 h1 을 셋 만들고 비활성인 것에 aria-hidden 을 걸어,
     * 페이지의 유일한 h1 이 진행도에 따라 바뀌었다 — reduced-motion 에서는 제목이
     * 「그 판단은 글 156편으로 남아 있다.」 가 됐다.
     */
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { level: 1, name: H1_NAME, exact: true }),
    ).toHaveCount(1);
  });
});

test.describe("히어로 — reduced motion", () => {
  /*
   * ⚠️ `test.use({ reducedMotion: "reduce" })` 는 이 버전(@playwright/test 1.62)에서
   *    **타입 오류다.** 최상위 `reducedMotion` 키는 사라졌고 `contextOptions` 안으로 들어갔다.
   *    `as any` 로 덮으면 컴파일은 통과하지만 옵션이 무시돼 「reduced-motion 을 검사했다」가
   *    거짓이 된다 — 스크롤을 안 했을 뿐인 검사가 되고, 그러면 아래 첫 단정이 빨개진다.
   */
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("스크롤 없이 최종 상태를 즉시 보여준다", async ({ page }) => {
    await page.goto(HOME);

    // GC-7: 모션을 끈 사람에게는 시작 상태가 아니라 **완성된 화면**을 준다.
    await expect(page.getByText(LINES[2], { exact: true })).toBeVisible();
    await expect(page.getByText(LINES[0], { exact: true })).toBeHidden();

    // 제목은 모션 설정과 무관하게 언제나 세 문장 전체다.
    await expect(
      page.getByRole("heading", { level: 1, name: H1_NAME, exact: true }),
    ).toHaveCount(1);
  });
});
