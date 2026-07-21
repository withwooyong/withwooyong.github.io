import type { FlowSpec } from "@/components/flow-diagram";

/**
 * 원본(BTV.png)은 화면 캡처에 번호 주석 5개가 달린 형태라 연결 구조가 없다.
 * 그래서 주석의 담당 업무 5가지를 클라이언트 -> 게이트웨이 -> 3갈래로 재구성했다.
 */
export const skbBtvSpec: FlowSpec = {
  id: "skb-btv",
  title: "B tv N-Screen 서비스 구성도",
  desc: "B tv STB와 Mobile B tv 요청이 API Gateway를 거쳐 NaviLog 검색·추천, 통합 이미지 플랫폼, 영상 딥메타 추출로 갈라지고, 검색 로그는 Kafka·Python·ELK로 수집·분석되어 다시 추천과 통계 서빙에 쓰이는 구조입니다.",
  viewBox: { w: 1200, h: 480 },
  minWidth: 900,
  nodes: [
    // 클라이언트
    { id: "stb", label: "B tv STB", sub: "1,000만 User 기준", shape: "client", x: 20, y: 150, w: 160, h: 46 },
    { id: "mobile", label: "Mobile B tv", shape: "client", x: 20, y: 280, w: 160, h: 46 },
    { id: "gateway", label: "API Gateway", shape: "box", x: 230, y: 215, w: 150, h: 46, accent: true },

    // 1~3번 업무: 검색 · 추천 계열
    { id: "nav-search", label: "NaviLog 검색·추천", sub: "텍스트 / 음성", shape: "box", x: 440, y: 60, w: 190, h: 46, accent: true },
    { id: "stats-api", label: "추천·통계 서빙 API", sub: "급상승검색 · 영화 · 방송 · 애니", shape: "box", x: 690, y: 60, w: 230, h: 46, accent: true },
    { id: "es-search", label: "Elasticsearch 콘텐츠 검색", shape: "box", x: 970, y: 60, w: 210, h: 46, accent: true },
    { id: "nugu", label: "NUGU 음성 AI", sub: "SKT 연동", shape: "external", x: 440, y: 165, w: 190, h: 46 },

    // 4~5번 업무: 이미지 · 영상 메타
    { id: "image-platform", label: "통합 이미지 플랫폼", sub: "이미지 · 콘텐츠 서빙 API", shape: "box", x: 440, y: 285, w: 190, h: 46, accent: true },
    { id: "image-hub", label: "이미지 HUB", shape: "cylinder", x: 700, y: 281, w: 180, h: 54 },
    { id: "deepmeta", label: "영상 딥메타 추출", sub: "서빙 API", shape: "box", x: 440, y: 390, w: 190, h: 46, accent: true },
    { id: "gpu", label: "영상 인식 시스템", sub: "SKT 연동", shape: "external", x: 700, y: 390, w: 180, h: 46 },

    // 수집 · 분석 · 적재 · 운영
    { id: "elk", label: "수집 · 분석 · 적재", sub: "Kafka · Python · Sanic · ELK", shape: "box", x: 970, y: 165, w: 210, h: 46, accent: true },
    { id: "admin", label: "운영 Admin", sub: "Java · Spring · RDBMS · Kibana", shape: "box", x: 970, y: 285, w: 210, h: 46, accent: true },
  ],
  edges: [
    { from: "stb", to: "gateway", kind: "request", bidirectional: true },
    { from: "mobile", to: "gateway", kind: "request", bidirectional: true },

    { from: "gateway", to: "nav-search", kind: "request" },
    { from: "gateway", to: "image-platform", kind: "request" },
    { from: "gateway", to: "deepmeta", kind: "request" },

    { from: "nav-search", to: "stats-api", kind: "data" },
    { from: "stats-api", to: "es-search", kind: "data" },
    // 검색 서비스가 SKT NUGU에 음성 인식을 요청하고 결과를 받는다.
    // 양방향이라 데스크톱은 방향과 무관하지만, nugu를 from으로 쓰면
    // 모바일 위상 정렬에서 NUGU가 맨 앞으로 튀어나온다
    { from: "nav-search", to: "nugu", kind: "external", bidirectional: true },

    { from: "image-platform", to: "image-hub", kind: "data", bidirectional: true },
    { from: "deepmeta", to: "gpu", kind: "external", bidirectional: true },

    { from: "es-search", to: "elk", kind: "async", bidirectional: true },
    { from: "elk", to: "admin", kind: "data", bidirectional: true },
  ],
  legend: [
    { kind: "request", label: "사용자 요청" },
    { kind: "data", label: "내부 데이터" },
    { kind: "async", label: "비동기 · 스트리밍" },
    { kind: "external", label: "외부 연동" },
  ],
};
