import type { FlowSpec } from "@/components/flow-diagram";

export const skbFlowServingSpec: FlowSpec = {
  id: "skb-flow-serving",
  title: "SK브로드밴드 서빙 API · 영상물 메타 · 통합 이미지 플랫폼 흐름도",
  desc: "서빙 API가 Ehcache와 Elasticsearch를 거쳐 메뉴 데이터를 응답하고, 영상물 메타는 SKT GPU 딥메타 추출과 Contents HUB에 연동되며, 이미지는 Nginx 캐시를 통해 이미지 HUB에서 서빙되는 세 갈래 흐름입니다.",
  viewBox: { w: 1200, h: 700 },
  minWidth: 900,
  lanes: [
    // 노드는 반드시 레인 y 범위 안에 완전히 들어가야 한다.
    // 벗어나면 모바일 재배치에서 레인 배정에 실패해 노드가 누락된다(stacked-layout.ts).
    { id: "serving", label: "서빙 API · CMS 운영 시스템", y: 12, h: 200 },
    { id: "meta", label: "영상물 메타 서비스", y: 232, h: 216 },
    { id: "image", label: "이미지 서빙 플랫폼", y: 468, h: 200 },
  ],
  nodes: [
    // 서빙 API · CMS 운영
    { id: "menu-req", label: "메뉴 API 호출", sub: "GNB · 메뉴리스트", shape: "client", x: 20, y: 66, w: 130, h: 46 },
    { id: "gw-serving", label: "API Gateway", shape: "box", x: 190, y: 66, w: 130, h: 46 },
    { id: "api-serving", label: "API 서버", sub: "Ehcache", shape: "box", x: 360, y: 66, w: 130, h: 46, accent: true },
    { id: "store-serving", label: "Elasticsearch", sub: "or MongoDB", shape: "box", x: 530, y: 66, w: 160, h: 46, accent: true },
    { id: "cms-serving", label: "CMS 운영", sub: "Spring Boot", shape: "circle", x: 730, y: 60, w: 160, h: 58, accent: true },
    { id: "rdbms-serving", label: "RDBMS", shape: "cylinder", x: 545, y: 140, w: 130, h: 62 },

    // 영상물 메타 서비스
    { id: "meta-req", label: "API 호출", sub: "인물 · 음원 · 등급", shape: "client", x: 20, y: 286, w: 130, h: 46 },
    { id: "gw-meta", label: "API Gateway", shape: "box", x: 190, y: 286, w: 130, h: 46 },
    { id: "api-meta", label: "API 서버", sub: "Ehcache", shape: "box", x: 360, y: 286, w: 130, h: 46, accent: true },
    { id: "es-meta", label: "Elasticsearch", sub: "서비스 DB", shape: "box", x: 530, y: 286, w: 140, h: 46, accent: true },
    { id: "cms-meta", label: "CMS 운영", shape: "circle", x: 710, y: 280, w: 130, h: 58 },
    { id: "gpu-skt", label: "GPU (SKT)", sub: "딥메타 추출", shape: "external", x: 880, y: 286, w: 140, h: 46 },
    { id: "hub-contents", label: "Contents HUB", shape: "cylinder", x: 1060, y: 278, w: 130, h: 62 },
    { id: "rdbms-meta", label: "RDBMS", shape: "cylinder", x: 545, y: 360, w: 130, h: 62 },
    { id: "meta-ops", label: "영상물 추출메타 운영", shape: "circle", x: 870, y: 358, w: 160, h: 62, accent: true },

    // 이미지 서빙 플랫폼
    { id: "img-req", label: "이미지 API 호출", shape: "client", x: 20, y: 522, w: 130, h: 46 },
    { id: "dns", label: "DNS", shape: "box", x: 190, y: 522, w: 130, h: 46 },
    { id: "nginx", label: "Nginx + PHP-FPM", sub: "Nginx Cache", shape: "box", x: 360, y: 522, w: 150, h: 46, accent: true },
    { id: "es-image", label: "Elasticsearch", sub: "서비스 DB", shape: "box", x: 550, y: 522, w: 140, h: 46, accent: true },
    { id: "cms-image", label: "CMS 운영", shape: "circle", x: 730, y: 516, w: 130, h: 58 },
    { id: "hub-image", label: "이미지 HUB", shape: "cylinder", x: 900, y: 514, w: 140, h: 62, accent: true },
    { id: "rdbms-image", label: "RDBMS", shape: "cylinder", x: 565, y: 596, w: 130, h: 62 },
  ],
  edges: [
    // 서빙 API — 요청과 응답이 같은 경로를 오가므로 전 구간 양방향
    { from: "menu-req", to: "gw-serving", kind: "request", bidirectional: true },
    { from: "gw-serving", to: "api-serving", kind: "data", bidirectional: true },
    { from: "api-serving", to: "store-serving", kind: "data", bidirectional: true },
    { from: "store-serving", to: "cms-serving", kind: "data", bidirectional: true },
    { from: "cms-serving", to: "rdbms-serving", kind: "data", bidirectional: true, waypoints: [{ x: 810, y: 171 }] },

    // 영상물 메타
    { from: "meta-req", to: "gw-meta", kind: "request", bidirectional: true },
    { from: "gw-meta", to: "api-meta", kind: "data", bidirectional: true },
    { from: "api-meta", to: "es-meta", kind: "data", bidirectional: true },
    { from: "es-meta", to: "cms-meta", kind: "data", bidirectional: true },
    { from: "cms-meta", to: "gpu-skt", kind: "external", bidirectional: true },
    { from: "gpu-skt", to: "hub-contents", kind: "external", bidirectional: true },
    // 양방향이라 데스크톱 렌더링은 방향과 무관하지만, 모바일 위상 정렬은
    // from/to로 순서를 정하므로 GPU 뒤에 오도록 방향을 맞춘다
    { from: "gpu-skt", to: "meta-ops", kind: "data", bidirectional: true },
    { from: "cms-meta", to: "rdbms-meta", kind: "data", bidirectional: true, waypoints: [{ x: 775, y: 391 }] },

    // 이미지 서빙
    { from: "img-req", to: "dns", kind: "request", bidirectional: true },
    { from: "dns", to: "nginx", kind: "data", bidirectional: true },
    { from: "nginx", to: "es-image", kind: "data", bidirectional: true },
    { from: "es-image", to: "cms-image", kind: "data", bidirectional: true },
    { from: "cms-image", to: "hub-image", kind: "data", bidirectional: true },
    { from: "cms-image", to: "rdbms-image", kind: "data", bidirectional: true, waypoints: [{ x: 795, y: 627 }] },
    // Nginx가 원본을 이미지 HUB에서 끌어와 캐싱한다. 아래를 크게 우회한다.
    // 방향은 nginx -> hub-image 로 둬야 모바일 위상 정렬에서 HUB가 뒤로 간다
    { from: "nginx", to: "hub-image", kind: "data", bidirectional: true, waypoints: [{ x: 435, y: 684 }, { x: 970, y: 684 }] },
  ],
  legend: [
    { kind: "request", label: "사용자 요청" },
    { kind: "data", label: "내부 데이터" },
    { kind: "external", label: "외부 연동" },
  ],
};
