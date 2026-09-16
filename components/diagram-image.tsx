import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";

/**
 * 본문의 도식 이미지를 탭하면 확대·이동할 수 있는 뷰어로 연다.
 *
 * `components/mermaid.tsx`와 같은 조작 규약을 쓴다. 한 페이지에 Mermaid 도식과 이미지 도식이
 * 함께 나오는데 확대하는 방법이 서로 다르면 독자가 두 번 배워야 하기 때문이다.
 *
 * 도식은 1040px 폭으로 그려져 있어 좁은 화면에서는 12px 글자가 4px로 줄어든다.
 * 가로 스크롤로만 훑게 하면 전체 구조를 볼 수 없으므로, 본문에서는 폭에 맞춰 축소해 두고
 * 확대는 뷰어에서 한다.
 */

/** scale 1 = 컨테이너 폭에 꼭 맞춤. 안쪽 폭을 `scale * 100%`로 두면 배율 계산에 실제 픽셀이 필요 없다. */
const MIN_SCALE = 1;
const MAX_SCALE = 12;
const ZOOM_FACTOR = 1.5;

const clamp = (n: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, n));

type DiagramImageProps = { src: string; alt: string };

export function DiagramImage({ src, alt }: DiagramImageProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [naturalScale, setNaturalScale] = useState(1);
  // 자연 폭은 프롭으로 받지 않고 실제로 로드된 이미지에서 잰다.
  // 본문에 적어 둔 수치는 파일을 다시 그리면 조용히 낡는다.
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);

  /**
   * 뷰어의 스크롤 영역이 붙는 순간 폭을 재서, 글자가 원래 크기로 보이는 배율로 열어준다.
   * 확대를 누른 이유가 "작아서"인데 맞춤 배율로 열면 아무것도 달라지지 않는다.
   */
  /**
   * 이미 캐시에 있는 이미지는 React가 onLoad를 붙이기 전에 로드가 끝나 그 이벤트가 오지 않는다.
   * 그러면 자연 폭을 영원히 모른 채 뷰어가 "화면 맞춤"으로만 열린다 — 확대가 되지 않는 확대 버튼이다.
   * 그래서 붙는 순간의 `complete`도 함께 본다.
   */
  const measureImage = useCallback((el: HTMLImageElement | null) => {
    if (el?.complete && el.naturalWidth) setNaturalWidth(el.naturalWidth);
  }, []);

  const measureViewport = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || !naturalWidth) return;
      const available = el.clientWidth - 24; // 좌우 패딩
      const ratio = clamp(naturalWidth / Math.max(available, 1));
      setNaturalScale(ratio);
      setScale(ratio);
    },
    [naturalWidth]
  );

  return (
    <figure className="my-6">
      <button
        type="button"
        onClick={() => setZoomOpen(true)}
        aria-label={`${alt} — 크게 보기`}
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
          onLoad={(e) => setNaturalWidth(e.currentTarget.naturalWidth || null)}
        />

        <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-500 shadow-sm transition-colors group-hover:border-blue-400 group-hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-400">
          <Maximize2 className="h-3 w-3" aria-hidden />
          크게 보기
        </span>
      </button>

      <figcaption className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
        도식을 탭하면 확대해서 볼 수 있습니다
      </figcaption>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent
          aria-describedby={undefined}
          className={cn(
            "flex h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 p-0",
            "sm:h-[92vh] sm:w-[96vw] sm:rounded-lg sm:border",
            "[&>button]:right-2 [&>button]:top-2 [&>button]:grid [&>button]:h-9 [&>button]:w-9 [&>button]:place-items-center",
            "[&>button]:rounded-md [&>button]:border [&>button]:border-slate-200 [&>button]:bg-white [&>button]:opacity-100",
            "dark:[&>button]:border-slate-700 dark:[&>button]:bg-slate-950"
          )}
        >
          <DialogTitle className="sr-only">{alt} — 확대 보기</DialogTitle>

          <div className="flex shrink-0 items-center gap-1.5 border-b border-slate-200 bg-white px-2 py-2 pr-14 dark:border-slate-800 dark:bg-slate-950">
            <ZoomButton onClick={() => setScale((s) => clamp(s / ZOOM_FACTOR))} disabled={scale <= MIN_SCALE} label="축소">
              <Minus className="h-4 w-4" aria-hidden />
            </ZoomButton>
            <ZoomButton onClick={() => setScale((s) => clamp(s * ZOOM_FACTOR))} disabled={scale >= MAX_SCALE} label="확대">
              <Plus className="h-4 w-4" aria-hidden />
            </ZoomButton>
            <ZoomButton onClick={() => setScale(MIN_SCALE)} disabled={scale === MIN_SCALE} label="화면 폭에 맞추기">
              <RotateCcw className="h-4 w-4" aria-hidden />
            </ZoomButton>
            <span className="ml-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {Math.round((scale / naturalScale) * 100)}%
            </span>
          </div>

          <div
            ref={measureViewport}
            className="min-h-0 flex-1 overflow-auto bg-white p-3 sm:p-6 dark:bg-slate-900"
            style={{ touchAction: "pan-x pan-y pinch-zoom" }}
          >
            <div style={{ width: `${scale * 100}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} className="block h-auto w-full max-w-none" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </figure>
  );
}

function ZoomButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 transition-colors",
        "hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600",
        "dark:border-slate-700 dark:text-slate-300 dark:disabled:hover:border-slate-700 dark:disabled:hover:text-slate-300"
      )}
    >
      {children}
    </button>
  );
}
