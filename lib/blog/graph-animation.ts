/**
 * 지역 그래프의 마운트 애니메이션.
 *
 * 🔴 **컴포넌트 밖에 두는 이유가 있다.** 이 리포의 테스트 환경은 `node` 이고 렌더링
 * 라이브러리가 없어, effect 안에 로직이 있으면 어떤 케이스도 그것을 볼 수 없다.
 * 브라우저가 주는 것(프레임 예약·취소·움직임 축소 설정)을 주입받는 형태로 뽑으면
 * 진행 규칙 전체를 검사할 수 있다.
 */

/** 애니메이션이 브라우저에 요구하는 것. 테스트에서 가짜를 넣을 수 있도록 주입받는다 */
export type AnimationHost = {
  requestFrame(callback: () => void): number;
  cancelFrame(handle: number): void;
  prefersReducedMotion(): boolean;
};

export type TickAnimationInput = {
  totalTicks: number;
  ticksPerFrame: number;
  setTicks: (ticks: number) => void;
  host: AnimationHost;
};

/**
 * 틱을 0 부터 `totalTicks` 까지 올리고 중단 함수를 돌려준다.
 *
 * 🔴 **진행 상태를 모듈이 아니라 이 호출 안에 둔다.** React StrictMode 는 마운트를
 * 두 번 하는데(1회차 effect → cleanup → 2회차 effect), 「이미 시작했다」를 밖에
 * 기억해 두면 2회차가 즉시 돌아가 버린다. 그러면 화면에 남는 것은 멈춘 애니메이션이
 * 아니라 **힘 계산을 하지 않은 초기 원형 배치**다. 상태가 호출마다 새로 생기므로
 * 중단한 뒤 다시 시작하면 언제나 끝까지 간다.
 */
export function startTickAnimation({
  totalTicks,
  ticksPerFrame,
  setTicks,
  host,
}: TickAnimationInput): () => void {
  // 움직임을 줄이도록 설정한 방문자에게는 최종 배치를 그대로 남긴다. 틱을 건드리지 않는다.
  if (host.prefersReducedMotion()) return () => {};

  let frame = 0;
  let handle = 0;
  let stopped = false;

  const step = () => {
    // 🔴 **큐에서 지우는 것만으로는 부족하다.** `cancelAnimationFrame` 은 이미 실행에
    // 들어간 콜백을 되돌리지 못하므로, 중단한 애니메이션의 마지막 프레임이 뒤늦게 불릴
    // 수 있다. StrictMode 에서는 그것이 2회차 애니메이션과 **겹쳐 돌아** 틱이 두 배씩
    // 뛴다 (실측으로 한 프레임에 6 이 아니라 18 까지 갔다).
    if (stopped) return;

    frame += 1;
    const next = Math.min(frame * ticksPerFrame, totalTicks);
    setTicks(next);
    if (next < totalTicks) handle = host.requestFrame(step);
  };

  setTicks(0);
  handle = host.requestFrame(step);

  return () => {
    stopped = true;
    host.cancelFrame(handle);
  };
}
