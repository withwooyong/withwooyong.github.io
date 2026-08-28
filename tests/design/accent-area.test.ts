// tests/design/accent-area.test.ts
//
// GC-9(설계 규칙): 액센트 색은 첫 화면 픽셀의 5% 이하여야 한다.
// accentAreaRatio 는 아직 없는 모듈이다(lib/design/accent-area.ts) — import 실패로 죽는
// 것이 이 파일이 존재하는 시점의 정상 상태(red)다.
import { describe, expect, it } from "vitest";
import { accentAreaRatio, type Circle } from "@/lib/design/accent-area";
// 노드 좌표·성장 배율·액센트 선택은 **구현이 정본**이다. 테스트가 특정 인덱스를
// 하드코딩하면 「그 조합이 GC-9 을 지킨다」만 검사하게 되고, 디자인이 바뀌는 순간
// 낡는다. 여기서 잠그는 것은 조합이 아니라 **성질**이다 —
// 무엇을 액센트로 고르든 점등 완료 시 화면의 5% 를 넘지 않는다.
import { HERO_NODES, accentCircles, litCircles } from "@/lib/hero/atlas-nodes";

const GC9_LIMIT = 0.05;

const ACCENT_CIRCLES = accentCircles();
const ALL_GROWN_CIRCLES = litCircles();

const DESKTOP = { width: 1280, height: 720 };
const MOBILE = { width: 393, height: 851 };

/** 히어로 SVG 의 viewBox 한 변. `<svg viewBox="0 0 100 100">` 의 그 100 이다. */
const VIEW_BOX = 100;

/**
 * `preserveAspectRatio="xMidYMid slice"` 로 크롭된 뒤 **실제로 보이는** viewBox 면적.
 *
 * 구현에서 가져오지 않고 여기 다시 적는다 — SVG 명세가 정하는 기하이지 이 리포의
 * 자유도가 아니기 때문이다. 구현에서 import 하면 「구현이 자기 자신과 같다」가 된다.
 */
function visibleViewBoxArea({ width, height }: { width: number; height: number }): number {
  const scale = Math.max(width / VIEW_BOX, height / VIEW_BOX);
  return (width / scale) * (height / scale);
}

