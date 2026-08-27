import { test, type Page } from "@playwright/test";

/**
 * 새 셸(components/site-shell.tsx)이 이 페이지에 붙어 있는지 알아보는 표지.
 *
 * ⚠️ `aria-label="주요 메뉴"` 나 「본문으로 건너뛰기」로 판정하지 마라. **둘 다 오탐한다.**
 *    2026-08-26 실측: 구 `components/portfolio-nav.tsx` 가 **같은 aria-label 을 쓰고**,
 *    구 index 산출물(`out/index.html`)에 스킵 링크 문구도 이미 1건 있다.
 *    그 둘로 게이트를 짜면 셸이 안 붙은 T8 에서 「붙어 있다」로 읽고, 구 내비를 상대로
 *    아래 검사들이 통째로 빨개진다 — 원인과 무관한 빨강이라 아무 정보도 주지 않는다.
 *
 * 그래서 전용 속성을 하나 둔다. 존재 이유가 「새 셸이 여기 있다」 하나뿐이라 우연히 겹칠 수 없다.
 */
export const SHELL_MARKER = "[data-site-shell]";

/**
 * 게이트의 판정 술어. **재시도하지 않는다 — 지금 이 순간을 한 번 본다.**
 *
 * ⚠️ 각 스펙의 센티넬은 **이 함수를 그대로 불러야 한다.** `expect(locator).toHaveCount(1)` 로
 *    쓰면 그쪽만 5초까지 재시도하게 되고, 표지가 하이드레이션 이후에 생기는 구현에서
 *    **센티넬은 초록인데 게이트는 계속 skip** 인 상태가 만들어진다. 아래 `gotoWithShell` 이
 *    경고하는 「센티넬 초록 + 게이트 skip」이 경로가 아니라 **타이밍**으로 재현되는 것이다.
 *    (2026-08-27 리뷰 지적. 오늘은 `data-site-shell` 이 정적 HTML 에 있어 안 터진다 —
 *     T13 이 `pages/atlas/index.tsx` 에 `dynamic(..., { ssr: false })` 를 쓰면 그날 터진다.
 *     확인법: `curl -s localhost:4173/atlas/ | grep -c data-site-shell` 이 1인가.)
 *
 * 셸이 **두 번** 마운트되는 회귀는 이 술어로 못 잡는다(둘 다 「> 0」이다).
 * 그건 센티넬이 `toHaveCount(1)` 로 따로 본다.
 */
export async function shellIsMounted(page: Page): Promise<boolean> {
  return (await page.locator(SHELL_MARKER).count()) > 0;
}

/**
 * 셸이 처음 붙는 경로. **센티넬도 게이트도 전부 이 상수를 넘긴다.**
 *
 * ⚠️ 경로를 문자열로 직접 적지 마라. 센티넬과 검사가 **서로 다른 경로**를 보는 순간
 *    안전장치가 통째로 무력해진다. 상수 하나를 공유하는 것이 그 사고를
 *    **구조적으로** 막는 유일한 방법이다.
 *
 * 이 리포는 그 사고를 두 방향으로 다 겪었다.
 *   - 2026-08-26 ①: 센티넬이 `/` 하나만 볼 때 `/work/` 에 셸을 안 붙이면
 *     asPath 검사가 **영원히 조용한 skip** 이 되고 빨간 것이 하나도 없었다.
 *   - 2026-08-26 ②: 센티넬만 `/atlas/` 로 옮기고 검사 8곳은 `/`·`/work/` 에 두었다.
 *     이러면 `/atlas/` 에 셸이 붙는 순간 **센티넬 2건이 초록이 되는데 검사 8건은 그대로 잠든다** —
 *     초록이 「다 켜졌다」는 거짓 신호를 준다. ①의 방향만 뒤집은 같은 사고다.
 *
 * 그래서 `shell.spec.ts` 안에 있던 이 상수를 여기로 올렸다. 2026-08-27 에
 * `search.spec.ts` 가 같은 경로를 필요로 하면서 **문자열을 한 번 더 적을 뻔했고**,
 * 그것이 정확히 ②의 재발이다. 상수가 파일 로컬이면 두 번째 사용자가 복제한다.
 *
 * `/` 는 후보가 될 수 없다 — GC-11 이 `pages/index.tsx` 수정을 금지해 셸이 붙지 않는다.
 */
