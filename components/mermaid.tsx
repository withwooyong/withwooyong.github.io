import { DiagramZoomDialog } from "@/components/diagram-zoom-dialog";
import { mermaidKindName, withObjectParticle, type Size } from "@/lib/diagram-zoom";
import { mermaidThemeVariables, repaintHardcodedStrokes, resolveDiagramFontFamily } from "@/lib/mermaid-theme";
import { Maximize2 } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

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

/**
 * mermaid가 useMaxWidth:false로 그린 SVG의 자연 크기(px). viewBox를 먼저 보고, 없으면 width·height 속성을 본다.
 * 높이까지 알아야 세로로 긴 도식을 화면 안에 맞춰 열 수 있다.
 */
function naturalSizeOf(svg: string): Size | null {
  const open = /<svg[^>]*>/.exec(svg)?.[0] ?? "";
  const box = /\sviewBox="[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)"/.exec(open);
  if (box) return { width: Number(box[1]), height: Number(box[2]) };
  const w = /\swidth="([\d.]+)"/.exec(open)?.[1];
  const h = /\sheight="([\d.]+)"/.exec(open)?.[1];
  return w && h ? { width: Number(w), height: Number(h) } : null;
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
  const figureRef = useRef<HTMLElement>(null);
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const kindName = useMemo(() => mermaidKindName(chart), [chart]);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    // useId는 콜론을 포함하는데 mermaid가 만드는 DOM id에는 쓸 수 없다.
    const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;

    import("mermaid")
      .then(async ({ default: mermaid }) => {
        // 폰트를 상속에 맡기면 재는 자리와 그리는 자리의 폰트가 갈려 라벨 끝 글자가 잘린다.
        // 왜 그런지와 실측은 lib/mermaid-theme.ts의 resolveDiagramFontFamily에 적어 두었다.
        // 확대 뷰어는 포털이라 body 아래에 그려지는데, 이 값이 SVG에 박히므로 본문과 같은 폰트가 된다.
        const fontFamily = resolveDiagramFontFamily(
          figureRef.current ? getComputedStyle(figureRef.current).fontFamily : null
        );

        // 웹폰트가 로드되기 전에 재면 대체 글꼴의 자폭으로 상자가 만들어진다.
        await document.fonts?.ready;
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "strict",
          fontFamily,
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
  const natural = useMemo(() => (svg ? naturalSizeOf(svg) : null), [svg]);

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
    <figure ref={figureRef} className="my-6">
      {/* 본문 미리보기 — 폭에 맞춰 전체가 보이도록 축소한다. */}
      <button
        type="button"
        onClick={openZoom}
        disabled={!svg}
        aria-label={`${kindName} 크게 보기`}
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
        {withObjectParticle(kindName)} 탭하면 확대해서 볼 수 있습니다
      </figcaption>

      <DiagramZoomDialog open={zoomOpen} onOpenChange={setZoomOpen} title={`${kindName} 확대 보기`} natural={natural}>
        <div
          className="[&_svg]:!h-auto [&_svg]:!w-full [&_svg]:!max-w-none"
          dangerouslySetInnerHTML={{ __html: zoomedSvg }}
        />
      </DiagramZoomDialog>
    </figure>
  );
}
