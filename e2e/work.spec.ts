import { expect, test } from "@playwright/test";

import { experiences } from "../data/experience";
import { diagramGroups } from "../data/portfolio";
import { domains } from "../data/product-lead-domains";
import { projects } from "../data/projects";
import { capabilityMap, workPositioning } from "../data/work";

/**
 * `/work` — `product-lead*` 4갈래를 하나로 접은 페이지.
 *
 * ⚠️ **이 파일은 `gotoWithShell` 게이트를 쓰지 않는다. 의도적이다.**
 *    게이트는 「셸이 아직 그 경로에 안 붙었다」를 skip 으로 흘려보내기 위한 장치다.
 *    그런데 `/work/` 는 T11 이 **셸과 함께 처음 만드는 페이지**라, 셸이 없다는 것은
 *    「아직 안 왔다」가 아니라 **「만들다 빠뜨렸다」** 다. 그 둘을 같은 skip 으로 덮으면
 *    이 리포가 반복해서 데인 「조용한 초록」이 그대로 재현된다.
 *    셸 부착 여부는 아래 첫 describe 가 **빨강으로** 판정한다.
 *
 * ⚠️ **개수는 전부 데이터에서 온다. 숫자를 여기 적지 마라.**
 *    `/atlas` 가 엣지 1,053 중 156 만 그리고도 E2E 74 건이 통과한 사고가 이 리포에 있다.
 *    「데이터에 있다」와 「화면에 그려졌다」는 다른 사실이고, 후자를 재려면
 *    화면에서 센 수를 **데이터에서 센 수**와 맞춰야 한다. 상수를 손으로 적으면
 *    데이터가 늘어난 날 검사가 조용히 뒤처진다.
 *
 * ⚠️ **섹션 다섯 중 하나라도 개수 대조가 빠지면 그 섹션은 검사되지 않는 것과 같다.**
 *    2026-08-28 뮤테이션 실측: 「프로젝트」 섹션만 개수 대조가 없던 때,
 *    `projects.slice(0, 0)` 으로 **카드를 0개 렌더해도 E2E 70 건이 전부 초록**이었다.
 *    h2 존재만 보는 검사는 섹션이 비어 있는 것을 못 본다. 위의 `/atlas` 사고와 같은 모양이다.
 *
 * ⚠️ **`getByRole(role, { name })` 은 기본이 부분 문자열 매칭이다.** `exact: true` 없이는
 *    접근명이 길어져도 초록으로 남는다 — 뮤테이션 실측: `<h2>경력</h2>` → `경력 요약` 이
 *    **생존**했다. 접근명을 계약으로 삼는 검사에는 전부 `exact: true` 를 붙인다.
 */

const WORK = "/work/";

test.describe("/work/ — 존재와 셸", () => {
  test("200 으로 응답한다", async ({ page }) => {
    const res = await page.goto(WORK);
    expect(res?.status(), `${WORK} 응답 코드`).toBe(200);
  });

  /**
   * 셸 표지를 **정적 HTML** 에서 센다. DOM 으로 재면 하이드레이션이 꽂아 넣은 것까지
   * 세게 되어, JS 를 돌리기 전 HTML 을 읽는 크롤러가 보는 것과 어긋난다.
   * `smoke.spec.ts` 의 canonical 검사가 같은 이유로 정적 HTML 을 본다.
   */
  test("새 셸이 정적 HTML 에 정확히 한 번 붙어 있다", async ({ page }) => {
    const res = await page.request.get(WORK);
    expect(res.ok(), `${WORK} 가 200 이 아니다 — 셸 이전에 페이지가 없다`).toBe(true);
    const html = await res.text();
    const count = html.split("data-site-shell").length - 1;
    expect(count, `${WORK} 정적 HTML 안의 data-site-shell 개수`).toBe(1);
  });

  /**
   * ⚠️ **항목이 어느 내비에 있는지가 폭에 따라 다르다.** 데스크톱 내비는 `hidden md:flex` 라
   *    390px 에서 통째로 안 보이고, 그 폭에서 항목이 사는 곳은 햄버거가 여는 드로어다.
   *    `e2e/shell.spec.ts:92` 가 같은 분기를 이미 갖고 있다 — 2026-08-27 에 그쪽이 먼저 데었다.
   *    구현으로는 해소되지 않는다: 드로어에 같은 접근명을 주면 스크린리더가 「주요 메뉴」를
   *    두 번 읽고, 닫힌 드로어는 어차피 display:none 이다.
   */
  test("헤더 내비에 Work 가 있고, /work/ 에서 현재 페이지로 표시된다", async ({ page }) => {
    await page.goto(WORK);

    const desktopNav = page.getByRole("navigation", { name: "주요 메뉴" });
    let nav = desktopNav;
    if (!(await desktopNav.isVisible())) {
      await page.getByRole("button", { name: "메뉴 열기" }).click();
      nav = page.getByRole("navigation", { name: "모바일 메뉴" });
    }

    const link = nav.getByRole("link", { name: "Work", exact: true });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute("aria-current", "page");
  });
});

