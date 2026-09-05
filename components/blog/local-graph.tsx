import { DEFAULT_LAYOUT_OPTIONS, layout } from "@/lib/blog/graph-layout";
import type { GraphNode, LocalGraph } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * 지역 그래프 위젯.
 *
 * 🔴 연결선만 SVG 로 그리고 **노드는 그 위에 절대 배치한 HTML 앵커**로 둔다.
 * SVG 안에서는 `next/link` 를 쓸 수 없어 클라이언트 라우팅이 끊기고, 한국어 라벨에
 * `break-keep` 이나 말줄임을 적용하기도 까다롭다.
 *
 * 라벨은 중심 편과 지금 가리키고 있는 노드만 보여 준다. 폭 224픽셀 안에 제목 12개를
 * 모두 쓰면 겹쳐서 읽을 수 없다 — Obsidian 의 실물도 그 상태였다.
 */

const { width: WIDTH, height: HEIGHT } = DEFAULT_LAYOUT_OPTIONS;

/** 마운트 애니메이션의 한 프레임이 나아가는 틱 수. 300틱을 약 50프레임에 나눈다 */
const TICKS_PER_FRAME = 6;

export function LocalGraphPanel({ graph }: { graph: LocalGraph }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // 서버와 첫 렌더는 최종 배치를 그린다. 스크립트가 꺼져 있어도 그래프가 보여야 한다.
  const [ticks, setTicks] = useState(DEFAULT_LAYOUT_OPTIONS.ticks);
  const started = useRef(false);

  const nodeIds = useMemo(
    () => [graph.center.id].concat(graph.neighbors.map((n) => n.id)),
    [graph]
  );

  const points = useMemo(
    () => layout({ centerId: graph.center.id, nodeIds, edges: graph.edges }, { ...DEFAULT_LAYOUT_OPTIONS, ticks }),
    [graph, nodeIds, ticks]
  );

  const at = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const point of points) map.set(point.id, { x: point.x, y: point.y });
    return map;
  }, [points]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // 움직임을 줄이도록 설정한 방문자에게는 애니메이션 없이 최종 배치를 남긴다.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let frame = 0;
    let raf = 0;
    const step = () => {
      frame += 1;
      const next = frame * TICKS_PER_FRAME;
      setTicks(Math.min(next, DEFAULT_LAYOUT_OPTIONS.ticks));
      if (next < DEFAULT_LAYOUT_OPTIONS.ticks) raf = window.requestAnimationFrame(step);
    };
    setTicks(0);
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const active: GraphNode | null =
    activeId === graph.center.id
      ? graph.center
      : graph.neighbors.find((n) => n.id === activeId) ?? null;

  return (
    <section className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800" aria-label="이 글과 이어진 글">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        이어진 글
      </p>

      <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
        <svg
          width={WIDTH}
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="absolute inset-0"
          aria-hidden
        >
          {graph.edges.map((edge) => {
            const from = at.get(edge.from);
            const to = at.get(edge.to);
            if (!from || !to) return null;
            const touched = activeId === edge.from || activeId === edge.to;
            return (
              <line
                key={`${edge.from}|${edge.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                strokeWidth={touched ? 1.4 : 0.8}
                className={cn(
                  "transition-colors",
                  touched
                    ? "stroke-blue-500 dark:stroke-blue-400"
                    : "stroke-slate-300 dark:stroke-slate-700"
                )}
              />
            );
          })}
        </svg>

        {/* 중심 편 — 링크가 아니다. 지금 보고 있는 글이기 때문이다 */}
        <span
          className="absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 dark:bg-blue-400"
          style={{ left: at.get(graph.center.id)?.x ?? WIDTH / 2, top: at.get(graph.center.id)?.y ?? HEIGHT / 2 }}
          onMouseEnter={() => setActiveId(graph.center.id)}
          onMouseLeave={() => setActiveId(null)}
          aria-hidden
        />

        {graph.neighbors.map((node) => {
          const point = at.get(node.id);
          if (!point) return null;
          const on = activeId === node.id;
          return (
            <Link
              key={node.id}
              href={`/blog/${node.categorySlug}/${node.slug}/`}
              className={cn(
                "absolute z-10 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                "ring-offset-2 ring-offset-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                "dark:ring-offset-slate-950",
                on
                  ? "bg-blue-500 dark:bg-blue-400"
                  : "bg-slate-400 hover:bg-blue-500 dark:bg-slate-600 dark:hover:bg-blue-400"
              )}
              style={{ left: point.x, top: point.y }}
              onMouseEnter={() => setActiveId(node.id)}
              onMouseLeave={() => setActiveId(null)}
              onFocus={() => setActiveId(node.id)}
              onBlur={() => setActiveId(null)}
            >
              <span className="sr-only">{node.title}</span>
            </Link>
          );
        })}
      </div>

      {/*
        캡션은 높이를 고정한다. 가리키는 노드에 따라 줄 수가 달라지면 사이드바 바닥이
        위아래로 흔들린다.
      */}
      <p className="mt-2 h-8 overflow-hidden text-xs leading-4 break-keep text-slate-500 dark:text-slate-400">
        {active ? active.title : `${graph.neighbors.length}편과 이어져 있다`}
        {!active && graph.hiddenCount > 0 ? ` (+${graph.hiddenCount})` : ""}
      </p>
    </section>
  );
}
