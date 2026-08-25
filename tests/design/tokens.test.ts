// tests/design/tokens.test.ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "@/lib/design/contrast";

const CSS = fs.readFileSync(path.join(process.cwd(), "styles", "globals.css"), "utf8");

/** CSS 주석을 지운다. 중괄호 깊이 스캐너도 선언 정규식도 주석을 모르기 때문이다. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * 주어진 셀렉터의 모든 블록에서 커스텀 프로퍼티를 모은다.
 *
 * `globals.css` 에는 `:root` 와 `.dark` 가 각각 두 벌 있다(shadcn 토큰, flow 다이어그램 토큰).
 * 같은 셀렉터끼리는 뒤에 온 것이 이긴다. **셀렉터가 다르면 이 규칙은 성립하지 않는다** —
 * `@layer` 밖 선언은 안 선언을 순서·특정도와 무관하게 이긴다. 그 간극은 아래
 * 「램프 토큰은 정확히 한 번씩」 검사로 막는다. 파서가 캐스케이드를 흉내내게 하지 않는다.
 */
function collectVars(css: string, selector: string): Record<string, string> {
  const src = stripComments(css);
  const out: Record<string, string> = {};
  const opener = new RegExp(`${selector.replace(/\./g, "\\.")}\\s*\\{`, "g");
  let match: RegExpExecArray | null;

  while ((match = opener.exec(src)) !== null) {
    let depth = 1;
    let i = match.index + match[0].length;
    const start = i;
    while (i < src.length && depth > 0) {
      if (src[i] === "{") depth += 1;
      else if (src[i] === "}") depth -= 1;
      i += 1;
    }
    const body = src.slice(start, i - 1);
    // 세미콜론은 선택이다 — 블록의 마지막 선언은 CSS 상 생략할 수 있다.
    // 값에서 `}` 와 줄바꿈을 뺀 이유는 생략된 경우 뒤엣것까지 삼키지 않게 하려는 것이다.
    // for...of 로 matchAll 을 직접 돌면 target: es5 에서 TS2802 가 난다.
    // tsconfig 는 동결이므로 호출부에서 배열로 받는다.
    const decls = Array.from(body.matchAll(/--([\w-]+)\s*:\s*([^;}\n]+);?/g));
    for (const decl of decls) {
      out[decl[1]] = decl[2].trim();
    }
  }
  return out;
}

const LIGHT = collectVars(CSS, ":root");
const DARK = { ...LIGHT, ...collectVars(CSS, ".dark") };

/** 병합 전, `.dark` 블록이 자기 손으로 정의한 것만. 상속으로 가려지는 누락을 잡는다. */
const DARK_OWN = collectVars(CSS, ".dark");

/** 텍스트로 쓰이는 무채색 단계. n5(비활성)는 WCAG 대비 요건 제외 대상이라 뺀다. */
const TEXT_STEPS = ["n6", "n7", "n8", "n9"] as const;

// n3(구분면)·n4(테두리)는 텍스트 면이 아니다. 컨트롤러 실측:
//   n6 vs n3 = 라이트 4.25 / 다크 4.21,  signal vs n3 = 라이트 4.33  — 전부 AA 미달.
//   n4 는 더 낮다(3.5~3.7).
// 램프가 틀린 게 아니라 그 조합을 쓰면 안 되는 것이다. n3 는 shadcn --accent(버튼 호버
// 배경) 별칭이라 그 위에는 --accent-foreground(n9 계열)만 온다. n6·signal 을 n3·n4 에
// 얹지 마라 — 이 규칙은 검사기가 못 잡는다.
/** 텍스트를 얹는 면. n3(구분면)·n4(테두리)는 제외 — 위 주석 참조. */
const TEXT_SURFACES = ["n0", "n1", "n2"] as const;

const RAMP_TOKENS = [
  "n0", "n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9",
  "signal", "signal-ink", "signal-soft",
];

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

