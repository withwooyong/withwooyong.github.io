import { useCallback, useEffect, useRef } from "react";

/**
 * 섹션 진입 시 한 번, 감쇠 스프링 형태로 요소를 2~3회 흔들고 멎는 펄스.
 * 정적 HTML/CSS 는 건드리지 않고 인라인 style 만 rAF 로 갱신한다.
 * prefers-reduced-motion: reduce 이면 trigger() 가 아무것도 하지 않는다.
 */
export function useRevealPulse<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const lastScrollRef = useRef<{ y: number; t: number } | null>(null);
  const scrollListenerRef = useRef<(() => void) | null>(null);

  const removeScrollListener = useCallback(() => {
    if (scrollListenerRef.current) {
      window.removeEventListener("scroll", scrollListenerRef.current);
      scrollListenerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      const last = lastScrollRef.current;
      if (last) {
        const dt = now - last.t;
        if (dt > 0) {
          const instantV = Math.abs(y - last.y) / (dt / 1000);
          // 지수 이동 평균
          velocityRef.current = velocityRef.current * 0.8 + instantV * 0.2;
        }
      }
      lastScrollRef.current = { y, t: now };
    };

    scrollListenerRef.current = onScroll;
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      removeScrollListener();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, [removeScrollListener]);

  const trigger = useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const amplitude = clamp(0.55 + velocityRef.current / 2500, 0.55, 1.0);
    const isDark = document.documentElement.classList.contains("dark");
    const ringColor = isDark ? "96,165,250" : "37,99,235";

    timeoutRef.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) {
        removeScrollListener();
        return;
      }

      const start = performance.now();
      const durationMs = 2000;
      const freq = 1.1; // Hz — 물결과 템포를 맞춰 느긋하게
      const tau = 0.7; // s — 진동수를 낮춘 만큼 늘려 출렁임 횟수(2~3회)를 유지한다
      // 원래 그림자(카드의 shadow 등)를 링 뒤에 붙여 애니메이션 중에도 사라지지 않게 한다
      const baseShadow = getComputedStyle(el).boxShadow;
      const shadowTail = baseShadow && baseShadow !== "none" ? `, ${baseShadow}` : "";
      // 클래스의 그림자 전이(150ms)가 매 프레임 값을 늦게 따라가 링이 번지지 않도록 애니메이션 동안만 끈다
      el.style.transitionDuration = "0s";

      const step = (now: number) => {
        const elapsed = (now - start) / 1000;
        if (elapsed >= durationMs / 1000) {
          el.style.transform = "";
          el.style.boxShadow = "";
          el.style.transitionDuration = "";
          rafRef.current = null;
          removeScrollListener();
          return;
        }

        const envelope = Math.exp(-elapsed / tau);
        const y = envelope * Math.sin(2 * Math.PI * freq * elapsed);
        const scale = 1 + 0.035 * amplitude * y;
        // 링은 진동을 따르지 않고 감쇠 곡선만 따른다 — 한 번 퍼지면서 옅어진다(깜빡이지 않는다)
        const ringSize = 10 * amplitude * (1 - envelope);
        const ringAlpha = 0.35 * envelope;

        el.style.transform = `scale(${scale})`;
        el.style.boxShadow = `0 0 0 ${ringSize}px rgba(${ringColor}, ${ringAlpha})${shadowTail}`;

        rafRef.current = requestAnimationFrame(step);
      };

      rafRef.current = requestAnimationFrame(step);
    }, 450);
  }, [removeScrollListener]);

  return { ref, trigger };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
