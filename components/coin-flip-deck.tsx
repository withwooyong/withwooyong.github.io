import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";

type CoinFlipDeckProps = {
  children: ReactNode;
  className?: string;
};

/**
 * 뷰포트 진입 시 한 번만 자식 카드(.coin-flip-card)를 동전처럼 Y축으로
 * 여러 바퀴 회전 → 감속 정지시킨다. 실제 모션은 globals.css가 담당.
 * prefers-reduced-motion: reduce 이면 회전 없이 그대로 노출.
 */
export function CoinFlipDeck({ children, className }: CoinFlipDeckProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("coin-flip-deck", active && "coin-flip-active", className)}>
      {children}
    </div>
  );
}
