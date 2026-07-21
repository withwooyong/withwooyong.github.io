import { cn } from "@/lib/utils";
import type { FlowEdgeKind, FlowLane, FlowNode } from "./types";

export const EDGE_COLOR_VAR: Record<FlowEdgeKind, string> = {
  request: "var(--flow-request)",
  data: "var(--flow-data)",
  external: "var(--flow-external)",
  async: "var(--flow-async)",
};

const EDGE_KINDS: FlowEdgeKind[] = ["request", "data", "external", "async"];

export function markerId(idPrefix: string, kind: FlowEdgeKind): string {
  return `${idPrefix}-arrow-${kind}`;
}

/**
 * 엣지 종류별 화살촉 마커.
 * 같은 페이지에 같은 스펙의 인스턴스가 여러 개(카드 + 다이얼로그) 뜰 수 있으므로
 * 호출부에서 인스턴스별로 유일한 idPrefix를 넘겨야 한다
 */
export function ArrowMarkers({ idPrefix }: { idPrefix: string }) {
  return (
    <defs>
      {EDGE_KINDS.map((kind) => (
        <marker
          key={kind}
          id={markerId(idPrefix, kind)}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLOR_VAR[kind]} />
        </marker>
      ))}
    </defs>
  );
}

/** 계층 띠. 노드보다 먼저(뒤에) 그린다 */
export function LaneBand({ lane, width }: { lane: FlowLane; width: number }) {
  return (
    <g className="flow-lane-group" aria-hidden>
      <rect className="flow-lane" x={0} y={lane.y} width={width} height={lane.h} rx={8} />
      <text
        x={12}
        y={lane.y + 18}
        fontSize={12}
        fontWeight={600}
        fill="var(--flow-lane-fg)"
      >
        {lane.label}
      </text>
    </g>
  );
}

type NodeShapeProps = {
  node: FlowNode;
  dimmed: boolean;
  onHoverChange: (id: string | null) => void;
};

/**
 * 문자열의 대략적인 렌더 폭을 추정한다.
 * 한글/CJK 글자는 폭이 넓어 fontSize의 약 1.0배, 그 외(영문·숫자 등)는 약 0.55배로 어림한다.
 */
function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0;
  for (const ch of text) {
    const isCjk = /[ㄱ-ㆎ가-힣一-鿿]/.test(ch);
    width += (isCjk ? 1.0 : 0.55) * fontSize;
  }
  return width;
}

export function NodeShape({ node, dimmed, onHoverChange }: NodeShapeProps) {
  const fill = node.accent ? "var(--flow-accent-bg)" : "var(--flow-node-bg)";
  const stroke = node.accent ? "var(--flow-accent-border)" : "var(--flow-node-border)";
  const strokeWidth = node.accent ? 2 : 1.25;
  const cx = node.x + node.w / 2;
  const innerWidth = node.w - 12;

  const labelFontSize = 12;
  const labelFit =
    estimateTextWidth(node.label, labelFontSize) > innerWidth
      ? { textLength: innerWidth, lengthAdjust: "spacingAndGlyphs" as const }
      : {};

  const subFontSize = 10;
  const subFit =
    node.sub && estimateTextWidth(node.sub, subFontSize) > innerWidth
      ? { textLength: innerWidth, lengthAdjust: "spacingAndGlyphs" as const }
      : {};

  return (
    <g
      className={cn("flow-node", dimmed && "flow-dim")}
      onMouseEnter={() => onHoverChange(node.id)}
      onMouseLeave={() => onHoverChange(null)}
    >
      {renderShape(node, fill, stroke, strokeWidth)}
      <text
        x={cx}
        y={node.sub ? node.y + node.h / 2 - 2 : node.y + node.h / 2 + 4}
        textAnchor="middle"
        fontSize={labelFontSize}
        fontWeight={600}
        fill="var(--flow-node-fg)"
        pointerEvents="none"
        {...labelFit}
      >
        {node.label}
      </text>
      {node.sub ? (
        <text
          x={cx}
          y={node.y + node.h / 2 + 13}
          textAnchor="middle"
          fontSize={subFontSize}
          fill="var(--flow-node-sub)"
          pointerEvents="none"
          {...subFit}
        >
          {node.sub}
        </text>
      ) : null}
    </g>
  );
}

function renderShape(node: FlowNode, fill: string, stroke: string, strokeWidth: number) {
  const common = { fill, stroke, strokeWidth };

  if (node.shape === "circle") {
    return (
      <ellipse
        cx={node.x + node.w / 2}
        cy={node.y + node.h / 2}
        rx={node.w / 2}
        ry={node.h / 2}
        {...common}
      />
    );
  }

  if (node.shape === "cylinder") {
    const ry = 7;
    const { x, y, w, h } = node;
    return (
      <g>
        <path
          d={`M ${x} ${y + ry} L ${x} ${y + h - ry} A ${w / 2} ${ry} 0 0 0 ${x + w} ${y + h - ry} L ${x + w} ${y + ry} Z`}
          {...common}
        />
        <ellipse cx={x + w / 2} cy={y + ry} rx={w / 2} ry={ry} {...common} />
      </g>
    );
  }

  if (node.shape === "external") {
    // 외부 연동은 점선 테두리로 내부 시스템과 구분한다
    return <rect {...node2rect(node)} {...common} strokeDasharray="4 3" rx={8} />;
  }

  if (node.shape === "client") {
    // 사용자/단말은 모서리를 크게 굴려 시각적으로 구분한다
    return <rect {...node2rect(node)} {...common} rx={node.h / 2} />;
  }

  return <rect {...node2rect(node)} {...common} rx={6} />;
}

function node2rect(node: FlowNode) {
  return { x: node.x, y: node.y, width: node.w, height: node.h };
}

/** 엣지 종류 범례. SVG 밖 HTML로 렌더한다 */
export function FlowLegend({ items }: { items: Array<{ kind: FlowEdgeKind; label: string }> }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
      {items.map((item) => (
        <li key={item.kind} className="flex items-center gap-1.5">
          <svg width="20" height="8" aria-hidden>
            <line
              x1="0"
              y1="4"
              x2="20"
              y2="4"
              stroke={EDGE_COLOR_VAR[item.kind]}
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </svg>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
