import { cn } from "@/lib/utils";
import { useMemo, useState, type CSSProperties } from "react";
import { edgePath } from "./geometry";
import { ArrowMarkers, EDGE_COLOR_VAR, FlowLegend, LaneBand, NodeShape, markerId } from "./primitives";
import type { FlowSpec } from "./types";
import { useInView } from "./use-in-view";

export function FlowDiagram({ spec, className }: { spec: FlowSpec; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [hovered, setHovered] = useState<string | null>(null);

  const nodeById = useMemo(
    () => new Map(spec.nodes.map((node) => [node.id, node])),
    [spec.nodes],
  );

  const edges = useMemo(
    () =>
      spec.edges.flatMap((edge) => {
        const from = nodeById.get(edge.from);
        const to = nodeById.get(edge.to);
        // 검증기가 빌드 타임에 막지만 런타임 안전장치를 둔다
        if (!from || !to) return [];
        return [{ edge, d: edgePath(from, to, edge.waypoints) }];
      }),
    [spec.edges, nodeById],
  );

  const isEdgeActive = (from: string, to: string) =>
    hovered === null || from === hovered || to === hovered;

  return (
    <div
      ref={ref}
      data-flow-animate={inView ? "on" : "off"}
      className={cn("w-full", spec.minWidth ? "overflow-x-auto" : null, className)}
    >
      <svg
        viewBox={`0 0 ${spec.viewBox.w} ${spec.viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby={`${spec.id}-title ${spec.id}-desc`}
        className="h-auto w-full"
        style={spec.minWidth ? { minWidth: spec.minWidth } : undefined}
      >
        <title id={`${spec.id}-title`}>{spec.title}</title>
        <desc id={`${spec.id}-desc`}>{spec.desc}</desc>

        <ArrowMarkers specId={spec.id} />

        {spec.lanes?.map((lane) => (
          <LaneBand key={lane.id} lane={lane} width={spec.viewBox.w} />
        ))}

        {edges.map(({ edge, d }, index) => {
          const active = isEdgeActive(edge.from, edge.to);
          const color = EDGE_COLOR_VAR[edge.kind];
          const animated = edge.animated !== false;
          return (
            <g key={`${edge.from}-${edge.to}-${index}`} className={cn(!active && "flow-dim")}>
              <path className="flow-edge-hit" d={d} />
              <path
                className="flow-edge"
                d={d}
                stroke={color}
                markerEnd={`url(#${markerId(spec.id, edge.kind)})`}
                markerStart={
                  edge.bidirectional ? `url(#${markerId(spec.id, edge.kind)})` : undefined
                }
              />
              {animated ? (
                <circle
                  className="flow-packet"
                  fill={color}
                  style={{ "--flow-path": `path("${d}")` } as CSSProperties}
                />
              ) : null}
              {edge.label ? (
                <text
                  x={labelPoint(d).x}
                  y={labelPoint(d).y - 6}
                  textAnchor="middle"
                  fontSize={10}
                  fill={color}
                  pointerEvents="none"
                >
                  {edge.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {spec.nodes.map((node) => (
          <NodeShape
            key={node.id}
            node={node}
            dimmed={hovered !== null && !isNodeActive(node.id, hovered, spec)}
            onHoverChange={setHovered}
          />
        ))}
      </svg>

      {spec.legend ? <FlowLegend items={spec.legend} /> : null}
    </div>
  );
}

/** 호버된 노드 자신 + 직접 연결된 노드만 활성 */
function isNodeActive(nodeId: string, hovered: string, spec: FlowSpec): boolean {
  if (nodeId === hovered) return true;
  return spec.edges.some(
    (edge) =>
      (edge.from === hovered && edge.to === nodeId) ||
      (edge.to === hovered && edge.from === nodeId),
  );
}

/** path d 문자열의 좌표들 중 중간 지점. 엣지 라벨 위치용 */
function labelPoint(d: string): { x: number; y: number } {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push({ x: nums[i], y: nums[i + 1] });
  }
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const mid = Math.floor((points.length - 1) / 2);
  const a = points[mid];
  const b = points[mid + 1];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
