import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AA_NON_TEXT, AA_TEXT, contrastRatio, parseHex, relativeLuminance } from "@/lib/contrast";
import {
  CONTRAST_PAIRS,
  DIAGRAM_FONT_FALLBACK,
  MERMAID_FONT_SIZE,
  MERMAID_THEME_COLORS,
  auditContrast,
  mermaidThemeVariables,
  repaintHardcodedStrokes,
  resolveDiagramFontFamily,
  uncheckedKeys,
} from "@/lib/mermaid-theme";

const REPO = path.resolve(__dirname, "..", "..");

/**
 * 이 저장소는 다크 모드 대비 1.06 인 화면을 프로덕션에 배포한 적이 있다.
 * 그때 통과한 검사들이 놓친 것은 색이 아니라 **재지 않은 자리**였으므로,
 * 여기의 케이스는 값이 맞는지뿐 아니라 「전부 쟀는지」를 함께 본다.
 */

describe("대비 계산식", () => {
  // TH1: 계산식이 실제로 WCAG 값을 내는지. 이 앵커가 없으면 팔레트 케이스가 통째로 헛돈다.
  it("검정과 흰색의 대비비는 21이다", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("같은 색끼리의 대비비는 1이다", () => {
    expect(contrastRatio("#0f172a", "#0f172a")).toBeCloseTo(1, 10);
  });

  it("인자의 순서가 결과를 바꾸지 않는다", () => {
    expect(contrastRatio("#0284c7", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#0284c7"), 10);
  });

  // TH2: WCAG 문서가 밝히는 경계값. 임계값 4.5를 겨우 넘는 회색이라 계산식이 어긋나면 즉시 갈린다.
  it("#767676과 흰색은 AA 경계인 4.5를 겨우 넘는다", () => {
    const ratio = contrastRatio("#767676", "#ffffff");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
    expect(ratio).toBeLessThan(4.6);
  });

  it("검정의 상대 휘도는 0, 흰색은 1이다", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 10);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 10);
  });

  it("3자리 축약 hex를 6자리와 같게 읽는다", () => {
    expect(parseHex("#fff")).toEqual(parseHex("#ffffff"));
    expect(parseHex("0f8")).toEqual([0, 255, 136]);
  });

  // TH3: hex가 아닌 값을 조용히 0으로 읽으면 대비가 과대평가되어 위반이 사라진다.
  it("hex가 아닌 색은 거부한다", () => {
    expect(() => parseHex("hsl(var(--primary))")).toThrow();
    expect(() => parseHex("#12345")).toThrow();
    expect(() => parseHex("#zzzzzz")).toThrow();
  });
});

describe("mermaid 팔레트의 대비", () => {
  // TH4·TH5: 본 판정. 위반이 하나라도 있으면 그 짝의 이름과 실측값이 보고된다.
  for (const mode of ["light", "dark"] as const) {
    it(`${mode} 모드에 대비 위반이 없다`, () => {
      const { violations } = auditContrast(mode);
      const report = violations.map((v) => `${v.label}: ${v.ratio.toFixed(2)} < ${v.min} (${v.fg} vs ${v.bg})`);
      expect(report).toEqual([]);
    });
  }

  // TH6: 「위반 0」은 「짝이 0개」와 구분되지 않는다. 대조할 것이 실제로 있는지를 먼저 센다.
  it("판정에 도달한 짝의 수가 목록의 수와 같고, 비어 있지 않다", () => {
    expect(CONTRAST_PAIRS.length).toBeGreaterThanOrEqual(40);
    for (const mode of ["light", "dark"] as const) {
      expect(auditContrast(mode).checked).toBe(CONTRAST_PAIRS.length);
    }
  });

  // TH7: 짝 목록이 한쪽 임계값으로만 채워지면 다른 쪽 요구가 통째로 사라진다.
  it("글자 임계값과 비텍스트 임계값이 모두 짝 목록에 쓰인다", () => {
    const mins = new Set(CONTRAST_PAIRS.map((p) => p.min));
    expect(mins.has(AA_TEXT)).toBe(true);
    expect(mins.has(AA_NON_TEXT)).toBe(true);
    expect(AA_TEXT).toBe(4.5);
    expect(AA_NON_TEXT).toBe(3);
  });

  // TH8: 재지 않은 색은 재서 통과한 색과 구분되지 않는다. 1.06 결함이 살던 자리가 정확히 여기다.
  it("짝에 한 번도 나오지 않는 색 변수가 없다", () => {
    expect(uncheckedKeys("light")).toEqual([]);
    expect(uncheckedKeys("dark")).toEqual([]);
  });

  // TH9: 존재하지 않는 변수를 짝에 적으면 undefined가 흘러 계산이 무의미해진다.
  it("없는 색 변수를 짝에 적으면 던진다", () => {
    expect(() => auditContrast("light", [{ label: "가짜", fg: "없는색", bg: "background", min: AA_TEXT }])).toThrow();
  });
});

