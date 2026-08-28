import { expect, test } from "@playwright/test";

import { aboutFacts, leadershipPhilosophy } from "../data/about";
import { education } from "../data/education";
import { skillCategories, thesisSummaryNarration } from "../data/portfolio";

/**
 * `/about` — 「누구인가」.
 *
 * ⚠️ **이 파일의 존재 이유는 한 문장이다: 이 페이지의 콘텐츠 세 덩이 중 둘은 여기서
 *    안 보이면 리포 어디에서도 안 보인다.** `data/about.ts`·`data/education.ts` 는
 *    T10 이 구 `pages/index.tsx` 를 재작성할 때 소실을 막으려고 떼어 낸 것이라
 *    소비자가 이 페이지뿐이다. 계획서 T12 의 코드 조각은 셋을 import 만 하고
 *    렌더하지 않았다 — 그대로 뒀으면 **빌드도 타입도 통과하는 채로** 학교 이름과
 *    철학 3문단이 사라진 페이지가 배포됐을 것이다. 그것을 잡는 검사가 여기 말고 없다.
 *
 * ⚠️ **`gotoWithShell` 게이트를 쓰지 않는다.** `/work` 와 같은 이유다 — `/about/` 은
 *    T12 가 셸과 함께 처음 만드는 페이지라, 셸이 없다는 것은 「아직 안 왔다」가 아니라
 *    **「만들다 빠뜨렸다」** 다. 그 둘을 같은 skip 으로 덮으면 조용한 초록이 재현된다.
 *
 * ⚠️ **개수는 전부 데이터에서 온다. 숫자를 여기 적지 마라.** `/atlas` 가 엣지 1,053 중
 *    156 만 그리고도 E2E 74 건이 통과한 사고가 이 리포에 있다. 상수를 손으로 적으면
 *    데이터가 늘어난 날 검사가 조용히 뒤처진다.
 *
 * ⚠️ **`getByRole(role, { name })` 은 기본이 부분 문자열 매칭이다.** 접근명을 계약으로
 *    삼는 곳에는 전부 `exact: true` 를 붙인다(2026-08-28 뮤테이션 실측: `exact` 없이는
 *    `<h2>경력</h2>` → `경력 요약` 이 생존했다).
 */

const ABOUT = "/about/";

test.describe("/about/ — 존재와 셸", () => {
  test("200 으로 응답한다", async ({ page }) => {
    const res = await page.goto(ABOUT);
    expect(res?.status(), `${ABOUT} 응답 코드`).toBe(200);
  });

  /**
   * 셸 표지를 **정적 HTML** 에서 센다. DOM 으로 재면 하이드레이션이 꽂아 넣은 것까지 세게 되어,
   * JS 를 돌리기 전 HTML 을 읽는 크롤러가 보는 것과 어긋난다(`smoke.spec.ts` 의 canonical 과 같다).
   */
  test("새 셸이 정적 HTML 에 정확히 한 번 붙어 있다", async ({ page }) => {
    const res = await page.request.get(ABOUT);
    expect(res.ok(), `${ABOUT} 가 200 이 아니다 — 셸 이전에 페이지가 없다`).toBe(true);
    const html = await res.text();
    const count = html.split("data-site-shell").length - 1;
    expect(count, `${ABOUT} 정적 HTML 안의 data-site-shell 개수`).toBe(1);
  });

  /**
   * ⚠️ **항목이 어느 내비에 있는지가 폭에 따라 다르다.** 데스크톱 내비는 `hidden md:flex` 라
   *    390px 에서 통째로 안 보이고, 그 폭에서 항목이 사는 곳은 햄버거가 여는 드로어다.
   *    `shell.spec.ts` 와 `work.spec.ts` 가 같은 분기를 이미 갖고 있다.
   */
  test("헤더 내비에 About 이 있고, /about/ 에서 현재 페이지로 표시된다", async ({ page }) => {
    await page.goto(ABOUT);

    const desktopNav = page.getByRole("navigation", { name: "주요 메뉴" });
    let nav = desktopNav;
    if (!(await desktopNav.isVisible())) {
      await page.getByRole("button", { name: "메뉴 열기" }).click();
      nav = page.getByRole("navigation", { name: "모바일 메뉴" });
    }

    const link = nav.getByRole("link", { name: "About", exact: true });
    await expect(link).toBeVisible();
    await expect(link, "현재 페이지 표시(aria-current)").toHaveAttribute("aria-current", "page");
  });
});

