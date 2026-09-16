/**
 * 도식 확대 뷰어의 판정을 컴포넌트 밖으로 뽑은 순수 함수들이다.
 *
 * 뷰어는 Mermaid 도식(`components/mermaid.tsx`)과 이미지 도식(`components/diagram-image.tsx`)이
 * 함께 쓴다. 판정이 컴포넌트 안에 흩어져 있으면 통째로 지워도 케이스가 전부 통과하므로 여기에 둔다.
 */

/** 배율의 단위는 「뷰어 안쪽 폭」이다. scale 1 = 도식의 폭이 뷰어 폭과 같다. */
export const MAX_SCALE = 12;
export const ZOOM_FACTOR = 1.5;

export type Size = { width: number; height: number };

/**
 * 도식 전체가 뷰어 안에 들어오는 배율(contain).
 *
 * 폭만 맞추면 세로로 긴 도식은 높이가 화면을 넘는다. 그래서 폭 배율(1)과 높이 배율 중
 * 작은 쪽을 고른다. 높이 배율도 「뷰어 폭」 단위로 환산해야 두 값을 비교할 수 있다 —
 * 폭을 s·W 로 두면 높이는 s·W·(h/w) 이므로, 그것이 H 와 같아지는 s 는 (H/W)·(w/h) 다.
 */
export function fitScale(viewport: Size, natural: Size): number {
  if (viewport.width <= 0 || viewport.height <= 0 || natural.width <= 0 || natural.height <= 0) return 1;
  const heightFit = (viewport.height / viewport.width) * (natural.width / natural.height);
  return Math.min(1, heightFit);
}

/** 맞춤 배율 아래로는 줄이지 않는다. 그보다 작게 보여 줄 이유가 없다. */
export function clampScale(scale: number, minScale: number): number {
  return Math.min(MAX_SCALE, Math.max(minScale, scale));
}

/** 이 거리보다 많이 움직였으면 클릭이 아니라 이동(드래그 · 글자 선택)이다. */
export const TAP_SLOP_PX = 6;

/**
 * 확대 화면을 누른 것이 「닫기」인지 판정한다.
 *
 * 누른 자리에서 거의 움직이지 않은 클릭만 닫는다. 이동한 뒤 손을 뗀 것과
 * 스크롤바를 누른 것은 닫지 않는다 — 스크롤바를 잡아 끌다 뷰어가 닫히면 이동이 불가능해진다.
 * 터치로 끌거나 핀치하면 브라우저가 click 을 보내지 않으므로 그 경우는 여기까지 오지 않는다.
 */
export function isDismissClick(input: {
  down: { x: number; y: number } | null;
  up: { x: number; y: number };
  onScrollbar: boolean;
}): boolean {
  if (input.onScrollbar) return false;
  if (!input.down) return true; // 키보드로 누른 click 은 pointerdown 이 없다
  return Math.hypot(input.up.x - input.down.x, input.up.y - input.down.y) <= TAP_SLOP_PX;
}

/**
 * Mermaid 선언 키워드 → 독자에게 보일 종류 이름.
 * 발행본 560개는 flowchart 538 · sequenceDiagram 14 · stateDiagram-v2 8 (2026-09-17,
 * `check-mermaid.mjs` 의 `extractDiagrams` 로 셌다). 나머지는 쓰이면 바로 맞는 이름이 나오도록 둔다.
 */
const MERMAID_KIND_NAMES: Record<string, string> = {
  flowchart: "플로우차트",
  graph: "플로우차트",
  sequenceDiagram: "시퀀스 다이어그램",
  stateDiagram: "상태 다이어그램",
  "stateDiagram-v2": "상태 다이어그램",
  classDiagram: "클래스 다이어그램",
  erDiagram: "ER 다이어그램",
  gantt: "간트 차트",
  pie: "파이 차트",
  journey: "사용자 여정 지도",
  mindmap: "마인드맵",
  timeline: "타임라인",
  quadrantChart: "사분면 차트",
  gitGraph: "Git 그래프",
};

/** 종류를 알 수 없을 때의 이름. */
export const DEFAULT_KIND_NAME = "도식";

/** 정의의 첫 선언(주석 `%%` 과 front matter `---` 블록은 건너뛴다)에서 종류 이름을 얻는다. */
export function mermaidKindName(chart: string): string {
  const lines = chart.split(/\r?\n/).map((line) => line.trim());
  let i = 0;
  if (lines.find((line) => line !== "") === "---") {
    i = lines.indexOf("---") + 1;
    while (i < lines.length && lines[i] !== "---") i++;
    i++;
  }
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line === "" || line.startsWith("%%")) continue;
    const keyword = line.split(/[\s;]/)[0];
    return MERMAID_KIND_NAMES[keyword] ?? DEFAULT_KIND_NAME;
  }
  return DEFAULT_KIND_NAME;
}

/**
 * 받침에 따라 목적격 조사를 고른다 — 「플로우차트를」 · 「다이어그램을」.
 * 한글 음절이 아니면(영문 · 숫자로 끝나면) 받침을 알 수 없어 「을(를)」로 둔다.
 */
export function withObjectParticle(word: string): string {
  const last = word.trimEnd().charCodeAt(word.trimEnd().length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) return `${word}${(last - 0xac00) % 28 === 0 ? "를" : "을"}`;
  return `${word}을(를)`;
}