export const SHELL_HOME = "/atlas/";

/**
 * 셸이 붙은 페이지에서만 도는 테스트의 진입점.
 *
 * 지금은 셸이 어느 페이지에도 안 붙어 있어 전부 skip 된다. `pages/atlas/index.tsx` 가
 * `<SiteShell>` 로 감싸는 순간(아틀라스·검색 계획서 **T13** — 「/atlas 조립 · 셸 부착」),
 * **아무도 플래그를 켜지 않아도** 저절로 돈다.
 * 게이트가 사람이 뒤집는 스위치가 아니라 **셸의 실재** 그 자체이기 때문이다.
 *
 * ⚠️ 이 주석과 아래 skip 메시지는 2026-08-27 까지 「T11」이라고 말하고 있었다. 그 계획서의
 *    T11 은 「Canvas + 자동선택」이다 — 셸과 무관하다. skip 메시지는 나중에 이 빨강을
 *    만나는 사람이 읽는 **유일한 안내문**이라, 번호가 틀리면 엉뚱한 태스크를 뒤지게 한다.
 *    실행 순서 다이어그램(계획서 §「실행 순서와 그 이유」)이 정본이다.
 *
 * ⚠️ skip 은 이 리포가 반복해서 데인 「거짓 0」과 같은 얼굴을 하고 있다.
 *    그래서 이 게이트는 **각 스펙 파일 맨 위의 센티넬**(「셸이 `SHELL_HOME` 에 붙어 있다」)과
 *    쌍으로만 성립한다. 센티넬은 이 게이트를 통과하지 않으므로, 셸이 사라지거나 표지가 지워지면
 *    skip 이 조용히 늘어나는 게 아니라 **센티넬이 빨개진다.**
 *    센티넬을 지우면 그 파일 전체가 「조용한 초록」이 된다 — 지우지 마라.
 *    지금 그 센티넬을 가진 파일은 `shell.spec.ts` 와 `search.spec.ts` 둘이다.
 *
 * ⚠️ **이 쌍은 「전부 돌릴 때」만 성립한다.** 센티넬은 별도 `describe` 라 `-g` 필터에 걸리면
 *    통째로 빠진다. 실측 2026-08-27:
 *      `npx playwright test e2e/search.spec.ts -g "검색 팔레트" --project=desktop`
 *      → `4 skipped` · **종료코드 0**. 완벽한 조용한 초록이다.
 *    필터를 건 실행의 초록을 「통과했다」의 근거로 삼지 마라.
 *
 * ⚠️ 센티넬과 게이트는 **같은 상수(`SHELL_HOME`)를 봐야 한다.** 서로 다른 경로를 보면
 *    센티넬이 초록인데 게이트는 계속 skip 인 상태가 만들어지고, 그 초록이
 *    「다 켜졌다」는 거짓 신호를 준다. 2026-08-26 에 실제로 그 상태를 만들었다가 되돌렸다.
 *    (이 주석은 그전까지 센티넬이 `smoke.spec.ts` 에 있다고 말하고 있었는데, 거기엔 없었다.)
 */
export async function gotoWithShell(page: Page, path: string): Promise<void> {
  await page.goto(path);
  test.skip(
    !(await shellIsMounted(page)),
    `셸 미부착: ${path} — 아틀라스·검색 계획서 T13 에서 켜진다 (같은 파일의 센티넬을 보라)`,
  );
}

/**
 * 지금 포커스된 요소를 사람이 읽을 수 있는 한 줄로.
 *
 * `innerText` 를 쓰는 이유: 렌더된 텍스트만 돌려주므로 `dark:hidden` 으로 감춘 것이 빠진다.
 * 테마 토글은 sr-only span 둘을 **둘 다 렌더**하고 CSS 로만 가르는데(components/theme-toggle.tsx),
 * `textContent` 로 읽으면 「다크 모드로 전환라이트 모드로 전환」이 되어 무엇이 포커스됐는지
 * 알아볼 수 없다. sr-only 는 display:none 이 아니라 clip 이라 innerText 에는 남는다.
 *
 * 햄버거는 안이 svg 뿐이라 innerText 가 비어 aria-label 로 떨어진다.
 */
export function focusedLabel(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return "(없음)";
    const text = el.innerText || el.getAttribute("aria-label") || el.tagName;
    return text.trim().replace(/\s+/g, " ");
  });
}
