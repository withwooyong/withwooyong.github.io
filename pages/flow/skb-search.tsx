import { FlowDiagram, toStackedSpec } from "@/components/flow-diagram";
import { SiteHead } from "@/components/site-head";
import { ThemeToggle } from "@/components/theme-toggle";
import { skbFlowSearchSpec as spec } from "@/data/diagrams/skb-flow-search";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Chapter = { order: number; title: string; lines: string[] };

/** 노드 라벨. 같은 라벨(API Gateway · Elasticsearch)을 가르도록 sub 가 있으면 괄호로 붙인다 */
const nodeLabel = new Map(
  spec.nodes.map((n) => [n.id, n.sub ? `${n.label} (${n.sub})` : n.label] as const),
);

/** 스펙의 steps 에서 문단을 만든다. 본문은 그 order 의 엣지를 「출발 → 도착」으로 나열할 뿐이다 */
const chapters: Chapter[] = (spec.steps ?? []).map((step) => ({
  order: step.order,
  title: step.caption,
  lines: spec.edges
    .filter((e) => e.order === step.order)
    .map(
      (e) =>
        `${nodeLabel.get(e.from) ?? e.from} ${e.bidirectional ? "↔" : "→"} ${nodeLabel.get(e.to) ?? e.to}`,
    ),
}));

/** 이 폭(Tailwind md) 이상이면 흐름도가 화면 안에 다 들어오므로 상자를 스크롤하지 않는다 */
const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * 모바일 흐름도 상자의 scrollTop 을 정한다. 그 order 의 엣지가 잇는 노드들의 세로 범위 중앙이
 * 상자 중앙에 오게 한다. 노드 좌표는 모바일 재배치(toStackedSpec)의 viewBox 단위이고,
 * 실제 렌더 높이 / viewBox.h 로 화면 픽셀에 환산한다. 계산할 수 없으면 null 이다.
 */
function mobileScrollTop(box: HTMLElement, order: number): number | null {
  if (order === 0) return 0;
  const svg = box.querySelector("svg");
  if (!svg) return null;
  const vb = svg.viewBox.baseVal;
  // 폭을 재기 전의 원본(가로) 배치다. 노드 좌표를 환산할 수 없다
  if (vb.height === 0 || (vb.width === spec.viewBox.w && vb.height === spec.viewBox.h)) return null;
  const stacked = toStackedSpec(spec, vb.width);
  const byId = new Map(stacked.nodes.map((n) => [n.id, n] as const));
  let top = Infinity;
  let bottom = -Infinity;
  for (const edge of stacked.edges) {
    if (edge.order !== order) continue;
    for (const id of [edge.from, edge.to]) {
      const node = byId.get(id);
      if (!node) continue;
      top = Math.min(top, node.y);
      bottom = Math.max(bottom, node.y + node.h);
    }
  }
  if (!Number.isFinite(top)) return null;
  const svgRect = svg.getBoundingClientRect();
  const scale = svgRect.height / vb.height;
  const svgTop = svgRect.top - box.getBoundingClientRect().top + box.scrollTop;
  const target = svgTop + ((top + bottom) / 2) * scale - box.clientHeight / 2;
  return Math.min(Math.max(target, 0), Math.max(box.scrollHeight - box.clientHeight, 0));
}

/** 화면 가운데 가는 띠. 문단이 이 띠에 닿으면 그 단계가 켜진다 */
const CENTER_BAND = "-45% 0px -45% 0px";

