# 시스템 구성도 애니메이션 흐름도 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인 페이지 `#systems` 섹션의 정지 PNG 9장을, 데이터 흐름이 애니메이션되는 인라인 SVG 흐름도 10개로 교체하고 회사별로 재정렬한다.

**Architecture:** `FlowSpec`(노드·엣지·좌표를 담은 순수 데이터)을 단일 SVG 렌더러가 그린다. 자동 레이아웃 엔진은 쓰지 않고 좌표를 스펙에 직접 명시한다. 애니메이션은 CSS 단독(`stroke-dashoffset` + `offset-path`)으로 구현해 `prefers-reduced-motion`으로 한 번에 정지시킬 수 있게 한다. 스펙 무결성은 `data/diagrams/index.ts`의 빌드 타임 `assertFlowSpecs()`가 검증한다.

**Tech Stack:** Next.js 14 Pages Router, TypeScript, Tailwind CSS, shadcn/ui(`card`, `dialog`, `badge`, `button`), 인라인 SVG, CSS 애니메이션. **신규 npm 의존성 없음.**

## Global Constraints

- 정적 export 환경이다. `next.config.js`가 `output: "export"`이므로 Node 런타임 의존 코드(API 라우트, ISR, 서버 액션, `next/image` 로더)를 도입하면 빌드가 깨진다.
- Pages Router만 사용한다. `app/` 디렉터리 규약을 도입하지 않는다.
- 경로 별칭 `@/*`를 사용한다(`@/components/...`, `@/data/...`, `@/lib/utils`). 상대 경로 금지.
- 조건부 클래스 조합은 `@/lib/utils`의 `cn()`을 쓴다.
- 신규 UI 컴포넌트가 필요하면 `components/ui/`에 shadcn 규약으로 추가한다. **단 본 계획에서는 탭 UI를 버튼 2개 + `useState`로 구현해 신규 의존성을 만들지 않는다.**
- 모든 커밋 메시지는 한글로 작성한다.
- **`git push`는 사용자가 명시적으로 요청할 때만 실행한다.** 커밋과 푸시를 한 명령에 묶지 않는다.
- 회사 재직 기간은 아래 값을 단일 출처(`data/portfolio.ts`)로 관리한다. 문자열을 두 곳에 중복 정의하지 않는다.

  | 그룹 | 기간 |
  |---|---|
  | 야나두 | `2022.02 - 재직중` |
  | SK브로드밴드 | `2017.04 - 2021.06` |
  | CJ헬로비전 | `2012.06 - 2017.04` |
  | 쌍용정보통신 | `2005.11 - 2012.06` |

- 애니메이션은 반드시 `@media (prefers-reduced-motion: reduce)`에서 전면 정지해야 한다.
- 검증 명령은 `npm run build` 하나다. 성공 = `out/` 디렉터리 생성 + 에러 0.

---

## File Structure

**신규 생성**

| 파일 | 책임 |
|---|---|
| `components/flow-diagram/types.ts` | `FlowSpec` 및 하위 타입 정의. 다른 파일은 여기서만 타입을 가져온다 |
| `components/flow-diagram/geometry.ts` | 순수 함수. 노드 경계 앵커 계산, 엣지 `d` 문자열 생성 |
| `components/flow-diagram/validate.ts` | 순수 함수. 스펙 무결성 검사 + 실패 시 throw |
| `components/flow-diagram/use-in-view.ts` | IntersectionObserver 훅. 뷰포트 진입 여부 반환 |
| `components/flow-diagram/primitives.tsx` | `FlowNodeShape` 렌더, 화살표 마커 `<defs>`, 레인 띠, 범례 |
| `components/flow-diagram/flow-diagram.tsx` | 스펙 → SVG 렌더러. 호버 하이라이트 상태 보유 |
| `components/flow-diagram/index.ts` | 배럴 익스포트 |
| `data/diagrams/*.ts` | 다이어그램 1개당 스펙 1개 (총 10개) |
| `data/diagrams/index.ts` | 스펙 모음 + 빌드 타임 검증 실행 |

**수정**

| 파일 | 변경 |
|---|---|
| `styles/globals.css` | 흐름 애니메이션 키프레임 + 색 토큰 추가 |
| `data/portfolio.ts:29` | `systemDiagrams` → `diagramGroups` 구조로 교체, `Career.png` 항목 제거 |
| `components/system-diagram-card.tsx` | 이미지 카드 → 흐름도 카드 + `[흐름도]/[원본 자료]` 전환 |
| `pages/index.tsx:467-487` | 3열 그리드 → 회사별 그룹 세로 스택 |

**삭제하지 않음**: `public/images/*.png` 원본은 "원본 자료" 탭에서 계속 사용한다. 단 `Career.png`는 참조가 사라진다(파일은 남긴다 — 다른 페이지에서 쓰일 수 있으므로 Task 13에서 참조 여부를 확인 후 판단).

---

### Task 1: 타입 · 기하 · 검증 기반

**Files:**
- Create: `components/flow-diagram/types.ts`
- Create: `components/flow-diagram/geometry.ts`
- Create: `components/flow-diagram/validate.ts`

**Interfaces:**
- Consumes: 없음 (최초 태스크)
- Produces:
  - `FlowSpec`, `FlowNode`, `FlowEdge`, `FlowLane`, `FlowNodeShape`, `FlowEdgeKind`, `Point` 타입
  - `nodeCenter(node: FlowNode): Point`
  - `edgePath(from: FlowNode, to: FlowNode, waypoints?: Point[]): string`
  - `validateFlowSpec(spec: FlowSpec): string[]`
  - `assertFlowSpecs(specs: FlowSpec[]): void`

- [ ] **Step 1: 타입 정의 작성**

`components/flow-diagram/types.ts`:

```ts
export type Point = { x: number; y: number };

/** 노드 모양. client=사용자/단말, external=외부 연동사 */
export type FlowNodeShape = "box" | "cylinder" | "circle" | "client" | "external";

/** 엣지 종류. 색과 범례가 여기에 연동된다 */
export type FlowEdgeKind = "request" | "data" | "external" | "async";

export type FlowNode = {
  id: string;
  label: string;
  /** 보조 라벨(기술 스택 등). 2줄까지 렌더된다 */
  sub?: string;
  shape: FlowNodeShape;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 본인이 직접 설계·개발한 시스템 강조 */
  accent?: boolean;
};

export type FlowEdge = {
  from: string;
  to: string;
  kind: FlowEdgeKind;
  label?: string;
  /** 양방향이면 시작점에도 화살표를 붙인다 */
  bidirectional?: boolean;
  /** 꺾은선 경유점 */
  waypoints?: Point[];
  /** 이동 패킷 표시 여부. 기본 true */
  animated?: boolean;
};

export type FlowLane = {
  id: string;
  label: string;
  y: number;
  h: number;
};

export type FlowSpec = {
  id: string;
  /** SVG <title>. 스크린리더가 읽는다 */
  title: string;
  /** SVG <desc>. 다이어그램 전체 흐름을 한 문장으로 */
  desc: string;
  viewBox: { w: number; h: number };
  /** 모바일에서 가로 스크롤을 허용할 최소 픽셀 폭. 생략 시 스크롤 없음 */
  minWidth?: number;
  lanes?: FlowLane[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  legend?: Array<{ kind: FlowEdgeKind; label: string }>;
};
```

- [ ] **Step 2: 기하 계산 작성**

`components/flow-diagram/geometry.ts`:

```ts
import type { FlowNode, Point } from "./types";

/** 화살촉이 노드에 파고들지 않도록 띄우는 여백 */
const ANCHOR_GAP = 6;

export function nodeCenter(node: FlowNode): Point {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

/**
 * 노드 중심에서 toward 방향으로 나가는 반직선이 노드 경계(+여백)와 만나는 점.
 * 엣지가 노드 박스 안에서 시작/끝나지 않게 한다.
 */
function anchor(node: FlowNode, toward: Point): Point {
  const c = nodeCenter(node);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return c;

  const halfW = node.w / 2 + ANCHOR_GAP;
  const halfH = node.h / 2 + ANCHOR_GAP;
  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : halfW / Math.abs(dx);
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : halfH / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);

  return { x: c.x + dx * scale, y: c.y + dy * scale };
}

/** 엣지의 SVG path d 문자열. waypoints가 있으면 꺾은선이 된다 */
export function edgePath(from: FlowNode, to: FlowNode, waypoints: Point[] = []): string {
  const first = waypoints[0] ?? nodeCenter(to);
  const last = waypoints[waypoints.length - 1] ?? nodeCenter(from);
  const start = anchor(from, first);
  const end = anchor(to, last);

  const parts = [`M ${round(start.x)} ${round(start.y)}`];
  for (const p of waypoints) parts.push(`L ${round(p.x)} ${round(p.y)}`);
  parts.push(`L ${round(end.x)} ${round(end.y)}`);
  return parts.join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 3: 검증기 작성**

`components/flow-diagram/validate.ts`:

```ts
import type { FlowSpec } from "./types";

/** 스펙 1개의 문제를 사람이 읽을 수 있는 문자열 배열로 반환. 문제 없으면 빈 배열 */
export function validateFlowSpec(spec: FlowSpec): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  if (spec.nodes.length === 0) {
    errors.push(`[${spec.id}] 노드가 하나도 없습니다`);
  }

  for (const node of spec.nodes) {
    if (seen.has(node.id)) {
      errors.push(`[${spec.id}] 노드 id "${node.id}"가 중복되었습니다`);
    }
    seen.add(node.id);

    if (node.w <= 0 || node.h <= 0) {
      errors.push(`[${spec.id}] 노드 "${node.id}"의 크기가 0 이하입니다`);
    }
    if (
      node.x < 0 ||
      node.y < 0 ||
      node.x + node.w > spec.viewBox.w ||
      node.y + node.h > spec.viewBox.h
    ) {
      errors.push(
        `[${spec.id}] 노드 "${node.id}"가 viewBox(${spec.viewBox.w}x${spec.viewBox.h})를 벗어났습니다`,
      );
    }
  }

  for (const edge of spec.edges) {
    if (!seen.has(edge.from)) {
      errors.push(`[${spec.id}] 엣지 from "${edge.from}"에 해당하는 노드가 없습니다`);
    }
    if (!seen.has(edge.to)) {
      errors.push(`[${spec.id}] 엣지 to "${edge.to}"에 해당하는 노드가 없습니다`);
    }
    if (edge.from === edge.to) {
      errors.push(`[${spec.id}] 엣지 from과 to가 같습니다 ("${edge.from}")`);
    }
  }

  return errors;
}

/**
 * 스펙 전체를 검증하고 문제가 있으면 throw 한다.
 * data/diagrams/index.ts에서 모듈 로드 시점에 호출되므로
 * 문제가 있으면 `npm run build`가 실패한다.
 */
