import type { FlowSpec } from "@/components/flow-diagram";

/**
 * 원본(yanadoo_app.png)은 yanadoo_all.png의 APP 영역을 잘라낸 조각이라
 * 연결 구조가 없다. 원본에 있는 항목(UniWebView, 영어·클래스·B2B, 틈새단어,
 * 스르르 학습지, OpenAI·klleon·Speech API)만 노드로 올려 재구성했다.
 *
 * 기능 6개를 같은 열에 세로로 정렬해 셸에서 퍼지는 선과 API로 모이는 선이
 * 각각 부채꼴이 되게 했다. 서로 교차하지 않고 셸이 허브임이 형태로 드러난다.
 */
export const yanadooAppSpec: FlowSpec = {
  id: "yanadoo-app",
  title: "야나두 앱 구성도",
  desc: "iOS와 Android가 UniWebView 기반 하이브리드 셸로 진입해 영어·클래스·B2B WebView와 틈새단어·스르르 학습지·AI 리얼톡으로 갈라지고, 모든 기능이 야나두 API로 모이며 Push 알림 서버가 셸로 알림을 보내는 구조입니다.",
  viewBox: { w: 1200, h: 440 },
  minWidth: 900,
  nodes: [
    // 셸을 기능 열의 세로 중앙(중심 y 218)에 맞춰 갈래를 위아래 대칭으로 만든다.
    // 위로 치우치면 아래 갈래의 선이 가팔라져 중간 노드를 스친다
    { id: "ios", label: "iOS", shape: "client", x: 20, y: 135, w: 170, h: 46 },
    { id: "android", label: "Android", shape: "client", x: 20, y: 255, w: 170, h: 46 },
    { id: "shell", label: "야나두 앱 셸", sub: "UniWebView 하이브리드", shape: "box", x: 230, y: 195, w: 200, h: 46, accent: true },
    { id: "push", label: "Push 알림 서버", sub: "푸시 알림 발송", shape: "box", x: 230, y: 350, w: 200, h: 46, accent: true },

    // 기능 6개는 같은 열에 세로 정렬한다
    { id: "web-english", label: "영어 학습 WebView", shape: "box", x: 490, y: 20, w: 220, h: 46 },
    { id: "web-class", label: "클래스 WebView", shape: "box", x: 490, y: 90, w: 220, h: 46 },
    { id: "web-b2b", label: "B2B WebView", shape: "box", x: 490, y: 160, w: 220, h: 46 },
    { id: "word", label: "틈새단어", shape: "box", x: 490, y: 230, w: 220, h: 46 },
    { id: "sreure", label: "스르르 학습지", shape: "box", x: 490, y: 300, w: 220, h: 46 },
    { id: "realtalk", label: "AI 리얼톡", sub: "klleon · OpenAI · Speech API", shape: "box", x: 490, y: 370, w: 220, h: 46, accent: true },

    { id: "api-core", label: "야나두 API", sub: "상품 · 주문 · 결제 · 학습", shape: "box", x: 870, y: 185, w: 250, h: 46, accent: true },
  ],
  edges: [
    { from: "ios", to: "shell", kind: "request" },
    { from: "android", to: "shell", kind: "request" },
    // 서버가 발행한 알림이 셸로 들어온다
    { from: "push", to: "shell", kind: "async" },

    { from: "shell", to: "web-english", kind: "request" },
    { from: "shell", to: "web-class", kind: "request" },
    { from: "shell", to: "web-b2b", kind: "request" },
    { from: "shell", to: "word", kind: "request" },
    { from: "shell", to: "sreure", kind: "request" },
    { from: "shell", to: "realtalk", kind: "request" },

    { from: "web-english", to: "api-core", kind: "data" },
    { from: "web-class", to: "api-core", kind: "data" },
    { from: "web-b2b", to: "api-core", kind: "data" },
    { from: "word", to: "api-core", kind: "data" },
    { from: "sreure", to: "api-core", kind: "data" },
    { from: "realtalk", to: "api-core", kind: "data" },
  ],
  legend: [
    { kind: "request", label: "사용자 요청" },
    { kind: "data", label: "내부 데이터" },
    { kind: "async", label: "비동기 · 스트리밍" },
  ],
};
