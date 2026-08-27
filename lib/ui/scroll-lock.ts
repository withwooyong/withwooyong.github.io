/**
 * 스크롤 잠금 카운터.
 *
 * 모달이 각자 `body.style.overflow` 를 저장·복원하면 **영구 잠금**이 난다:
 * 드로어가 `""` 를 저장하고 `hidden` 을 걸어 둔 상태에서 팔레트가 열리면 팔레트는
 * `"hidden"` 을 저장한다. 정리 순서상 드로어가 먼저 `""` 로 되돌려도 팔레트가 뒤이어
 * 자기가 저장한 `"hidden"` 을 되살린다.
 * → 모바일에서 드로어를 연 채 `Ctrl+K` → `Escape` 하면 페이지가 영영 안 굴러가고,
 *   새로고침 말고는 탈출구가 없다.
 *
 * 해법은 저장 지점을 하나로 모으는 것이다. **`0 → 1` 일 때만 저장하고 `1 → 0` 일 때만 복원한다.**
 */

let lockCount = 0;
let previousOverflow: string | null = null;

function noop(): void {
  /* 서버에서는 할 일이 없다 */
}

/**
 * 잠금을 하나 건다. 반환된 함수를 부르면 해제한다. 중첩 모달에 안전하다.
 *
 * 해제 함수는 **여러 번 불려도 한 번만** 감소한다 — React StrictMode 는 이펙트 정리를
 * 두 번 부르고, 그때 카운터가 두 번 줄면 다른 모달의 잠금이 풀린다.
 */
export function lockScroll(): () => void {
  if (typeof document === "undefined") return noop;

  lockCount += 1;
  if (lockCount === 1) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  let released = false;

  return function release(): void {
    if (released) return;
    released = true;

    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0) return;

    if (typeof document !== "undefined") {
      document.body.style.overflow = previousOverflow === null ? "" : previousOverflow;
    }
    previousOverflow = null;
  };
}
