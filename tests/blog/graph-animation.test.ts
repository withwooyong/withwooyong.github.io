import { describe, expect, it } from "vitest";
import { startTickAnimation, type AnimationHost } from "@/lib/blog/graph-animation";

/**
 * 프레임을 손으로 돌리는 가짜 호스트.
 *
 * 실제 `requestAnimationFrame` 을 쓰면 케이스가 타이밍에 의존해 간헐적으로 깨진다.
 */
function fakeHost(reducedMotion = false) {
  let nextHandle = 1;
  const queue = new Map<number, () => void>();
  let canceledCallback: (() => void) | null = null;

  const host: AnimationHost = {
    requestFrame(cb) {
      const handle = nextHandle++;
      queue.set(handle, cb);
      return handle;
    },
    cancelFrame(handle) {
      // 취소한 콜백을 버리지 않고 붙들어 둔다 — 아래 runCanceledFrame 이 그것을 부른다.
      canceledCallback = queue.get(handle) ?? canceledCallback;
      queue.delete(handle);
    },
    prefersReducedMotion: () => reducedMotion,
  };

  return {
    host,
    /** 예약된 프레임을 한 번 돌린다 */
    runFrame() {
      const callbacks = Array.from(queue.values());
      queue.clear();
      for (const cb of callbacks) cb();
    },
    /**
     * 취소했는데도 콜백이 불리는 상황을 흉내낸다.
     *
     * 실제 `cancelAnimationFrame` 은 **이미 실행에 들어간 콜백을 되돌리지 못한다.**
     * 큐에서 지우는 것만으로 안전하다고 보면 이 경로가 검사되지 않는다.
     */
    runCanceledFrame() {
      canceledCallback?.();
    },
    pending: () => queue.size,
  };
}

/** 케이스마다 쓰는 기본 입력. setTicks 가 받은 값을 전부 기록한다 */
function harness(reducedMotion = false) {
  const fake = fakeHost(reducedMotion);
  const seen: number[] = [];
  const start = () =>
    startTickAnimation({
      totalTicks: 30,
      ticksPerFrame: 6,
      setTicks: (t) => seen.push(t),
      host: fake.host,
    });
  return { ...fake, seen, start };
}

describe("마운트 애니메이션", () => {
  it("시작하면 먼저 0 으로 되돌린다 — 최종 배치에서 출발하면 움직임이 보이지 않는다", () => {
    const h = harness();
    h.start();
    expect(h.seen[0]).toBe(0);
  });

  it("프레임마다 정해진 틱만큼 나아간다", () => {
    const h = harness();
    h.start();
    h.runFrame();
    h.runFrame();
    expect(h.seen).toEqual([0, 6, 12]);
  });

  it("마지막 값이 정확히 totalTicks 다 — 넘어가면 배치가 흔들린다", () => {
    const h = harness();
    h.start();
    for (let i = 0; i < 10; i++) h.runFrame();
    expect(h.seen[h.seen.length - 1]).toBe(30);
    expect(Math.max(...h.seen)).toBe(30);
  });

  it("🔴 totalTicks 가 ticksPerFrame 의 배수가 아니어도 정확히 거기서 멈춘다", () => {
    // 위 케이스의 30 과 6 은 나누어떨어져, 상한을 씌우지 않아도 마지막 값이 우연히 맞는다.
    const fake = fakeHost();
    const seen: number[] = [];
    startTickAnimation({
      totalTicks: 20,
      ticksPerFrame: 6,
      setTicks: (t) => seen.push(t),
      host: fake.host,
    });
    for (let i = 0; i < 10; i++) fake.runFrame();

    expect(seen).toEqual([0, 6, 12, 18, 20]);
  });

  it("totalTicks 에 닿으면 프레임을 더 예약하지 않는다", () => {
    const h = harness();
    h.start();
    for (let i = 0; i < 5; i++) h.runFrame();
    expect(h.pending()).toBe(0);
  });

  it("🔴 중단한 뒤 다시 시작하면 끝까지 간다 — StrictMode 는 마운트를 두 번 한다", () => {
    const h = harness();

    // 1회차 마운트: 시작하자마자 cleanup 이 돈다.
    const stop = h.start();
    stop();

    // 2회차 마운트: 여기서 애니메이션이 실제로 진행되어야 한다.
    h.start();
    for (let i = 0; i < 10; i++) h.runFrame();

    expect(h.seen[h.seen.length - 1]).toBe(30);
  });

  it("중단하면 예약된 프레임이 취소된다", () => {
    const h = harness();
    const stop = h.start();
    expect(h.pending()).toBe(1);

    stop();
    expect(h.pending()).toBe(0);
  });

  it("중단한 뒤에는 틱이 더 올라가지 않는다", () => {
    const h = harness();
    const stop = h.start();
    stop();

    const after = h.seen.length;
    h.runFrame();
    expect(h.seen.length).toBe(after);
  });

  it("🔴 취소를 놓친 프레임이 뒤늦게 불려도 틱을 올리지 않는다 — rAF 는 실행 중인 콜백을 되돌리지 못한다", () => {
    const h = harness();
    const stop = h.start();
    stop();

    const after = h.seen.length;
    h.runCanceledFrame();

    expect(h.seen.length).toBe(after);
  });

  it("🔴 중단한 애니메이션의 남은 프레임이 새로 시작한 것과 겹쳐 돌지 않는다", () => {
    const h = harness();
    const stop = h.start();
    stop();

    h.start();
    const afterRestart = h.seen.length;

    // 1회차의 살아남은 콜백이 뒤늦게 불려도 2회차의 진행에 끼어들면 안 된다.
    h.runCanceledFrame();
    h.runFrame();

    expect(h.seen.slice(afterRestart)).toEqual([6]);
  });

  it("움직임 축소를 요청했으면 프레임을 걸지 않는다", () => {
    const h = harness(true);
    h.start();
    expect(h.pending()).toBe(0);
  });

  it("🔴 움직임 축소를 요청했으면 틱을 건드리지 않는다 — 최종 배치가 그대로 남아야 한다", () => {
    const h = harness(true);
    h.start();
    expect(h.seen).toEqual([]);
  });
});
