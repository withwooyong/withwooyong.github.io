import { startTickAnimation } from "@/lib/blog/graph-animation";
import { DEFAULT_LAYOUT_OPTIONS, layout } from "@/lib/blog/graph-layout";
import type { GraphNode, LocalGraph } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

/**
 * 위젯이 놓인 문맥. 제목과 캡션뿐 아니라 **중심 노드가 링크인지까지** 함께 결정한다.
 *
 * 🔴 문구만 바꾸는 인자로 두지 않는다. 본문에서 중심은 지금 보고 있는 편이라 링크가
 * 아니지만, 카테고리에서는 중심이 남의 편이므로 클릭할 수 있어야 한다. 둘을 따로 받으면
 * 「제목은 카테고리인데 중심은 죽은 점」 같은 조합이 조용히 생긴다.
 */
export type GraphVariant = "post" | "category";

const VARIANT_TEXT: Record<GraphVariant, { label: string; heading: string }> = {
  post: { label: "이 글과 이어진 글", heading: "이어진 글" },
  category: { label: "이 카테고리의 허브", heading: "이 카테고리의 허브" },
};

export function LocalGraphPanel({ graph, variant }: { graph: LocalGraph; variant: GraphVariant }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // 서버와 첫 렌더는 최종 배치를 그린다. 스크립트가 꺼져 있어도 그래프가 보여야 한다.
  const [ticks, setTicks] = useState(DEFAULT_LAYOUT_OPTIONS.ticks);

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

  // 🔴 진행 규칙 전체가 startTickAnimation 안에 있다. 여기에 「이미 시작했다」 같은 상태를
  // 다시 두면 StrictMode 의 2회차 마운트가 즉시 돌아가 초기 원형 배치에 갇힌다.
  useEffect(
    () =>
      startTickAnimation({
        totalTicks: DEFAULT_LAYOUT_OPTIONS.ticks,
        ticksPerFrame: TICKS_PER_FRAME,
        setTicks,
        host: {
          requestFrame: (cb) => window.requestAnimationFrame(cb),
          cancelFrame: (handle) => window.cancelAnimationFrame(handle),
          prefersReducedMotion: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        },
      }),
    []
  );

  const text = VARIANT_TEXT[variant];
  const centerPoint = at.get(graph.center.id);
  const centerStyle = { left: centerPoint?.x ?? WIDTH / 2, top: centerPoint?.y ?? HEIGHT / 2 };

  const active: GraphNode | null =
    activeId === graph.center.id
      ? graph.center
      : graph.neighbors.find((n) => n.id === activeId) ?? null;

  return (
    <section className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800" aria-label={text.label}>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {text.heading}
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

        {/*
          중심 편. 본문에서는 지금 보고 있는 글이라 링크가 아니지만, 카테고리에서는
          허브로 뽑힌 남의 편이므로 클릭해서 갈 수 있어야 한다 — 화면에서 가장 큰 점이
          아무 데도 가지 않으면 고장으로 읽힌다.
        */}
        {variant === "category" ? (
          <Link
            href={`/blog/${graph.center.categorySlug}/${graph.center.slug}/`}
            className={cn(
              "absolute z-10 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
              "ring-offset-2 ring-offset-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              "dark:ring-offset-slate-950",
              "bg-blue-600 hover:bg-blue-500 dark:bg-blue-400 dark:hover:bg-blue-300"
            )}
            style={centerStyle}
            onMouseEnter={() => setActiveId(graph.center.id)}
            onMouseLeave={() => setActiveId(null)}
            onFocus={() => setActiveId(graph.center.id)}
            onBlur={() => setActiveId(null)}
          >
            <span className="sr-only">{graph.center.title}</span>
          </Link>
        ) : (
          <span
            className="absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 dark:bg-blue-400"
            style={centerStyle}
            onMouseEnter={() => setActiveId(graph.center.id)}
            onMouseLeave={() => setActiveId(null)}
            aria-hidden
          />
        )}

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

        🔴 카테고리는 두 줄이 모자란다. 허브 제목만으로 leading-4 두 줄을 채우는 편이
        많아 뒤에 이어 붙인 이웃 수가 잘려 나갔다 — 실측으로 「외 12편 (+3)」이 통째로
        보이지 않았다. 제목과 요약을 다른 줄로 나누고 높이를 세 줄로 잡는다.
      */}
      <p
        className={cn(
          "mt-2 overflow-hidden text-xs leading-4 break-keep text-slate-500 dark:text-slate-400",
          variant === "category" ? "h-12" : "h-8"
        )}
      >
        {active ? (
          active.title
        ) : variant === "category" ? (
          <>
            <span className="block">{graph.center.title}</span>
            <span className="block text-slate-400 dark:text-slate-500">
              {graph.neighbors.length}편과 이어져 있다
              {graph.hiddenCount > 0 ? ` (+${graph.hiddenCount})` : ""}
            </span>
          </>
        ) : (
          <>
            {graph.neighbors.length}편과 이어져 있다
            {graph.hiddenCount > 0 ? ` (+${graph.hiddenCount})` : ""}
          </>
        )}
      </p>
    </section>
  );
}
