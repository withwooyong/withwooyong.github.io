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

export async function shellIsMounted(page: Page): Promise<boolean> {
  return (await page.locator(SHELL_MARKER).count()) > 0;
}

/**
 * 셸이 붙은 페이지에서만 도는 테스트의 진입점.
 *
 * T8 시점에는 셸이 어느 페이지에도 안 붙어 있어 전부 skip 된다.
 * T10 에서 `pages/index.tsx` 가 `<SiteShell>` 로 감싸는 순간, **아무도 플래그를 켜지 않아도**
 * 저절로 돈다. 게이트가 사람이 뒤집는 스위치가 아니라 **셸의 실재** 그 자체이기 때문이다.
 *
 * ⚠️ skip 은 이 리포가 반복해서 데인 「거짓 0」과 같은 얼굴을 하고 있다.
 *    그래서 이 게이트는 smoke.spec.ts 의 센티넬(「셸이 홈에 붙어 있다」)과 **쌍으로만 성립한다.**
 *    센티넬은 이 게이트를 통과하지 않으므로, 셸이 사라지거나 표지가 지워지면
 *    skip 이 조용히 늘어나는 게 아니라 **센티넬이 빨개진다.**
 *    센티넬을 지우면 이 파일 전체가 「조용한 초록」이 된다 — 지우지 마라.
 */
export async function gotoWithShell(page: Page, path: string): Promise<void> {
  await page.goto(path);
  test.skip(
    !(await shellIsMounted(page)),
    `셸 미부착: ${path} — T10 에서 켜진다 (smoke.spec.ts 의 센티넬을 보라)`,
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
