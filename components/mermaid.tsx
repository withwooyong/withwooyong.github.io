import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { mermaidThemeVariables, repaintHardcodedStrokes } from "@/lib/mermaid-theme";
import { cn } from "@/lib/utils";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

/** <html class="dark"> 변화를 구독한다. 이 저장소의 테마는 컨텍스트 없이 클래스만 토글한다. */
function useIsDark(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

/**
 * 같은 SVG를 본문과 확대 뷰어에 동시에 넣으면 마커 id가 중복돼 url(#id) 참조가 엉킨다.
 *
 * mermaid의 SVG는 루트 id로 스코프된 <style> 블록(`#mermaid-r0 .node rect { ... }`)을 품고 있고,
 * 마커 id도 루트 id를 접두사로 쓴다. 그래서 id 속성만 바꾸면 스타일이 통째로 풀린다.
 * 루트 id 문자열을 문서 전체에서 치환해야 정의·참조·선택자가 함께 따라온다.
 */
function namespaceSvgIds(svg: string, suffix: string): string {
  const rootId = /<svg[^>]*\sid="([^"]+)"/.exec(svg)?.[1];
  if (!rootId) return svg;
  return svg.split(rootId).join(`${rootId}-${suffix}`);
}

/** scale 1 = 컨테이너 폭에 꼭 맞춤. 안쪽 폭을 `scale * 100%`로 두면 배율 계산에 실제 픽셀이 필요 없다. */
const MIN_SCALE = 1;
const MAX_SCALE = 12;
const ZOOM_FACTOR = 1.5;

const clamp = (n: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, n));

/** mermaid가 useMaxWidth:false로 그린 SVG는 width 속성에 자연 폭(px)을 갖는다. */
function naturalWidthOf(svg: string): number | null {
  const w = /<svg[^>]*\swidth="([\d.]+)"/.exec(svg)?.[1];
  return w ? Number(w) : null;
}

type MermaidProps = { chart: string };

/**
 * mermaid 도식을 클라이언트에서 SVG로 렌더링한다.
 *
 * 본문에서는 폭에 맞춰 전체가 보이게 축소하고, 탭하면 확대·이동 가능한 뷰어를 연다.
 * 좁은 화면에서 넓은 도식을 가로 스크롤로만 훑게 하면 전체 구조를 볼 수 없기 때문이다.
 *
 * mermaid는 무겁고 브라우저 API에 의존하므로 동적 import로 필요할 때만 불러온다.
 * 정적 export(output: "export")에서는 서버 렌더가 없으므로 useEffect 안에서만 실행된다.
 */
export function Mermaid({ chart }: MermaidProps) {
  const reactId = useId();
  const isDark = useIsDark();
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    // useId는 콜론을 포함하는데 mermaid가 만드는 DOM id에는 쓸 수 없다.
    const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;

    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "strict",
          fontFamily: "inherit",
          // 색은 사이트 팔레트를 따른다. 값과 대비 근거는 lib/mermaid-theme.ts에 있다.
          themeVariables: mermaidThemeVariables(isDark),
          // 도식을 자연 크기로 그린 뒤, 표시 크기는 CSS가 정하게 둔다.
          flowchart: { useMaxWidth: false },
          sequence: { useMaxWidth: false },
          gantt: { useMaxWidth: false },
          er: { useMaxWidth: false },
          state: { useMaxWidth: false },
          mindmap: { useMaxWidth: false },
          quadrantChart: { useMaxWidth: false },
        });

        const { svg: rendered } = await mermaid.render(renderId, chart);
        if (!cancelled) setSvg(repaintHardcodedStrokes(rendered, isDark));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      // mermaid가 측정용으로 body에 남기는 임시 노드를 정리한다.
      document.getElementById(`d${renderId}`)?.remove();
    };
  }, [chart, isDark, reactId]);

  const zoomedSvg = useMemo(() => (svg ? namespaceSvgIds(svg, "zoom") : ""), [svg]);
  const naturalWidth = useMemo(() => (svg ? naturalWidthOf(svg) : null), [svg]);

  /** 글자가 원래 크기로 보이는 배율. 좁은 화면일수록 커진다. */
  const [naturalScale, setNaturalScale] = useState(1);

  /**
   * 뷰어의 스크롤 영역이 붙는 순간 폭을 재서, 자연 크기 배율로 열어준다.
   * 확대를 누른 이유가 "작아서"인데 맞춤 배율로 열면 아무것도 달라지지 않는다.
   */
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

  const openZoom = useCallback(() => setZoomOpen(true), []);

  // 렌더 실패 시 원본 정의를 그대로 보여준다. 도식이 사라지는 것보다 낫다.
  if (failed) {
    return (
      <figure className="my-6 overflow-x-auto rounded-lg border border-amber-300 bg-amber-50 p-3 sm:p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <figcaption className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
          도식을 그리지 못했습니다. 원본 정의를 표시합니다.
        </figcaption>
        <pre className="text-[11px] leading-relaxed text-slate-700 sm:text-xs dark:text-slate-300">{chart}</pre>
      </figure>
    );
  }

  return (
    <figure className="my-6">
      {/* 본문 미리보기 — 폭에 맞춰 전체가 보이도록 축소한다. */}
      <button
        type="button"
        onClick={openZoom}
        disabled={!svg}
        aria-label="도식 크게 보기"
        className="group relative block w-full cursor-zoom-in rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-400 disabled:cursor-default sm:p-4 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-600"
      >
        {svg ? (
          <div
            className="mermaid-figure [&_svg]:!h-auto [&_svg]:!max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
            aria-hidden
          />
        ) : (
          <div className="h-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" aria-hidden />
        )}

        {svg ? (
          <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-500 shadow-sm transition-colors group-hover:border-blue-400 group-hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-400">
            <Maximize2 className="h-3 w-3" aria-hidden />
            크게 보기
          </span>
        ) : null}
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
            // DialogContent가 그리는 기본 닫기 버튼을 손가락으로 누를 수 있는 크기로 키운다.
            "[&>button]:right-2 [&>button]:top-2 [&>button]:grid [&>button]:h-9 [&>button]:w-9 [&>button]:place-items-center",
            "[&>button]:rounded-md [&>button]:border [&>button]:border-slate-200 [&>button]:bg-white [&>button]:opacity-100",
            "dark:[&>button]:border-slate-700 dark:[&>button]:bg-slate-950"
          )}
        >
          <DialogTitle className="sr-only">도식 확대 보기</DialogTitle>

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

          {/* 스크롤 영역. 안쪽 폭을 scale 배수로 잡으면 1배는 항상 화면 폭에 꼭 맞는다. */}
          <div
            ref={measureViewport}
            className="min-h-0 flex-1 overflow-auto bg-white p-3 sm:p-6 dark:bg-slate-900"
            style={{ touchAction: "pan-x pan-y pinch-zoom" }}
          >
            <div
              className="[&_svg]:!h-auto [&_svg]:!w-full [&_svg]:!max-w-none"
              style={{ width: `${scale * 100}%` }}
              dangerouslySetInnerHTML={{ __html: zoomedSvg }}
            />
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
