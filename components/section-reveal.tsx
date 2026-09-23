import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";

type SectionRevealProps = {
  children: ReactNode;
  className?: string;
  onReveal?: () => void;
};

/**
 * 뷰포트 진입 시 한 번만 opacity + translateY 등장.
 * prefers-reduced-motion: reduce 이면 즉시 표시.
 */
export function SectionReveal({ children, className, onReveal }: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setVisible(true);
          onRevealRef.current?.();
          observer.disconnect();
        }
      },
      { root: null, rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("section-reveal", visible && "section-reveal-visible", className)}>
      {children}
    </div>
  );
}
