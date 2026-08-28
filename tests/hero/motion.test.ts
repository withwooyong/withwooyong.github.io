// tests/hero/motion.test.ts
//
// 결함 [4]를 잠그는 파일: stagger 안의 종료 경계(0.6 과 NODES.length 로 우연히 만들어진
// 0.6667)가 코드 어디에도 상수로 없어서, 노드 수를 바꾸면 조용히 어긋났다. 이번엔 MOTION_END
// 를 export 된 상수로 강제하고, total 을 바꿔도 그 상수에서 끝나는지를 직접 검사한다.
// lib/hero/motion.ts 는 아직 없는 모듈이다 — import 실패로 죽는 것이 이 시점의 정상(red)이다.
import { describe, expect, it } from "vitest";
import { MOTION_END, activeLineIndex, scrollProgress, stagger } from "@/lib/hero/motion";

// 결함 [4] 재현에 쓰인 원래 노드 수. 5번 검사에서 이 값을 포함해 여러 total 로 바꿔 본다.
const ORIGINAL_TOTAL = 24;

describe("MOTION_END — 점등·문구 교체가 끝나는 지점", () => {
  it("0과 1 사이(1 포함)의 값이고, 상수로 참조할 수 있다", () => {
    expect(typeof MOTION_END).toBe("number");
    expect(MOTION_END).toBeGreaterThan(0);
    expect(MOTION_END).toBeLessThanOrEqual(1);
  });
});