test.describe("/work/ — 섹션이 실제로 그려졌는가", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WORK);
  });

  test("h1 이 하나이고 포지셔닝 heading 이다", async ({ page }) => {
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(workPositioning.heading);
  });

  test("포지셔닝 문구가 보인다", async ({ page }) => {
    await expect(page.getByText(workPositioning.lead, { exact: true })).toBeVisible();
    await expect(page.getByText(workPositioning.sub, { exact: true })).toBeVisible();
  });

  /**
   * 섹션 다섯이 **전부** 있어야 한다. 하나가 빠져도 페이지는 멀쩡히 렌더되고
   * 빌드도 통과한다 — 사람이 열어 보지 않으면 아무도 모른다.
   * `exact: true` 가 붙은 이유는 이 파일 머리의 네 번째 ⚠️ 를 보라.
   */
  for (const name of ["요구 역량 매핑", "경력", "프로젝트", "시스템 구조", "도메인 실행 설계"]) {
    test(`「${name}」 섹션이 접근성 트리에 있다`, async ({ page }) => {
      await expect(page.getByRole("heading", { level: 2, name, exact: true })).toHaveCount(1);
    });
  }
});

test.describe("/work/ — 데이터와 화면의 개수가 맞는가", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WORK);
  });

  test(`역량 매핑 표가 ${capabilityMap.length} 행을 그린다`, async ({ page }) => {
    // 표에는 접근명을 두지 않는다 — 스크롤 컨테이너가 이름을 갖는다(section-capability.tsx 주석).
    // 이 리포에서 `<table>` 은 그 파일에만 있다. 다른 곳에 표가 생기면 이 줄이 먼저 빨개진다.
    const rows = page.getByRole("table").locator("tbody tr");
    await expect(rows).toHaveCount(capabilityMap.length);
  });

  test(`경력이 ${experiences.length} 건 그려진다`, async ({ page }) => {
    const items = page.getByRole("list", { name: "경력", exact: true }).locator("> li");
    await expect(items).toHaveCount(experiences.length);
  });

  /**
   * 이 검사가 없던 동안 `projects.slice(0, 0)` 뮤턴트가 **생존**했다.
   * 다섯 섹션 중 넷에만 개수 대조가 있으면, 초록 70 건은 커버리지를 증명하지 않는다.
   */
  test(`프로젝트가 ${projects.length} 건 그려진다`, async ({ page }) => {
    const items = page.getByRole("list", { name: "프로젝트", exact: true }).locator("> li");
    await expect(items).toHaveCount(projects.length);
  });

  test(`시스템 구조가 ${diagramGroups.length} 개 그룹으로 그려진다`, async ({ page }) => {
    const groups = page.locator("[data-diagram-group]");
    await expect(groups).toHaveCount(diagramGroups.length);
  });

  test(`도메인 실행 설계가 ${domains.length} 건 그려진다`, async ({ page }) => {
    const items = page.getByRole("list", { name: "도메인 실행 설계", exact: true }).locator("> li");
    await expect(items).toHaveCount(domains.length);
  });
});

