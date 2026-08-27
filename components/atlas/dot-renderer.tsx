import { useMemo } from "react";
import {
  ATLAS_PALETTE,
  EDGE_WIDTH,
  NODE_RADIUS,
  layoutRadial,
  neighborsOf,
  paint,
  visibleEdges,
} from "@/lib/atlas/layout";
import type { AtlasGraph } from "@/lib/atlas/types";

/**
 * SVG 렌더러. 설계서 §7.5 의 Dot.
 *
 * **무엇을 그릴지는 여기서 정하지 않는다.** 좌표는 `layoutRadial`, 그릴 엣지는
 * `visibleEdges`, 강조 대상은 `neighborsOf`, 색은 `ATLAS_PALETTE` 가 정한다 — 전부
 * `lib/atlas/layout.ts` 의 순수 값이고 `tests/atlas/layout.test.ts` 가 잠근다.
 * 이 리포에는 jsdom 이 없어(`vitest.config.ts` 가 일부러 안 넣었다) `.tsx` 안에 든
 * 규칙에는 게이트를 못 걸기 때문이다.
 *
 * ⚠️ 액센트는 **선택된 것과 그 이웃**에만 쓴다(GC-9 — 액센트는 첫 화면 픽셀의 5% 이하).
 *    선택 전에는 `--signal` 이 화면에 한 번도 안 나온다.
 *
 *    다만 계획서가 든 근거는 **틀렸다.** 「162 개를 전부 amber 로 칠하면 상한을 몇 배로
 *    넘는다」고 적혀 있는데, 실측하면 점 전체가 뷰박스의 4.65% 로 **상한 아래다**
 *    (반지름 0.9 는 하나가 2.54 밖에 안 된다). **면적을 지배하는 것은 점이 아니라 선이다** —
 *    계획서 원안처럼 엣지 1,053 개를 강조 굵기로 그리면 그때 폭발한다.
 *    규칙을 지키는 진짜 이유는 면적이 아니라 의미다: 액센트가 어디에나 있으면
 *    아무것도 가리키지 못한다. `tests/atlas/layout.test.ts` 가 두 수치를 다 붙들고 있다.
 *
 * ⚠️ `@/lib/atlas/types` 에서 값을 가져오지 마라 — `zod` 가 브라우저 번들에 실린다.
 *    `import type` 이라야 트랜스파일러가 지운다(`isolatedModules: true`).
 *
 * ⚠️ **키보드·스크린리더 경로는 여기가 아니라 `<ListView />` 다.**
 *    처음에는 「`role="img"` 가 자식을 접근성 트리에서 지우니 계획서 원안의
 *    `role="button"` 원들은 어차피 안 읽힌다」고 적었는데 **그것은 거짓이다.**
 *    ARIA 의 Presentational Children 규칙에는 **포커스 가능한 자손 예외**가 있다(사양 근거).
 *    브라우저에서 실제로 잰 것은 **탭 순서**다 — 원안을 재현하면 포커스가 원들을 차례로
 *    지나간다. 함께 잰 `getByRole("button")` 5 vs 2 는 Playwright 가 주입 JS 로 자체
 *    계산한 값이지 브라우저 AX 트리가 아니다. 「AX 트리로 확인됐다」고 읽지 마라.
 *    실제 이유는 둘이다.
 *      ① 목록도 버튼이 글 수만큼 있다. SVG 에 정지점을 또 두면 **두 배**가 된다.
 *      ② 목록에는 토픽 제목과 섹션 구조가 있어 건너뛸 수 있지만, SVG 의 탭 순서는
 *         배치 순서일 뿐이라 162 개를 차례로 지나가는 것 말고 방법이 없다.
 *    ⇒ 상호작용 경로를 목록 하나로 모은다.
 *
 * ⚠️ **`/atlas` 는 이 컴포넌트와 `<ListView />` 를 함께 실어야 한다(T11).**
 *    설계서 §7.7 의 플로차트는 `prefers-reduced-motion` 으로 **둘 중 하나**를 고르게
 *    그려져 있다. 그대로 구현하면 no-preference 기기에서 페이지의 키보드 경로가
 *    **0 이 된다**(WCAG 2.1.1). 사양의 분기를 「그래프를 보일지 말지」로 읽고
 *    목록은 항상 두어야 한다.
 */
export function DotRenderer({
  graph,
  selected,
  onSelect,
}: {
  graph: AtlasGraph;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  // graph 는 getStaticProps 가 준 뒤 바뀌지 않는다. selected 가 바뀔 때마다
  // 162 노드의 삼각함수를 다시 돌 이유가 없다.
  const pos = useMemo(() => layoutRadial(graph), [graph]);
  const edges = useMemo(() => visibleEdges(graph, selected), [graph, selected]);
  const neighbors = useMemo(() => neighborsOf(graph, selected), [graph, selected]);

  const label =
    selected == null
      ? `지식 그래프 — 노드 ${graph.nodes.length}개, 연결 ${graph.edges.length}개. 토픽 연결선만 표시 중이다.`
      : `지식 그래프 — ${graph.nodes.find((n) => n.id === selected)?.title ?? selected} 선택됨, 이어진 글 ${neighbors.size}편.`;

  const edgePaint = selected == null ? ATLAS_PALETTE.edge : ATLAS_PALETTE.edgeLit;
  const edgeWidth = selected == null ? EDGE_WIDTH.resting : EDGE_WIDTH.lit;

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label={label}>
      <g>
        {edges.map((e) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.from}|${e.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={paint(edgePaint)}
              strokeWidth={edgeWidth}
              opacity={edgePaint.opacity}
            />
          );
        })}
      </g>
      <g>
        {graph.nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const isTopic = n.type === "concept";
          const isSel = n.id === selected;
          const lit = isSel || neighbors.has(n.id);

          const style = lit
            ? ATLAS_PALETTE.accent
            : isTopic
              ? ATLAS_PALETTE.topic
              : selected == null
                ? ATLAS_PALETTE.artifact
                : ATLAS_PALETTE.dimmed;

          return (
            <circle
              key={n.id}
              cx={p.x}
              cy={p.y}
              r={isTopic ? NODE_RADIUS.topic : isSel ? NODE_RADIUS.selected : NODE_RADIUS.artifact}
              fill={paint(style)}
              opacity={style.opacity}
              className="cursor-pointer"
              onClick={() => onSelect(n.id)}
            />
          );
        })}
      </g>
    </svg>
  );
}
