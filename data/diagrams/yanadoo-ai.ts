import type { FlowSpec } from "@/components/flow-diagram";

/**
 * 원본 도식이 없어 AIYanadoo 서비스 페이지 구성과
 * yanadoo_all.png의 AI 백엔드(AI 서버 + OpenAI, AI 스르르 Table API,
 * Google Cloud Speech API, klleon)를 근거로 새로 그렸다.
 *
 * 두 레인 모두 행을 지그재그로 접었다. 레인 2는 왕복 루프라
 * 이렇게 해야 AI 서버 -> TTS, 학습 화면 -> 발화가 수직선이 되어 루프가 보인다.
 * 대신 screen -> mic 때문에 사이클이 생겨 모바일 위상 정렬은 (y, x) 폴백으로
 * 떨어진다. 루프는 본질적으로 순환이라 없앨 수 없는 트레이드오프다.
 */
export const yanadooAiSpec: FlowSpec = {
  id: "yanadoo-ai",
  title: "야나두 AI 영어 학습 서비스 구성도",
  desc: "60초 단어 테스트와 AI 커리큘럼으로 시작해 AI 나두·스르르 학습지를 거쳐 AI 튜터의 실시간 회화까지 이어지고, 학습자 발화가 STT·AI 서버·OpenAI·TTS·AI 아바타를 돌아 학습 화면으로 되돌아오는 왕복 루프 구조입니다.",
  viewBox: { w: 1200, h: 500 },
  minWidth: 900,
  lanes: [
    { id: "journey", label: "학습 여정 (Step 1 → Step 3)", y: 12, h: 230 },
    { id: "loop", label: "실시간 AI 왕복 루프", y: 262, h: 226 },
  ],
  nodes: [
    // 학습 여정 — 윗줄은 좌에서 우로, 아랫줄은 우에서 좌로 되짚는다
    { id: "learner", label: "학습자", shape: "client", x: 20, y: 60, w: 240, h: 46 },
    { id: "step1-test", label: "60초 단어 테스트", sub: "Step 1", shape: "box", x: 310, y: 60, w: 240, h: 46 },
    // 어휘 확장 폭은 엣지 라벨로 두면 4열 간격(50px)에 안 들어가 sub로 올렸다
    { id: "step1-curriculum", label: "AI 커리큘럼", sub: "Step 1 · 어휘 100 → 3,000", shape: "box", x: 600, y: 60, w: 240, h: 46 },
    { id: "step2-nadu", label: "AI 나두", sub: "Step 2 · 학습 루틴", shape: "box", x: 890, y: 60, w: 240, h: 46 },

    { id: "step2-sreure", label: "AI 스르르 학습지", sub: "Step 2 · 학습 루틴", shape: "box", x: 890, y: 160, w: 240, h: 46 },
    { id: "step3-tutor", label: "AI 튜터", sub: "Step 3 · 100단어 회화", shape: "box", x: 600, y: 160, w: 240, h: 46 },
    { id: "step3-travel", label: "AI 여행영어", sub: "Step 3", shape: "box", x: 310, y: 160, w: 240, h: 46 },
    { id: "step3-talk", label: "AI 원어민톡", sub: "Step 3", shape: "box", x: 20, y: 160, w: 240, h: 46 },

    // 왕복 루프 — 윗줄이 입력(발화 -> 이해), 아랫줄이 출력(합성 -> 화면)
    { id: "mic", label: "학습자 발화", sub: "마이크 입력", shape: "client", x: 20, y: 310, w: 240, h: 46 },
    { id: "stt", label: "Google Cloud Speech API", sub: "STT", shape: "external", x: 310, y: 310, w: 240, h: 46 },
    { id: "ai-server", label: "AI 서버", sub: "채팅 · 음성 · 화상 · 학습 · 고객센터", shape: "box", x: 600, y: 310, w: 240, h: 46, accent: true },
    { id: "llm", label: "OpenAI", sub: "대화 생성", shape: "external", x: 890, y: 310, w: 240, h: 46 },

    { id: "screen", label: "학습 화면", sub: "앱 · 웹", shape: "client", x: 20, y: 410, w: 240, h: 46 },
    { id: "avatar", label: "klleon 딥휴먼", sub: "AI 아바타 렌더", shape: "external", x: 310, y: 410, w: 240, h: 46 },
    { id: "tts", label: "TTS", sub: "음성 합성", shape: "box", x: 600, y: 410, w: 240, h: 46 },
    { id: "sreure-api", label: "AI 스르르 Table API 서버", sub: "학습 데이터", shape: "box", x: 890, y: 410, w: 240, h: 46, accent: true },
  ],
  edges: [
    { from: "learner", to: "step1-test", kind: "request" },
    { from: "step1-test", to: "step1-curriculum", kind: "request" },
    { from: "step1-curriculum", to: "step2-nadu", kind: "request" },
    { from: "step2-nadu", to: "step2-sreure", kind: "request" },
    { from: "step2-sreure", to: "step3-tutor", kind: "request" },
    { from: "step3-tutor", to: "step3-travel", kind: "request" },
    { from: "step3-travel", to: "step3-talk", kind: "request" },

    // 레인을 잇는 유일한 엣지. 실시간 회화가 아래 루프를 깨운다
    { from: "step3-tutor", to: "mic", kind: "data", label: "실시간 회화" },

    { from: "mic", to: "stt", kind: "external" },
    { from: "stt", to: "ai-server", kind: "data" },
    { from: "ai-server", to: "llm", kind: "external", bidirectional: true },
    { from: "ai-server", to: "sreure-api", kind: "data", bidirectional: true },
    { from: "ai-server", to: "tts", kind: "data" },
    { from: "tts", to: "avatar", kind: "external" },
    { from: "avatar", to: "screen", kind: "data" },
    // 라벨을 붙이면 수직선 옆 노드에 겹친다. 레인 라벨이 이미 루프임을 말한다
    { from: "screen", to: "mic", kind: "request" },
  ],
  legend: [
    { kind: "request", label: "사용자 요청" },
    { kind: "data", label: "내부 데이터" },
    { kind: "external", label: "외부 연동" },
  ],
};