test.describe("/work/ — 접근성 계약", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(WORK);
  });

  /**
   * 역량 매핑 표는 `min-w-*` 라 좁은 폭에서 **반드시** 가로 스크롤된다.
   * `overflow-x-auto` 컨테이너에 `tabindex` 가 없으면 키보드 사용자는 스크롤 영역에
   * 도달하지 못해 오른쪽 열을 **영영 읽을 수 없다.**
   *
   * ⚠️ **`role="region"` 으로 재지 마라.** 2026-08-28 리뷰가 잡았다 — 스크롤 컨테이너를
   *    landmark 로 만들면 바깥 `<section>` 과 이름이 겹치고, 그것을 피하려 `<section>` 에서
   *    이름을 떼면 h2 가 landmark 밖으로 밀려난다. **키보드 도달을 만드는 것은
   *    `role` 이 아니라 `tabindex` 다.** 그래서 여기서도 `tabindex` 로 잰다.
   */
  test("가로 스크롤되는 표에 키보드로 도달할 수 있다", async ({ page }) => {
    const table = page.getByRole("table");
    await expect(table).toHaveCount(1);

    const scroller = page.locator('[tabindex="0"]').filter({ has: table });
    await expect(scroller, "표를 감싼 포커스 정지점이 없다").toHaveCount(1);

    // 접근명 없는 정지점은 「어디에 왔는지 모를 곳」이다. 무엇을 가리키든 이름은 있어야 한다.
    await expect(scroller).toHaveAttribute("aria-labelledby", /.+/);

    /*
     * 포커스 정지점을 만들었으면 포커스 링도 와야 한다. 다크 배경 `#08080a` 위에서
     * 브라우저 기본 outline 은 대비가 낮고, 이 페이지의 다른 정지점과 모양이 달라
     * 「여기서 방향키로 스크롤하라」는 신호가 서지 않는다.
     *
     * ⚠️ **이 줄이 지키는 것은 「포커스 링이 보인다」가 아니라 「클래스를 붙이는 것을
     *    잊지 않았다」 다.** `toHaveClass` 는 DOM 의 클래스 문자열만 본다 —
     *    CSS 규칙이 통째로 없어도 초록이다.
     *    2026-08-28 실측: 산출물 CSS 에서 `.focus-visible\:ring-signal` 선택자를 무력화한 뒤
     *    이 test 만 재실행했더니 **2 passed** 였다.
     *
     *    그러므로 Tailwind 추출이 깨지는 회귀(상수를 조립식으로 바꾸거나 추출 경로 밖으로
     *    옮기는 것)는 이 검사가 **잡지 못한다.** 지금 그 CSS 를 지키고 있는 것은 검사가 아니라,
     *    같은 리터럴이 `site-header` 등 **6곳에 복붙돼 있다는 사실**뿐이다.
     *    `components/work/focus-ring.ts` 로의 단일화가 리포 전체로 진행되는 날
     *    그 방패도 함께 사라진다 — 그날 필요한 것은 `getComputedStyle(...).boxShadow` 를
     *    재거나, `smoke.spec.ts` 처럼 **산출물 자체**를 검사하는 것이다.
     */
    await expect(scroller).toHaveClass(/focus-visible:ring-signal/);
  });

  /**
   * 링크 목록 낭독에서는 링크 **텍스트만** 읽힌다. 접근명이 같으면 목적지를 구분할 수 없다.
   * 2026-08-28 실측: `data/projects.ts` 의 `label` 이 3건 모두 `서비스 보기` 라
   * 야나두·BTV·TVING 세 링크가 스크린리더에서 완전히 동일했다.
   */
  test("프로젝트 섹션의 링크 접근명이 서로 다르다", async ({ page }) => {
    const list = page.getByRole("list", { name: "프로젝트", exact: true });
    const names = await list.getByRole("link").evaluateAll((els) =>
      els.map((el) => (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim()),
    );

    // 대조군 — 링크를 하나도 못 잡았으면 아래 「전부 다르다」는 공허하게 참이다.
    expect(names.length, "프로젝트 링크를 하나도 찾지 못했다 — 아래 단언은 거짓 음성이다").toBeGreaterThan(1);

    expect(new Set(names).size, `접근명이 겹친다: ${names.join(" / ")}`).toBe(names.length);
  });

  /**
   * 새 창으로 여는 링크는 그 사실을 접근명에 담아야 한다. 예고 없이 창이 바뀌면
   * 스크린리더 사용자는 뒤로 가기가 듣지 않는 이유를 알 수 없다.
   */
  test("새 창으로 여는 링크가 그 사실을 알린다", async ({ page }) => {
    const external = page.locator("main a[target=_blank]");
    const count = await external.count();

    // 대조군 — 외부 링크가 없으면 검사할 것도 없다. 0 이면 이 페이지의 전제가 바뀐 것이다.
    expect(count, "main 안에 target=_blank 링크가 없다 — 아래 단언은 거짓 음성이다").toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const link = external.nth(i);
      const name = (await link.getAttribute("aria-label")) ?? (await link.innerText());
      expect(name, `새 창 예고가 없다: ${await link.getAttribute("href")}`).toContain("새 창");
    }
  });
});

