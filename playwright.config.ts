import { defineConfig, devices } from "@playwright/test";

/**
 * 정적 산출물(out/)을 그대로 서빙해 검사한다.
 *
 * next start 는 output: "export" 에서 동작하지 않는다. dev 서버로 검사하면
 * 실제 배포물과 다른 것을 보게 되므로, 빌드 산출물을 서빙한다.
 *
 * ⚠️ serve 에 --no-clean-urls 를 붙이지 마라.
 *    2026-08-26 실측(curl): 기본값에서 `/en/` 과 `/en` 이 **둘 다 리다이렉트 없이 200**
 *    이고 `/work/`(없는 라우트)는 404 다. serve 의 cleanUrls 는 `.html` 확장자 처리이지
 *    trailingSlash 변환이 아니다 — 「trailingSlash: true 를 지키려고」 끄는 것은 근거 없는
 *    조치이고, 끄면 오히려 확인되지 않은 경로로 들어간다.
 *
 * ⚠️ serve 는 **없는 디렉터리를 지정해도 오류 없이 뜨고 전부 404 를 낸다.**
 *    (실측: 잘못된 cwd 에서 `serve out` → `/` 까지 404). 그래서 out/ 의 실재와 신선도는
 *    globalSetup 이 따로 본다 — 404 만 보고 「라우트가 없다」고 읽으면 안 된다.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /**
   * 재시도하지 않는다 — CI 에서도.
   *
   * `retries: 1` 이면 두 번째에 통과한 테스트가 `flaky` 로 집계되고 **종료코드는 0** 이다.
   * (실측 2026-08-26: 첫 시도에만 실패하는 테스트로 재현 — CI 없음 → 종료코드 1,
   *  CI=true → `1 flaky`, 종료코드 0. `::error` 주석은 남지만 필수 체크는 통과한다.)
   * 이 스위트에는 이펙트 타이밍에 걸린 검사가 여럿이라, 재시도는 바로 그 회귀를 덮는다.
   * 「지켜지지 않을 규칙은 규칙 전체를 죽인다」의 반대편 — **조용히 통과하는 게이트는 게이트가 아니다.**
   */
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "npx serve out -l 4173 --no-clipboard",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
