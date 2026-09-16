import { DiagramZoomDialog } from "@/components/diagram-zoom-dialog";
import { DEFAULT_KIND_NAME, withObjectParticle, type Size } from "@/lib/diagram-zoom";
import { Maximize2 } from "lucide-react";
import { useCallback, useState } from "react";

/**
 * 본문의 도식 이미지를 탭하면 확대·이동할 수 있는 뷰어로 연다.
 *
 * 뷰어는 `components/mermaid.tsx`와 같은 `DiagramZoomDialog`를 쓴다.
 *
 * 도식은 1040px 폭으로 그려져 있어 좁은 화면에서는 12px 글자가 4px로 줄어든다.
 * 가로 스크롤로만 훑게 하면 전체 구조를 볼 수 없으므로, 본문에서는 폭에 맞춰 축소해 두고
 * 확대는 뷰어에서 한다.
 */

/** `kind` 는 마크다운 이미지의 제목(`![alt](src "구조도")`)에서 온다. SVG 파일에는 선언이 없어 종류를 알 수 없다. */
type DiagramImageProps = { src: string; alt: string; kind?: string };

export function DiagramImage({ src, alt, kind }: DiagramImageProps) {
  const kindName = kind?.trim() || DEFAULT_KIND_NAME;
  const [zoomOpen, setZoomOpen] = useState(false);
  // 자연 크기는 프롭으로 받지 않고 실제로 로드된 이미지에서 잰다.
  // 본문에 적어 둔 수치는 파일을 다시 그리면 조용히 낡는다.
  const [natural, setNatural] = useState<Size | null>(null);

  const readNatural = useCallback((el: HTMLImageElement) => {
    if (el.naturalWidth && el.naturalHeight) setNatural({ width: el.naturalWidth, height: el.naturalHeight });
  }, []);

  /**
   * 이미 캐시에 있는 이미지는 React가 onLoad를 붙이기 전에 로드가 끝나 그 이벤트가 오지 않는다.
   * 그러면 자연 크기를 영원히 모른 채 뷰어가 폭 맞춤으로만 열린다. 그래서 붙는 순간의 `complete`도 함께 본다.
   */
  const measureImage = useCallback(
    (el: HTMLImageElement | null) => {
      if (el?.complete) readNatural(el);
    },
    [readNatural]
  );

  return (
    <figure className="my-6">
      <button
        type="button"
        onClick={() => setZoomOpen(true)}
        aria-label={`${alt} — ${kindName} 크게 보기`}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition-colors hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
      >
        {/* 정적 export라 next/image의 로더를 쓰지 않는다. SVG는 확대해도 깨지지 않는다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={measureImage}
          src={src}
          alt={alt}
          className="block h-auto w-full"
          loading="lazy"
          decoding="async"
          onLoad={(e) => readNatural(e.currentTarget)}
        />

        <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-500 shadow-sm transition-colors group-hover:border-blue-400 group-hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-400">
          <Maximize2 className="h-3 w-3" aria-hidden />
          크게 보기
        </span>
      </button>

      <figcaption className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
        {withObjectParticle(kindName)} 탭하면 확대해서 볼 수 있습니다
      </figcaption>

      <DiagramZoomDialog open={zoomOpen} onOpenChange={setZoomOpen} title={`${alt} — ${kindName} 확대 보기`} natural={natural}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block h-auto w-full max-w-none" />
      </DiagramZoomDialog>
    </figure>
  );
}