test.describe("/work/ — 문구 규칙", () => {
  /**
   * 부정 단언에는 대조군이 붙는다. 「금지 표현 0 건」은 페이지가 빈 껍데기여도,
   * 셀렉터가 아무것도 못 잡아도 초록이다. 그래서 **있어야 하는 문구를 먼저 확인**해
   * 계수기가 살아 있음을 증명한 뒤에 0 을 주장한다.
   * 같은 규칙을 `tests/work/work-data.test.ts` 가 데이터 층에서 한 번 더 검사한다 —
   * 데이터가 깨끗해도 페이지가 문구를 새로 쓰면 여기서만 잡힌다.
   */
  test("원조 주장 표현이 페이지에 없다 (대조군: 「커머스개발실장」이 먼저 보여야 한다)", async ({ page }) => {
    await page.goto(WORK);
    const body = (await page.locator("main").innerText()).replace(/\s+/g, " ");

    expect(body, "본문이 비었다 — 아래 0 건은 거짓 음성이다").toContain("커머스개발실장");

    expect(/처음\s*(구축|만든|만들|세운|개발한)/.test(body), `원조 주장 표현이 있다:\n${body}`).toBe(false);
  });

  /**
   * 구본 표기 「발주사 PM」이 화면에 남아 있으면 안 된다.
   * 2026-08-28 실측: `data/work.ts` 는 「발주 PM」인데 `data/experience.ts` 는
   * 「발주사 PM」이라, **한 페이지에 두 표기가 공존**했다. 데이터 층 검사가
   * `capabilityMap` 만 훑어 이 조합을 못 봤다 — 화면에서 한 번 더 본다.
   */
  test("구본 표기 「발주사 PM」이 화면에 없다 (대조군: 「발주 PM」이 먼저 보여야 한다)", async ({ page }) => {
    await page.goto(WORK);
    const body = (await page.locator("main").innerText()).replace(/\s+/g, " ");

    expect(body, "「발주 PM」이 하나도 없다 — 아래 0 건은 거짓 음성이다").toContain("발주 PM");

    expect(body).not.toContain("발주사 PM");
  });

  /**
   * 회사 라벨 전체 표기. **경력 리스트 안으로 스코프한다** —
   * 같은 문자열이 다른 섹션에도 나오면 strict mode 가 터지는데, 그것을 피하겠다고
   * 화면에 보이는 회사명을 줄이면 **테스트가 콘텐츠를 지배하게 된다.** 방향이 반대다.
   */
  test("경력의 회사 라벨이 전체 표기로 보인다", async ({ page }) => {
    await page.goto(WORK);
    const list = page.getByRole("list", { name: "경력", exact: true });
    await expect(list.getByText("(주)야나두 a kakao company (구 카카오키즈)")).toBeVisible();
  });
});