export default function SkbSearchFlowPage() {
  // 0 은 어떤 단계도 시작하지 않은 상태다
  const [activeOrder, setActiveOrder] = useState(0);
  const sectionRefs = useRef(new Map<number, HTMLElement>());
  const orders = useMemo(() => chapters.map((c) => c.order), []);
  const diagramBoxRef = useRef<HTMLDivElement>(null);

  // 모바일은 흐름도가 상자보다 길어 창으로 보여 준다. 단계가 바뀌면 그 단계의 노드가 창 가운데 오게 옮긴다
  useEffect(() => {
    const box = diagramBoxRef.current;
    if (!box || window.matchMedia(DESKTOP_QUERY).matches) return;
    const top = mobileScrollTop(box, activeOrder);
    if (top === null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }, [activeOrder]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      // 관찰할 수 없으면 모든 단계를 끝난 상태로 보여 준다
      setActiveOrder(orders[orders.length - 1] ?? 0);
      return;
    }
    const inBand = new Set<number>();
    const byElement = new Map<Element, number>();
    sectionRefs.current.forEach((el, order) => byElement.set(el, order));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const order = byElement.get(entry.target);
          if (order === undefined) continue;
          if (entry.isIntersecting) {
            inBand.add(order);
            setActiveOrder(order);
          } else if (inBand.delete(order)) {
            // 띠를 아래로 벗어났다 = 위로 스크롤했다. 바로 앞 단계로 돌아간다
            const center = (entry.rootBounds?.height ?? window.innerHeight) / 2;
            if (entry.boundingClientRect.top > center) {
              const previous = orders[orders.indexOf(order) - 1];
              setActiveOrder(previous ?? 0);
            }
          }
        }
      },
      { rootMargin: CENTER_BAND, threshold: 0 },
    );
    byElement.forEach((_, el) => observer.observe(el));
    return () => observer.disconnect();
  }, [orders]);

  return (
    <>
      <SiteHead title={`${spec.title} — 스크롤로 보는 흐름`} description={spec.desc} path="/flow/skb-search/" />

      <div
        lang="ko"
        className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100"
      >
        <header className="border-b border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/85">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              홈
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-8">
          <h1 className="break-keep text-2xl font-bold leading-snug md:text-3xl">{spec.title}</h1>
          <p className="mt-3 max-w-3xl break-keep text-sm leading-6 text-slate-600 dark:text-slate-300">
            {spec.desc}
          </p>

          <div className="mt-6 md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-8">
            {/* 모바일은 위쪽에 높이 40vh 의 창으로(흐름도는 폭 기준으로 그리고 단계에 맞춰 스크롤), 데스크톱은 왼쪽에 고정한다 */}
            <div
              ref={diagramBoxRef}
              className={
                "sticky top-0 z-10 h-[40vh] overflow-hidden border-b border-slate-200 bg-white/95 py-2 backdrop-blur " +
                "dark:border-slate-700 dark:bg-slate-950/95 " +
                "md:top-6 md:h-auto md:overflow-visible md:rounded-lg md:border md:p-3 " +
                "md:[&_svg]:max-h-[calc(100vh-6rem)] " +
                "motion-reduce:[&_.flow-edge]:transition-none motion-reduce:[&_.flow-node]:transition-none"
              }
            >
              <FlowDiagram spec={spec} activeOrder={activeOrder} />
            </div>

            <ol className="mt-4 list-none space-y-[45vh] p-0 pb-[45vh] pt-[20vh] md:mt-0 md:pt-[30vh]">
              {chapters.map((chapter, index) => {
                const active = chapter.order === activeOrder;
                return (
                  <li
                    key={chapter.order}
                    ref={(el) => {
                      if (el) sectionRefs.current.set(chapter.order, el);
                      else sectionRefs.current.delete(chapter.order);
                    }}
                    aria-current={active ? "step" : undefined}
                    className={
                      "rounded-lg border p-4 transition-colors motion-reduce:transition-none " +
                      (active
                        ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                        : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900")
                    }
                  >
                    <p className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                      {index + 1}/{chapters.length}
                    </p>
                    <h2 className="mt-1 break-keep text-base font-semibold leading-6 text-slate-900 dark:text-slate-50">
                      {chapter.title}
                    </h2>
                    <ul className="mt-2 list-none space-y-1 p-0">
                      {chapter.lines.map((line) => (
                        <li
                          key={line}
                          className="break-keep text-sm leading-5 text-slate-600 dark:text-slate-300"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </div>
        </main>
      </div>
    </>
  );
}
