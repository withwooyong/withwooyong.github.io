import { describe, expect, it } from "vitest";
import { outboundKeys, postKey, proseOnly } from "@/lib/atlas/links";
import type { Post } from "@/lib/blog/types";

/** 본문만 갈아 끼우는 최소 Post. `outboundKeys` 는 `body` 만 본다. */
function body(md: string): Post {
  return {
    title: "제목",
    description: "설명",
    category: "rag",
    tags: [],
    date: "2026-01-01",
    featured: false,
    draft: false,
    slug: "a",
    categorySlug: "rag",
    body: md,
    toc: [],
  } as Post;
}

/**
 * 리뷰 A2 — 이 정규식은 마크다운 구조를 모르고 raw text 를 훑는다.
 * 「아틀라스는 이렇게 링크한다」 같은 설명글을 쓰는 순간 **예시가 진짜 관계가 된다.**
 *
 * 거울상 결함이 더 아프다: 같은 파일의 「슬래시로 끝난다」·앵커 검사도 raw body 를 읽으므로,
 * 코드 펜스 안의 잘못된 예시가 **가짜 위반**으로 잡혀 발행을 막는다.
 */
describe("proseOnly — 산문이 아닌 구간을 지운다", () => {
  it("백틱 펜스 안을 지운다", () => {
    expect(proseOnly("```\n[x](/blog/rag/b/)\n```")).not.toContain("/blog/rag/b/");
  });

  it("틸드 펜스 안을 지운다", () => {
    expect(proseOnly("~~~\n[x](/blog/rag/b/)\n~~~")).not.toContain("/blog/rag/b/");
  });

  it("인라인 코드 안을 지운다", () => {
    expect(proseOnly("설명 `[x](/blog/rag/b/)` 끝")).not.toContain("/blog/rag/b/");
  });

  it("HTML 주석 안을 지운다", () => {
    expect(proseOnly("<!-- [x](/blog/rag/b/) -->")).not.toContain("/blog/rag/b/");
  });

  it("산문은 건드리지 않는다 — 대조군", () => {
    const md = "앞 [x](/blog/rag/b/) 뒤";
    expect(proseOnly(md)).toContain("/blog/rag/b/");
  });

  it("줄 수를 보존한다 — 다른 검사기가 줄 번호로 보고할 수 있어야 한다", () => {
    const md = "a\n```\ncode\n```\nb";
    expect(proseOnly(md).split("\n")).toHaveLength(md.split("\n").length);
  });
});

describe("outboundKeys", () => {
  it("코드 펜스 안의 예시 링크는 엣지가 되지 않는다", () => {
    expect(outboundKeys(body("```md\n[예시](/blog/rag/b/)\n```"))).toEqual([]);
  });

  it("인라인 코드 안의 예시 링크는 엣지가 되지 않는다", () => {
    expect(outboundKeys(body("이렇게 씁니다 `[예시](/blog/rag/b/)`"))).toEqual([]);
  });

  it("HTML 주석 안의 링크는 엣지가 되지 않는다", () => {
    expect(outboundKeys(body("<!-- 나중에 [예시](/blog/rag/b/) 로 잇자 -->"))).toEqual([]);
  });

  it("펜스 안팎이 섞이면 바깥 것만 뽑는다 — 대조군", () => {
    const md = "진짜 [a](/blog/rag/real/)\n\n```md\n[예시](/blog/rag/fake/)\n```\n\n또 [b](/blog/rag/real2/)";
    expect(outboundKeys(body(md))).toEqual(["rag/real", "rag/real2"]);
  });

  it("닫히지 않은 펜스는 끝까지 코드로 본다", () => {
    expect(outboundKeys(body("앞 [a](/blog/rag/real/)\n```\n[예시](/blog/rag/fake/)"))).toEqual([
      "rag/real",
    ]);
  });

  // ── 아래는 기존 동작의 회귀 방지 ──────────────────────────────
  //    `links.ts` 주석이 「꼬리의 (?:[#?][^)]*)? 를 지우지 마라」고 경고한 자리다.

  it("앵커를 떼어 낸다", () => {
    expect(outboundKeys(body("[x](/blog/rag/b/#앵커)"))).toEqual(["rag/b"]);
  });

  it("질의를 떼어 낸다", () => {
    expect(outboundKeys(body("[x](/blog/rag/b/?q=1)"))).toEqual(["rag/b"]);
  });

  it("끝 슬래시가 없어도 같은 키를 낸다", () => {
    expect(outboundKeys(body("[x](/blog/rag/b)"))).toEqual(["rag/b"]);
  });

  it("카테고리 인덱스 링크는 버린다 — 편 대 편 관계가 아니다", () => {
    expect(outboundKeys(body("[x](/blog/rag/)"))).toEqual([]);
  });

  it("같은 대상을 여러 번 링크하면 그대로 여러 번 낸다 — 중복 제거는 호출자 몫이다", () => {
    expect(outboundKeys(body("[x](/blog/rag/b/) [y](/blog/rag/b/#s)"))).toEqual(["rag/b", "rag/b"]);
  });
});

describe("postKey", () => {
  it("<category>/<slug> 다", () => {
    expect(postKey(body(""))).toBe("rag/a");
  });
});