describe("추출기 자체 증명 — collectVars 가 무엇을 읽고 무엇을 버리는가", () => {
  it("주석 안의 선언은 읽지 않는다", () => {
    const css = `:root { --n6: #71717a; /* 3판 후보: --n6: #7e7e86; */ }`;
    expect(collectVars(css, ":root").n6).toBe("#71717a");
  });

  it("통째로 주석 처리된 블록은 읽지 않는다", () => {
    const css = `:root { --n6: #71717a; }\n/* :root { --n6: #000000; } */`;
    expect(collectVars(css, ":root").n6).toBe("#71717a");
  });

  it("주석 안의 홀 중괄호가 블록을 조기 종료시키지 않는다", () => {
    const css = `:root { /* 닫는 괄호 } 하나 */ --n6: #7e7e86; }\n:root { --n9: #ffffff; }`;
    const vars = collectVars(css, ":root");
    expect(vars.n6).toBe("#7e7e86");
    expect(vars.n9).toBe("#ffffff");
  });

  it("마지막 선언에 세미콜론이 없어도 읽는다", () => {
    expect(collectVars(`:root { --n6: #7e7e86 }`, ":root").n6).toBe("#7e7e86");
  });

  it("후손 셀렉터와 접두사가 같은 클래스는 잡지 않는다", () => {
    const css =
      `.dark { --n6: #7e7e86; }\n` +
      `.dark ::-webkit-scrollbar { --n6: #000000; }\n` +
      `.darkroom { --n6: #111111; }`;
    expect(collectVars(css, ".dark").n6).toBe("#7e7e86");
  });

  it("같은 셀렉터가 여러 벌이면 뒤에 온 값이 이긴다", () => {
    const css = `:root { --n6: #111111; }\n:root { --n6: #222222; }`;
    expect(collectVars(css, ":root").n6).toBe("#222222");
  });

  it("중첩 블록 안의 셀렉터도 잡는다", () => {
    const css = `:root { --n6: #7e7e86; }\n@media (min-width: 0) { :root { --n9: #ffffff; } }`;
    expect(collectVars(css, ":root").n9).toBe("#ffffff");
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

describe("라이트 블록도 Signal 3종을 직접 정의한다", () => {
  // signal-soft 는 rgba 라 대비 검사에 안 걸린다. 존재라도 확인하지 않으면 통째로 빠져도 초록이다.
  const LIGHT_OWN = collectVars(CSS, ":root");
  for (const name of ["signal", "signal-ink", "signal-soft"]) {
    it(`:root 가 --${name} 를 정의한다`, () => {
      expect(LIGHT_OWN[name], `--${name} 가 :root 에 없다`).toBeDefined();
    });
  }
});

describe("램프 토큰은 파일 안에서 정확히 두 번(라이트·다크) 정의된다", () => {
  // 정의가 셋 이상이면 어느 것이 이기는지가 @layer 소속에 달리는데, 이 파서는 그것을 모른다.
  // 중복을 금지해 그 질문 자체가 생기지 않게 한다.
  const STRIPPED = stripComments(CSS);
  for (const name of RAMP_TOKENS) {
    it(`--${name} 의 정의가 2회다`, () => {
      const hits = Array.from(STRIPPED.matchAll(new RegExp(`--${name}\\s*:`, "g")));
      expect(hits.length, `--${name} 정의 ${hits.length}회 — 라이트·다크 각 1회여야 한다`).toBe(2);
    });
  }
});

describe("텍스트 계열이 AA(4.5:1)를 만족한다", () => {
  for (const theme of [
    { name: "라이트", vars: LIGHT },
    { name: "다크", vars: DARK },
  ]) {
    for (const step of TEXT_STEPS) {
      for (const surface of TEXT_SURFACES) {
        it(`${theme.name}: ${step} 이 ${surface} 위에서 AA 를 넘는다`, () => {
          // 배경만 보고 색을 고르면 카드 안에서 미달이 된다. #78787f 가 정확히 그랬다.
          const ratio = contrastRatio(theme.vars[step], theme.vars[surface]);
          expect(ratio, `${step} vs ${surface} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
        });
      }
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
