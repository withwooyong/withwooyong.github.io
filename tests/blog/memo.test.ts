import { describe, expect, it } from "vitest";
import { memoizeWhen } from "@/lib/blog/memo";

/** 부른 횟수를 세는 계산 함수를 만든다 */
function counted<T>(value: () => T): { compute: () => T; calls: () => number } {
  let calls = 0;
  return {
    compute: () => {
      calls += 1;
      return value();
    },
    calls: () => calls,
  };
}

describe("조건부 메모이제이션", () => {
  it("켜져 있으면 계산을 한 번만 한다", () => {
    const { compute, calls } = counted(() => ({ n: 1 }));
    const memo = memoizeWhen(compute, () => true);

    memo();
    memo();
    memo();

    expect(calls()).toBe(1);
  });

  it("켜져 있으면 매번 같은 참조를 돌려준다", () => {
    const memo = memoizeWhen(() => ({ n: 1 }), () => true);
    expect(memo()).toBe(memo());
  });

  it("꺼져 있으면 부를 때마다 다시 계산한다", () => {
    const { compute, calls } = counted(() => ({ n: 1 }));
    const memo = memoizeWhen(compute, () => false);

    memo();
    memo();

    expect(calls()).toBe(2);
  });

  it("꺼져 있으면 매번 다른 참조를 돌려준다 — 개발 서버가 옛 결과를 붙들면 안 된다", () => {
    const memo = memoizeWhen(() => ({ n: 1 }), () => false);
    expect(memo()).not.toBe(memo());
  });

  it("🔴 켜짐 여부를 호출할 때마다 판정한다 — 만드는 시점의 환경 변수로 굳으면 안 된다", () => {
    let enabled = false;
    const { compute, calls } = counted(() => ({ n: 1 }));
    const memo = memoizeWhen(compute, () => enabled);

    memo();
    expect(calls()).toBe(1);

    enabled = true;
    memo();
    memo();

    // 켜진 뒤의 첫 호출에서 한 번 계산하고 그 뒤로는 캐시를 쓴다.
    expect(calls()).toBe(2);
  });

  it("🔴 꺼져 있는 동안 계산한 값을 캐시에 남기지 않는다", () => {
    let enabled = true;
    const memo = memoizeWhen(() => ({ n: 1 }), () => enabled);

    const cached = memo();
    enabled = false;
    const fresh = memo();

    expect(fresh).not.toBe(cached);
  });

  it("🔴 계산 결과가 null 이어도 캐시한다 — 거짓값 판정으로 쓰면 매번 다시 계산한다", () => {
    const { compute, calls } = counted<null>(() => null);
    const memo = memoizeWhen(compute, () => true);

    expect(memo()).toBeNull();
    expect(memo()).toBeNull();

    expect(calls()).toBe(1);
  });
});