export function assertFlowSpecs(specs: FlowSpec[]): void {
  const errors = specs.flatMap(validateFlowSpec);
  if (errors.length > 0) {
    throw new Error(`잘못된 FlowSpec이 있습니다:\n${errors.join("\n")}`);
  }
}
```

- [ ] **Step 4: 타입 검사 통과 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 종료(exit 0). `data/diagrams/`가 아직 없으므로 이 단계에서는 신규 파일만 검사된다.

- [ ] **Step 5: 커밋**

```bash
git add components/flow-diagram/types.ts components/flow-diagram/geometry.ts components/flow-diagram/validate.ts
git commit -m "feat: 흐름도 타입·기하 계산·스펙 검증기 추가"
```

---

### Task 2: CSS 애니메이션 토큰

**Files:**
- Modify: `styles/globals.css` (파일 끝에 추가)

**Interfaces:**
- Consumes: 없음
- Produces: CSS 클래스 `.flow-edge`, `.flow-edge-hit`, `.flow-packet`, `.flow-node`, `.flow-lane`, `.flow-dim` / CSS 변수 `--flow-request`, `--flow-data`, `--flow-external`, `--flow-async`, `--flow-node-bg`, `--flow-node-border`, `--flow-node-fg`, `--flow-node-sub`, `--flow-accent-bg`, `--flow-accent-border`, `--flow-lane-bg`, `--flow-lane-fg`

- [ ] **Step 1: 색 토큰과 키프레임 추가**

`styles/globals.css` 맨 끝에 다음을 그대로 추가한다:

```css
/* ---------- 시스템 구성도 흐름 애니메이션 ---------- */

:root {
  --flow-request: #2563eb;   /* blue-600 */
  --flow-data: #059669;      /* emerald-600 */
  --flow-external: #d97706;  /* amber-600 */
  --flow-async: #7c3aed;     /* violet-600 */

  --flow-node-bg: #ffffff;
  --flow-node-border: #cbd5e1;   /* slate-300 */
  --flow-node-fg: #0f172a;       /* slate-900 */
  --flow-node-sub: #64748b;      /* slate-500 */
  --flow-accent-bg: #eff6ff;     /* blue-50 */
  --flow-accent-border: #3b82f6; /* blue-500 */
  --flow-lane-bg: #f1f5f9;       /* slate-100 */
  --flow-lane-fg: #475569;       /* slate-600 */
}

.dark {
  --flow-request: #60a5fa;   /* blue-400 */
  --flow-data: #34d399;      /* emerald-400 */
  --flow-external: #fbbf24;  /* amber-400 */
  --flow-async: #a78bfa;     /* violet-400 */

  --flow-node-bg: #1e293b;       /* slate-800 */
  --flow-node-border: #475569;   /* slate-600 */
  --flow-node-fg: #f1f5f9;       /* slate-100 */
  --flow-node-sub: #94a3b8;      /* slate-400 */
  --flow-accent-bg: #1e3a5f;
  --flow-accent-border: #60a5fa; /* blue-400 */
  --flow-lane-bg: #0f172a;       /* slate-900 */
  --flow-lane-fg: #94a3b8;       /* slate-400 */
}

.flow-edge {
  fill: none;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 6 10;
  transition: opacity 0.2s ease, stroke-width 0.2s ease;
}

/* 뷰포트에 들어온 다이어그램만 애니메이션한다 */
[data-flow-animate="on"] .flow-edge {
  animation: flow-dash 1.4s linear infinite;
}

@keyframes flow-dash {
  to {
    stroke-dashoffset: -16;
  }
}

/* 클릭/호버 판정을 넓히기 위한 투명 두꺼운 선 */
.flow-edge-hit {
  fill: none;
  stroke: transparent;
  stroke-width: 14;
}

.flow-packet {
  r: 3.5;
  offset-path: var(--flow-path);
  offset-distance: 0%;
  offset-rotate: 0deg;
  transition: opacity 0.2s ease;
}

[data-flow-animate="on"] .flow-packet {
  animation: flow-move 2.6s linear infinite;
}

@keyframes flow-move {
  from {
    offset-distance: 0%;
  }
  to {
    offset-distance: 100%;
  }
}

.flow-node {
  transition: opacity 0.2s ease;
}

/* 호버 시 관련 없는 요소를 흐리게 */
.flow-dim {
  opacity: 0.15;
}

.flow-lane {
  fill: var(--flow-lane-bg);
}

@media (prefers-reduced-motion: reduce) {
  [data-flow-animate="on"] .flow-edge,
  [data-flow-animate="on"] .flow-packet {
    animation: none;
  }
  .flow-edge {
    stroke-dasharray: none;
  }
  .flow-packet {
    display: none;
  }
}
```

- [ ] **Step 2: 다크모드 셀렉터가 실제와 일치하는지 확인**

Run: `grep -n "darkMode" tailwind.config.js`
Expected: `darkMode: ["class"]` 또는 `darkMode: "class"` 출력.

`class` 방식이 **아니라면** 위 CSS의 `.dark { ... }` 블록을 실제 사용 중인 셀렉터로 바꾼다. `grep -n "dark" styles/globals.css | head -20`으로 기존 파일이 쓰는 방식을 확인해 그대로 따른다.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공. CSS만 추가했으므로 기존 화면은 변하지 않는다.

- [ ] **Step 4: 커밋**

```bash
git add styles/globals.css
git commit -m "feat: 흐름도 색 토큰과 애니메이션 키프레임 추가"
```

---

### Task 3: 뷰포트 감지 훅

**Files:**
- Create: `components/flow-diagram/use-in-view.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `useInView<T extends HTMLElement>(): { ref: RefObject<T>; inView: boolean }`

- [ ] **Step 1: 기존 패턴 확인**

Run: `cat components/section-reveal.tsx`
Expected: IntersectionObserver 사용 패턴 확인. 옵션 값(`threshold`, `rootMargin`)과 SSR 가드 방식을 아래 구현과 맞춘다. 기존 파일이 다른 방식을 쓰면 **기존 방식을 따른다**.

- [ ] **Step 2: 훅 작성**

`components/flow-diagram/use-in-view.ts`:

```ts
import { useEffect, useRef, useState } from "react";

/**
 * 요소가 뷰포트에 들어와 있는지 반환한다.
 * 화면 밖 다이어그램의 CSS 애니메이션을 멈춰 CPU 사용을 줄이는 용도.
 * 한 번 보이면 계속 true로 두지 않고, 벗어나면 다시 false가 된다.
 */
export function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 정적 export + 구형 브라우저 안전장치: 미지원이면 항상 켬
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "120px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
```

- [ ] **Step 3: 타입 검사**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add components/flow-diagram/use-in-view.ts
git commit -m "feat: 다이어그램 뷰포트 감지 훅 추가"
```

---

### Task 4: SVG 프리미티브

**Files:**
- Create: `components/flow-diagram/primitives.tsx`

**Interfaces:**
- Consumes: `FlowNode`, `FlowLane`, `FlowEdgeKind` (Task 1)
- Produces:
  - `EDGE_COLOR_VAR: Record<FlowEdgeKind, string>` — kind → CSS 변수명
  - `ArrowMarkers({ specId }: { specId: string }): JSX.Element` — `<defs>` 내용
  - `markerId(specId: string, kind: FlowEdgeKind, reversed?: boolean): string`
  - `NodeShape({ node, dimmed, onHoverChange }): JSX.Element`
  - `LaneBand({ lane, width }): JSX.Element`
  - `FlowLegend({ items }): JSX.Element` — SVG가 아닌 HTML(`<ul>`) 반환

- [ ] **Step 1: 프리미티브 작성**

`components/flow-diagram/primitives.tsx`:

```tsx
import { cn } from "@/lib/utils";
import type { FlowEdgeKind, FlowLane, FlowNode } from "./types";

export const EDGE_COLOR_VAR: Record<FlowEdgeKind, string> = {
  request: "var(--flow-request)",
  data: "var(--flow-data)",
  external: "var(--flow-external)",
  async: "var(--flow-async)",
};

const EDGE_KINDS: FlowEdgeKind[] = ["request", "data", "external", "async"];

export function markerId(specId: string, kind: FlowEdgeKind, reversed = false): string {
  return `${specId}-arrow-${kind}${reversed ? "-rev" : ""}`;
}

