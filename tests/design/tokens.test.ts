// tests/design/tokens.test.ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "@/lib/design/contrast";

const CSS = fs.readFileSync(path.join(process.cwd(), "styles", "globals.css"), "utf8");

/**
 * 주어진 셀렉터의 모든 블록에서 커스텀 프로퍼티를 모은다.
 *
 * globals.css 에는 `:root` 와 `.dark` 블록이 **여러 벌** 있다(shadcn 토큰, flow 다이어그램 토큰).
 * 문서 순서대로 훑어 뒤에 나온 값이 이기게 한다 — CSS 캐스케이드와 같은 규칙이다.
 *
 * `.dark ::-webkit-scrollbar-track {` 처럼 셀렉터가 이어지는 경우는
 * 여는 중괄호가 바로 뒤에 오지 않으므로 걸리지 않는다.
 */
function collectVars(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  const opener = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{`, "g");
  let match: RegExpExecArray | null;

  while ((match = opener.exec(CSS)) !== null) {
    let depth = 1;
    let i = match.index + match[0].length;
    const start = i;
    while (i < CSS.length && depth > 0) {
      if (CSS[i] === "{") depth += 1;
      else if (CSS[i] === "}") depth -= 1;
      i += 1;
    }
    const body = CSS.slice(start, i - 1);
    // for...of 로 matchAll 을 직접 돌면 target: es5 에서 TS2802 가 난다.
    // tsconfig 는 동결이므로 호출부에서 배열로 받는다.
    const decls = Array.from(body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g));
    for (const decl of decls) {
      out[decl[1]] = decl[2].trim();
    }
  }
  return out;
}

const LIGHT = collectVars(":root");
const DARK = { ...LIGHT, ...collectVars(".dark") };

/** 병합 전, `.dark` 블록이 자기 손으로 정의한 것만. 상속으로 가려지는 누락을 잡는다. */
const DARK_OWN = collectVars(".dark");

/** 텍스트로 쓰이는 무채색 단계. n5(비활성)는 WCAG 대비 요건 제외 대상이라 뺀다. */
const TEXT_STEPS = ["n6", "n7", "n8", "n9"] as const;
const AA = 4.5;

describe("검사기 자체 증명 — 알려진 미달 값을 잡아내는가", () => {
  // 스펙 2판의 다크 n6 값. 이 검사기가 실제로 잡아냈던 결함이다.
  it("2판 #71717a 는 다크 배경에서 AA 미달로 판정된다", () => {
    expect(contrastRatio("#71717a", "#08080a")).toBeLessThan(AA);
  });

  it("3판 #7e7e86 은 다크 배경과 카드 위 모두에서 통과한다", () => {
    expect(contrastRatio("#7e7e86", "#08080a")).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio("#7e7e86", "#0b0b0d")).toBeGreaterThanOrEqual(AA);
  });

  it("동일 색의 대비는 1이고 흑백 대비는 21이다", () => {
    expect(contrastRatio("#808080", "#808080")).toBeCloseTo(1, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 4);
  });
});

describe("무채색 램프가 정의돼 있다", () => {
  for (const theme of [
    { name: "라이트", vars: LIGHT },
    { name: "다크", vars: DARK },
  ]) {
    it(`${theme.name}: n0~n9 열 단계가 전부 hex 로 있다`, () => {
      for (let i = 0; i <= 9; i += 1) {
        const value = theme.vars[`n${i}`];
        expect(value, `--n${i} 가 없다`).toBeDefined();
        expect(value, `--n${i} 가 hex 가 아니다: ${value}`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  }
});

describe("다크 램프는 상속이 아니라 자기 손으로 정의돼 있다", () => {
  // DARK 는 LIGHT 를 물려받으므로, .dark 에 램프가 통째로 없어도 위 검사들이 전부 통과한다.
  // 그 구멍을 여기서 막는다.
  for (let i = 0; i <= 9; i += 1) {
    it(`.dark 블록이 --n${i} 를 직접 정의한다`, () => {
      const value = DARK_OWN[`n${i}`];
      // toMatch 를 먼저 걸면 커스텀 메시지를 붙이기 전에 vitest 가 자체 TypeError 를 던져
      // 「어느 토큰이 없는지」가 사라진다. 존재를 먼저 확인해야 메시지가 살아남는다.
      expect(value, `--n${i} 가 .dark 에 없다 — 라이트 값을 상속하고 있다`).toBeDefined();
      expect(value, `--n${i} 가 hex 가 아니다: ${value}`).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  }

  for (const name of ["signal", "signal-ink", "signal-soft"]) {
    it(`.dark 블록이 --${name} 를 직접 정의한다`, () => {
      expect(DARK_OWN[name], `--${name} 가 .dark 에 없다 — 라이트 값을 상속하고 있다`).toBeDefined();
    });
  }
});

describe("텍스트 계열이 AA(4.5:1)를 만족한다", () => {
  for (const theme of [
    { name: "라이트", vars: LIGHT },
    { name: "다크", vars: DARK },
  ]) {
    for (const step of TEXT_STEPS) {
      it(`${theme.name}: ${step} 이 배경 n0 위에서 AA 를 넘는다`, () => {
        const ratio = contrastRatio(theme.vars[step], theme.vars.n0);
        expect(ratio, `${step} vs n0 = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
      });

      it(`${theme.name}: ${step} 이 카드 n1 위에서 AA 를 넘는다`, () => {
        // 배경만 보고 색을 고르면 카드 안에서 미달이 된다. #78787f 가 정확히 그랬다.
        const ratio = contrastRatio(theme.vars[step], theme.vars.n1);
        expect(ratio, `${step} vs n1 = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
      });
    }
  }
});

describe("Signal 액센트가 양쪽 테마에서 AA 를 만족한다", () => {
  for (const theme of [
    { name: "라이트", vars: LIGHT },
    { name: "다크", vars: DARK },
  ]) {
    it(`${theme.name}: signal 이 배경 위에서 읽힌다`, () => {
      const ratio = contrastRatio(theme.vars.signal, theme.vars.n0);
      expect(ratio, `signal vs n0 = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    });

    it(`${theme.name}: signal-ink 가 signal 배경 위에서 읽힌다 (CTA 버튼)`, () => {
      const ratio = contrastRatio(theme.vars["signal-ink"], theme.vars.signal);
      expect(ratio, `signal-ink vs signal = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    });
  }
});

describe("다크 램프의 텍스트 계열은 단조 증가한다", () => {
  it("n5 < n6 < n7 < n8 < n9 순으로 밝아진다", () => {
    const steps = ["n5", "n6", "n7", "n8", "n9"] as const;
    const lums = steps.map((s) => relativeLuminance(DARK[s]));
    for (let i = 1; i < lums.length; i += 1) {
      expect(lums[i], `${steps[i]} 가 ${steps[i - 1]} 보다 어둡다`).toBeGreaterThan(lums[i - 1]);
    }
  });
});
