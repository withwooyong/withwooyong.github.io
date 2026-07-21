import type { FlowSpec } from "@/components/flow-diagram";

/**
 * 원본 자료가 없는 구술 기억 기반 항목이라 개념 수준으로만 그린다.
 * 노드 이름은 pages/index.tsx 경력 카드의 확정 표기
 * ("KT 가입자계 통합보안관리시스템(ISM)")를 따랐다.
 * 사용자 검수를 거치기 전에는 확정된 내용이 아니다.
 */
export const ssangyongNmsSpec: FlowSpec = {
  id: "ssangyong-nms",
  title: "KT 가입자계 통합보안관리시스템(ISM) 개념도",
  desc: "에이전트와 네트워크 장비에서 수집한 이벤트를 수집 서버가 모아 상관분석을 거쳐 관제 DB에 쌓고, 통합 관제 화면으로 보여 주며 장애를 통보하는 개념 구조입니다.",
  viewBox: { w: 1000, h: 340 },
  minWidth: 800,
  nodes: [
    { id: "agent", label: "에이전트 · 센서", shape: "box", x: 20, y: 60, w: 220, h: 46 },
    { id: "network", label: "네트워크 장비", shape: "box", x: 20, y: 180, w: 220, h: 46 },

    { id: "collector", label: "수집 서버", shape: "box", x: 290, y: 120, w: 200, h: 46, accent: true },
    { id: "analyzer", label: "이벤트 상관분석", shape: "box", x: 540, y: 120, w: 200, h: 46, accent: true },
    { id: "nmsdb", label: "관제 DB", shape: "cylinder", x: 540, y: 250, w: 200, h: 58 },

    { id: "console", label: "통합 관제 화면", shape: "box", x: 790, y: 60, w: 190, h: 46, accent: true },
    { id: "notify", label: "장애 통보", shape: "box", x: 790, y: 180, w: 190, h: 46 },
  ],
  edges: [
    { from: "agent", to: "collector", kind: "data", label: "수집" },
    { from: "network", to: "collector", kind: "data" },

    { from: "collector", to: "analyzer", kind: "data" },
    { from: "analyzer", to: "nmsdb", kind: "data", bidirectional: true },

    { from: "analyzer", to: "console", kind: "request" },
    { from: "analyzer", to: "notify", kind: "async", label: "경보" },
  ],
  legend: [
    { kind: "request", label: "사용자 요청" },
    { kind: "data", label: "내부 데이터" },
    { kind: "async", label: "비동기 · 스트리밍" },
  ],
};
