import { expect, test } from "@playwright/test";

/**
 * 제거된 `product-lead*` 라우트의 스텁 검사 (설계서 §4 · 계획서 Task 13).
 *
 * **9 URL 이 파일 5개로 접힌다.** 셋은 `public/**\/index.html` 정적 스텁이고,
 * 위키 6 URL 중 하위 5개는 `pages/product-lead-wiki/[slug].tsx` 가, 인덱스 1개는
 * `pages/product-lead-wiki/index.tsx` 가 덮는다.
 * 하나라도 404 가 되면 안 된다 — 외부에서 걸린 링크와 색인이 그대로 죽는다.
 *
 * ⚠️ 「파일 4개」라고 적힌 문서가 남아 있으면 그쪽이 틀렸다. `[slug].tsx` 가 덮는 것은
 *    6 URL 이 아니라 **5 URL** 이다(동적 세그먼트가 인덱스 라우트를 덮지 못한다).
 *
 * ⚠️ **이 파일은 「접힌 뒤」를 검사한다.** 스텁이 없는 상태에서 도는 것이 정상이고
 *    (그때는 구 페이지가 200 을 주므로 ①만 통과하고 ②에서 빨개진다), 그 빨강이
 *    이 검사의 계수기가 살아 있다는 증거다. 조용히 초록이 되는 경로를 만들지 마라.
 */

/** 접히는 9 URL 전부. 계획서 Task 13 의 목록과 같아야 한다. */
const RETIRED = [
  "/product-lead/",
  "/product-lead-v2/",
  "/product-lead-loadmap/",
  "/product-lead-wiki/",
  "/product-lead-wiki/hub/",
  "/product-lead-wiki/cms/",
  "/product-lead-wiki/payment/",
  "/product-lead-wiki/admin/",
  "/product-lead-wiki/governance/",
] as const;

/** 이동 목적지. 여기가 바뀌면 스텁 5개와 이 상수를 함께 고친다. */
const DESTINATION = "/work/";

/**
 * 위 9개 중 **손으로 쓴 정적 HTML** 셋.
 *
 * 이 셋만 따로 세는 이유는 `pages/_document.tsx` 가 보장해 주는 것들
 * (`<html lang="ko">` 등)을 이쪽은 **아무도 보장하지 않기** 때문이다.
 * 나머지 6개는 Next 가 그리므로 `_document` 의 계약을 그대로 물려받는다.
 */
const STATIC_STUBS = ["/product-lead/", "/product-lead-v2/", "/product-lead-loadmap/"] as const;

test.describe("제거된 라우트 스텁 — 9 URL", () => {
  /**
   * **전수 대조를 먼저 둔다.**
   *
   * 아래 `for` 는 `RETIRED` 가 빈 배열이면 **아무것도 단정하지 않고 초록**이다
   * (T12 의 R46 이 실제로 그렇게 조용히 통과했다). 개수를 먼저 못 박아
   * 목록이 줄어드는 사고를 이 한 줄이 잡는다.
   */
  test("검사 대상이 9개다 — 목록이 줄면 아래 루프가 조용히 초록이 된다", () => {
    expect(RETIRED.length, "RETIRED 개수").toBe(9);
    expect(new Set(RETIRED).size, "RETIRED 에 중복이 있다").toBe(9);
  });

  for (const path of RETIRED) {
    test(`${path} 가 ${DESTINATION} 로 보낸다`, async ({ page }) => {
      // ① 살아 있나. 404 면 여기서 끝난다.
      const res = await page.goto(path);
      expect(res?.status(), `${path} 응답 코드`).toBe(200);

      // ② 실제로 옮겨 가나.
      //
      // ⚠️ `waitForURL` 이 필요하다. `meta http-equiv="refresh"` 는 문서 파싱 후에
      //    걸리므로 `goto` 가 반환된 시점의 URL 은 아직 출발지다. 여기서 바로
      //    `toHaveURL` 을 재면 스텁이 정상 동작해도 빨개진다.
      await page.waitForURL(`**${DESTINATION}`);
      await expect(page).toHaveURL(new RegExp(`${DESTINATION.replace(/\//g, "\\/")}$`));
    });
  }
});

