import { expect, test, type Locator, type Page } from "@playwright/test";
import { SHELL_HOME, SHELL_MARKER } from "./shell-gate";

/**
 * `/atlas` 지식 아틀라스 E2E.
 *
 * ⚠️ **이 파일은 `gotoWithShell` 게이트를 쓰지 않는다 — 그래서 센티넬도 없다.**
 *    게이트는 「셸이 붙은 페이지에서만 성립하는 검사」를 위한 것인데, 아래 검사들은
 *    그래프·목록·노드 상세를 보므로 셸과 무관하게 항상 성립해야 한다. 게이트를 걸면
 *    셸이 사라졌을 때 **아틀라스 6건이 통째로 조용한 skip** 이 되고, 그것이 이 리포가
 *    반복해서 데인 「거짓 0」이다. 셸의 실재는 아래 「셸이 붙어 있다」가 직접 단정한다.
 *
 * `SHELL_HOME` 은 마침 `/atlas/` 다(`shell-gate.ts`). 같은 경로를 문자열로 한 번 더
 * 적으면 두 파일이 서로 다른 곳을 보게 되므로 상수를 그대로 쓴다.
 */

/** 목록 구획. `pages/atlas/index.tsx` 의 `<section aria-labelledby="atlas-list-heading">` 이다. */
function listRegion(page: Page): Locator {
  return page.getByRole("region", { name: "전체 목록", exact: true });
}

/**
 * 목록 안의 **글** 버튼 전부.
 *
 * ⚠️ 「전체 목록」 제목 뒤 `following::button[1]` 로 쓰지 마라. 계획서 초안이 그랬는데
 *    **첫 버튼은 글이 아니라 토픽**이다 — `lib/atlas/layout.ts` 의 `listSections` 가
 *    토픽 구획을 먼저 돌려주고, `components/atlas/list-view.tsx` 가 WCAG 2.1.1 때문에
 *    토픽 제목 `<h3>` **안에** 버튼을 넣기 때문이다. 토픽 노드에는 「원문 읽기 →」가
 *    아예 없어서 초안의 T4 는 그대로 두면 실패한다.
 *
 * 그래서 위치가 아니라 **구조**로 지목한다 — 글 버튼은 `<li>` 안에만 있고 토픽 버튼은
 * `<h3>` 안에만 있다. 이 로케이터가 정말 글을 골랐는지는 아래
 * 「글 노드 상세가 원문으로 이어진다」가 「원문 읽기 →」의 존재로 되짚는다.
 */
function articleButtons(page: Page): Locator {
  return listRegion(page).getByRole("listitem").getByRole("button");
}

/** 선택한 노드가 뜨는 우측 패널. `pages/atlas/index.tsx` 의 `<aside aria-label="선택한 노드">`. */
function nodePanel(page: Page): Locator {
  return page.getByRole("complementary", { name: "선택한 노드", exact: true });
}

/**
 * 목록의 첫 글을 고르고, 그 제목과 상세 페이지 링크를 돌려준다.
 *
 * ⚠️ id 를 하드코딩하지 않는 이유: 그 글이 사라지거나 슬러그가 바뀌면 검사가 죽는데,
 *    그 빨강은 회귀가 아니라 집필이다. 실물 목록에서 뽑으면 코퍼스가 바뀌어도 산다.
 *
 * 상세 링크(`components/atlas/list-view.tsx` 의 `DetailLink`)는 **선택된 항목에만** 붙는다.
 * 그래서 href 를 얻으려면 먼저 골라야 한다.
 */
async function selectFirstArticle(page: Page): Promise<{ title: string; detailHref: string }> {
  const button = articleButtons(page).first();
  await expect(button, "목록에 글 버튼이 하나도 없다 — 그래프가 비었거나 목록이 안 실렸다").toBeVisible();

  const title = (await button.innerText()).trim();
  await button.click();

  // 상세 링크는 패널이 아니라 **목록 안**, 고른 항목 바로 옆에 붙는다.
  // 접근명이 제목을 포함하므로 「어느 글의 상세인가」가 로케이터에 드러난다.
  const detail = listRegion(page).getByRole("link", {
    name: `${title} 상세 페이지로 이동`,
    exact: true,
  });
  await expect(detail, `「${title}」 을 골랐는데 상세 링크가 안 붙었다`).toBeVisible();

  const detailHref = (await detail.getAttribute("href")) ?? "";
  return { title, detailHref };
}

