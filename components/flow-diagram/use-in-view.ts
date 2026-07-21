import { useEffect, useRef, useState } from "react";

/**
 * 요소가 뷰포트에 들어와 있는지 반환한다.
 * 화면 밖 다이어그램의 CSS 애니메이션을 멈춰 CPU 사용을 줄이는 용도.
 * 한 번 보이면 계속 true로 두지 않고, 벗어나면 다시 false가 된다.
 */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 정적 export + 구형 브라우저 안전장치: 미지원이면 항상 켬
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "120px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
