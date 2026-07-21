import type { FlowSpec } from "@/components/flow-diagram";

/**
 * 원본(yanadoo_all.png)은 박스만 있고 연결선이 없어 흐름을 새로 정의했다.
 *
 * 배치 규칙 두 가지가 교차를 막는다.
 *  1. 허브(api-core) 바로 위 열을 비워 둔다. 프론트 3종이 허브로 내려오는 선이
 *     그 빈 통로를 지나므로 API 레인 노드를 하나도 관통하지 않는다.
 *  2. 같은 행을 가로지르는 긴 엣지는 레인 하단 여백(y 450)으로 흘려보낸다.
 *
 * 원본의 FRONT+BACKEND는 계층 순서가 아니라 열을 나누는 세로 띠라서,
 * 어드민을 별도 레인으로 빼지 않고 API 레인에 합치고 레인 라벨로 보존했다.
 * 별도 레인으로 두면 API와 INFRA 사이를 가로막아 허브에서 인프라로 내려가는
 * 선 5개가 전부 어드민을 관통한다.
 */
export const yanadooPlatformSpec: FlowSpec = {
  id: "yanadoo-platform",
  title: "야나두 전체 시스템 구성도",
  desc: "사용자와 앱 요청이 NGINX를 거쳐 야나두·야핏·B2B 프론트로 갈라지고, 야나두 API를 허브로 회원·틈새단어·AI·알림 서버가 붙으며, RDS·OpenSearch·CloudFront와 결제·영상·B2B 외부 연동으로 이어지는 전체 플랫폼 구조입니다.",
  viewBox: { w: 1440, h: 700 },
  minWidth: 1100,
  lanes: [
    { id: "front", label: "FRONT", y: 12, h: 200 },
    { id: "api", label: "API · 어드민 (FRONT + BACKEND)", y: 232, h: 300 },
    { id: "infra", label: "BACKEND + INFRA", y: 552, h: 130 },
  ],
  nodes: [
    // FRONT
    { id: "user", label: "사용자", sub: "웹 · 모바일", shape: "client", x: 15, y: 58, w: 300, h: 46 },
    { id: "nginx", label: "NGINX", sub: "프론트 진입", shape: "box", x: 365, y: 58, w: 300, h: 46 },
    { id: "front-web", label: "야나두 프론트", sub: "React — 영어 · 클래스", shape: "box", x: 715, y: 58, w: 300, h: 46, accent: true },
    { id: "channeltalk", label: "채널톡", sub: "상담 연동", shape: "external", x: 1065, y: 58, w: 300, h: 46 },

    { id: "app", label: "야나두 앱", sub: "UniWebView — 영어 · 클래스 · B2B", shape: "client", x: 15, y: 138, w: 300, h: 46, accent: true },
    { id: "front-b2b", label: "B2B 프론트", sub: "Vue.js", shape: "box", x: 365, y: 138, w: 300, h: 46 },
    { id: "front-yapit", label: "야핏 프론트", sub: "Spring + Thymeleaf", shape: "box", x: 715, y: 138, w: 300, h: 46 },
    { id: "ads", label: "GTM · GA · Meta", sub: "광고 · 분석 연동", shape: "external", x: 1065, y: 138, w: 300, h: 46 },

    // API · 어드민 — 윗줄 720 열은 비워 둔다(허브로 내려오는 통로)
    { id: "api-relay", label: "Relay 서버", sub: "Jira · Confluence · Jandi", shape: "box", x: 15, y: 288, w: 200, h: 46 },
    { id: "api-word", label: "틈새단어 API", sub: "Spring Data JPA", shape: "box", x: 250, y: 288, w: 200, h: 46 },
    { id: "api-member", label: "회원 서버", sub: "Spring Boot · NICE 인증", shape: "box", x: 485, y: 288, w: 200, h: 46, accent: true },
    { id: "api-ai", label: "AI 서버", sub: "채팅 · 음성 · 화상", shape: "box", x: 955, y: 288, w: 200, h: 46, accent: true },
    { id: "api-b2b", label: "B2B API 서버", sub: "Spring Data JPA", shape: "box", x: 1190, y: 288, w: 200, h: 46 },

    { id: "api-batch", label: "배치 서버", sub: "Spring Scheduled", shape: "box", x: 15, y: 378, w: 200, h: 46 },
    { id: "api-push", label: "알림 Push 서버", sub: "Spring Data JPA", shape: "box", x: 250, y: 378, w: 200, h: 46, accent: true },
    { id: "api-core", label: "야나두 API", sub: "상품 · 주문 · 결제 · 학습 · 몰인몰", shape: "box", x: 720, y: 378, w: 200, h: 46, accent: true },
    { id: "admin", label: "야나두 어드민", sub: "영어 · 클래스 · 사이클", shape: "box", x: 955, y: 378, w: 200, h: 46, accent: true },
    { id: "admin-b2b", label: "B2B 어드민", sub: "Vue.js + Touch", shape: "box", x: 1190, y: 378, w: 200, h: 46 },

    // BACKEND + INFRA — 실린더는 h58이라 y를 6px 올려 박스와 중심을 맞춘다
    { id: "rds", label: "Amazon RDS", sub: "Redis 캐시", shape: "cylinder", x: 15, y: 592, w: 200, h: 58 },
    { id: "opensearch", label: "OpenSearch", sub: "로그 서버", shape: "cylinder", x: 250, y: 592, w: 200, h: 58 },
    { id: "cdn", label: "AWS CloudFront", sub: "CDN · 파일 · 이미지", shape: "box", x: 485, y: 598, w: 200, h: 46 },
    { id: "pay", label: "토스페이먼츠", sub: "결제 연동", shape: "external", x: 720, y: 598, w: 200, h: 46 },
    { id: "video", label: "Catenoid", sub: "비디오 서버 연동", shape: "external", x: 955, y: 598, w: 200, h: 46 },
    { id: "b2b-ext", label: "비즈마켓 · LG U+", sub: "B2B 몰인몰 연동", shape: "external", x: 1190, y: 598, w: 200, h: 46 },
  ],
  edges: [
    { from: "user", to: "nginx", kind: "request" },
    { from: "app", to: "nginx", kind: "request" },
    { from: "nginx", to: "front-web", kind: "request" },
    { from: "nginx", to: "front-b2b", kind: "request" },
    { from: "nginx", to: "front-yapit", kind: "request" },
    { from: "front-web", to: "channeltalk", kind: "external" },
    { from: "front-web", to: "ads", kind: "external" },

    // 허브 위 빈 열을 통과해 내려온다
    { from: "front-web", to: "api-core", kind: "request" },
    { from: "front-yapit", to: "api-core", kind: "request" },
    { from: "front-b2b", to: "api-b2b", kind: "request" },

    { from: "api-core", to: "api-member", kind: "data", bidirectional: true },
    { from: "api-core", to: "api-word", kind: "data", bidirectional: true },
    { from: "api-core", to: "api-ai", kind: "data", bidirectional: true },
    { from: "api-core", to: "api-push", kind: "data" },
    { from: "api-push", to: "api-relay", kind: "data" },
    // 같은 행을 가로지르므로 레인 하단 여백으로 우회한다
    { from: "api-batch", to: "api-core", kind: "async", waypoints: [{ x: 115, y: 450 }, { x: 820, y: 450 }] },
    { from: "admin", to: "api-core", kind: "data" },
    { from: "admin-b2b", to: "api-b2b", kind: "data" },

    { from: "api-core", to: "rds", kind: "data", bidirectional: true },
    { from: "api-core", to: "opensearch", kind: "async", label: "로그" },
    { from: "api-core", to: "cdn", kind: "data", label: "정적 자산" },
    { from: "api-core", to: "pay", kind: "external" },
    { from: "api-core", to: "video", kind: "external" },
    // 바로 아래 B2B 어드민을 관통하므로 오른쪽 통로로 돌아 내려간다
    { from: "api-b2b", to: "b2b-ext", kind: "external", waypoints: [{ x: 1425, y: 311 }, { x: 1425, y: 621 }] },
  ],
  legend: [
    { kind: "request", label: "사용자 요청" },
    { kind: "data", label: "내부 데이터" },
    { kind: "async", label: "비동기 · 스트리밍" },
    { kind: "external", label: "외부 연동" },
  ],
};
