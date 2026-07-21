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
