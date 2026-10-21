export type Point = { x: number; y: number };

/** 노드 모양. client=사용자/단말, external=외부 연동사 */
export type FlowNodeShape = "box" | "cylinder" | "circle" | "client" | "external";

/** 엣지 종류. 색과 범례가 여기에 연동된다 */
export type FlowEdgeKind = "request" | "data" | "external" | "async";

export type FlowNode = {
  id: string;
  label: string;
  /** 보조 라벨(기술 스택 등). SVG <text> 한 줄로 렌더되며 줄바꿈은 지원하지 않는다 */
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
  /**
   * 순서 재생의 단계 번호(1부터 빈 번호 없이). 같은 번호는 동시에 재생하고,
   * 다음 번호는 앞 번호의 엣지가 모두 끝난 뒤 시작한다.
   * 스펙에 order 가 하나라도 있으면 순서 모드가 되며, order 가 없는 엣지는 패킷을 그리지 않는다.
   */
  order?: number;
  /** 순서 모드에서 패킷이 이 엣지를 지나는 시간(초). 기본 0.8 */
  duration?: number;
};

export type FlowLane = {
  id: string;
  label: string;
  y: number;
  h: number;
  /**
   * 띠의 가로 폭. 생략하면 viewBox 전체 폭을 쓴다.
   * 좁은 화면 재배치에서는 오른쪽에 엣지 우회 통로가 있으므로,
   * 띠가 통로까지 덮어 선과 겹치지 않도록 좁혀 지정한다.
   */
  w?: number;
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
  /** 순서 재생의 단계별 캡션. order 는 엣지의 order 와 맞아야 한다 */
  steps?: FlowStep[];
};

export type FlowStep = { order: number; caption: string };
