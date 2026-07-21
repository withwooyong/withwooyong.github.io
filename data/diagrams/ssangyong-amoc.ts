import type { FlowSpec } from "@/components/flow-diagram";

/**
 * 원본 자료가 없는 구술 기억 기반 항목이라 개념 수준으로만 그린다.
 * 노드 이름은 pages/index.tsx 경력 카드의 확정 표기("KT QOOK TV A-MOC 플랫폼")를 따랐다.
 * 사용자 검수를 거치기 전에는 확정된 내용이 아니다.
 */
export const ssangyongAmocSpec: FlowSpec = {
  id: "ssangyong-amoc",
  title: "KT QOOK TV A-MOC 플랫폼 개념도",
  desc: "IPTV STB와 헤드엔드 방송 설비의 상태를 A-MOC 관제 플랫폼이 수집해 운영 DB에 쌓고, 관제 대시보드로 보여 주며 임계치를 넘으면 장애 알람으로 연결하는 개념 구조입니다.",
  viewBox: { w: 1000, h: 340 },
  minWidth: 800,
  nodes: [
    { id: "stb", label: "IPTV STB", sub: "QOOK TV 가입자", shape: "client", x: 20, y: 60, w: 240, h: 46 },
    { id: "headend", label: "헤드엔드 방송 설비", shape: "box", x: 20, y: 180, w: 240, h: 46 },

    { id: "amoc", label: "A-MOC 관제 플랫폼", shape: "box", x: 340, y: 120, w: 280, h: 46, accent: true },
    { id: "opdb", label: "운영 DB", shape: "cylinder", x: 340, y: 250, w: 280, h: 58 },

    { id: "monitor", label: "관제 대시보드", shape: "box", x: 700, y: 60, w: 280, h: 46, accent: true },
    { id: "alarm", label: "장애 알람", shape: "box", x: 700, y: 180, w: 280, h: 46 },
  ],
  edges: [
    { from: "stb", to: "amoc", kind: "data", label: "상태 수집" },
    { from: "headend", to: "amoc", kind: "data", label: "설비 상태" },

    { from: "amoc", to: "opdb", kind: "data", bidirectional: true },

    { from: "amoc", to: "monitor", kind: "request" },
    { from: "amoc", to: "alarm", kind: "async", label: "임계치 초과" },
  ],
  legend: [
    { kind: "request", label: "사용자 요청" },
    { kind: "data", label: "내부 데이터" },
    { kind: "async", label: "비동기 · 스트리밍" },
  ],
};
