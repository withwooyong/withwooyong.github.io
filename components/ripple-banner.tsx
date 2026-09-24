import { useEffect, useRef } from "react";
import { createRippleSim, type RippleSim } from "@/lib/ripple-sim";

// 조정용 상수
const IDLE_MS = 1500; // 마지막 입력 후 이 시간이 지나면 정리 단계(높이장을 빠르게 가라앉힘)에 들어간다
const SETTLE_MS = 700; // 정리 단계 길이 — 끝나면 높이장과 캔버스를 비우고 rAF 를 멈춘다
const MAX_DPR = 2; // 디바이스 픽셀 비율 상한 — 고DPI 화면에서 시뮬레이션 해상도가 과도해지지 않게 한다
const MOVE_STRENGTH_SCALE = 2.0; // 포인터 이동 거리 → 드롭 강도 배율
const MOVE_STRENGTH_MAX = 0.55; // 포인터 이동으로 생기는 드롭 강도 상한
const CLICK_STRENGTH = 1.0; // pointerdown(클릭/탭) 한 번의 드롭 강도
const STEP_MS = 1000 / 60; // 시뮬레이션 스텝 간격 — 고주사율 화면에서도 물결 속도를 60Hz 기준으로 고정한다
const MAX_STEPS_PER_FRAME = 3; // 탭 복귀 등으로 시간이 크게 벌어졌을 때 몰아서 돌리는 스텝 수 상한

/**
 * 히어로 섹션에 마우스·터치를 따라 번지는 물결 오버레이.
 * 장식용 — 스크린리더에서 숨기고 클릭·터치를 가로채지 않는다.
 * WebGL float 렌더 타깃을 쓸 수 없거나 prefers-reduced-motion 이면 아무것도 그리지 않는다.
 */
export function RippleBanner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const section = canvas.parentElement;
    if (!section) return;

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");

    let sim: RippleSim | null = null;
    let rafId: number | null = null;
    let running = false; // rAF 루프가 돌고 있는지
    let isVisible = true; // IntersectionObserver 상 화면 안인지
    let lastInputAt = 0;
    let lastFrameAt = 0;
    let stepDebt = 0; // 아직 돌리지 않은 시뮬레이션 시간(ms)
    let lastPointerUv: { u: number; v: number } | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let darkModeObserver: MutationObserver | null = null;

    const isPageHidden = () => document.hidden;
    // prefers-color-scheme 이 아니라 이 사이트의 다크 판정(html.dark)을 그대로 따른다
    const readDarkMode = () => document.documentElement.classList.contains("dark");

    const doResize = () => {
      if (!sim) return;
      const rect = section.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      sim.resizeSim(Math.max(1, rect.width * dpr), Math.max(1, rect.height * dpr));
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      running = false;
    };

    const frame = () => {
      if (!sim || !isVisible || isPageHidden()) {
        sim?.wipe(); // 멈춘 채 남은 마지막 프레임이 복귀 때 잔상으로 보이지 않게 한다
        stopLoop();
        return;
      }
      const now = performance.now();
      const idleFor = now - lastInputAt;
      sim.setSettling(idleFor > IDLE_MS);
      stepDebt = Math.min(stepDebt + now - lastFrameAt, STEP_MS * MAX_STEPS_PER_FRAME);
      lastFrameAt = now;
      while (stepDebt >= STEP_MS) {
        sim.step();
        stepDebt -= STEP_MS;
      }
      if (idleFor > IDLE_MS + SETTLE_MS) {
        sim.wipe();
        stopLoop();
        return;
      }
      rafId = requestAnimationFrame(frame);
    };

    const startLoop = () => {
      if (running || !sim || !isVisible || isPageHidden()) return;
      running = true;
      lastFrameAt = performance.now();
      stepDebt = STEP_MS; // 시작 프레임에서 한 스텝은 바로 돌린다
      rafId = requestAnimationFrame(frame);
    };

    const toUv = (clientX: number, clientY: number) => {
      const rect = section.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      const u = (clientX - rect.left) / rect.width;
      const v = (clientY - rect.top) / rect.height;
      if (u < 0 || u > 1 || v < 0 || v > 1) return null;
      return { u, v };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!sim) return;
      const uv = toUv(event.clientX, event.clientY);
      lastInputAt = performance.now();
      if (uv) {
        if (lastPointerUv) {
          const dx = uv.u - lastPointerUv.u;
          const dy = uv.v - lastPointerUv.v;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const strength = Math.min(MOVE_STRENGTH_MAX, dist * MOVE_STRENGTH_SCALE);
          if (strength > 0.01) sim.addDrop(uv.u, uv.v, strength);
        }
        lastPointerUv = uv;
      }
      startLoop();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!sim) return;
      const uv = toUv(event.clientX, event.clientY);
      lastInputAt = performance.now();
      if (uv) {
        sim.addDrop(uv.u, uv.v, CLICK_STRENGTH);
        lastPointerUv = uv;
      }
      startLoop();
    };

    const attachInputListeners = () => {
      section.addEventListener("pointermove", onPointerMove, { passive: true });
      section.addEventListener("pointerdown", onPointerDown, { passive: true });
    };
    const removeInputListeners = () => {
      section.removeEventListener("pointermove", onPointerMove);
      section.removeEventListener("pointerdown", onPointerDown);
    };

    const onContextLost = (event: Event) => {
      event.preventDefault();
      stopLoop();
      sim = null;
    };

    const onVisibilityChange = () => {
      if (isPageHidden()) {
        stopLoop();
      } else {
        startLoop();
      }
    };

    let ready = false;

    const setup = () => {
      if (ready) return;
      sim = createRippleSim(canvas);
      if (!sim) return; // float 렌더 타깃 미지원 — 캔버스는 그대로 비워 둔다(대체 상태)
      ready = true;
      doResize();
      sim.setDarkMode(readDarkMode());

      darkModeObserver = new MutationObserver(() => {
        sim?.setDarkMode(readDarkMode());
      });
      darkModeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      resizeObserver = new ResizeObserver(doResize);
      resizeObserver.observe(section);

      intersectionObserver = new IntersectionObserver(
        (entries) => {
          isVisible = entries.some((entry) => entry.isIntersecting);
          if (isVisible) startLoop();
          else stopLoop();
        },
        { threshold: 0.01 }
      );
      intersectionObserver.observe(section);

      document.addEventListener("visibilitychange", onVisibilityChange);
      canvas.addEventListener("webglcontextlost", onContextLost, false);
      attachInputListeners();
      lastInputAt = performance.now();
      startLoop();
    };

    const teardown = () => {
      if (!ready) return;
      ready = false;
      stopLoop();
      removeInputListeners();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      darkModeObserver?.disconnect();
      darkModeObserver = null;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("webglcontextlost", onContextLost, false);
      sim?.destroy();
      sim = null;
    };

    if (!mql.matches) setup();

    const onReducedMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) teardown();
      else setup();
    };
    mql.addEventListener("change", onReducedMotionChange);

    return () => {
      mql.removeEventListener("change", onReducedMotionChange);
      teardown();
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[1] h-full w-full" aria-hidden />;
}
