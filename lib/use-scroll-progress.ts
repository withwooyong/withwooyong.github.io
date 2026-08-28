// lib/use-scroll-progress.ts
//
// 스티키 히어로의 스크롤 진행도를 읽는 **얇은 DOM 어댑터**.
// 산식은 하나도 여기 없다 — 전부 `scrollProgress()` 에 있다. 그래야 vitest(environment:
// "node")에서 검사되고, 훅에 남는 것은 「언제 재고 언제 안 재는가」뿐이다.

import { type RefObject, useEffect, useRef, useState } from "react";
import { scrollProgress } from "@/lib/hero/motion";

/**
 * `ref` 를 붙인 요소가 뷰포트를 지나가는 진행도 [0,1] 을 돌려준다.
 *
 * - `prefers-reduced-motion: reduce` 면 **즉시 1** 로 고정하고 리스너를 걸지 않는다(GC-7).
 *   0 이 아니라 1 인 이유: 모션을 끈 사람에게 보여야 하는 것은 시작 상태가 아니라
 *   **연출이 끝난 완성 화면**이다.
 *
 *   ⚠️ 다만 이 경로만으로는 **첫 페인트 점프를 없앨 수 없다.** 정적 export 라 서버 HTML 은
 *   useState(0) 으로 직렬화되고 useEffect 는 페인트 **뒤에** 돌기 때문이다 — SSR 시점에는
 *   미디어 질의 결과를 알 방법이 없으므로, 판정을 setState 로 하는 한 원리상 한 프레임의
 *   0 → 1 전환이 남는다. 그래서 **눈에 보이는 최종 상태는 CSS 가 그린다**:
 *   components/hero.tsx 와 components/hero-atlas.tsx 가 미디어 질의 유틸리티로
 *   첫 페인트부터 마지막 문장·점등 완료 아틀라스를 찍고, 껍데기 높이도 한 화면으로 줄여
 *   죽은 스크롤을 없앤다.
 *
 *   따라서 아래 setProgress(1) 은 **지우면 안 되는 폴백**이다. CSS 가 못 미치는 값
 *   (progress 를 직접 읽는 계산)과 기하 속성 r 을 CSS 로 못 받는 엔진을 이것이 받는다.
 * - 스크롤마다 레이아웃을 읽으면 프레임이 떨어진다. `requestAnimationFrame` 으로
 *   한 프레임에 한 번만 잰다.
 */
export function useScrollProgress<T extends HTMLElement>(): {
  ref: RefObject<T>;
  progress: number;
} {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    /*
     * matchMedia 가 없는 환경(아주 오래된 브라우저)에서는 옵셔널 체이닝으로 undefined 가
     * 되고, `?.matches` 도 undefined 라 아래 분기가 「모션 허용」으로 떨어진다 — 안전한 쪽이다.
     */
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    /*
     * ⚠️ **알려진 한계 — 고치지 않기로 한 것이다.** deps 가 빈 배열이라 이 판정은 마운트 시점에
     *    한 번만 난다. 로드 후 OS 설정을 reduce → no-preference 로 바꾸면 CSS 쪽(motion-reduce)은
     *    즉시 원래 높이로 돌아오는데 progress 는 1 에 고정돼 있어 **죽은 스크롤이 되돌아온다.**
     *    새로고침하면 정상이다.
     *
     *    MediaQueryList.addEventListener 로 구독하면 고쳐지지만 **그걸 하지 않는다** —
     *    이 저장소에서 그 API 가 구형 사파리에서 TypeError 를 던져 React 루트를 언마운트시키고
     *    전 페이지를 백지로 만든 전력이 있고, 에러 바운더리는 0건이다.
     *    설정을 바꾸고 새로고침을 안 하는 경우보다 백지가 훨씬 비싸다.
     */
    if (reduced) {
      setProgress(1);
      return;
    }

    let frame = 0;

    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      setProgress(scrollProgress(rect.top, rect.height, window.innerHeight));
    };

    const schedule = () => {
      // 이미 예약돼 있으면 아무것도 하지 않는다 — 한 프레임에 레이아웃 읽기는 한 번뿐이다.
      if (frame === 0) {
        frame = window.requestAnimationFrame(measure);
      }
    };

    measure(); // 첫 값은 스크롤을 기다리지 않고 지금 정한다(새로고침·앵커 진입)
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return { ref, progress };
}