describe("계수기 자체 증명 — accentAreaRatio 가 실제로 면적을 재는가", () => {
  it("뷰포트 전체를 덮는 큰 원 1개는 비율이 거의 1이다", () => {
    // viewBox 100 기준으로 r=1000 은 정사각 viewBox 어디를 잘라도(슬라이스) 전부 덮는다.
    const circles: Circle[] = [{ x: 50, y: 50, r: 1000 }];
    const ratio = accentAreaRatio(circles, DESKTOP);
    expect(ratio).toBeGreaterThanOrEqual(0.98);
    expect(ratio).toBeLessThanOrEqual(1);
  });

  it("빈 배열은 0이다", () => {
    expect(accentAreaRatio([], DESKTOP)).toBe(0);
  });

  it("슬라이스 크롭으로 화면 밖에만 있는 원은 0에 가깝다", () => {
    // desktop 1280x720, viewBox=100 이면 scale = max(1280,720)/100 = 12.8,
    // 렌더된 viewBox 크기는 1280x1280(가로가 꽉 참) → 세로가 크롭된다.
    // 보이는 y 범위는 [ (1280-720)/2/12.8, ... ] ≈ [21.875, 78.125] 다.
    // y=2, r=1 인 원은 [1,3] 구간이라 보이는 범위 밖에 완전히 있다.
    const circles: Circle[] = [{ x: 50, y: 2, r: 1 }];
    const ratio = accentAreaRatio(circles, DESKTOP);
    expect(ratio).toBeLessThan(0.005);
  });

  it("겹치는 원 2개는 합집합으로 계산된다 — 같은 자리 원 2개는 원 1개와 같다", () => {
    const one: Circle[] = [{ x: 40, y: 40, r: 5 }];
    const duplicated: Circle[] = [{ x: 40, y: 40, r: 5 }, { x: 40, y: 40, r: 5 }];
    const ratioOne = accentAreaRatio(one, DESKTOP);
    const ratioDup = accentAreaRatio(duplicated, DESKTOP);
    expect(ratioDup).toBeCloseTo(ratioOne, 6);
  });

  /**
   * **해상도 대조군 — 아래 「24노드 전부」 대조군과 중복이 아니다. 지우지 마라.**
   *
   * 24노드 대조군은 측정 대상(≈1%)보다 5배 큰 케이스라 격자가 성겨져도 살아남는다.
   * 실제로 `DEFAULT_SAMPLES` 를 1000 → 8 로 낮췄더니 액센트 실측이 1.017% → **0.000%**
   * 로 무너졌는데도 이 파일의 검사가 **전부 초록**이었다(2026-08-28 뮤테이션 실측).
   * 「액센트가 작아서 통과」와 「격자가 코어를 한 번도 못 맞혀서 통과」가 같은 초록으로
   * 나온 것이다 — 이 리포가 반복해서 데인 「없다 = 못 읽었다」 그 모양이다.
   *
   * 그래서 대조군을 **액센트 코어와 같은 규모의 작은 원 하나**로 잡는다. 원 하나의
   * 넓이 비는 해석해가 있다 — π·r² / (크롭 뒤 보이는 viewBox 면적). 계측값이 그
   * 알려진 값과 좁은 오차 안에서 일치해야 한다고 단언하면, 표본이 낮아지는 순간
   * 계측값이 0 으로 무너져 **여기가 먼저 빨개진다.**
   */
  it("액센트 코어 크기의 원 1개가 해석해 π·r²/가시면적 과 2% 안에서 일치한다", () => {
    const R = 2.0; // 실제 accentCoreRadius() 는 1.586~2.082 다 — 그 한가운데
    const circle: Circle[] = [{ x: 50, y: 50, r: R }];

    // 대조군 반지름이 실제 코어 규모에서 떨어져 나가면 「해상도를 지킨다」가 거짓이 된다.
    const radii = ACCENT_CIRCLES.map((c) => c.r);
    expect(R).toBeGreaterThanOrEqual(Math.min(...radii));
    expect(R).toBeLessThanOrEqual(Math.max(...radii));

    // ⚠️ **이 두 뷰포트 루프는 중복이 아니라 이 검사의 생명줄이다. 한쪽을 지우지 마라.**
    //    격자 표본이 성겨지면 계측이 0 에 가까워지는데, 그 오차는 해상도에 대해 단조가 아니라
    //    **격자와 원의 정렬 운**에 좌우된다. 실측: 표본 128 에서 desktop 은 오차 1.65% 라
    //    허용치(2%)를 통과하고 mobile 은 10.3% 라 걸린다. desktop 만 남기면 표본 128 짜리
    //    해상도 저하가 조용히 통과한다.
    //    (참고 — 표본 256 은 두 뷰포트 모두 통과한다. 그 해상도의 실측 오차는 상대 ~1% 로
    //     5% 예산에 무해하므로 위험이 아니라 이 검사의 한계로 기록해 둔다.)
    for (const [name, viewport] of [
      ["desktop", DESKTOP],
      ["mobile", MOBILE],
    ] as const) {
      const exact = (Math.PI * R * R) / visibleViewBoxArea(viewport);
      const measured = accentAreaRatio(circle, viewport);
      const relativeError = Math.abs(measured / exact - 1);
      expect(
        relativeError,
        `${name}: 해석해 ${exact.toFixed(8)} vs 계측 ${measured.toFixed(8)} — ` +
          "격자가 코어를 제대로 맞히지 못하고 있다(표본 수를 확인하라)",
      ).toBeLessThan(0.02);
    }
  });
});

describe("히어로 액센트가 GC-9(≤5%)을 지킨다", () => {
  // 액센트가 0개면 면적도 0이라 아래 두 검사가 무조건 초록이 된다.
  // 「지켰다」와 「연출을 지워서 지킬 것이 없다」를 구분한다.
  it("액센트 노드가 실제로 존재한다 — 최소 1개, 전체보다는 적다", () => {
    expect(ACCENT_CIRCLES.length).toBeGreaterThan(0);
    expect(ACCENT_CIRCLES.length).toBeLessThan(HERO_NODES.length);
  });

  it("desktop 1280x720", () => {
    const ratio = accentAreaRatio(ACCENT_CIRCLES, DESKTOP);
    expect(ratio).toBeLessThanOrEqual(GC9_LIMIT);
  });

  it("mobile 393x851", () => {
    const ratio = accentAreaRatio(ACCENT_CIRCLES, MOBILE);
    expect(ratio).toBeLessThanOrEqual(GC9_LIMIT);
  });
});

describe("거짓 음성 방지 대조군 — 계측기가 실제로 위반을 잡아내는가", () => {
  // 5·6번 검사만 있으면 accentAreaRatio 가 항상 0을 돌려줘도 초록이 된다.
  // 24노드 전부를 액센트로 넣으면 GC-9 을 위반해야 한다 — 계측기가 진짜로 면적을
  // 재고 있다는 증거다. 이 검사가 빨갛지 않으면 5·6번의 초록은 신뢰할 수 없다.
  it("24노드 전부를 액센트로 넣으면 GC-9 을 위반한다(desktop)", () => {
    const ratio = accentAreaRatio(ALL_GROWN_CIRCLES, DESKTOP);
    expect(ratio).toBeGreaterThan(GC9_LIMIT);
  });
});