test.describe("아틀라스", () => {
  test("셸이 붙어 있다", async ({ page }) => {
    await page.goto(SHELL_HOME);
    await expect(
      page.locator(SHELL_MARKER),
      `${SHELL_HOME} 에 data-site-shell 이 1개가 아니다 — 미부착이거나 중첩 마운트다`,
    ).toHaveCount(1);
  });

  test("그래프와 목록이 함께 있다", async ({ page }) => {
    await page.goto(SHELL_HOME);

    // 그래프는 `role="img"` 의 SVG 다. 자식 원은 접근성 트리에서 지워지므로 `aria-label` 이
    // 유일한 접근명이고, 그 문구는 `components/atlas/dot-renderer.tsx` 가 만든다.
    await expect(page.getByRole("img", { name: /지식 그래프/ })).toBeVisible();

    // ⚠️ 목록은 「보기 좋은 것」이 아니라 **키보드·스크린리더의 유일한 경로**다
    //    (`DotRenderer` 는 포인터 전용). 그래프만 남기는 회귀를 여기서 잡는다.
    await expect(
      page.getByRole("heading", { name: "전체 목록", exact: true }),
    ).toBeVisible();
  });

  test("목록에서 글을 고르면 상세가 뜬다", async ({ page }) => {
    await page.goto(SHELL_HOME);
    const { title } = await selectFirstArticle(page);

    const panel = nodePanel(page);
    // 고른 것이 패널에 뜬 것과 **같은 글**인지 본다. 「연결」만 보면 어느 노드가 떴는지
    // 모른 채 초록이 된다.
    await expect(panel.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(panel.getByRole("heading", { name: /^연결/ })).toBeVisible();
  });

  /**
   * R2 — 브리프의 「노드 상세가 **정적으로 존재**하고 원문으로 이어진다」는 이름이
   * 검사하지 않는 것을 주장하고 있었다. `/atlas/<id>/` 를 한 번도 요청하지 않았기 때문이다.
   * 둘로 쪼갠 앞쪽이 이것이다.
   */
  test("노드 상세가 정적으로 존재한다", async ({ page }) => {
    await page.goto(SHELL_HOME);
    const { title, detailHref } = await selectFirstArticle(page);

    // 글 노드 id 는 `<category>/<slug>` 라 **경로에 슬래시가 들어간다.** 그것을 받으려고
    // 라우트를 `[...id].tsx` catch-all 로 만든 것이 T11 의 핵심 결정이라, 슬래시가 실제로
    // 있는지를 먼저 못 박는다 — 없으면 아래 200 은 catch-all 을 증명하지 못한다.
    expect(detailHref, "상세 링크가 /atlas/ 로 시작하지 않는다").toMatch(/^\/atlas\//);
    expect(
      detailHref.slice("/atlas/".length).replace(/\/$/, ""),
      "노드 id 에 슬래시가 없다 — catch-all 라우트를 증명하지 못하는 경로다",
    ).toContain("/");

    // ⚠️ 원본 응답을 본다. `page.goto` 로 보면 클라이언트 라우팅이 그려 준 화면을
    //    「정적으로 존재한다」로 오독한다 — 정적 내보내기가 이 경로를 안 냈어도 초록이 된다.
    const res = await page.request.get(detailHref);
    expect(res.status(), `${detailHref} 가 200 이 아니다 — 정적 산출물에 이 노드가 없다`).toBe(200);
    expect(await res.text(), `${detailHref} 본문에 「${title}」 이 없다`).toContain(title);
  });

  /** R2 의 뒤쪽 — 아틀라스가 글로 되돌아가는 길. */
  test("글 노드 상세가 원문으로 이어진다", async ({ page }) => {
    await page.goto(SHELL_HOME);
    await selectFirstArticle(page);

    // 「원문 읽기 →」는 `source.kind === "note"` 인 노드에만 렌더된다
    // (`components/atlas/node-panel.tsx`). 즉 이 단정은 **위 로케이터가 토픽이 아니라 글을
    // 골랐다**는 것까지 함께 증명한다 — 토픽을 골랐다면 이 링크가 존재하지 않는다.
    const source = nodePanel(page).getByRole("link", { name: "원문 읽기 →", exact: true });
    await expect(source, "고른 노드에 「원문 읽기 →」가 없다 — 글이 아니라 토픽을 골랐다").toBeVisible();
    await expect(source).toHaveAttribute("href", /^\/blog\//);
  });

  /**
   * 노드 상세 162 장이 sitemap 에 새면 검색엔진이 글 본문의 **요약 조각**을 원문과 함께
   * 색인한다. `scripts/generate-sitemap.mjs` 의 제외가 살아 있는지 본다.
   */
  test("sitemap 에 노드 상세가 새지 않는다", async ({ page }) => {
    const res = await page.request.get("/sitemap.xml");
    expect(res.status(), "sitemap.xml 이 200 이 아니다").toBe(200);

    const xml = await res.text();
    const atlasLocs = xml.match(/<loc>[^<]*\/atlas\/[^<]*<\/loc>/g) ?? [];
    expect(atlasLocs, `sitemap 의 atlas 항목: ${atlasLocs.join(" ") || "(0건)"}`).toHaveLength(1);
  });
});