test.describe("/about/ — 히어로와 요약", () => {
  test("h1 이 하나이고 이름을 말한다", async ({ page }) => {
    await page.goto(ABOUT);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText("허우용 · Ted");
  });

  /**
   * 요약 카드 3장. `aboutFacts` 의 **`전문 분야` 는 리포 전체에서 유일한 사본**이라,
   * 이 검사가 없으면 그 문자열이 화면에서 사라져도 아무 데서도 안 걸린다.
   *
   * ⚠️ 개수만 재고 값을 안 재면 라벨 3개를 렌더하고 값 3개를 빠뜨려도 초록이다. 둘 다 본다.
   */
  test("요약이 aboutFacts 전수를 라벨·값까지 렌더한다", async ({ page }) => {
    await page.goto(ABOUT);
    const dl = page.locator('dl[aria-label="요약"]');

    await expect(dl.locator("dt"), "요약 라벨 수").toHaveCount(aboutFacts.length);
    for (const fact of aboutFacts) {
      await expect(dl.getByText(fact.label, { exact: true })).toBeVisible();
      await expect(dl.getByText(fact.value, { exact: true })).toBeVisible();
    }
  });

  test("경력 전문은 /work/ 로 보낸다", async ({ page }) => {
    await page.goto(ABOUT);
    await expect(page.getByRole("link", { name: /경력 전문 보기/ })).toHaveAttribute(
      "href",
      "/work/",
    );
  });
});

test.describe("/about/ — 철학·기술·학력", () => {
  /**
   * 철학 3문단. `data/about.ts` 의 원문이고, **이 페이지 말고 소비자가 없다.**
   * 한 문단만 렌더하는 회귀를 개수로 잡는다.
   */
  test("철학이 leadershipPhilosophy 전수를 문단으로 렌더한다", async ({ page }) => {
    await page.goto(ABOUT);
    await expect(page.getByRole("heading", { name: "개발 리더로서의 철학", exact: true })).toBeVisible();

    const paragraphs = page.locator('section[aria-labelledby="about-philosophy"] p');
    await expect(paragraphs, "철학 문단 수").toHaveCount(leadershipPhilosophy.length);
    for (const paragraph of leadershipPhilosophy) {
      await expect(page.getByText(paragraph, { exact: true })).toBeVisible();
    }
  });

  test("기술이 skillCategories 전수를 분류·내용까지 렌더한다", async ({ page }) => {
    await page.goto(ABOUT);
    await expect(page.getByRole("heading", { name: "기술", exact: true })).toBeVisible();

    const dl = page.locator('dl[aria-label="기술 분류"]');
    await expect(dl.locator("dt"), "기술 분류 수").toHaveCount(skillCategories.length);
    for (const category of skillCategories) {
      await expect(dl.getByText(category.title, { exact: true })).toBeVisible();
      await expect(dl.getByText(category.body, { exact: true })).toBeVisible();
    }
  });

  /**
   * ⚠️ **이 검사가 계획서의 경고를 실제로 막는 유일한 장치다** —
   *    「`data/portfolio.ts` 만 보고 만들면 학교 이름도 논문 제목도 없는 페이지가 나온다」.
   *    학교명·논문 제목·PDF 링크 셋을 각각 본다. 셋 중 하나만 빠져도 빨개져야 한다.
   */
  test("학력이 education 전수를 학교·논문 제목·PDF 링크까지 렌더한다", async ({ page }) => {
    await page.goto(ABOUT);
    await expect(page.getByRole("heading", { name: "학력", exact: true })).toBeVisible();

    const list = page.getByRole("list", { name: "학력" });
    await expect(list.getByRole("listitem"), "학력 항목 수").toHaveCount(education.length);

    for (const item of education) {
      await expect(list.getByText(item.school, { exact: true })).toBeVisible();
      await expect(list.getByText(item.thesisTitle, { exact: true })).toBeVisible();
      await expect(
        list.getByRole("link", { name: `${item.thesisTitle} 논문 PDF — 새 창`, exact: true }),
        "논문 PDF 링크의 목적지",
      ).toHaveAttribute("href", item.thesisPdfUrl);
    }
  });

  /**
   * 논문 요약은 빈 줄로 나뉜 여러 문단짜리 **한 문자열**이다.
   *
   * ⚠️ 텍스트 존재만 재면 안 된다. HTML 은 줄바꿈을 공백으로 접으므로,
   *    `whitespace-pre-line` 이 빠져도 「글자는 다 있는」 벽 텍스트가 되어 초록이다.
   *    문단 구분이 살아 있는지는 **계산된 스타일**로만 확인된다.
   */
  test("논문 요약을 펼치면 원문이 문단 구분을 유지한 채 보인다", async ({ page }) => {
    await page.goto(ABOUT);

    const body = page.locator("details p");
    await expect(body, "닫힌 <details> 안은 보이지 않는다").toBeHidden();

    await page.locator("summary").click();
    await expect(body).toBeVisible();

    // ⚠️ `toHaveText` 로 재지 마라 — Playwright 가 공백을 정규화해서 비교하므로
    //    줄바꿈이 살아 있는지가 그 단정으로는 드러나지 않는다. 원문 그대로 대조한다.
    expect((await body.textContent())?.trim(), "논문 요약 원문").toBe(
      thesisSummaryNarration.trim(),
    );
    await expect(body, "줄바꿈이 공백으로 접히면 문단이 사라진다").toHaveCSS(
      "white-space",
      "pre-line",
    );
  });
});
