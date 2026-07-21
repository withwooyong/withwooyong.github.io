import type { FlowSpec } from "@/components/flow-diagram";

/**
 * 원본(TVING.png)은 웹·앱 화면 캡처와 설명 문구뿐이라 담당 업무로 재구성했다.
 * 노드는 원본 문구에 실재하는 것만 올렸다 —
 * "CMS 운영 및 미디어 메타 시스템", "검색, EPG, 통계, 콘텐츠 리스트 제공 등의
 * H/E API 및 이미지 서버", "Admin: Java, Spring, RDBMS, MongoDB / Serving API: Java, php".
 *
 * 엣지가 인접 레인끼리만 이어지도록 흐름을 정렬해(운영·수집 -> 저장 -> 서빙 -> 서비스)
 * 중간 레인을 관통하는 선을 없앴다. 유일한 예외인 통합 API <-> 콘텐츠 DB는
 * DB 중심 x를 운영 레인 노드 사이 틈(580~600)에 맞춰 수직으로 빠져나가게 했다.
 */
export const tvingNscreenSpec: FlowSpec = {
  id: "tving-nscreen",
  title: "TVING N-Screen 서비스 구성도",
  desc: "CMS 운영과 미디어 메타 시스템, 방송사 편성 데이터를 받는 실시간 EPG가 콘텐츠 DB에 쌓이고, 통합 H/E API가 이를 읽어 검색·이미지 서버와 함께 TVING 웹과 앱으로 서빙하는 구조입니다.",
  viewBox: { w: 1200, h: 560 },
  minWidth: 900,
  lanes: [
    { id: "service", label: "서비스 (N-Screen · 1,000만 User 기준)", y: 12, h: 120 },
    { id: "serving", label: "서빙 API", y: 152, h: 120 },
    { id: "ops", label: "운영 · 수집", y: 292, h: 120 },
    { id: "store", label: "저장 · 외부 연동", y: 432, h: 120 },
  ],
  nodes: [
    { id: "web", label: "TVING 웹", shape: "client", x: 230, y: 58, w: 320, h: 46 },
    { id: "app", label: "TVING 앱", sub: "N-Screen", shape: "client", x: 650, y: 58, w: 320, h: 46 },

    { id: "search", label: "검색 시스템 연동", sub: "검색 API · 화면", shape: "box", x: 120, y: 198, w: 300, h: 46, accent: true },
    { id: "unified-api", label: "통합 H/E API", sub: "Java · php", shape: "box", x: 450, y: 198, w: 300, h: 46, accent: true },
    { id: "image-server", label: "이미지 서버", shape: "box", x: 780, y: 198, w: 300, h: 46, accent: true },

    { id: "cms", label: "CMS 운영", sub: "Java · Spring", shape: "box", x: 20, y: 338, w: 270, h: 46, accent: true },
    { id: "media-meta", label: "미디어 메타 시스템", shape: "box", x: 310, y: 338, w: 270, h: 46, accent: true },
    { id: "epg", label: "실시간 EPG 연동", sub: "채널 편성", shape: "box", x: 600, y: 338, w: 270, h: 46, accent: true },
    { id: "stats", label: "통계 · 콘텐츠 리스트", shape: "box", x: 890, y: 338, w: 270, h: 46 },

    // 중심 x를 590으로 두어 통합 API와의 수직선이 운영 레인의 틈(580~600)을 지난다
    { id: "db", label: "콘텐츠 DB", sub: "RDBMS · MongoDB", shape: "cylinder", x: 440, y: 478, w: 300, h: 58 },
    // 라벨을 엣지에 붙이면 레인 경계선에 걸쳐 읽기 나빠 sub로 올렸다
    { id: "broadcaster", label: "방송사 편성 데이터", sub: "실시간 편성 외부 수신", shape: "external", x: 850, y: 478, w: 300, h: 46 },
  ],
  edges: [
    { from: "web", to: "unified-api", kind: "request", bidirectional: true },
    { from: "app", to: "unified-api", kind: "request", bidirectional: true },

    { from: "unified-api", to: "search", kind: "data", bidirectional: true },
    { from: "unified-api", to: "image-server", kind: "data" },
    { from: "unified-api", to: "db", kind: "data", bidirectional: true },

    { from: "media-meta", to: "search", kind: "data" },

    { from: "cms", to: "db", kind: "data" },
    { from: "media-meta", to: "db", kind: "data" },
    { from: "epg", to: "db", kind: "data" },
    { from: "stats", to: "db", kind: "data" },

    { from: "broadcaster", to: "epg", kind: "external" },
  ],
  legend: [
    { kind: "request", label: "사용자 요청" },
    { kind: "data", label: "내부 데이터" },
    { kind: "external", label: "외부 연동" },
  ],
};
