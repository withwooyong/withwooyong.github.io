import { describe, expect, it } from "vitest";

import { safeExcerpt } from "@/lib/search/excerpt";

describe("safeExcerpt", () => {
  it("무속성 <mark> 는 그대로 살린다", () => {
    expect(safeExcerpt("검색 <mark>임베딩</mark> 결과")).toBe(
      "검색 <mark>임베딩</mark> 결과",
    );
  });

  it("<img onerror=...> 는 태그가 아니라 글자가 된다", () => {
    // 실측: 조각 안에 원시 `<img` 가 3건 있다(본문 코드블록의 평문화).
    const out = safeExcerpt('<img src=x onerror=alert(1)>');
    expect(out).toBe("&lt;img src=x onerror=alert(1)&gt;");
    expect(out).not.toContain("<img");
  });

  it("<script> 는 태그가 아니라 글자가 된다", () => {
    const out = safeExcerpt("<script>alert(1)</script>");
    expect(out).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(out).not.toContain("<script");
  });

  it("<mark> 에 속성이 붙으면 되살리지 않는다", () => {
    const out = safeExcerpt('<mark onclick="alert(1)">x</mark>');
    expect(out).not.toContain("<mark onclick");
    expect(out).toContain("&lt;mark onclick=");
    // 닫는 태그는 무속성이라 되살아나지만, 열리지 않았으므로 무해하다.
    expect(out).toContain("</mark>");
  });

  it("& 는 다시 이스케이프하지 않는다", () => {
    // pagefind content 는 이스케이프돼 있지 않다(실측: `&lt;` 0건).
    // 여기서 & 를 건드리면 본문의 & 가 `&amp;` 로 보이는 이중 이스케이프가 된다.
    expect(safeExcerpt("검색 & 색인")).toBe("검색 & 색인");
    expect(safeExcerpt("a &amp; b")).toBe("a &amp; b");
  });

  it("여러 <mark> 와 태그가 섞여도 각각 처리한다", () => {
    expect(safeExcerpt("<td><mark>a</mark></td><mark>b</mark>")).toBe(
      "&lt;td&gt;<mark>a</mark>&lt;/td&gt;<mark>b</mark>",
    );
  });

  it("빈 문자열은 빈 문자열이다", () => {
    expect(safeExcerpt("")).toBe("");
  });

  it("태그가 없으면 원문 그대로다", () => {
    expect(safeExcerpt("벡터 검색 파이프라인")).toBe("벡터 검색 파이프라인");
  });
});