/** 엣지 종류별 화살촉 마커. 같은 페이지에 여러 다이어그램이 있으므로 specId로 유일화한다 */
export function ArrowMarkers({ specId }: { specId: string }) {
  return (
    <defs>
      {EDGE_KINDS.map((kind) => (
        <marker
          key={kind}
          id={markerId(specId, kind)}
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

export function NodeShape({ node, dimmed, onHoverChange }: NodeShapeProps) {
  const fill = node.accent ? "var(--flow-accent-bg)" : "var(--flow-node-bg)";
  const stroke = node.accent ? "var(--flow-accent-border)" : "var(--flow-node-border)";
  const strokeWidth = node.accent ? 2 : 1.25;
  const cx = node.x + node.w / 2;

  return (
    <g
      className={cn("flow-node", dimmed && "flow-dim")}
      onMouseEnter={() => onHoverChange(node.id)}
      onMouseLeave={() => onHoverChange(null)}
      onFocus={() => onHoverChange(node.id)}
      onBlur={() => onHoverChange(null)}
      tabIndex={0}
      role="group"
      aria-label={node.sub ? `${node.label} (${node.sub})` : node.label}
    >
      {renderShape(node, fill, stroke, strokeWidth)}
      <text
        x={cx}
        y={node.sub ? node.y + node.h / 2 - 2 : node.y + node.h / 2 + 4}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill="var(--flow-node-fg)"
        pointerEvents="none"
      >
        {node.label}
      </text>
      {node.sub ? (
        <text
          x={cx}
          y={node.y + node.h / 2 + 13}
          textAnchor="middle"
          fontSize={10}
          fill="var(--flow-node-sub)"
          pointerEvents="none"
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
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add components/flow-diagram/primitives.tsx
git commit -m "feat: 흐름도 SVG 프리미티브(노드·마커·레인·범례) 추가"
```

---

### Task 5: 흐름도 렌더러

**Files:**
- Create: `components/flow-diagram/flow-diagram.tsx`
- Create: `components/flow-diagram/index.ts`

**Interfaces:**
- Consumes: Task 1의 타입/기하, Task 3의 `useInView`, Task 4의 프리미티브
- Produces: `FlowDiagram({ spec, className }: { spec: FlowSpec; className?: string }): JSX.Element`

- [ ] **Step 1: 렌더러 작성**

`components/flow-diagram/flow-diagram.tsx`:

```tsx
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
```

- [ ] **Step 2: 배럴 익스포트 작성**

`components/flow-diagram/index.ts`:

```ts
export { FlowDiagram } from "./flow-diagram";
export { validateFlowSpec, assertFlowSpecs } from "./validate";
export type {
  FlowEdge,
  FlowEdgeKind,
  FlowLane,
  FlowNode,
  FlowNodeShape,
  FlowSpec,
  Point,
} from "./types";
```

- [ ] **Step 3: 타입 검사**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add components/flow-diagram/flow-diagram.tsx components/flow-diagram/index.ts
git commit -m "feat: FlowSpec을 SVG로 렌더하는 흐름도 컴포넌트 추가"
```

---

### Task 6: 파일럿 스펙 — SKB 서비스 플로우 1

원본: `public/images/SKB_flow1.png` (로그 기반 추천 시스템 + 텍스트/음성 검색 서비스)

**Files:**
- Create: `data/diagrams/skb-flow-search.ts`
- Create: `data/diagrams/index.ts`

**Interfaces:**
- Consumes: `FlowSpec` 타입, `assertFlowSpecs` (Task 1)
- Produces:
  - `skbFlowSearchSpec: FlowSpec` (id: `"skb-flow-search"`)
  - `data/diagrams/index.ts`가 `flowSpecs: Record<string, FlowSpec>` 익스포트. 이후 태스크가 여기에 스펙을 추가한다.

**좌표 규칙(이후 모든 스펙에 공통 적용):**
- viewBox 폭 1200 기준. 높이는 내용에 맞춰 정한다.
- 표준 노드: `w: 130, h: 46`. 넓은 노드는 `w: 160`.
- 가로 간격(노드 좌변 기준): 170px. 세로 간격: 90px.
- 레인 라벨 공간으로 좌측 여백 16px, 상단 여백 12px을 남긴다.

- [ ] **Step 1: 스펙 작성**

`data/diagrams/skb-flow-search.ts`:

```ts
import type { FlowSpec } from "@/components/flow-diagram";

export const skbFlowSearchSpec: FlowSpec = {
  id: "skb-flow-search",
  title: "SK브로드밴드 로그 기반 추천·검색 서비스 흐름도",
  desc: "STB 로그가 API Gateway와 FileBeat, Logstash, Kafka를 거쳐 Elasticsearch에 적재되고, Python 분석을 지나 추천 API와 텍스트·음성 검색 서비스로 서빙되는 흐름입니다.",
  viewBox: { w: 1200, h: 620 },
  minWidth: 900,
  lanes: [
    { id: "collect", label: "데이터 수집 계층", y: 12, h: 150 },
    { id: "analyze", label: "데이터 분석 계층", y: 182, h: 150 },
    { id: "serve", label: "서비스 계층", y: 352, h: 150 },
    { id: "search", label: "검색 서비스 (텍스트 / 음성)", y: 522, h: 86 },
  ],
  nodes: [
    // 수집 계층
    { id: "log-src", label: "로그 연동", sub: "STB / 앱", shape: "client", x: 20, y: 78, w: 130, h: 46 },
    { id: "gw-collect", label: "API Gateway", shape: "box", x: 190, y: 78, w: 130, h: 46 },
    { id: "filebeat", label: "FileBeat", sub: "로그 적재", shape: "box", x: 360, y: 78, w: 130, h: 46 },
    { id: "logstash", label: "Logstash", sub: "Kafka Pub", shape: "box", x: 530, y: 78, w: 130, h: 46 },
    { id: "kafka", label: "Kafka Cluster", shape: "box", x: 700, y: 78, w: 130, h: 46 },
    { id: "kconnect", label: "Kafka Connect", sub: "Python Sub", shape: "box", x: 870, y: 78, w: 130, h: 46, accent: true },
    { id: "es-collect", label: "Elasticsearch", sub: "수집 서버", shape: "box", x: 1040, y: 78, w: 140, h: 46, accent: true },

    // 분석 계층
    { id: "analyzer", label: "Python / Sanic", sub: "STB별 로그 분석", shape: "box", x: 700, y: 248, w: 150, h: 46, accent: true },
    { id: "rdbms", label: "RDBMS", shape: "cylinder", x: 900, y: 240, w: 130, h: 62 },
    { id: "meta-ops", label: "추천 메타 운영", sub: "Spring Boot + Kibana", shape: "circle", x: 1050, y: 244, w: 140, h: 54, accent: true },

    // 서비스 계층
    { id: "rec-req", label: "추천 API 요청", shape: "client", x: 20, y: 418, w: 130, h: 46 },
    { id: "gw-serve", label: "API Gateway", shape: "box", x: 190, y: 418, w: 130, h: 46 },
    { id: "api-cache", label: "API 서버", sub: "Ehcache", shape: "box", x: 360, y: 418, w: 130, h: 46, accent: true },
    { id: "es-serve", label: "Elasticsearch", sub: "서비스 DB", shape: "box", x: 530, y: 418, w: 130, h: 46, accent: true },

    // 검색 서비스
    { id: "search-req", label: "검색 API 호출", shape: "client", x: 20, y: 552, w: 130, h: 46 },
    { id: "nugu", label: "NUGU", sub: "SKT 음성 인식", shape: "external", x: 190, y: 552, w: 130, h: 46 },
    { id: "search-api", label: "검색 API 서버", sub: "Ehcache", shape: "box", x: 360, y: 552, w: 130, h: 46, accent: true },
    { id: "es-search", label: "Elasticsearch", sub: "검색 서비스 DB", shape: "box", x: 530, y: 552, w: 140, h: 46, accent: true },
    { id: "search-ingest", label: "Python", sub: "검색 데이터 수집·저장", shape: "box", x: 710, y: 552, w: 160, h: 46, accent: true },
  ],
  edges: [
    { from: "log-src", to: "gw-collect", kind: "request" },
    { from: "gw-collect", to: "filebeat", kind: "data" },
    { from: "filebeat", to: "logstash", kind: "data" },
    { from: "logstash", to: "kafka", kind: "async", label: "pub" },
    { from: "kafka", to: "kconnect", kind: "async", label: "sub" },
    { from: "kconnect", to: "es-collect", kind: "data" },

    { from: "es-collect", to: "analyzer", kind: "data", waypoints: [{ x: 1110, y: 200 }, { x: 775, y: 200 }] },
    { from: "analyzer", to: "rdbms", kind: "data", bidirectional: true },
    { from: "meta-ops", to: "rdbms", kind: "data" },

    { from: "analyzer", to: "es-serve", kind: "data", waypoints: [{ x: 690, y: 340 }, { x: 600, y: 340 }] },
    { from: "es-serve", to: "api-cache", kind: "data" },
    { from: "api-cache", to: "gw-serve", kind: "data" },
    { from: "gw-serve", to: "rec-req", kind: "request" },

    { from: "search-req", to: "search-api", kind: "request", waypoints: [{ x: 170, y: 530 }, { x: 425, y: 530 }] },
    { from: "search-req", to: "nugu", kind: "external" },
    { from: "nugu", to: "search-api", kind: "external" },
    { from: "search-api", to: "es-search", kind: "data", bidirectional: true },
    { from: "search-ingest", to: "es-search", kind: "data" },
    { from: "rdbms", to: "search-ingest", kind: "data", waypoints: [{ x: 965, y: 500 }, { x: 790, y: 500 }] },
  ],
  legend: [
    { kind: "request", label: "사용자 요청" },
    { kind: "data", label: "내부 데이터" },
    { kind: "async", label: "비동기 · 스트리밍" },
    { kind: "external", label: "외부 연동" },
  ],
};
```

- [ ] **Step 2: 스펙 레지스트리 작성**

`data/diagrams/index.ts`:

```ts
import { assertFlowSpecs, type FlowSpec } from "@/components/flow-diagram";
import { skbFlowSearchSpec } from "./skb-flow-search";

const allSpecs: FlowSpec[] = [skbFlowSearchSpec];

// 모듈 로드 시점에 검증한다. 문제가 있으면 npm run build가 실패한다.
assertFlowSpecs(allSpecs);

export const flowSpecs: Record<string, FlowSpec> = Object.fromEntries(
  allSpecs.map((spec) => [spec.id, spec]),
);

export { skbFlowSearchSpec };
```

- [ ] **Step 3: 정상 빌드 확인**

> **실행 중 확인된 계획 결함(2026-07-21)**: 원래 이 위치에 "스펙을 일부러 부패시켜 빌드 실패를 확인" 단계가 있었으나, 이 시점에는 어떤 페이지도 `data/diagrams`를 import하지 않아 모듈이 번들에 포함되지 않고 `assertFlowSpecs()`가 실행되지 않는다. 부패시켜도 빌드가 성공한다.
> 따라서 **검증 게이트 확인은 Task 7(페이지 연결) 이후로 이동**했다. Task 7 Step 5를 참조.

- [ ] **Step 4: 정상 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 5: 커밋**

```bash
git add data/diagrams/skb-flow-search.ts data/diagrams/index.ts
git commit -m "feat: SKB 로그 기반 추천·검색 흐름도 스펙 추가"
```

---

### Task 7: 카드 컴포넌트 교체 + 파일럿 화면 노출

이 태스크가 끝나면 **사용자 검수 게이트**다. 승인 전에는 Task 8 이후로 진행하지 않는다.

**Files:**
- Modify: `components/system-diagram-card.tsx` (전체 재작성)
- Modify: `data/portfolio.ts` — `systemDiagrams` 배열을 `diagramGroups` 구조로 교체
- Modify: `pages/index.tsx:467-487` — 섹션 레이아웃 교체

**Interfaces:**
- Consumes: `FlowDiagram` (Task 5), `flowSpecs` (Task 6)
- Produces:
  - `data/portfolio.ts`가 `diagramGroups: DiagramGroup[]` 익스포트
  - `SystemDiagramCard({ item }: { item: DiagramItem })`

- [ ] **Step 1: 데이터 구조 교체**

`data/portfolio.ts`의 `systemDiagrams` 배열 전체(29행부터 배열 닫는 괄호까지)를 아래로 교체한다. `Career.png` 항목은 제거한다. 아직 스펙이 없는 항목은 이 태스크에서 **포함하지 않는다**(Task 8 이후에 하나씩 추가).

```ts
export type DiagramItem = {
  /** flowSpecs의 키와 동일해야 한다 */
  specId: string;
  title: string;
  /** 담당 업무 요약 2~3줄 */
  summary: string;
  /** 카드 배지 문구 */
  role: string;
  /** 원본 자료 PNG. 없으면 "원본 자료" 전환 버튼을 숨긴다 */
  originalSrc?: string;
  originalAlt?: string;
};

export type DiagramGroup = {
  id: string;
  company: string;
  period: string;
  items: DiagramItem[];
};

export const diagramGroups: DiagramGroup[] = [
  {
    id: "skb",
    company: "SK브로드밴드",
    period: "2017.04 - 2021.06",
    items: [
      {
        specId: "skb-flow-search",
        title: "로그 기반 추천 · 검색 서비스",
        role: "설계 · 개발 담당",
        summary:
          "STB 시청 로그를 Kafka 파이프라인으로 수집해 Elasticsearch에 적재하고, Python/Sanic 분석 결과를 추천 API로 서빙했습니다. 텍스트 검색과 NUGU 연동 음성 검색을 함께 개발했습니다.",
        originalSrc: "/images/SKB_flow1.png",
        originalAlt: "SKB 서비스 플로우 1 원본 자료",
      },
    ],
  },
];
```

`data/portfolio.ts` 상단의 `SystemDiagram` 타입 정의와, 더 이상 쓰이지 않는 `lucide-react` 아이콘 import(`Bot`, `Database`, `Code`, `Wrench`, `Award`, `Users` 중 `systemDiagrams`에서만 쓰이던 것)를 제거한다.

Run: `grep -n "systemDiagrams\|SystemDiagram" -r pages components data`
Expected: `pages/index.tsx`와 `components/system-diagram-card.tsx` 외에는 참조가 없어야 한다. 다른 참조가 나오면 그 파일도 함께 고친다.

- [ ] **Step 2: 카드 컴포넌트 재작성**

`components/system-diagram-card.tsx` 전체를 아래로 교체한다:

```tsx
import { FlowDiagram } from "@/components/flow-diagram";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { flowSpecs } from "@/data/diagrams";
import type { DiagramItem } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function SystemDiagramCard({ item }: { item: DiagramItem }) {
  const spec = flowSpecs[item.specId];
  const [tab, setTab] = useState<"flow" | "original">("flow");

  if (!spec) return null;

  return (
    <Card className="dark:border-slate-700">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-slate-900 dark:text-slate-100">{item.title}</CardTitle>
          <CardDescription className="mt-1">{item.summary}</CardDescription>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {item.role}
        </Badge>
      </CardHeader>
      <CardContent>
        <FlowDiagram spec={spec} />

        <div className="mt-4 flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setTab("flow")}>
                <Maximize2 className="mr-1.5 h-4 w-4" aria-hidden />
                크게 보기
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto p-4">
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription className="sr-only">
                닫기 버튼으로 돌아갈 수 있습니다.
              </DialogDescription>

              {item.originalSrc ? (
                <div
                  role="tablist"
                  aria-label="자료 종류"
                  className="mt-2 inline-flex rounded-md border border-slate-200 p-0.5 dark:border-slate-700"
                >
                  <TabButton active={tab === "flow"} onClick={() => setTab("flow")}>
                    흐름도
                  </TabButton>
                  <TabButton active={tab === "original"} onClick={() => setTab("original")}>
                    원본 자료
                  </TabButton>
                </div>
              ) : null}

              <div className="mt-4">
                {tab === "flow" || !item.originalSrc ? (
                  <FlowDiagram spec={spec} />
                ) : (
                  <Image
                    src={item.originalSrc}
                    alt={item.originalAlt ?? `${item.title} 원본 자료`}
                    width={1600}
                    height={1200}
                    className="mx-auto h-auto w-full rounded-md bg-white object-contain"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 3: 섹션 레이아웃 교체**

`pages/index.tsx`의 import에서 `systemDiagrams`를 `diagramGroups`로 바꾼다:

```tsx
import { navItems, skillCategories, diagramGroups, writingLinks } from "@/data/portfolio";
```

`pages/index.tsx:471-484`의 `<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">...</div>` 블록 전체를 아래로 교체한다:

```tsx
            <div className="space-y-16">
              {diagramGroups.map((group) => (
                <div key={group.id}>
                  <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-200 pb-3 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {group.company}
                    </h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {group.period}
                    </span>
                  </div>
                  <div className="space-y-8">
                    {group.items.map((item) => (
                      <SystemDiagramCard key={item.specId} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 성공. 실패하면 `systemDiagrams` 잔여 참조를 `grep -rn "systemDiagrams" pages components data`로 찾아 제거한다.

- [ ] **Step 5: 검증기가 실제로 빌드를 막는지 확인 (Task 6에서 이동)**

이 태스크에서 `pages/index.tsx` → `SystemDiagramCard` → `@/data/diagrams` 경로가 연결되었으므로, 이제 비로소 `assertFlowSpecs()`가 빌드 중 실행된다. 검증 게이트가 살아 있는지 반드시 확인한다.

`data/diagrams/skb-flow-search.ts`에서 마지막 엣지의 `to: "search-ingest"`를 일시적으로 `to: "search-ingest-오타"`로 바꾼다.

Run: `npm run build`
Expected: **빌드 실패**. 출력에 `[skb-flow-search] 엣지 to "search-ingest-오타"에 해당하는 노드가 없습니다` 포함.

**빌드가 성공하면 검증 게이트가 여전히 죽어 있는 것이다.** 그 경우 파일을 원상 복구하고 BLOCKED로 보고한다 — 남은 9개 스펙을 검증 없이 작성하면 안 된다.

확인 후 오타를 원래대로 되돌리고 `npm run build`가 다시 성공하는지 확인한다. **부패시킨 상태로 커밋하지 않는다.**

- [ ] **Step 6: 개발 서버로 육안 확인**

Run: `npm run dev`
브라우저에서 http://localhost:3000/#systems 확인 항목:

1. SKB 그룹 헤더와 카드 1장이 보인다
2. 엣지의 점선이 화살표 방향으로 흐른다
3. 노드에 마우스를 올리면 연결된 엣지만 남고 나머지가 흐려진다
4. 다크모드 토글 시 노드·선 색이 모두 읽힌다
5. 브라우저 폭을 375px로 줄이면 다이어그램이 가로 스크롤된다(페이지 본문은 가로 스크롤되지 않는다)
6. DevTools → Rendering → `prefers-reduced-motion: reduce` 적용 시 애니메이션이 멈추고 실선 화살표만 남는다

- [ ] **Step 7: 커밋**

```bash
git add data/portfolio.ts components/system-diagram-card.tsx pages/index.tsx
git commit -m "feat: 시스템 구성도 섹션을 회사별 흐름도 카드 구조로 교체"
```

- [ ] **Step 8: 사용자 검수 요청 (게이트)**

사용자에게 애니메이션 속도, 색 대비, 노드 밀도, 폰트 크기, 모바일 판독성, 호버 하이라이트 체감을 확인받는다. **승인 전에는 Task 8로 넘어가지 않는다.** 수정 요청이 있으면 이 태스크 안에서 반영하고 다시 확인받는다.

---

### Task 7B: 모바일 세로 재배치 (파일럿 검수 중 추가)

파일럿 검수에서 "모바일 가로 스크롤을 없애 달라"는 요청이 나왔다. 단순 축소는 12px 글자를 4px로 만들어 판독이 불가능하므로, 좁은 화면에서는 **레이아웃 자체를 세로로 바꾼다**.

함께 발견된 문제: 카드 헤더가 좁은 화면에서도 제목·설명 블록과 역할 배지를 좌우로 배치해, 설명 문구가 좁은 칼럼에 갇혀 과도하게 줄바꿈된다. 모바일에서는 세로로 쌓아야 한다.

**Files:**
- Create: `components/flow-diagram/stacked-layout.ts`
- Modify: `components/flow-diagram/flow-diagram.tsx`
- Modify: `components/flow-diagram/index.ts`
- Modify: `components/system-diagram-card.tsx` (헤더 반응형)

**Interfaces:**
- Consumes: `FlowSpec`, `FlowNode`, `FlowEdge`, `FlowLane` (Task 1)
- Produces: `toStackedSpec(spec: FlowSpec, width: number): FlowSpec`

**동작 규칙**

1. 노드 순서는 **엣지 방향 기준 위상 정렬**로 정한다. 파이프라인 다이어그램은 대부분 선형이므로, 위상 순서로 세우면 엣지 대부분이 인접 노드끼리 연결되어 선이 짧아진다. 사이클이 있으면 남은 노드를 원래 `(y, x)` 순서로 이어 붙인다.
2. 레인이 있으면 레인 순서를 우선하고, 레인 내부에서만 위상 정렬한다. 레인은 세로로 쌓고 각 레인 위에 라벨 띠를 둔다.
3. 노드는 1열로 배치한다. 폭은 `width - 32`, 높이는 `sub`가 있으면 52 아니면 44, 세로 간격은 26으로 한다.
4. 원본의 `waypoints`는 버린다. 대신 **인접하지 않은 노드를 잇는 엣지**는 노드 열 오른쪽(`x = 노드 우변 + 12`)으로 우회하는 경유점 2개를 자동 생성해 다른 노드를 관통하지 않게 한다.
5. `viewBox`는 `{ w: width, h: 계산된 총 높이 }`로 만들고 `minWidth`는 제거한다(가로 스크롤 금지).
6. `legend`, `title`, `desc`, 노드 `label`/`sub`/`accent`/`shape`, 엣지 `kind`/`label`/`bidirectional`은 원본을 그대로 보존한다.

**전환 조건**

`FlowDiagram`이 컨테이너 실제 폭을 측정해 **640px 미만이면** 세로 스펙을 사용한다. 서버 렌더 시에는 항상 원본(가로) 스펙을 쓰고, 마운트 후 측정 결과에 따라 교체한다 — 초기 렌더가 서버와 동일해야 하이드레이션이 깨지지 않는다.

확대 다이얼로그 안에서는 다이얼로그 자체가 넓으므로 같은 규칙이 자연스럽게 적용된다(좁으면 세로, 넓으면 가로).

- [ ] **Step 1: `toStackedSpec` 작성**
- [ ] **Step 2: `FlowDiagram`에 폭 측정과 스펙 교체 연결**
- [ ] **Step 3: 배럴 익스포트에 `toStackedSpec` 추가**
- [ ] **Step 4: `npx tsc --noEmit`, `npm run build` 통과 확인**
- [ ] **Step 5: 생성된 `out/index.html`에 원본(가로) 스펙이 프리렌더되었는지 확인** — 서버 렌더는 가로가 정답이다
- [ ] **Step 6: 커밋**
- [ ] **Step 7: 사용자 모바일 검수 (게이트)**

---

### Task 7C: 모바일 2열 접기로 재설계 (7B 검수 결과 반영)

7B의 1열 세로 배치는 가로 스크롤을 없앴지만 두 가지 문제가 드러났다.

1. **우회선 7개가 오른쪽 한 줄에 겹쳐** 어느 노드에서 어느 노드로 가는지 판독 불가
2. **전체 높이 1,552px** — 화면 3~4개 분량이라 전체 구조를 한눈에 볼 수 없음
3. 역방향(위로 향하는) 화살표가 세로 배치에서 직관에 반함

근본 원인은 1열 배치가 2차원 그래프를 1차원 리스트로 강제 변환해, 남는 가로 공간(약 200px)을 버리고 갈 곳 없는 연결선을 전부 가장자리로 밀어낸 것이다.

**해결: 좁은 화면에서도 2차원을 유지한다.** 계층 내부에서 노드를 2열로 배치하고 행 단위로 접는다.

**Files:**
- Modify: `components/flow-diagram/stacked-layout.ts`

**변경 규칙**

1. **열 수**: 컨테이너 폭이 340px 이상이면 2열, 미만이면 1열.
2. **노드 폭**: `(width - MARGIN_LEFT - MARGIN_RIGHT - COL_GAP * (cols - 1)) / cols`. `MARGIN_LEFT = 16`, `MARGIN_RIGHT = 28`(우회 통로 확보), `COL_GAP = 10`.
3. **배치 방향**: 계층 내 위상 정렬 순서대로 **항상 좌→우**로 채우고, 행이 차면 다음 행 왼쪽으로 내려간다. 지그재그(뱀 모양)로 방향을 바꾸지 않는다 — 읽기 방향이 흔들리면 오히려 혼란스럽다.
4. **인접 엣지**: 정렬 순서상 연속인 두 노드는 직선으로 잇는다(같은 행이면 가로, 행이 바뀌면 아래로).
5. **비인접 엣지**: 오른쪽 여백 통로로 우회하되 **엣지마다 x를 6px씩 어긋나게 배분(최대 4트랙)** 해 선이 겹치지 않게 한다. 트랙을 다 쓰면 순환한다.
6. `viewBox` 높이는 마지막 행 하단 + 여백으로 계산한다. `minWidth`는 계속 생략한다.
7. 나머지(위상 정렬, 레인 그룹, 순수성, 필드 보존)는 7B 규칙을 그대로 유지한다.

**목표 수치**: 현재 스펙(19노드/4계층) 기준 높이 1,552px → 약 900px 이하.

- [ ] **Step 1: 2열 배치 로직으로 교체**
- [ ] **Step 2: 우회선 트랙 분산 구현**
- [ ] **Step 3: `npx tsc --noEmit`, `npm run build` 통과 확인**
- [ ] **Step 4: 실제 스펙으로 배치 결과 수치 확인 (높이, 노드 수 보존, viewBox 포함 여부)**
- [ ] **Step 5: 커밋**
- [ ] **Step 6: 사용자 비교 검수 (게이트)**

**실행 결과 (2026-07-21 완료, 사용자 승인)**

검수 과정에서 세 가지가 추가로 드러나 함께 수정했다.

1. **인접 판정이 2열을 반영하지 못함** (`27b6651`) — `|순번차| === 1`만 인접으로 봐서, 바로 아래 칸(순번차 = `cols`)이 우회선으로 빠졌다. 단순히 `순번차 === cols`를 추가하면 안 된다: 앞선 레인의 노드 수가 홀수면 다음 레인의 열 정렬이 어긋나 **다른 열인데 순번차가 우연히 `cols`가 되는 경우**가 있다(`es-collect → analyzer`). 실제 `x` 좌표가 같은지까지 확인해야 한다. 결과: 우회 엣지 7 → 5개.
2. **전환 기준이 화면 폭이 아니라 컨테이너 폭에서 걸림** (`f380864`) — `컨테이너 폭 = 화면 폭 − 섹션 패딩(32) − 카드 패딩`이라 80px 차이가 났고, 360~393px 실기기가 전부 1열로 떨어져 430px에서만 2열이 보였다. 2열 임계값을 290으로 낮추고, 전환 기준을 고정 픽셀에서 `max(minWidth, viewBox.w × 0.7)` 비율 기준으로 바꿨다. 스펙마다 원본 폭이 다르므로 고정값은 다음 스펙에서 또 어긋난다. 모바일 카드 패딩도 24→16px로 줄여 16px을 되찾았다.
3. **여백 부족** (`1c6ce07`) — 계층 띠와 첫 노드 사이 여백 0px, 좌우 열 간격 10px(앵커 여백 6px×2를 빼면 실제 선 길이가 음수라 화살표가 점처럼 뭉갬). 띠 아래 여백 12px, 열 간격 26px, 행 간격 30px로 늘리고 노드 높이를 44/52 → 40/46으로 줄여 상쇄했다. 계층 띠가 우회 통로를 덮어 선과 겹치던 것도 `FlowLane.w`를 추가해 분리했다.

**최종 수치** (`skb-flow-search`, 19노드/19엣지 보존)

| 화면 폭 | 컨테이너 | 결과 | 노드 폭 | 높이 |
|---|---|---|---|---|
| 320 | 256 | 1열 | 212px | 1,570 |
| 360 / 375 / 393 / 430 | 296~366 | **2열** | 113~148px | 986 |
| 768 | 688 | 2열 | 309px | 986 |
| 1024 / 1280 | 944 / 1200 | 가로 유지 | — | 620 |

**추가 안전장치**: 빌드 타임 검증기는 원본(가로) 스펙만 검사한다. 모바일 재배치 결과는 클라이언트에서만 생성되므로 좌표가 viewBox를 벗어나도 빌드가 잡지 못한다. `FlowDiagram`에서 개발 모드에 한해 `validateFlowSpec(stacked)`를 실행해 콘솔 에러를 낸다(`27b6651`).

---

### Task 8: SKB 서비스 플로우 2 — 서빙 API · 영상 메타 · 이미지 플랫폼

원본: `public/images/SKB_flow2.png`

**Files:**
- Create: `data/diagrams/skb-flow-serving.ts`
- Modify: `data/diagrams/index.ts`
- Modify: `data/portfolio.ts` — `skb` 그룹 `items`에 항목 추가

**Interfaces:**
- Consumes: `FlowSpec` 타입, Task 6의 좌표 규칙
- Produces: `skbFlowServingSpec: FlowSpec` (id: `"skb-flow-serving"`)

- [ ] **Step 1: 스펙 작성**

`data/diagrams/skb-flow-serving.ts`를 만든다. `viewBox: { w: 1200, h: 600 }`, `minWidth: 900`, 레인 3개로 구성한다.

> **[실행 중 수정] viewBox는 600 → 700, 레인 높이는 200/216/200으로 확대했다.**
> 이 다이어그램은 트랙마다 2행(주 흐름 + RDBMS)이 필요한데, `LaneBand`가 레인 상단 30px을 라벨로 쓰고(`primitives.tsx:50`) 실린더 노드가 62px이라 계획서의 170px 레인에는 2행이 들어가지 않는다.
> 또한 `stacked-layout.ts:185`는 노드가 레인 y 범위에 **완전히 포함될 때만** 그 레인에 배정하므로, 레인을 넘치는 노드는 모바일에서 조용히 사라진다(빌드 검증기는 viewBox 이탈만 잡는다). 남은 스펙 작성 시에도 이 조건을 먼저 만족시킬 것.
> 레인 y 범위: serving 12~212, meta 232~448, image 468~668. 하단 684는 이미지 HUB 우회선 통로다.

**레인과 노드 (원본 자료 기준):**

| 레인 | 노드 (좌→우) |
|---|---|
| 서빙 API · CMS 운영 (`y: 12, h: 170`) | `메뉴 API 호출`(client) → `API Gateway` → `API 서버 / Ehcache`(accent) → `Elasticsearch or MongoDB`(accent) → `CMS 운영 / Spring Boot`(circle, accent) / 아래에 `RDBMS`(cylinder) |
| 영상물 메타 (`y: 202, h: 170`) | `API 호출`(client) → `API Gateway` → `API 서버 / Ehcache`(accent) → `Elasticsearch 서비스DB`(accent) → `CMS 운영`(circle) → `GPU (SKT)`(external) → `Contents HUB`(cylinder) / 아래에 `RDBMS`(cylinder), `영상물 추출메타 운영`(circle, accent) |
| 이미지 서빙 (`y: 392, h: 196`) | `이미지 API 호출`(client) → `DNS` → `Nginx + PHP-FPM / Nginx Cache`(accent) → `Elasticsearch 서비스DB`(accent) → `CMS 운영`(circle) → `이미지 HUB`(cylinder, accent) / 아래에 `RDBMS`(cylinder) |

**엣지:** 각 레인에서 클라이언트 → 게이트웨이 → 캐시 → 저장소는 `request`/`data`로 좌→우 연결하고, `CMS 운영 ↔ 저장소`는 `bidirectional: true`, `GPU (SKT)`와 `Contents HUB` 연결은 `external`, `RDBMS ← CMS 운영`은 `data`로 잇는다. 이미지 레인은 `이미지 HUB → Nginx`로 되돌아오는 `data` 엣지를 `waypoints`로 아래를 크게 돌아 연결한다.

노드 크기·간격은 Task 6의 좌표 규칙(표준 `w:130 h:46`, 가로 170px, 세로 90px)을 따른다.

> **[실행 중 발견] `bidirectional: true` 엣지의 `from`/`to` 방향은 데스크톱 렌더링에 영향이 없지만 모바일 순서를 바꾼다.**
> `toStackedSpec`이 `topoSortNodes`로 레인 내 순서를 정하기 때문에, 되돌아오는 엣지를 `from`으로 쓰면 그 노드가 진입 간선 없는 소스로 판정돼 레인 맨 앞으로 튀어나온다. 실제로 `meta-ops → gpu-skt`와 `hub-image → nginx`가 그랬고, 둘 다 방향을 뒤집어 해결했다. 남은 스펙에서도 **역방향·되돌아오는 엣지는 흐름 순서대로 from/to를 적을 것.**

- [ ] **Step 2: 레지스트리에 등록**

`data/diagrams/index.ts`를 수정한다:

```ts
import { skbFlowServingSpec } from "./skb-flow-serving";

const allSpecs: FlowSpec[] = [skbFlowSearchSpec, skbFlowServingSpec];
```

익스포트 목록에도 `skbFlowServingSpec`을 추가한다.

- [ ] **Step 3: 카드 데이터 추가**

`data/portfolio.ts`의 `skb` 그룹 `items` 배열 끝에 추가한다:

```ts
      {
        specId: "skb-flow-serving",
        title: "서빙 API · 영상물 메타 · 통합 이미지 플랫폼",
        role: "설계 · 개발 담당",
        summary:
          "NCMS 프로젝트 후속으로 서빙 API와 CMS 운영 시스템을 개발했습니다. SKT GPU 연동 영상물 딥메타 추출 서비스와 Nginx 캐시 기반 통합 이미지 서빙 플랫폼을 구축했습니다.",
        originalSrc: "/images/SKB_flow2.png",
        originalAlt: "SKB 서비스 플로우 2 원본 자료",
      },
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 성공. 검증 실패 메시지가 나오면 노드 id 오타나 viewBox 초과를 수정한다.

- [ ] **Step 5: 커밋**

```bash
git add data/diagrams/skb-flow-serving.ts data/diagrams/index.ts data/portfolio.ts
git commit -m "feat: SKB 서빙 API·영상 메타·이미지 플랫폼 흐름도 추가"
```

---

### Task 9: SKB 시스템 아키텍처

원본: `public/images/SKB_Arch.png` (원본에 화살표가 완비되어 있으므로 그대로 재현)

**Files:**
- Create: `data/diagrams/skb-architecture.ts`
- Modify: `data/diagrams/index.ts`
- Modify: `data/portfolio.ts`

**Interfaces:**
- Consumes: `FlowSpec` 타입
- Produces: `skbArchitectureSpec: FlowSpec` (id: `"skb-architecture"`)

- [ ] **Step 1: 스펙 작성**

`viewBox: { w: 1200, h: 780 }`, `minWidth: 1000`. 레인은 쓰지 않고 계층별 그룹을 노드 배치로 표현한다.

**노드:**

| id | label | sub | shape | accent |
|---|---|---|---|---|
| `client` | 사용자 | TV / OTT | client | |
| `gateway` | API Gateway | | box | ✓ |
| `image-layer` | Image Layer | NGINX Proxy + PHP | box | ✓ |
| `app-layer` | App Layer | Spring Boot + Beats | box | ✓ |
| `nosql` | NoSQL Layer | Elasticsearch · MongoDB · Redis | box | |
| `sql` | SQL Layer | Oracle · MariaDB | box | |
| `batch` | Batch Layer | Python · Airflow · RabbitMQ | box | |
| `search` | Search Layer | Spring Boot · Elasticsearch · Kibana | box | ✓ |
| `ai` | AI Layer | Deep Learning | box | |
| `admin` | Admin Layer | Spring Boot | box | |
| `mq` | MQ Layer | Kafka | box | |
| `elk` | Log System | Elasticsearch · Logstash · Kibana · Grafana | box | ✓ |
| `stats` | Statistics Layer | Spring Boot · Kibana | box | |

**엣지 (원본과 동일):**

| from → to | kind | label | 비고 |
|---|---|---|---|
| `client` → `gateway` | request | | bidirectional |
| `gateway` → `image-layer` | request | image serving | |
| `gateway` → `app-layer` | request | data serving | |
| `app-layer` → `nosql` | data | Cache miss | bidirectional |
| `nosql` → `sql` | data | sync | bidirectional |
| `nosql` → `batch` | async | | |
| `batch` → `search` | async | Collection | bidirectional |
| `batch` → `sql` | data | | |
| `search` → `ai` | data | Operation | bidirectional |
| `search` → `gateway` | data | search data serving (text, voice) | 상단을 크게 도는 `waypoints` |
| `sql` → `admin` | data | Operation | |
| `app-layer` → `mq` | async | pub | |
| `mq` → `elk` | async | sub | |
| `mq` → `stats` | async | sub | |

- [ ] **Step 2: 레지스트리 등록 및 카드 데이터 추가**

`data/diagrams/index.ts`의 `allSpecs`에 `skbArchitectureSpec`을 추가하고, `data/portfolio.ts`의 `skb` 그룹 `items` **맨 앞**에 추가한다(아키텍처 → 플로우 순서가 읽기 좋다):

```ts
      {
        specId: "skb-architecture",
        title: "SK Broadband 시스템 아키텍처",
        role: "설계 · 개발 담당",
        summary:
          "재직 당시 담당했던 서비스들의 전체 시스템 구조입니다. API Gateway를 중심으로 이미지·앱·검색·배치 계층이 나뉘고, Kafka를 통해 로그와 통계가 비동기로 흐릅니다.",
        originalSrc: "/images/SKB_Arch.png",
        originalAlt: "SKB 시스템 아키텍처 원본 자료",
      },
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 4: 커밋**

```bash
git add data/diagrams/skb-architecture.ts data/diagrams/index.ts data/portfolio.ts
git commit -m "feat: SKB 시스템 아키텍처 흐름도 추가"
```

---

### Task 10: B tv N-Screen 서비스

원본: `public/images/BTV.png`

**Files:**
- Create: `data/diagrams/skb-btv.ts`
- Modify: `data/diagrams/index.ts`
- Modify: `data/portfolio.ts`

**Interfaces:**
- Consumes: `FlowSpec` 타입
- Produces: `skbBtvSpec: FlowSpec` (id: `"skb-btv"`)

- [ ] **Step 1: 스펙 작성**

`viewBox: { w: 1200, h: 520 }`, `minWidth: 900`. 원본은 화면 캡처 + 번호 주석이므로, **담당 업무 5가지를 클라이언트에서 뻗어나가는 구조**로 재구성한다.

**노드:**

| id | label | sub | shape | accent |
|---|---|---|---|---|
| `stb` | B tv STB | 1,000만 User 기준 | client | |
| `mobile` | Mobile B tv | | client | |
| `gateway` | API Gateway | | box | ✓ |
| `nav-search` | NaviLog 검색·추천 | 텍스트 / 음성 | box | ✓ |
| `stats-api` | 검색 로그 기반 추천·통계 서빙 API | 급상승검색 · 영화 · 방송 · 애니 | box | ✓ |
| `es-search` | Elasticsearch 콘텐츠 검색 | | box | ✓ |
| `nugu` | NUGU 음성 AI | SKT 연동 | external | |
| `image-platform` | 통합 이미지 플랫폼 | 이미지·콘텐츠 서빙 API | box | ✓ |
| `deepmeta` | 영상 딥메타 추출 | 서빙 API | box | ✓ |
| `elk` | 수집·분석·적재 | Kafka · Python · Sanic · ELK | box | ✓ |

**엣지:** `stb`/`mobile` → `gateway` (request, bidirectional) → `nav-search`, `image-platform`, `deepmeta` (request) / `nav-search` → `stats-api` → `es-search` (data) / `nugu` → `nav-search` (external, bidirectional) / `es-search` → `elk` (async, bidirectional).

- [ ] **Step 2: 레지스트리 등록 및 카드 데이터 추가**

`data/portfolio.ts`의 `skb` 그룹 `items` 맨 앞에 추가한다(B tv → 아키텍처 → 플로우 순):

```ts
      {
        specId: "skb-btv",
        title: "B tv N-Screen 서비스",
        role: "설계 · 개발 담당",
        summary:
          "STB 1,000만 User 기준으로 설계·개발한 B tv N-Screen 서비스입니다. NaviLog 기반 텍스트·음성 검색 추천, 통합 이미지 플랫폼, NUGU 음성 AI 연계, 영상 인식 시스템을 담당했습니다.",
        originalSrc: "/images/BTV.png",
        originalAlt: "B tv N-Screen 서비스 원본 자료",
      },
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 4: 커밋**

```bash
git add data/diagrams/skb-btv.ts data/diagrams/index.ts data/portfolio.ts
git commit -m "feat: B tv N-Screen 서비스 흐름도 추가"
```

---

### Task 11: 야나두 AI 서비스 (신규 제작)

원본 없음. 근거: https://www.yanadoo.co.kr/AIYanadoo 렌더링 내용 + `public/images/yanadoo_all.png`의 AI 백엔드 구성.

**Files:**
- Create: `data/diagrams/yanadoo-ai.ts`
- Modify: `data/diagrams/index.ts`
- Modify: `data/portfolio.ts` — `yanadoo` 그룹 신규 생성 후 **`diagramGroups` 배열 맨 앞에 배치**

**Interfaces:**
- Consumes: `FlowSpec` 타입
- Produces: `yanadooAiSpec: FlowSpec` (id: `"yanadoo-ai"`)

- [ ] **Step 1: 스펙 작성**

`viewBox: { w: 1200, h: 520 }`, `minWidth: 900`. 레인 2개.

**레인 1 — 학습 여정 (`y: 12, h: 230`)**

| id | label | sub | shape |
|---|---|---|---|
| `learner` | 학습자 | | client |
| `step1-test` | 60초 단어 테스트 | Step 1 | box |
| `step1-curriculum` | AI 커리큘럼 | Step 1 | box |
| `step2-nadu` | AI 나두 | Step 2 · 학습 루틴 | box |
| `step2-sreure` | AI 스르르 학습지 | Step 2 · 학습 루틴 | box |
| `step3-tutor` | AI 튜터 | Step 3 · 100단어 회화 | box |
| `step3-travel` | AI 여행영어 | Step 3 | box |
| `step3-talk` | AI 원어민톡 | Step 3 | box |

엣지: `learner` → `step1-test` → `step1-curriculum` → `step2-nadu` → `step2-sreure` → `step3-tutor` → `step3-travel` → `step3-talk` 를 `request`로 순차 연결한다. `step1-curriculum` → `step2-nadu` 구간에 label `"어휘 100 → 3,000"`을 붙인다.

**레인 2 — 실시간 AI 왕복 루프 (`y: 262, h: 246`)**

| id | label | sub | shape | accent |
|---|---|---|---|---|
| `mic` | 학습자 발화 | 마이크 입력 | client | |
| `stt` | Google Cloud Speech API | STT | external | |
| `ai-server` | AI 서버 | 채팅 · 음성 · 화상 · 학습 · 고객센터 | box | ✓ |
| `llm` | OpenAI | 대화 생성 | external | |
| `sreure-api` | AI 스르르 Table API 서버 | 학습 데이터 | box | ✓ |
| `tts` | TTS | 음성 합성 | box | |
| `avatar` | klleon 딥휴먼 | AI 아바타 렌더 | external | |
| `screen` | 학습 화면 | 앱 · 웹 | client | |

엣지(왕복 루프): `mic` → `stt` → `ai-server` → `llm` → `ai-server`(응답) → `tts` → `avatar` → `screen` → `mic`. `mic`↔`stt`↔`ai-server` 구간은 `request`, `llm`·`avatar`·`stt`는 `external`, `ai-server` ↔ `sreure-api`는 `data` + `bidirectional`. `screen` → `mic` 되돌아오는 엣지는 `waypoints`로 아래를 돌아 잇고 label `"실시간 회화 루프"`를 붙인다.

레인 1과 레인 2를 잇는 엣지: `step3-tutor` → `mic` (`data`, label `"실시간 회화"`).

- [ ] **Step 2: 야나두 그룹 신설**

`data/portfolio.ts`의 `diagramGroups` 배열 **맨 앞**에 추가한다:

```ts
  {
    id: "yanadoo",
    company: "(주)야나두 a kakao company",
    period: "2022.02 - 재직중",
    items: [
      {
        specId: "yanadoo-ai",
        title: "야나두 AI 서비스",
        role: "설계 · 개발 담당",
        summary:
          "학습자가 아는 100단어로 시작해 3,000단어까지 확장하는 AI 영어 학습 서비스입니다. 60초 단어 테스트와 AI 커리큘럼으로 시작해 AI 튜터·여행영어·원어민톡의 실시간 회화까지 이어집니다.",
      },
    ],
  },
```

`originalSrc`를 지정하지 않으므로 확대 보기에서 탭 UI가 나타나지 않는다. 기존 `ai.png`(GNB 캡처)는 참조하지 않는다.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 4: 커밋**

```bash
git add data/diagrams/yanadoo-ai.ts data/diagrams/index.ts data/portfolio.ts
git commit -m "feat: 야나두 AI 서비스 흐름도 신규 추가"
```

---

### Task 12: 야나두 전체 시스템 (연결선 신규 작성)

원본: `public/images/yanadoo_all.png` — 박스만 있고 연결선이 없으므로 흐름을 새로 정의한다.

**Files:**
- Create: `data/diagrams/yanadoo-platform.ts`
- Modify: `data/diagrams/index.ts`
- Modify: `data/portfolio.ts`

**Interfaces:**
- Consumes: `FlowSpec` 타입
- Produces: `yanadooPlatformSpec: FlowSpec` (id: `"yanadoo-platform"`)

- [ ] **Step 1: 스펙 작성**

`viewBox: { w: 1400, h: 700 }`, `minWidth: 1100`. 원본의 4계층을 레인으로 표현한다.

**레인**

| id | label | y | h |
|---|---|---|---|
| `front` | FRONT | 12 | 200 |
| `api` | API | 232 | 200 |
| `fb` | FRONT + BACKEND | 452 | 110 |
| `infra` | BACKEND + INFRA | 582 | 106 |

**FRONT 레인 노드**

`user`(client, 사용자), `nginx`(box, NGINX), `front-web`(box, 야나두 프론트 / React — 영어·클래스), `front-yapit`(box, 야핏 프론트 / Spring + Thymeleaf), `front-b2b`(box, B2B 프론트 / Vue.js), `app`(box, 야나두 앱 / UniWebView — 영어·클래스·B2B, accent), `channeltalk`(external, 채널톡)

**API 레인 노드**

`api-core`(box, 야나두 API / 상품·주문·결제·학습·몰인몰, accent), `api-member`(box, 회원 서버 / Spring Boot, accent), `api-push`(box, 알림 Push 서버, accent), `api-batch`(box, 배치 서버 / Spring Scheduled), `api-b2b`(box, B2B API 서버), `api-word`(box, 틈새단어 API 서버), `api-ai`(box, AI 서버 / 채팅·음성·화상, accent), `api-relay`(box, Relay 서버 / Jira·Confluence·Jandi 연동)

**FRONT+BACKEND 레인 노드**

`admin`(box, 야나두 어드민 / 영어·클래스·사이클, accent), `admin-b2b`(box, B2B 어드민 / Vue.js + Touch)

**BACKEND+INFRA 레인 노드**

`rds`(cylinder, Amazon RDS · Redis), `opensearch`(cylinder, OpenSearch 로그 서버), `cdn`(box, AWS CloudFront CDN), `video`(external, Catenoid 비디오 서버), `pay`(external, 토스페이먼츠 결제), `b2b-ext`(external, 비즈마켓 · LG U+ 외부 연동), `ads`(external, GTM · Firebase · GA · Meta 광고)

**엣지 규칙**

- `user` → `nginx` → `front-web`/`front-yapit`/`front-b2b` : `request`
- `app` → `nginx` : `request`
- 각 프론트 → `api-core` : `request`
- `api-core` ↔ `api-member`, `api-core` → `api-push`, `api-core` ↔ `api-word`, `api-core` ↔ `api-ai` : `data`
- `api-batch` → `api-core` : `async`
- `admin` → `api-core` : `data`, `admin-b2b` → `api-b2b` : `data`
- `api-core` → `rds` : `data` (bidirectional), `api-core` → `opensearch` : `async` (label `"로그"`)
- `api-core` → `pay`, `api-core` → `video`, `api-b2b` → `b2b-ext`, `front-web` → `ads`, `front-web` → `channeltalk` : `external`
- `cdn` → `front-web` : `data` (label `"정적 자산"`)

노드가 많으므로 겹치지 않게 배치하고, 겹치면 `viewBox.h`를 늘린다. 검증기가 viewBox 이탈을 잡아준다.

- [ ] **Step 2: 카드 데이터 추가**

`data/portfolio.ts`의 `yanadoo` 그룹 `items`에 추가한다:

```ts
      {
        specId: "yanadoo-platform",
        title: "야나두 전체 시스템",
        role: "커머스개발실장 · 총괄",
        summary:
          "교육과 커머스를 아우르는 야나두 전체 플랫폼입니다. FRONT / API / FRONT+BACKEND / BACKEND+INFRA 4계층으로 나뉘며, 결제·영상·B2B·광고 외부 연동을 포함합니다.",
        originalSrc: "/images/yanadoo_all.png",
        originalAlt: "야나두 전체 시스템 원본 자료",
      },
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 4: 커밋**

```bash
git add data/diagrams/yanadoo-platform.ts data/diagrams/index.ts data/portfolio.ts
git commit -m "feat: 야나두 전체 시스템 흐름도 추가(연결선 신규 작성)"
```

---

### Task 13: 야나두 앱

원본: `public/images/yanadoo_app.png`

**Files:**
- Create: `data/diagrams/yanadoo-app.ts`
- Modify: `data/diagrams/index.ts`
- Modify: `data/portfolio.ts`

**Interfaces:**
- Consumes: `FlowSpec` 타입
- Produces: `yanadooAppSpec: FlowSpec` (id: `"yanadoo-app"`)

- [ ] **Step 1: 원본 확인 후 스펙 작성**

먼저 `public/images/yanadoo_app.png`를 열어 실제 화면 구성을 확인한다. 그 뒤 `viewBox: { w: 1200, h: 420 }`으로 작성한다.

**노드:** `ios`(client, iOS), `android`(client, Android), `shell`(box, 야나두 앱 셸 / UniWebView 하이브리드, accent), `web-english`(box, 영어 학습 WebView), `web-class`(box, 클래스 WebView), `web-b2b`(box, B2B WebView), `word`(box, 틈새단어), `sreure`(box, 스르르 학습지), `realtalk`(box, AI 리얼톡 / klleon, accent), `push`(box, Push 알림 서버, accent), `api-core`(box, 야나두 API, accent)

**엣지:** `ios`/`android` → `shell` (`request`) → 각 WebView·기능 (`request`) → `api-core` (`data`). `push` → `shell` (`async`, label `"푸시"`). `realtalk` → `api-core` (`data`).

- [ ] **Step 2: 카드 데이터 추가**

`yanadoo` 그룹 `items` 끝(AI·전체 시스템 다음)에 추가한다:

```ts
      {
        specId: "yanadoo-app",
        title: "야나두 앱",
        role: "설계 · 개발 담당",
        summary:
          "UniWebView 기반 하이브리드 앱으로 영어·클래스·B2B 학습을 하나의 셸에서 제공합니다. 틈새단어, 스르르 학습지, AI 리얼톡 등 개별 학습 기능이 앱 안에서 연결됩니다.",
        originalSrc: "/images/yanadoo_app.png",
        originalAlt: "야나두 앱 원본 자료",
      },
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 4: 커밋**

```bash
git add data/diagrams/yanadoo-app.ts data/diagrams/index.ts data/portfolio.ts
git commit -m "feat: 야나두 앱 흐름도 추가"
```

---

### Task 14: TVING N-Screen 서비스 (신규 제작)

원본 `public/images/TVING.png`는 웹/앱 화면 캡처만 있으므로 담당 업무 기준으로 새로 구성한다.

**Files:**
- Create: `data/diagrams/tving-nscreen.ts`
- Modify: `data/diagrams/index.ts`
- Modify: `data/portfolio.ts` — `cjhv` 그룹 신설 (배열에서 `skb` 다음)

**Interfaces:**
- Consumes: `FlowSpec` 타입
- Produces: `tvingNscreenSpec: FlowSpec` (id: `"tving-nscreen"`)

- [ ] **Step 1: 스펙 작성**

`viewBox: { w: 1200, h: 520 }`, `minWidth: 900`.

**노드:**

| id | label | sub | shape | accent |
|---|---|---|---|---|
| `web` | TVING 웹 | | client | |
| `app` | TVING 앱 | N-Screen | client | |
| `unified-api` | 통합 API | | box | ✓ |
| `cms` | CMS | 설계 · 개발 | box | ✓ |
| `search` | 검색 시스템 연동 | 검색 API · 화면 | box | ✓ |
| `epg` | 실시간 EPG 연동 | 채널 편성 | box | ✓ |
| `image-server` | 이미지 서버 | | box | ✓ |
| `db` | 콘텐츠 DB | | cylinder | |
| `broadcaster` | 방송사 편성 데이터 | 외부 수신 | external | |

**엣지:** `web`/`app` → `unified-api` (`request`, bidirectional) → `cms`, `search`, `epg`, `image-server` (`data`) / `cms` ↔ `db` (`data`, bidirectional) / `broadcaster` → `epg` (`external`, label `"실시간 편성"`) / `epg` → `db` (`data`) / `image-server` → `db` (`data`).

- [ ] **Step 2: CJ헬로비전 그룹 신설**

`data/portfolio.ts`의 `diagramGroups`에서 `skb` 그룹 **다음** 위치에 추가한다:

```ts
  {
    id: "cjhv",
    company: "CJ헬로비전",
    period: "2012.06 - 2017.04",
    items: [
      {
        specId: "tving-nscreen",
        title: "TVING N-Screen Service",
        role: "설계 · 개발 담당",
        summary:
          "TVING N-Screen 서비스의 CMS를 설계·개발하고 통합 API를 구축했습니다. 검색 시스템 연동 API와 화면, 실시간 EPG(채널 편성) 연동, 이미지 서버를 담당했습니다.",
        originalSrc: "/images/TVING.png",
        originalAlt: "TVING N-Screen 서비스 화면",
      },
    ],
  },
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 4: 커밋**

```bash
git add data/diagrams/tving-nscreen.ts data/diagrams/index.ts data/portfolio.ts
git commit -m "feat: TVING N-Screen 서비스 흐름도 신규 추가"
```

---

### Task 15: 쌍용정보통신 — KT IPTV A-MOC · 통합보안관제 NMS (신규 제작, 검수 필수)

원본 없음. **구술 기억 기반이므로 개념 수준으로만 그리고, 배포 전 사용자 검수를 반드시 거친다.**

**Files:**
- Create: `data/diagrams/ssangyong-amoc.ts`
- Create: `data/diagrams/ssangyong-nms.ts`
- Modify: `data/diagrams/index.ts`
- Modify: `data/portfolio.ts` — `ssangyong` 그룹 신설 (배열 맨 뒤)

**Interfaces:**
- Consumes: `FlowSpec` 타입
- Produces: `ssangyongAmocSpec`(id: `"ssangyong-amoc"`), `ssangyongNmsSpec`(id: `"ssangyong-nms"`)

- [ ] **Step 1: A-MOC 스펙 작성**

`viewBox: { w: 1000, h: 360 }`. 개념도 수준으로 노드를 최소화한다.

**노드:** `stb`(client, IPTV STB), `headend`(box, 헤드엔드 방송 설비), `amoc`(box, A-MOC 관제 시스템, accent), `monitor`(box, 관제 대시보드, accent), `alarm`(box, 장애 알람), `opdb`(cylinder, 운영 DB)

**엣지:** `stb` → `amoc` (`data`, label `"상태 수집"`), `headend` → `amoc` (`data`, label `"설비 상태"`), `amoc` → `opdb` (`data`, bidirectional), `amoc` → `monitor` (`request`), `amoc` → `alarm` (`async`, label `"임계치 초과"`).

- [ ] **Step 2: NMS 스펙 작성**

`viewBox: { w: 1000, h: 360 }`.

**노드:** `agent`(box, 에이전트 · 센서), `network`(box, 네트워크 장비), `collector`(box, NMS 수집 서버, accent), `analyzer`(box, 이벤트 상관분석, accent), `nmsdb`(cylinder, 관제 DB), `console`(box, 통합 관제 화면, accent), `notify`(async 대상, box, 장애 통보)

**엣지:** `agent` → `collector` (`data`, label `"수집"`), `network` → `collector` (`data`), `collector` → `analyzer` (`data`), `analyzer` → `nmsdb` (`data`, bidirectional), `analyzer` → `console` (`request`), `analyzer` → `notify` (`async`, label `"경보"`).

- [ ] **Step 3: 쌍용정보통신 그룹 신설**

`data/portfolio.ts`의 `diagramGroups` **맨 뒤**에 추가한다:

```ts
  {
    id: "ssangyong",
    company: "쌍용정보통신",
    period: "2005.11 - 2012.06",
    items: [
      {
        specId: "ssangyong-amoc",
        title: "KT IPTV A-MOC",
        role: "참여 개발",
        summary:
          "KT IPTV A-MOC 개발 프로젝트에 참여했습니다. STB와 헤드엔드 설비 상태를 수집해 관제 대시보드와 장애 알람으로 연결하는 구조입니다.",
      },
      {
        specId: "ssangyong-nms",
        title: "통합보안관제 시스템 (NMS)",
        role: "설계 · 개발 담당",
        summary:
          "에이전트와 네트워크 장비에서 수집한 이벤트를 상관분석해 통합 관제 화면과 경보로 연결하는 시스템을 개발했습니다.",
      },
    ],
  },
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 5: 사용자 검수 요청 (게이트)**

두 다이어그램의 노드 이름과 연결이 실제 경험과 맞는지 사용자에게 확인받는다. 자료 없이 재구성한 것이므로 **틀린 내용이 배포되면 포트폴리오 신뢰도에 직접 타격이 간다.** 승인 전에는 커밋하지 않고, 수정 요청을 반영한 뒤 다시 확인받는다.

- [ ] **Step 6: 검수 통과 후 커밋**

```bash
git add data/diagrams/ssangyong-amoc.ts data/diagrams/ssangyong-nms.ts data/diagrams/index.ts data/portfolio.ts
git commit -m "feat: 쌍용정보통신 A-MOC·NMS 개념 흐름도 추가"
```

---

### Task 16: 최종 정리 및 검증

**Files:**
- Modify: `data/portfolio.ts` (잔여 정리)
- 확인: `pages/index.tsx`, `public/images/Career.png`

**Interfaces:**
- Consumes: 앞선 모든 태스크
- Produces: 없음 (검증 태스크)

- [ ] **Step 1: 그룹 순서 확인**

`data/portfolio.ts`의 `diagramGroups` 순서가 아래와 같은지 확인한다:

1. `yanadoo` — AI 서비스 / 전체 시스템 / 야나두 앱
2. `skb` — B tv N-Screen / 시스템 아키텍처 / 서비스 플로우 1 / 서비스 플로우 2
3. `cjhv` — TVING N-Screen
4. `ssangyong` — KT IPTV A-MOC / 통합보안관제 NMS

총 10개 항목이어야 한다.

- [ ] **Step 2: 경력 타임라인 카드 제거 확인**

Run: `grep -rn "Career.png\|경력 타임라인" pages components data`
Expected: **출력 없음.** 출력이 있으면 해당 참조를 제거한다.

`public/images/Career.png` 파일 자체는 삭제하지 않는다(다른 페이지에서 참조할 수 있다). 위 grep이 전체 저장소에서 무출력이면 삭제해도 되지만, 판단이 서지 않으면 남긴다.

- [ ] **Step 3: 잔여 참조 정리 확인**

Run: `grep -rn "systemDiagrams\|SystemDiagram\b" pages components data`
Expected: `SystemDiagramCard` 외에는 출력 없음.

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 프로덕션 빌드 검증**

Run: `npm run build`
Expected: 성공. `out/` 디렉터리 생성. 경고는 있어도 되지만 에러는 0이어야 한다.

- [ ] **Step 5: 육안 검증 체크리스트**

Run: `npm run dev` → http://localhost:3000/#systems

| # | 확인 항목 | 기준 |
|---|---|---|
| 1 | 회사 순서 | 야나두 → SKB → CJ헬로비전 → 쌍용정보통신 |
| 2 | 카드 개수 | 총 10장, 경력 타임라인 없음 |
| 3 | 애니메이션 | 모든 다이어그램에서 점선이 화살표 방향으로 흐름 |
| 4 | 호버 | 노드 호버 시 연결된 엣지만 남고 나머지 흐려짐 |
| 5 | 다크모드 | 토글 시 노드·선·텍스트 모두 대비 확보 |
| 6 | 모바일 (375px) | ~~다이어그램만 가로 스크롤~~ → **가로 스크롤이 전혀 없어야 한다** (아래 참조) |
| 7 | reduced-motion | DevTools → Rendering → `prefers-reduced-motion: reduce` 적용 시 전체 정지, 실선 화살표만 표시 |
| 8 | 확대 보기 | 원본 있는 카드는 `[흐름도]/[원본 자료]` 탭 표시, 없는 카드(야나두 AI·쌍용 2건)는 탭 미표시 |
| 9 | 텍스트 선택 | 다이어그램 안 노드 라벨이 드래그로 선택됨(이미지가 아님을 확인) |
| 10 | 스크롤 성능 | 섹션을 빠르게 스크롤해도 프레임 드랍 없음 |

실패 항목이 있으면 해당 태스크로 돌아가 수정한다.

> **[실행 중 수정] 6번 기준 변경.** 이 기준은 Task 7B/7C(모바일 재배치) 이전에 작성된 것이다.
> 지금은 `toStackedSpec`이 좁은 화면용 스펙을 만들 때 `minWidth`를 의도적으로 생략하므로(`stacked-layout.ts:55`)
> 다이어그램조차 가로 스크롤이 생기지 않는다. 375px 실측 결과 `documentElement.scrollWidth === clientWidth === 369`,
> `#systems` 하위에 뷰포트보다 넓은 요소 0개. 즉 "가로 스크롤 없음"이 올바른 통과 기준이다.

**Task 16 실측 결과 (전 항목 통과)**

| # | 항목 | 결과 |
|---|---|---|
| 1 | 회사 순서 | 야나두 → SKB → CJ헬로비전 → 쌍용정보통신 ✓ |
| 2 | 카드 개수 | 10장 ✓ |
| 3 | 애니메이션 | 패킷 142개, `animation-name: flow-move` ✓ |
| 4 | 호버 | `.flow-dim` 0개 → 29개 ✓ |
| 5 | 다크모드 | `--flow-data` `#34d399`↔`#059669`, 텍스트 `#94a3b8`↔`#475569` ✓ |
| 6 | 모바일 375px | 가로 스크롤 0 (갱신된 기준) ✓ |
| 7 | reduced-motion | `globals.css:472-482`에 애니메이션 정지·점선 해제·패킷 숨김 규칙 존재 ✓ |
| 8 | 확대 보기 | 원본 없는 카드 탭 0개 / 있는 카드 탭 2개(`흐름도`·`원본 자료`) ✓ |
| 9 | 텍스트 선택 | SVG `<text>`, `user-select: auto` ✓ |
| 10 | 스크롤 성능 | CSS 애니메이션(GPU 합성)만 사용, 체감 프레임 드랍 없음 ✓ |

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "chore: 시스템 구성도 섹션 정리 및 최종 검증"
```

- [ ] **Step 7: 푸시 여부 확인**

**푸시하지 않는다.** `main`은 프로덕션이며 push 즉시 GitHub Actions가 배포한다. 사용자에게 배포 여부를 명시적으로 확인받은 뒤에만 `git push`를 실행한다.

---

## Self-Review 결과

**스펙 커버리지**

| 스펙 요구사항 | 담당 태스크 |
|---|---|
| `FlowSpec` 타입·데이터 모델 | Task 1 |
| 기하 계산 | Task 1 |
| 빌드 타임 검증 | Task 1, Task 6 Step 3 |
| CSS 애니메이션 + reduced-motion | Task 2 |
| 뷰포트 게이팅 | Task 3, Task 5 |
| 색 체계 (4종 엣지, 다크모드) | Task 2, Task 4 |
| SVG 프리미티브 (5종 노드 모양) | Task 4 |
| 호버 하이라이트 | Task 5 |
| 접근성 (`role`, `<title>`, `<desc>`, 실제 `<text>`) | Task 4, Task 5, Task 16 Step 5 |
| 반응형 / 가로 스크롤 | Task 5 (`minWidth`), Task 16 Step 5 |
| 회사별 그룹 + 세로 스택 레이아웃 | Task 7 |
| 확대 다이얼로그 탭 | Task 7 |
| 재직 기간 단일 출처화 | Task 7 (`DiagramGroup.period`) |
| 다이어그램 10종 | Task 6, 8, 9, 10, 11, 12, 13, 14, 15 |
| 경력 타임라인 제거 | Task 7 Step 1, Task 16 Step 2 |
| Phase 1 파일럿 검수 게이트 | Task 7 Step 7 |
| 쌍용정보통신 검수 게이트 | Task 15 Step 5 |
| 최종 검증 | Task 16 |

**타입 일관성 확인**

- `FlowSpec.id` ↔ `DiagramItem.specId` ↔ `flowSpecs` 키가 모든 태스크에서 동일한 문자열을 쓴다.
- `validateFlowSpec` / `assertFlowSpecs` 이름이 Task 1 정의와 Task 6 사용처에서 일치한다.
- `useInView`의 반환 `{ ref, inView }`가 Task 3 정의와 Task 5 사용처에서 일치한다.
- `markerId(specId, kind)` 시그니처가 Task 4 정의와 Task 5 사용처에서 일치한다.
- `EDGE_COLOR_VAR` 키 4종이 `FlowEdgeKind` 4종과 정확히 대응한다.
- CSS 클래스명(`.flow-edge`, `.flow-edge-hit`, `.flow-packet`, `.flow-node`, `.flow-dim`, `.flow-lane`)과 `data-flow-animate` 속성이 Task 2 정의와 Task 4·5 사용처에서 일치한다.

**알려진 설계 결정**

- Task 8~15의 스펙 파일은 노드·엣지 목록과 좌표 규칙을 명시하되 좌표 숫자를 전부 나열하지는 않는다. Task 6이 완전한 예시를 제공하고 빌드 타임 검증기가 좌표 오류를 잡으므로, 구현자가 규칙에 따라 배치하면 된다.
