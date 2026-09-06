/**
 * 조건이 참일 때만 첫 결과를 기억하는 메모이제이션.
 *
 * 🔴 **켜짐 여부를 만드는 시점이 아니라 부르는 시점에 묻는다.** `process.env.NODE_ENV` 를
 * 인자로 받아 굳히면, 모듈이 평가되는 순서에 따라 판정이 달라져 개발 서버가 옛 결과를
 * 붙들거나 프로덕션 빌드가 캐시를 놓친다.
 *
 * 🔴 **캐시가 찼는지를 값의 참·거짓으로 판정하지 않는다.** `if (!cached)` 로 쓰면 계산
 * 결과가 `null`·`0`·빈 문자열일 때 캐시가 영영 채워지지 않고 매번 다시 계산한다.
 * 그래서 값과 별도로 채움 여부를 둔다.
 */
export function memoizeWhen<T>(compute: () => T, enabled: () => boolean): () => T {
  let cached: T;
  let filled = false;

  return () => {
    // 꺼져 있으면 계산만 하고 캐시에 남기지 않는다 — 남기면 다시 켰을 때 옛 값이 나온다.
    if (!enabled()) return compute();
    if (!filled) {
      cached = compute();
      filled = true;
    }
    return cached;
  };
}
