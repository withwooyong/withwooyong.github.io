import { describe, expect, it } from "vitest";

import { experiences } from "@/data/experience";
import { capabilityMap, workPositioning } from "@/data/work";

/**
 * `/work` 가 소비하는 데이터의 문구 규칙 검사.
 *
 * 이 파일이 존재하는 이유는 계획서 §Task 11 Step 4 가 **사람의 육안 검사**로 두었기 때문이다.
 * 이력 문구 오기는 이 리포에서 실제로 사고였고(사용자가 직접 교정한 이력이 있다),
 * 사람이 매번 `grep` 을 눈으로 읽는 규칙은 한 번 건너뛰면 그대로 발행된다.
 * CLAUDE.md 가 말하는 「규칙은 산문이 아니라 검사기에 산다」가 여기에 걸린다.
 *
 * ⚠️ **부정 단언에는 반드시 대조군이 붙어 있다.** 「금지 표현이 0건」은 데이터가 통째로
 *    비어 있어도, import 가 빈 배열을 돌려줘도 초록이다 — 「없다」와 「못 읽었다」가
 *    같은 출력이 되는 이 리포의 대표적 함정이다. 그래서 같은 test 안에서 **있어야 하는
 *    문자열을 먼저 세고**, 그 계수기가 살아 있음을 증명한 뒤에 0 을 주장한다.
 */

/** 확정본 `-v2` 의 문구. 2026-08-28 사용자 결정: 계획서 문구 규칙보다 `-v2` 가 우선한다. */
const V2_LEAD = "20년간 OTT·커머스 플랫폼의 코어를 설계·재구축하고, 20~30인 조직을 총괄해 온 리더.";
const V2_SUB = "차세대 CMS 재구축을 발주 PM으로 완주하고, 커머스·AI 플랫폼까지 총괄하는 프로덕트 리더.";

/** capabilityMap 의 모든 문자열을 한 줄로 이어 붙인다 — 문구 검사의 건초더미. */
function capabilityHaystack(): string {
  return capabilityMap.map((row) => `${row.need} ${row.evidence}`).join("\n");
}

/** experiences 의 모든 문자열. `highlights` 까지 포함해야 한다 — 구본 표기가 거기 숨어 있었다. */
function experienceHaystack(): string {
  return experiences
    .map((exp) => [exp.role, exp.company, exp.summary, ...exp.highlights].join(" "))
    .join("\n");
}

/** `/work` 가 소비하는 문자열 **전부**. 표기 일관성 검사는 이것을 봐야 한다. */
function workPageHaystack(): string {
  return `${capabilityHaystack()}\n${experienceHaystack()}`;
}

describe("workPositioning — 확정본 -v2 문구를 축자로 옮겼는가", () => {
  it("lead 가 -v2 의 포지셔닝 문구와 축자로 일치한다", () => {
    expect(workPositioning.lead).toBe(V2_LEAD);
  });

  it("sub 가 -v2 의 보조 문구와 축자로 일치한다", () => {
    expect(workPositioning.sub).toBe(V2_SUB);
  });

  it("eyebrow·heading 이 비어 있지 않다", () => {
    expect(workPositioning.eyebrow.trim().length).toBeGreaterThan(0);
    expect(workPositioning.heading.trim().length).toBeGreaterThan(0);
  });
});

describe("capabilityMap — 역량 매핑 표", () => {
  it("-v2 와 같은 10 행이다", () => {
    expect(capabilityMap).toHaveLength(10);
  });

  it("모든 행의 need·evidence 가 비어 있지 않다", () => {
    for (const row of capabilityMap) {
      expect(row.need.trim(), `need 가 비었다: ${JSON.stringify(row)}`).not.toBe("");
      expect(row.evidence.trim(), `evidence 가 비었다: ${row.need}`).not.toBe("");
    }
  });

  it("need 가 중복되지 않는다 — 렌더에서 key 로 쓰인다", () => {
    const needs = capabilityMap.map((row) => row.need);
    expect(new Set(needs).size, `중복된 need: ${needs.join(" / ")}`).toBe(needs.length);
  });
});

describe("문구 규칙 — 금지 표현", () => {
  /**
   * 금지된 것은 「처음」이라는 낱말이 아니라 **원조 주장**이다.
   * `-v2` 는 「OTT CMS 도메인을 처음 다룬」을 확정본으로 갖고 있고(커리어 순서 서술),
   * 금지 대상은 「처음 구축한/만든」쪽이다. 계획서의 `grep '처음'` 은 이 둘을 구분하지 못해
   * 확정본까지 잡는다 — 그래서 여기서 패턴을 좁혔다.
   */
  const 원조주장 = /처음\s*(구축|만든|만들|세운|개발한)/;

  it("capabilityMap 에 원조 주장 표현이 없다 (대조군: 「1세대」가 먼저 잡혀야 한다)", () => {
    const haystack = capabilityHaystack();

    // 대조군 — 이 단언이 먼저 통과해야 아래 0 건이 「없다」이지 「못 읽었다」가 아니다.
    expect(haystack, "건초더미가 비었다 — 아래 0 건은 거짓 음성이다").toContain("1세대");

    expect(원조주장.test(haystack), `원조 주장 표현이 있다:\n${haystack}`).toBe(false);
  });

  it("경력 데이터에 원조 주장 표현이 없다 (대조군: 「커머스개발실장」이 먼저 잡혀야 한다)", () => {
    const haystack = experienceHaystack();

    expect(haystack, "건초더미가 비었다 — 아래 0 건은 거짓 음성이다").toContain("커머스개발실장");

    expect(원조주장.test(haystack), `원조 주장 표현이 있다:\n${haystack}`).toBe(false);
  });

  /**
   * ⚠️ **`capabilityMap` 만 보면 안 된다.** 2026-08-28 실측: `data/work.ts` 는 「발주 PM」인데
   *    `data/experience.ts:79` 는 구본 「발주사 PM」이라 **`/work` 한 페이지에 두 표기가
   *    공존**했고, 이 검사가 `capabilityMap` 만 훑고 있어 통과했다.
   *    「검사한 곳이 깨끗하다」와 「페이지가 깨끗하다」는 다른 사실이다 —
   *    건초더미가 페이지가 소비하는 데이터 **전부**를 덮어야 한다.
   */
  it("구본 표현 「발주사 PM」 이 회귀하지 않았다 (대조군: 「발주 PM」 이 먼저 잡혀야 한다)", () => {
    const haystack = workPageHaystack();

    expect(haystack, "「발주 PM」 이 하나도 없다 — 아래 0 건은 거짓 음성이다").toContain("발주 PM");

    expect(haystack).not.toContain("발주사 PM");
  });
});

describe("문구 규칙 — 정식 표기", () => {
  it("야나두 항목이 회사 라벨 전체 표기를 쓴다", () => {
    const 야나두 = experiences.find((exp) => exp.company.includes("야나두"));
    expect(야나두, "야나두 경력 항목을 찾지 못했다").toBeDefined();
    expect(야나두!.company).toBe("(주)야나두 a kakao company (구 카카오키즈)");
  });

  it("직책이 「커머스개발실장」이다 — 「개발실장」 단독이 아니다", () => {
    const 야나두 = experiences.find((exp) => exp.company.includes("야나두"));
    expect(야나두!.role).toBe("커머스개발실장");
  });
});