test.describe("스텁의 색인 계약", () => {
  /**
   * **`<head>` 만 잘라 낸다.** 통째 문자열 검색은 Next 가 `__NEXT_DATA__` 에 실어 둔
   * props 에도 걸려 거짓 양성이 된다(`CLAUDE.md` 의 「있다는 세 단계다」).
   *
   * 끊지 못하면 **단언 이전에 명시적으로 죽인다** — 파싱 실패가 조용한 초록이 되면
   * 아래 검사 전부가 무의미해진다.
   */
  function headOf(html: string, path: string): string {
    const inner = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1];
    // `!` 로 덮지 않는다. 못 끊었을 때 조용히 빈 문자열이 흐르면 아래 개수 단언이
    // 「0개」로 죽는데, 그 빨강은 「메타가 없다」와 「HTML 을 못 읽었다」를 구분하지 못한다.
    if (inner === undefined) throw new Error(`${path} 의 <head> 를 끊지 못했다 — HTML 파싱 실패`);
    return inner;
  }

  /** `<head>` 안에서 태그를 세어 **정확히 1개**임을 보장하고 그 원문을 준다. */
  function soleTag(head: string, re: RegExp, what: string, path: string): string {
    const hits = head.match(re) ?? [];
    expect(hits.length, `${path} 의 ${what} 가 ${hits.length}개다 (1개여야 한다)`).toBe(1);
    const only = hits[0];
    if (only === undefined) throw new Error(`${path} 의 ${what} 를 읽지 못했다 — 위 개수 단언과 모순`);
    return only;
  }

  /**
   * **이 단언은 브라우저가 아니라 바이트에서 잰다.** 이유가 둘이고, 둘 다 실측이다.
   *
   * ① **경주.** `meta http-equiv="refresh" content="0"` 은 문서 로드 직후 즉시 이동한다.
   *    `page.goto` 뒤 DOM 을 폴링하면 400바이트짜리 정적 스텁은 **첫 폴링 전에** 이미
   *    `/work/` 로 넘어가 있어 타임아웃이 난다(2026-08-28 실측, 3/3 재현).
   *    반대로 Next 스텁 6개는 스크립트 로딩이 ~25ms 를 벌어 **우연히** 통과했다 —
   *    그 초록은 계약이 아니라 타이밍이었다. 바이트로 재면 9개가 같은 근거로 초록이다.
   *    `content="1"` 로 늦춰 통과시키는 길도 있지만, 그것은 검사를 위해 프로덕션 의미를
   *    바꾸는 것이다 — 지연 refresh 는 크롤러가 **임시** 이전으로 해석한다.
   *
   * ② **계층.** 이 메타의 소비자는 렌더러가 아니라 크롤러이고 크롤러는 바이트를 읽는다.
   *    「실제로 이동하는가」는 위 describe 의 `waitForURL` 이 이미 브라우저로 재고 있으므로
   *    여기서 다시 재지 않는다. 두 검사가 서로 다른 계층을 하나씩 맡는다.
   *
   * ⚠️ **`robots` 메타는 「있어야」가 아니라 「없어야」 한다.** 초안은 `noindex, follow` 를
   *    요구했고 그것이 리다이렉트 스텁의 상식처럼 보이지만, 이 9개는 **전부 `/work/` 를
   *    canonical 로 가리킨다.** 구글은 canonical 로 묶인 URL 무리를 하나로 취급하므로,
   *    그 무리 안의 `noindex` 가 **대표 URL 인 `/work/` 까지** 색인에서 끌어내릴 수 있다.
   *    포트폴리오의 핵심 페이지가 조용히 사라지는 실패이고, 사라진 뒤에는 원인이 안 보인다.
   *    중복 제거는 canonical 하나로 충분하고, 검색엔진 노출 차단은
   *    `scripts/generate-sitemap.mjs` 의 EXCLUDE 가 맡는다.
   *
   *    `public/notion/index.html` 이 같은 조합(noindex + canonical)을 쓰고 있지만 그쪽
   *    canonical 대상은 **외부** Notion 이라 잃을 것이 없었다. 대상이 내부 페이지로
   *    바뀌면서 위험도가 달라졌다 — 선례를 근거로 되돌리지 마라.
   */
  for (const path of RETIRED) {
    test(`${path} 가 robots 메타 없이 ${DESTINATION} canonical 만 단다`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `${path} 응답 코드`).toBe(200);
      const head = headOf(await res.text(), path);

      // 계수기 대조를 먼저 둔다 — `<head>` 를 잘못 끊어 빈 문자열이 흐르면 아래 「0개」가
      // 저절로 통과한다. 반드시 있어야 하는 태그 하나로 파싱이 살아 있음을 증명한다.
      expect(head, `${path} 의 <head> 에 <title> 이 없다 — 파싱이 죽었을 수 있다`).toMatch(
        /<title>/i,
      );

      const robots = head.match(/<meta[^>]+name="robots"[^>]*>/gi) ?? [];
      expect(
        robots.length,
        `${path} 에 robots 메타가 ${robots.length}개 있다 (0개여야 한다) — ${robots.join(" ")}\n` +
          `canonical 로 ${DESTINATION} 에 묶인 무리라, 여기 붙은 noindex 가 ${DESTINATION} 까지 색인에서 뺄 수 있다.`,
      ).toBe(0);

      // 속성 인용 형식이 소스마다 다르다 — public/ 은 ` />`, next/head 는 `"/>` 로 닫는다.
      const canonical = soleTag(head, /<link[^>]+rel="canonical"[^>]*>/gi, "canonical", path);
      expect(canonical, `${path} 의 canonical 이 ${DESTINATION} 를 가리키지 않는다`).toMatch(
        new RegExp(`href="https?://[^"]*${DESTINATION.replace(/\//g, "\\/")}"`),
      );

      // ⚠️ **이 단언이 이 파일에서 가장 중요하다. 그리고 초안에는 없었다.**
      //
      // 위 describe 의 `waitForURL` 이 이동을 재고 있으니 충분해 보이지만, 그것은 **JS 가
      // 도는 브라우저**에서만 참이다. 스텁에는 보조 경로로 `location.replace()` 가 있어서
      // meta refresh 를 통째로 지워도 `waitForURL` 이 그대로 초록이다 —
      // 2026-08-28 뮤테이션 #1 이 실제로 생존했다(전 스위트 238 passed 유지).
      //
      // 즉 **주 경로(JS 없이 도는 meta refresh)를 재는 검사가 하나도 없었다.** 크롤러와
      // JS 를 끈 사용자에게는 이쪽이 전부다. 위 주석이 「바이트에서 잰다」고 설계를 다
      // 적어 놓고도 정작 이 줄이 빠져 있었다 — **주석은 단언이 아니다.**
      const refresh = soleTag(head, /<meta[^>]+http-equiv="refresh"[^>]*>/gi, "meta refresh", path);
      expect(
        refresh.match(/content="([^"]*)"/i)?.[1].replace(/\s+/g, ""),
        `${path} 의 meta refresh 가 즉시 ${DESTINATION} 로 보내지 않는다 — ${refresh}\n` +
          `지연값(0 이 아닌 값)은 WCAG SC 2.2.1 의 실패 조건 F40/F41 에 걸리고, 크롤러도 임시 이전으로 해석한다.`,
      ).toBe(`0;url=${DESTINATION}`);
    });
  }

  /**
   * **목적지 자신이 `noindex` 면 안 된다.**
   *
   * 위 9개의 canonical 이 전부 `/work/` 로 모이므로, 언젠가 `/work/` 에 `noindex` 가 붙는
   * 순간 클러스터 전체가 색인에서 증발한다. 위 루프는 스텁만 보므로 그 사고를 못 잡는다.
   * `components/site-head.tsx` 의 `noindex` prop 하나면 일어날 수 있는 일이라 여기서 막는다.
   */
  test(`${DESTINATION} 자신은 noindex 가 아니다 — canonical 클러스터의 대표 URL 이다`, async ({
    request,
  }) => {
    const res = await request.get(DESTINATION);
    expect(res.status(), `${DESTINATION} 응답 코드`).toBe(200);
    const head = headOf(await res.text(), DESTINATION);

    // 계수기 대조 — 엉뚱한 문서를 읽고 「noindex 없음」을 통과시키지 않도록.
    expect(head, `${DESTINATION} 의 <head> 에 <title> 이 없다`).toMatch(/<title>/i);

    const robots = head.match(/<meta[^>]+name="robots"[^>]*>/gi) ?? [];
    const noindexed = robots.filter((tag) => /noindex/i.test(tag));
    expect(
      noindexed.length,
      `${DESTINATION} 가 noindex 다 — 스텁 9개의 canonical 이 전부 여기로 오므로 클러스터 전체가 색인에서 빠진다: ${noindexed.join(" ")}`,
    ).toBe(0);
  });

  /**
   * **`</head>` 이후만 본다.** Next 는 props 를 `__NEXT_DATA__` 에 실어 두므로 통째 문자열
   * 검색은 거짓 양성이 된다(`CLAUDE.md` 의 「있다는 세 단계다」).
   */
  function bodyOf(html: string, path: string): string {
    const i = html.indexOf("</head>");
    if (i < 0) throw new Error(`${path} 의 </head> 를 찾지 못했다 — HTML 파싱 실패`);
    return html.slice(i);
  }

  /**
   * **본문에 사람이 누를 수 있는 대체 링크가 있어야 한다.**
   *
   * `meta refresh` 가 막힌 프록시·텍스트 브라우저·확장 프로그램 환경이 스텁 설계의 근거인데,
   * 그 근거를 재는 검사가 하나도 없었다 — **본문 블록을 통째로 지우는 뮤턴트가 전 스위트에서
   * 생존한다.** 위 describe 의 `waitForURL` 은 refresh 가 **동작할 때**만 보므로 이 구멍을 못 막는다.
   *
   * `<main>` 랜드마크도 함께 잰다. 그 화면을 실제로 받는 사람에게는 이것이 전부라,
   * 랜드마크가 없으면 스크린리더 사용자에게 탐색 단서가 0 이 된다.
   */
  for (const path of RETIRED) {
    test(`${path} 본문에 <main> 과 ${DESTINATION} 대체 링크가 있다`, async ({ request }) => {
      const body = bodyOf(await (await request.get(path)).text(), path);

      expect(body, `${path} 본문에 <main> 랜드마크가 없다`).toMatch(/<main[\s>]/i);

      const links = body.match(new RegExp(`<a[^>]+href="${DESTINATION}"`, "gi")) ?? [];
      expect(
        links.length,
        `${path} 본문에 ${DESTINATION} 로 가는 <a> 가 없다 — meta refresh 가 막힌 환경에서 막다른 길이 된다`,
      ).toBeGreaterThan(0);
    });
  }

  /**
   * **Pagefind 색인에서 빠져 있어야 한다.**
   *
   * 없으면 스텁 9개가 전부 같은 제목으로 ⌘K 결과에 뜨고, 누른 사람은 즉시 `/work/` 로 튕긴다.
   * 색인 산출물(`out/pagefind/fragment`)을 세는 것이 정본이지만 그건 빌드 스크립트의 몫이고,
   * 여기서는 **그 결과를 만드는 원인**인 속성이 산출물 HTML 에 실제로 나갔는지를 바이트로 못 박는다.
   *
   * ⚠️ `"all"` 이어야 한다. 기본값 `"index"` 는 본문만 빼고 **제목은 여전히 집는다**.
   *
   * ⚠️ **실제 「태그의 속성」인지까지 본다. 문자열이 본문 어딘가 있는 것으로는 부족하다.**
   *    초안은 본문 전체에서 문자열만 찾았는데, 스텁마다 바로 위에 이 속성을 **설명하는
   *    HTML 주석**이 있어 같은 문자열을 담고 있었다 — 그래서 **속성을 통째로 지워도
   *    초록이었다**(2026-08-28 뮤테이션 #6 생존, 전 스위트 238 passed 유지).
   *    `bodyOf` 는 `__NEXT_DATA__` 거짓 양성을 막으려고 만든 헬퍼인데, 정작 **자기가
   *    설명하려고 쓴 주석**에 걸렸다. 거짓 양성의 출처를 하나 막으면서 하나를 새로 만든 것이다.
   *
   * ⚠️ 다는 자리가 스텁 종류마다 다르다 — 정적 3개는 `<body>`, Next 6개는 `<main>` 이다
   *    (Pages Router 에서 `<body>` 는 `pages/_document.tsx` 소유라 페이지가 속성을 못 얹는다).
   *    그래서 태그 이름을 고정하지 않고 **어떤 원소든 그 속성을 실제로 갖고 있는지**만 본다.
   *    자리를 고정하면 지금 통과하는 6개가 이유 없이 빨개진다.
   */
  for (const path of RETIRED) {
    test(`${path} 가 data-pagefind-ignore="all" 을 실제 속성으로 달고 나간다`, async ({
      request,
    }) => {
      const raw = bodyOf(await (await request.get(path)).text(), path);
      // 주석을 걷어낸 뒤에 본다. `<!--` 는 아래 `<[a-z]` 에도 안 걸리지만, 두 겹으로 막아
      // 다음 사람이 주석을 옮겨 써도 이 검사가 다시 뚫리지 않게 한다.
      const body = raw.replace(/<!--[\s\S]*?-->/g, "");

      // 계수기 대조 — 주석 제거가 본문을 통째로 날렸으면 아래 실패가 「속성이 없다」와
      // 구분되지 않는다. 반드시 남아 있어야 하는 태그로 파싱이 살아 있음을 먼저 증명한다.
      expect(body, `${path} 에서 <body> 를 찾지 못했다 — 주석 제거가 본문을 삼켰다`).toMatch(
        /<body[\s>]/i,
      );

      expect(
        body,
        `${path} 에 data-pagefind-ignore="all" 이 속성으로 달려 있지 않다 — 리다이렉트 스텁이 ⌘K 결과에 뜬다`,
      ).toMatch(/<[a-zA-Z][^>]*\sdata-pagefind-ignore="all"/);
    });
  }

  /**
   * **정적 스텁 3개의 `lang="ko"`.**
   *
   * 나머지 6개는 `pages/_document.tsx` 의 `<Html lang="ko">` 가 보장하지만, 이 셋은 손으로 쓴
   * HTML 이라 아무도 보장하지 않는다. 빠지면 스크린리더가 한국어 본문을 영어로 읽는다.
   */
  test("정적 스텁이 3개다 — 목록이 줄면 아래 루프가 조용히 초록이 된다", () => {
    expect(STATIC_STUBS.length, "STATIC_STUBS 개수").toBe(3);
    expect(STATIC_STUBS.every((p) => RETIRED.includes(p)), "STATIC_STUBS 가 RETIRED 의 부분집합이 아니다").toBe(true);
  });

  for (const path of STATIC_STUBS) {
    test(`${path} 가 lang="ko" 를 단다 (_document 가 보장하지 않는 손글씨 HTML)`, async ({
      request,
    }) => {
      const html = await (await request.get(path)).text();
      const htmlTag = html.match(/<html[^>]*>/i)?.[0];
      expect(htmlTag, `${path} 의 <html> 태그를 찾지 못했다`).toBeTruthy();
      expect(htmlTag, `${path} 의 <html> 에 lang="ko" 가 없다 — ${htmlTag}`).toMatch(
        /lang="ko"/i,
      );
    });
  }

  test("스텁 9개가 sitemap 에 하나도 없다", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();

    // 계수기 대조 — sitemap 이 비었거나 못 읽었으면 아래 not.toContain 은 전부
    // 통과한다. 살아 있는 URL 하나를 먼저 확인해 그 거짓 0 을 막는다.
    expect(xml, "sitemap 이 비어 있다 — 아래 검사가 전부 무의미해진다").toContain(
      `${DESTINATION}</loc>`,
    );

    for (const path of RETIRED) {
      expect(xml, `${path} 가 아직 sitemap 에 있다`).not.toContain(`${path}</loc>`);
    }
  });
});
