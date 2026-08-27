import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { lockScroll } from "@/lib/ui/scroll-lock";

/**
 * vitest 환경이 `node` 라 `document` 가 없다(`vitest.config.ts`).
 * jsdom 을 들이는 대신 이 모듈이 실제로 만지는 것 — `document.body.style.overflow` —
 * 만 스텁한다. 모듈이 `document` 를 **호출 시점에** 읽으므로 스텁으로 충분하다.
 */
type Stub = { body: { style: { overflow: string } } };

function stubDocument(initialOverflow: string): Stub {
  const stub: Stub = { body: { style: { overflow: initialOverflow } } };
  (globalThis as unknown as { document: Stub }).document = stub;
  return stub;
}

function clearDocument(): void {
  delete (globalThis as unknown as { document?: Stub }).document;
}

/** 지금 body 에 걸린 overflow 값. */
function overflow(): string {
  return (globalThis as unknown as { document: Stub }).document.body.style
    .overflow;
}

describe("lockScroll", () => {
  beforeEach(() => {
    stubDocument("");
  });

  afterEach(() => {
    clearDocument();
  });

  it("하나 걸면 hidden, 풀면 원래 값으로 돌아온다", () => {
    const release = lockScroll();
    expect(overflow()).toBe("hidden");

    release();
    expect(overflow()).toBe("");
  });

  it("원래 값이 빈 문자열이 아니어도 그 값을 복원한다", () => {
    stubDocument("auto");

    const release = lockScroll();
    expect(overflow()).toBe("hidden");

    release();
    expect(overflow()).toBe("auto");
  });

  it("중첩 2회 후 하나만 풀면 여전히 잠겨 있다", () => {
    // 드로어가 연 상태에서 팔레트가 열리는 상황.
    const releaseDrawer = lockScroll();
    const releasePalette = lockScroll();
    expect(overflow()).toBe("hidden");

    releaseDrawer();
    expect(overflow()).toBe("hidden");

    releasePalette();
    expect(overflow()).toBe("");
  });

  it("정리 순서가 반대여도 마지막 해제에서만 복원한다", () => {
    // 이게 원래 버그의 재현 순서다: 팔레트가 나중에 정리되며 "hidden" 을 되살렸다.
    const releaseDrawer = lockScroll();
    const releasePalette = lockScroll();

    releasePalette();
    expect(overflow()).toBe("hidden");

    releaseDrawer();
    expect(overflow()).toBe("");
  });

  it("해제 함수를 두 번 불러도 카운터가 한 번만 준다", () => {
    // React StrictMode 는 이펙트 정리를 두 번 부른다. 두 번 줄면 남의 잠금이 풀린다.
    const releaseDrawer = lockScroll();
    const releasePalette = lockScroll();

    releasePalette();
    releasePalette();
    releasePalette();
    expect(overflow()).toBe("hidden");

    releaseDrawer();
    expect(overflow()).toBe("");
  });

  it("모두 푼 뒤 다시 걸어도 정상 동작한다 (카운터가 음수로 새지 않았다)", () => {
    const first = lockScroll();
    first();
    first();
    expect(overflow()).toBe("");

    const second = lockScroll();
    expect(overflow()).toBe("hidden");
    second();
    expect(overflow()).toBe("");
  });

  it("document 가 없으면 무동작 함수를 돌려준다", () => {
    clearDocument();

    const release = lockScroll();
    expect(typeof release).toBe("function");
    expect(() => release()).not.toThrow();

    // 카운터를 건드리지 않았는지 확인 — 다음 잠금이 정상적으로 저장·적용돼야 한다.
    stubDocument("scroll");
    const real = lockScroll();
    expect(overflow()).toBe("hidden");
    real();
    expect(overflow()).toBe("scroll");
  });
});