describe("stagger — 항목별 점등 정도", () => {
  it("p=0 에서 0번 항목은 0이다", () => {
    expect(stagger(0, 0, ORIGINAL_TOTAL)).toBe(0);
  });

  it("모든 반환값이 [0,1] 범위 안이다", () => {
    const total = ORIGINAL_TOTAL;
    for (let step = 0; step <= 10; step += 1) {
      const p = step / 10;
      for (let i = 0; i < total; i += 1) {
        const v = stagger(p, i, total);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("마지막 항목은 정확히 MOTION_END 에서 1이 된다", () => {
    const total = ORIGINAL_TOTAL;
    expect(stagger(MOTION_END, total - 1, total)).toBe(1);
  });

  it("MOTION_END 도달 전에는 마지막 항목이 아직 끝나지 않는다", () => {
    const total = ORIGINAL_TOTAL;
    // 0.01 은 "그 직전" 을 나타내는 임의의 작은 여유값이다 — 정확한 경계값 자체는
    // 위 검사가 이미 고정했으므로, 여기서는 "그 전에는 미달"만 확인하면 된다.
    expect(stagger(MOTION_END - 0.01, total - 1, total)).toBeLessThan(1);
  });

  it("n(total)을 24 → 48 → 7 로 바꿔도 종료 경계가 그대로 MOTION_END 다", () => {
    // 결함 [4] 를 직접 잠그는 검사. total 이 바뀌면 코드 안의 우연한 상수(0.6/total)로
    // 계산되던 경계가 조용히 움직였었다 — 이제는 total 과 무관하게 MOTION_END 여야 한다.
    for (const total of [24, 48, 7]) {
      expect(stagger(MOTION_END, total - 1, total)).toBe(1);
      expect(stagger(MOTION_END - 0.01, total - 1, total)).toBeLessThan(1);
    }
  });

  it("순서를 보존한다 — 앞선 항목이 같은 진행도에서 항상 더(또는 같이) 점등돼 있다", () => {
    const total = ORIGINAL_TOTAL;
    for (let step = 1; step <= 9; step += 1) {
      const p = step / 10;
      for (let i = 0; i < total; i += 1) {
        for (let j = i + 1; j < total; j += 1) {
          expect(stagger(p, i, total)).toBeGreaterThanOrEqual(stagger(p, j, total));
        }
      }
    }
  });
});

describe("activeLineIndex — 진행도에 따른 활성 문구", () => {
  const LINE_COUNT = 4; // 히어로 문구 교체 후보 수 — 특정 카피 내용과 무관한 임의의 개수

  it("p=0 은 0번, p=1 은 마지막 문구다", () => {
    expect(activeLineIndex(0, LINE_COUNT)).toBe(0);
    expect(activeLineIndex(1, LINE_COUNT)).toBe(LINE_COUNT - 1);
  });

  it("반환값이 항상 [0, lineCount-1] 범위 안이다", () => {
    for (let step = 0; step <= 20; step += 1) {
      const p = step / 20;
      const idx = activeLineIndex(p, LINE_COUNT);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(LINE_COUNT - 1);
    }
  });

  it("마지막 문구는 MOTION_END 이전에 이미 활성이고, 그 뒤(정적 구간)에도 새 문구가 나타나지 않는다", () => {
    // 정적 구간 [MOTION_END, 1] 전체에서 마지막 문구로 고정돼 있어야 한다 —
    // 그렇지 않으면 "정적 구간에 모션이 없다" 는 전제가 깨진다.
    const samples = [MOTION_END, MOTION_END + (1 - MOTION_END) / 2, 1];
    for (const p of samples) {
      expect(activeLineIndex(p, LINE_COUNT)).toBe(LINE_COUNT - 1);
    }

    // 마지막 문구로 처음 바뀌는 지점을 촘촘한 격자로 찾아, 그 지점이 MOTION_END 보다
    // 엄격히 앞서는지 확인한다(= MOTION_END 에 딱 맞춰 나타나는 게 아니라 그 전에 끝난다).
    const STEPS = 1000; // 이분 탐색 대신 쓰는 선형 격자 해상도 — 클수록 정밀, 임의의 값
    let firstActivationP = 1;
    for (let step = 0; step <= STEPS; step += 1) {
      const p = step / STEPS;
      if (activeLineIndex(p, LINE_COUNT) === LINE_COUNT - 1) {
        firstActivationP = p;
        break;
      }
    }
    expect(firstActivationP).toBeLessThan(MOTION_END);
  });
});

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * 여기서부터는 **리터럴로 못 박는 검사**다. 위쪽 검사들과 중복처럼 보여도 지우지 마라.
 *
 * 위쪽 검사는 기대값을 `MOTION_END` 에서 계산한다 — 즉 「구현이 자기 자신과 같다」를
 * 확인한다. 그래서 상수를 바꾸면 기대값도 같이 움직여 **영원히 초록**이다. 실측(2026-08-28
 * 뮤테이션):
 *
 *   MOTION_END      0.72        → 0.95         : 13개 검사 전부 초록
 *   LIT_SPAN_RATIO  0.35        → 0.9          : 13개 검사 전부 초록
 *   LINE_END        END × 0.85  → END × 1.2    : 13개 검사 전부 초록
 *                                                (주석이 명시한 불변식 정면 위반)
 *
 * 그래서 아래는 숫자를 **테스트 파일에 직접 적는다.** 「매직 넘버」로 보이겠지만
 * 그것이 요점이다 — e2e/hero.spec.ts 가 히어로 문구 3줄을 컴포넌트에서 import 하지 않고
 * 다시 적어 놓은 것과 **같은 이유**다. 상수를 고치면 여기가 빨개져야 하고, 그때
 * 「의도한 변경인가」를 사람이 판단하고 이 숫자를 함께 고치는 것이 정상 절차다.
 *
 * 파생 리터럴(정본은 lib/hero/motion.ts):
 *   MOTION_END = 0.72
 *   LIT_SPAN   = 0.72 × 0.35 = 0.252    ← 항목 하나의 점등 구간 폭
 *   LAST_START = 0.72 − 0.252 = 0.468   ← 마지막 항목이 점등을 시작하는 지점
 *   LINE_END   = 0.72 × 0.85 = 0.612    ← 문구 교체가 끝나는 지점
 * ─────────────────────────────────────────────────────────────────────────────
 */
const MOTION_END_LITERAL = 0.72;
const LIT_SPAN_LITERAL = 0.252;
const LAST_START_LITERAL = 0.468;
const LINE_END_LITERAL = 0.612;

/** 마지막 문구가 **처음** 활성이 되는 진행도를 격자로 찾는다(해상도 1e-5). */
function firstLastLineActivation(lineCount: number): number {
  const STEPS = 100_000;
  for (let step = 0; step <= STEPS; step += 1) {
    const p = step / STEPS;
    if (activeLineIndex(p, lineCount) === lineCount - 1) {
      return p;
    }
  }
  return 1;
}

describe("리터럴로 못 박는 경계값 — 상수를 바꾸면 여기가 빨개진다", () => {
  it("MOTION_END 는 0.72 다", () => {
    expect(MOTION_END).toBe(MOTION_END_LITERAL);
  });

  it("마지막 항목의 점등은 0.468 에서 시작해 0.72 에서 끝난다", () => {
    const total = ORIGINAL_TOTAL;
    const last = total - 1;
    expect(stagger(LAST_START_LITERAL - 0.0001, last, total)).toBe(0);
    expect(stagger(LAST_START_LITERAL + 0.0001, last, total)).toBeGreaterThan(0);
    expect(stagger(MOTION_END_LITERAL, last, total)).toBe(1);
    expect(stagger(MOTION_END_LITERAL - 0.0001, last, total)).toBeLessThan(1);
  });

  it("점등 구간의 한가운데(0.594)에서 정확히 절반이다", () => {
    // 0.594 = 0.468 + 0.252/2. LIT_SPAN_RATIO 가 흔들리면 이 값이 0.5 에서 벗어난다.
    expect(stagger(0.594, ORIGINAL_TOTAL - 1, ORIGINAL_TOTAL)).toBeCloseTo(0.5, 3);
  });

  it("점등 구간의 폭을 실제로 재면 0.252 다", () => {
    // 계산이 아니라 **측정**이다 — 0 에서 벗어나는 지점과 1 에 닿는 지점을 격자로 찾아 뺀다.
    const STEPS = 100_000;
    const total = ORIGINAL_TOTAL;
    const last = total - 1;
    let rising = -1;
    let complete = -1;
    for (let step = 0; step <= STEPS; step += 1) {
      const p = step / STEPS;
      const v = stagger(p, last, total);
      if (rising < 0 && v > 0) {
        rising = p;
      }
      if (v >= 1) {
        complete = p;
        break;
      }
    }
    expect(rising).toBeGreaterThan(0);
    expect(complete).toBeGreaterThan(0);
    expect(complete - rising).toBeCloseTo(LIT_SPAN_LITERAL, 3);
  });

  it("lineCount=3 의 문구 전환 경계는 0.204·0.408 이고, 정적 구간에는 교체가 없다", () => {
    expect(activeLineIndex(0.2039, 3)).toBe(0);
    expect(activeLineIndex(0.2041, 3)).toBe(1);
    expect(activeLineIndex(0.4079, 3)).toBe(1);
    expect(activeLineIndex(0.4081, 3)).toBe(2);
    // 0.7201 은 정적 구간([0.72, 1]) 안이다 — 여기서 인덱스가 더 올라가면 안 된다.
    expect(activeLineIndex(0.7201, 3)).toBe(2);
  });

  it("LINE_END ≤ MOTION_END 불변식 — lineCount 1·3·4·7·24 전부에서", () => {
    // ⚠️ **한 값만 보면 안 된다.** LINE_END 를 0.85 → 1.2 배로 늘려도 lineCount=3 은
    //    경계가 0.576 이라 여전히 0.72 밑이고, lineCount=4 도 0.648 이라 통과한다.
    //    0.85~1.33 배 전 구간이 사각지대였다 — 7·24 에서만 드러난다.
    for (const lineCount of [1, 3, 4, 7, 24]) {
      const first = firstLastLineActivation(lineCount);
      expect(
        first,
        `lineCount=${lineCount}: 마지막 문구가 ${first} 에서야 뜬다 — 정적 구간에 교체가 남는다`,
      ).toBeLessThan(MOTION_END_LITERAL);

      if (lineCount === 1) {
        // 문구가 하나면 처음부터 그것이 마지막 문구다 — LINE_END 를 역산할 수 없다.
        expect(first).toBe(0);
        continue;
      }
      // 마지막 문구의 활성 시작점 = LINE_END × (lineCount-1)/lineCount → LINE_END 역산.
      const recoveredLineEnd = (first * lineCount) / (lineCount - 1);
      expect(
        recoveredLineEnd,
        `lineCount=${lineCount} 에서 역산한 LINE_END`,
      ).toBeCloseTo(LINE_END_LITERAL, 3);
    }
  });
});

describe("scrollProgress — 스크롤 진행도 산식", () => {
  it("요소 높이가 뷰포트 높이 이하(travel 0 이하)면 1이다", () => {
    expect(scrollProgress(0, 500, 800)).toBe(1);
    expect(scrollProgress(100, 800, 800)).toBe(1);
  });

  it("요소 상단이 뷰포트 상단에 닿으면 0이고, 다 빠져나가면 1이다", () => {
    const elementHeight = 2000;
    const viewportHeight = 800;
    const travel = elementHeight - viewportHeight; // 1200
    expect(scrollProgress(0, elementHeight, viewportHeight)).toBe(0);
    expect(scrollProgress(-travel, elementHeight, viewportHeight)).toBe(1);
  });

  it("범위 밖 입력은 [0,1]로 클램프된다", () => {
    const elementHeight = 2000;
    const viewportHeight = 800;
    const travel = elementHeight - viewportHeight;
    // 아직 요소에 닿기 전(양의 rectTop 이 큰 경우) — 0 밑으로 내려가면 안 된다.
    expect(scrollProgress(500, elementHeight, viewportHeight)).toBe(0);
    // 이미 한참 지나간 경우(travel 보다 훨씬 더 음수) — 1을 넘으면 안 된다.
    expect(scrollProgress(-travel - 1000, elementHeight, viewportHeight)).toBe(1);
  });
});