describe("팔레트의 형식과 짝", () => {
  // TH10: 한쪽 모드에만 있는 변수는 반대 모드에서 mermaid 내장값으로 조용히 되돌아간다.
  it("라이트와 다크가 같은 색 변수 집합을 갖는다", () => {
    expect(Object.keys(MERMAID_THEME_COLORS.light).sort()).toEqual(Object.keys(MERMAID_THEME_COLORS.dark).sort());
  });

  it("모든 값이 6자리 hex다", () => {
    for (const mode of ["light", "dark"] as const) {
      for (const [key, value] of Object.entries(MERMAID_THEME_COLORS[mode])) {
        expect(`${mode}.${key}=${value}`).toMatch(/=#[0-9a-f]{6}$/);
      }
    }
  });

  // TH11: 두 모드가 같은 값이면 다크 모드가 없는 것과 같다.
  it("두 모드의 색이 실제로 다르다", () => {
    const light = MERMAID_THEME_COLORS.light;
    const dark = MERMAID_THEME_COLORS.dark;
    const same = Object.keys(light).filter((k) => light[k] === dark[k]);
    expect(same).toEqual([]);
  });
});

describe("mermaid.initialize에 넘기는 값", () => {
  it("색 지도에 글자 크기를 더해 넘긴다", () => {
    const dark = mermaidThemeVariables(true);
    expect(dark.fontSize).toBe(MERMAID_FONT_SIZE);
    expect(dark.primaryColor).toBe(MERMAID_THEME_COLORS.dark.primaryColor);
    expect(mermaidThemeVariables(false).primaryColor).toBe(MERMAID_THEME_COLORS.light.primaryColor);
  });

  // TH12: 글자 크기는 색이 아니므로 대비 감사 대상에 섞이면 hex 검사가 깨진다.
  it("글자 크기는 색 지도 안에 들어 있지 않다", () => {
    expect(MERMAID_THEME_COLORS.light.fontSize).toBeUndefined();
    expect(MERMAID_THEME_COLORS.dark.fontSize).toBeUndefined();
  });
});

/**
 * mermaid 는 라벨 폭을 body 바로 아래의 임시 컨테이너에서 재는데, 도식이 그려지는 자리는
 * font-sans 가 걸린 본문이다. 조상이 다르므로 폰트를 상속에 맡기면 재는 폰트와 그리는
 * 폰트가 갈리고, 자폭 차이만큼 좁게 만들어진 상자가 마지막 글자를 잘라낸다.
 *
 * 🔴 이 결함은 기존 검사기가 판정하지 못한다. 문법도 링크도 색도 멀쩡하고, 잘림은 브라우저가
 * 레이아웃을 계산한 뒤에야 드러나기 때문이다 — 실제로 도식 549개를 담은 채 배포됐고 세 세션
 * 동안 아무 검사도 이것을 보지 못했다. 그래서 판정을 순수 함수로 뽑아 여기에 묶는다.
 * 여기 케이스가 지키는 것은 잘림 자체가 아니라 **상속 키워드가 다시 들어오는 길**이다.
 */
describe("도식에 넘길 폰트의 판정", () => {
  it("그려질 자리에서 해석된 스택은 그대로 쓴다", () => {
    const resolved = "__Inter_f367f3, __Inter_Fallback_f367f3, Inter, system-ui, sans-serif";
    expect(resolveDiagramFontFamily(resolved)).toBe(resolved);
  });

  // TH19: 이 한 줄이 결함이 되살아나는 자리다. 되돌리기 쉽고, 되돌려도 다른 검사는 울지 않는다.
  it("상속에 맡기는 값은 거부한다", () => {
    for (const keyword of ["inherit", "initial", "unset", "revert", "revert-layer"]) {
      expect(resolveDiagramFontFamily(keyword)).toBe(DIAGRAM_FONT_FALLBACK);
      expect(resolveDiagramFontFamily(keyword.toUpperCase())).toBe(DIAGRAM_FONT_FALLBACK);
      expect(resolveDiagramFontFamily(`  ${keyword}  `)).toBe(DIAGRAM_FONT_FALLBACK);
    }
  });

  // 요소가 아직 붙지 않았거나 계산된 값이 비어 있는 경우. 빈 값을 그대로 넘기면 mermaid 가
  // 자기 기본값으로 되돌아가는데, 그 기본값이 본문 폰트와 같다는 보장이 없다.
  it("값을 얻지 못하면 대체 스택을 준다", () => {
    for (const empty of [null, undefined, "", "   "]) {
      expect(resolveDiagramFontFamily(empty)).toBe(DIAGRAM_FONT_FALLBACK);
    }
  });

  // TH20: 대체 스택 자신이 상속 키워드를 담고 있으면 위 세 케이스가 전부 헛돈다.
  // var() 를 담아도 마찬가지다 — body 아래에서는 변수가 정의되지 않아 선언째로 무효가 된다.
  it("대체 스택은 상속 키워드도 CSS 변수도 담지 않는다", () => {
    expect(DIAGRAM_FONT_FALLBACK).not.toMatch(/var\(/);
    expect(resolveDiagramFontFamily(DIAGRAM_FONT_FALLBACK)).toBe(DIAGRAM_FONT_FALLBACK);
  });

  // 반환값이 그대로 mermaid 설정에 들어가므로, 어떤 입력에도 상속 키워드가 새어 나가면 안 된다.
  it("어떤 입력에도 상속 키워드를 그대로 돌려주지 않는다", () => {
    const inputs = ["inherit", "INHERIT", " unset ", "", null, undefined, "Inter, sans-serif"];
    for (const input of inputs) {
      const out = resolveDiagramFontFamily(input);
      expect(["inherit", "initial", "unset", "revert", "revert-layer"]).not.toContain(out.toLowerCase());
    }
  });

  // 상속 키워드를 「담고 있을」 뿐인 폰트 이름까지 거부하면 멀쩡한 스택이 대체값으로 바뀐다.
  it("이름 안에 키워드가 들어 있을 뿐인 스택은 거부하지 않는다", () => {
    const stack = "Inherit Sans, system-ui, sans-serif";
    expect(resolveDiagramFontFamily(stack)).toBe(stack);
  });
});

describe("테마 변수를 우회하는 색의 교정", () => {
  /**
   * mermaid 11 은 stick 화살촉에 `stroke="black"` 을 속성으로 건다.
   * 다른 화살촉과 달리 대응하는 CSS 규칙이 없어 테마를 무엇으로 두든 검정이 남고,
   * 다크 캔버스 위에서 대비가 1.18 이 된다. 브라우저 실측으로 찾은 자리다.
   */
  const RENDERED = [
    '<marker id="m-stickTopArrowHead"><path d="M 0 0 L 7 7" stroke="black" stroke-width="1.5"/></marker>',
    '<marker id="m-stickBottomArrowHead"><path d="M 0 7 L 7 0" stroke="black" stroke-width="1.5"/></marker>',
    '<path class="messageLine0" stroke="#cbd5e1"/>',
  ].join("");

  // TH16: 교정이 통째로 빠지면 검정이 그대로 남는다.
  it("검정으로 박힌 획을 팔레트의 시그널 색으로 덮는다", () => {
    const dark = repaintHardcodedStrokes(RENDERED, true);
    expect(dark).not.toContain('stroke="black"');
    expect(dark).toContain(`stroke="${MERMAID_THEME_COLORS.dark.signalColor}"`);

    const light = repaintHardcodedStrokes(RENDERED, false);
    expect(light).not.toContain('stroke="black"');
    expect(light).toContain(`stroke="${MERMAID_THEME_COLORS.light.signalColor}"`);
  });

  // TH17: mermaid 는 이 획을 **두 개** 낸다. 하나만 바꾸면 나머지 하나가 검정으로 남는다.
  it("한 번이 아니라 모든 출현을 덮는다", () => {
    expect(RENDERED.split('stroke="black"')).toHaveLength(3); // 출현 2회
    const fixed = repaintHardcodedStrokes(RENDERED, true);
    expect(fixed.split(`stroke="${MERMAID_THEME_COLORS.dark.signalColor}"`)).toHaveLength(4); // 원래 1회 + 덮은 2회
  });

  it("나머지 마크업은 건드리지 않는다", () => {
    const fixed = repaintHardcodedStrokes(RENDERED, true);
    expect(fixed).toContain('d="M 0 0 L 7 7"');
    expect(fixed).toContain('class="messageLine0"');
    expect(fixed.length).toBeGreaterThan(RENDERED.length); // hex가 "black"보다 길다
  });

  it("덮을 것이 없으면 원문을 그대로 돌려준다", () => {
    const plain = '<svg><path stroke="#475569"/></svg>';
    expect(repaintHardcodedStrokes(plain, false)).toBe(plain);
  });
});

describe("캔버스 색과 카드 배경의 결합", () => {
  /**
   * TH13: 대비 1.06 결함의 기전은 「색이 틀렸다」가 아니라
   * 「글자를 정한 곳과 배경을 정한 곳이 달랐다」였다.
   * 팔레트의 캔버스 색은 도식을 얹는 카드의 배경과 같아야 하는데,
   * 카드 배경은 이 파일이 아니라 컴포넌트의 Tailwind 클래스가 정한다.
   */
  it("팔레트의 캔버스 색이 mermaid.tsx의 카드 배경 클래스와 짝이 맞는다", () => {
    const source = readFileSync(path.join(REPO, "components", "mermaid.tsx"), "utf8");

    // 도식이 놓이는 면은 둘이다 — 본문 미리보기 카드와 확대 뷰어의 스크롤 영역.
    // 「있다」가 아니라 「둘 다 있다」를 보아야 한쪽만 바뀐 경우가 드러난다.
    // 뒤의 `/95`는 「크게 보기」 배지의 반투명 배경이라 도식의 캔버스가 아니므로 제외한다.
    const darkCanvas = source.match(/dark:bg-slate-900(?![/\d])/g) ?? [];
    expect(darkCanvas).toHaveLength(2);
    expect(source).toContain("bg-white");

    // Tailwind 기본값 — white = #ffffff, slate-900 = #0f172a
    expect(MERMAID_THEME_COLORS.light.background).toBe("#ffffff");
    expect(MERMAID_THEME_COLORS.dark.background).toBe("#0f172a");
  });

  // TH14: 컴포넌트가 팔레트를 실제로 쓰는지. 모듈만 있고 연결되지 않으면 색은 그대로다.
  it("컴포넌트가 팔레트 모듈을 themeVariables로 넘긴다", () => {
    const source = readFileSync(path.join(REPO, "components", "mermaid.tsx"), "utf8");
    expect(source).toContain("mermaidThemeVariables");
    expect(source).toMatch(/themeVariables:\s*mermaidThemeVariables\(/);
  });

  // TH18: 교정 함수와 케이스가 다 있어도, 컴포넌트가 부르지 않으면 화면은 그대로다.
  it("컴포넌트가 렌더 결과에 획 교정을 적용한다", () => {
    const source = readFileSync(path.join(REPO, "components", "mermaid.tsx"), "utf8");
    expect(source).toMatch(/setSvg\(repaintHardcodedStrokes\(/);
  });
});
