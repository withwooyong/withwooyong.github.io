import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MAX_SCALE, ZOOM_FACTOR, clampScale, fitScale, isDismissClick, type Size } from "@/lib/diagram-zoom";
import { cn } from "@/lib/utils";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type DiagramZoomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 화면 낭독기가 읽는 제목. */
  title: string;
  /** 도식의 자연 크기(px). 모르면 폭에 맞춰 연다. */
  natural: Size | null;
  /** 폭이 `scale * 100%` 인 상자 안에 들어갈 도식. 폭을 100% 로 채워야 한다. */
  children: React.ReactNode;
};

/**
 * Mermaid 도식과 이미지 도식이 함께 쓰는 확대 뷰어.
 *
 * 한 페이지에 두 종류가 함께 나오는데 확대하는 방법이 서로 다르면 독자가 두 번 배워야 하므로
 * 하나로 둔다. 도식 전체가 화면 안에 들어오는 배율로 열고(contain), 확대 화면을 다시 누르면 닫는다.
 */
export function DiagramZoomDialog({ open, onOpenChange, title, natural, children }: DiagramZoomDialogProps) {
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  /** 글자가 원래 크기로 보이는 배율. 퍼센트 표시의 기준이다. */
  const [naturalScale, setNaturalScale] = useState(1);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  /**
   * 뷰어의 스크롤 영역이 붙는 순간 크기를 재서, 도식 전체가 보이는 배율로 연다.
   * 종전에는 자연 크기로 열었는데, 자연 폭이 화면보다 큰 도식은 화면을 몇 배 넘겨 열렸고
   * 폭만 맞추던 되돌리기도 세로로 긴 도식의 높이를 넘겼다.
   */
  const measureViewport = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || !natural) return;
      const style = getComputedStyle(el);
      const viewport = {
        width: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        height: el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      };
      const fit = fitScale(viewport, natural);
      setMinScale(fit);
      setScale(fit);
      setNaturalScale(natural.width / Math.max(viewport.width, 1));
    },
    [natural]
  );

  const onScrollAreaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const onScrollbar =
        e.clientX - rect.left >= el.clientLeft + el.clientWidth || e.clientY - rect.top >= el.clientTop + el.clientHeight;
      if (isDismissClick({ down: pointerDown.current, up: { x: e.clientX, y: e.clientY }, onScrollbar })) {
        onOpenChange(false);
      }
      pointerDown.current = null;
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          "flex h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 p-0",
          "sm:h-[92vh] sm:w-[96vw] sm:rounded-lg sm:border",
          // DialogContent가 그리는 기본 닫기 버튼을 손가락으로 누를 수 있는 크기로 키운다.
          "[&>button]:right-2 [&>button]:top-2 [&>button]:grid [&>button]:h-9 [&>button]:w-9 [&>button]:place-items-center",
          "[&>button]:rounded-md [&>button]:border [&>button]:border-slate-200 [&>button]:bg-white [&>button]:opacity-100",
          "dark:[&>button]:border-slate-700 dark:[&>button]:bg-slate-950"
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <div className="flex shrink-0 items-center gap-1.5 border-b border-slate-200 bg-white px-2 py-2 pr-14 dark:border-slate-800 dark:bg-slate-950">
          <ZoomButton onClick={() => setScale((s) => clampScale(s / ZOOM_FACTOR, minScale))} disabled={scale <= minScale} label="축소">
            <Minus className="h-4 w-4" aria-hidden />
          </ZoomButton>
          <ZoomButton onClick={() => setScale((s) => clampScale(s * ZOOM_FACTOR, minScale))} disabled={scale >= MAX_SCALE} label="확대">
            <Plus className="h-4 w-4" aria-hidden />
          </ZoomButton>
          <ZoomButton onClick={() => setScale(minScale)} disabled={scale === minScale} label="화면에 맞추기">
            <RotateCcw className="h-4 w-4" aria-hidden />
          </ZoomButton>
          <span className="ml-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {Math.round((scale / naturalScale) * 100)}%
          </span>
          <span className="ml-auto hidden text-xs text-slate-400 sm:inline dark:text-slate-500">누르면 닫힙니다</span>
        </div>

        {/* 스크롤 영역. 안쪽 폭을 scale 배수로 잡고, 화면보다 작으면 가운데에 둔다.
            justify-content 가 아니라 auto 여백으로 가운데 두어야 넘칠 때 위 · 왼쪽이 잘리지 않는다. */}
        <div
          ref={measureViewport}
          className="flex min-h-0 flex-1 cursor-zoom-out overflow-auto bg-white p-3 sm:p-6 dark:bg-slate-900"
          style={{ touchAction: "pan-x pan-y pinch-zoom" }}
          onPointerDown={(e) => {
            pointerDown.current = { x: e.clientX, y: e.clientY };
          }}
          onClick={onScrollAreaClick}
        >
          <div className="m-auto shrink-0" style={{ width: `${scale * 100}%` }}>
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
