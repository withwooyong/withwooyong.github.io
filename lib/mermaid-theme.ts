import { AA_NON_TEXT, AA_TEXT, contrastRatio } from "@/lib/contrast";

/**
 * mermaid 도식의 색을 사이트 팔레트에 맞춘다.
 *
 * mermaid 11 의 내장 테마(`default`·`dark`)는 보라 계열 노드에 회색 테두리를 쓰기 때문에,
 * sky 계열인 이 사이트 안에서 도식만 다른 제품처럼 보인다.
 * 콘텐츠를 한 글자도 고치지 않고 색만 바꾸려면 `themeVariables` 가 유일한 접점이다.
 *
 * 값의 출처는 `tailwind.config.js` 의 `primary`(sky 계열)와 Tailwind 기본 `slate` 다.
 * `styles/globals.css` 의 `--primary` 는 shadcn 기본값인 무채색이라 브랜드색이 아니므로 쓰지 않는다.
 *
 * 캔버스 색(`background`)은 `components/mermaid.tsx` 가 도식을 얹는 카드의 배경과 같아야 한다.
 * 본문 미리보기와 확대 뷰어 모두 라이트에서 `bg-white`, 다크에서 `dark:bg-slate-900` 이다.
 */

/** mermaid 에 넘길 색 변수 하나의 이름. 값은 모두 `#rrggbb` 여야 한다. */
export type ThemeColors = Record<string, string>;

/** 라이트 모드. 캔버스는 `bg-white` 다. */
const LIGHT: ThemeColors = {
  background: "#ffffff", // 캔버스 = 카드의 bg-white

  // 노드 — 채움은 primary-100, 테두리는 primary-600, 글자는 slate-900
  primaryColor: "#e0f2fe",
  mainBkg: "#e0f2fe",
  primaryBorderColor: "#0284c7",
  nodeBorder: "#0284c7",
  primaryTextColor: "#0f172a",
  nodeTextColor: "#0f172a",
  textColor: "#0f172a",
  titleColor: "#0f172a",

  // 보조 면 — 노드와 구분되어야 하므로 브랜드색이 아니라 slate 계열을 쓴다
  secondaryColor: "#f1f5f9",
  tertiaryColor: "#f8fafc",

  // 선 — 엣지가 클러스터 테두리보다 진하다. 의미를 나르는 쪽이 더 강해야 한다
  lineColor: "#475569",
  clusterBorder: "#64748b",
  clusterBkg: "#f8fafc",
  edgeLabelBackground: "#ffffff",

  // 시퀀스 도식
  actorBkg: "#e0f2fe",
  actorBorder: "#0284c7",
  actorTextColor: "#0f172a",
  actorLineColor: "#64748b",
  signalColor: "#475569",
  signalTextColor: "#0f172a",
  labelBoxBkgColor: "#e0f2fe",
  labelBoxBorderColor: "#0284c7",
  labelTextColor: "#0f172a",
  loopTextColor: "#0f172a",
  noteBkgColor: "#f1f5f9",
  noteTextColor: "#0f172a",
  noteBorderColor: "#64748b",
  activationBkgColor: "#bae6fd",
  activationBorderColor: "#0369a1",
  sequenceNumberColor: "#ffffff",
  altBackground: "#f8fafc",

  // 상태 도식
  labelColor: "#0f172a",
  stateBkg: "#e0f2fe",
  stateLabelColor: "#0f172a",
  transitionColor: "#475569",
  transitionLabelColor: "#0f172a",
  compositeBackground: "#f8fafc",
  compositeBorder: "#64748b",
  compositeTitleBackground: "#f1f5f9",
  innerEndBackground: "#0f172a",
  specialStateColor: "#0f172a",
};

/** 다크 모드. 캔버스는 `dark:bg-slate-900` 이다. */
const DARK: ThemeColors = {
  background: "#0f172a", // 캔버스 = 카드의 dark:bg-slate-900

  primaryColor: "#0c4a6e",
  mainBkg: "#0c4a6e",
  primaryBorderColor: "#38bdf8",
  nodeBorder: "#38bdf8",
  primaryTextColor: "#f1f5f9",
  nodeTextColor: "#f1f5f9",
  textColor: "#f1f5f9",
  titleColor: "#f1f5f9",

  secondaryColor: "#1e293b",
  tertiaryColor: "#1e293b",

  lineColor: "#cbd5e1",
  clusterBorder: "#94a3b8",
  clusterBkg: "#1e293b",
  edgeLabelBackground: "#0f172a",

  actorBkg: "#0c4a6e",
  actorBorder: "#38bdf8",
  actorTextColor: "#f1f5f9",
  actorLineColor: "#94a3b8",
  signalColor: "#cbd5e1",
  signalTextColor: "#f1f5f9",
  labelBoxBkgColor: "#0c4a6e",
  labelBoxBorderColor: "#38bdf8",
  labelTextColor: "#f1f5f9",
  loopTextColor: "#f1f5f9",
  noteBkgColor: "#1e293b",
  noteTextColor: "#f1f5f9",
  noteBorderColor: "#94a3b8",
  activationBkgColor: "#075985",
  activationBorderColor: "#7dd3fc",
  sequenceNumberColor: "#0f172a",
  altBackground: "#1e293b",

  labelColor: "#f1f5f9",
  stateBkg: "#0c4a6e",
  stateLabelColor: "#f1f5f9",
  transitionColor: "#cbd5e1",
  transitionLabelColor: "#f1f5f9",
  compositeBackground: "#1e293b",
  compositeBorder: "#94a3b8",
  compositeTitleBackground: "#0f172a",
  innerEndBackground: "#f1f5f9",
  specialStateColor: "#f1f5f9",
};

export const MERMAID_THEME_COLORS: Readonly<Record<"light" | "dark", ThemeColors>> = {
  light: LIGHT,
  dark: DARK,
};

/**
 * 대비를 재야 하는 색의 짝.
 *
 * `min` 이 `AA_TEXT` 인 짝은 글자와 그 뒷면이고, `AA_NON_TEXT` 인 짝은 테두리·선과 그 인접면이다.
 * 테두리는 안쪽 채움과 바깥쪽 캔버스 **양쪽**에 접하므로 두 면을 각각 적는다.
 * 한쪽만 적으면 반대쪽에서 도형이 사라져도 검사가 통과한다.
 */
export type ContrastPair = { readonly label: string; readonly fg: string; readonly bg: string; readonly min: number };

export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  // 글자
  { label: "노드 글자 / 노드 채움", fg: "nodeTextColor", bg: "mainBkg", min: AA_TEXT },
  { label: "기본 글자 / 기본 채움", fg: "primaryTextColor", bg: "primaryColor", min: AA_TEXT },
  { label: "본문 글자 / 캔버스", fg: "textColor", bg: "background", min: AA_TEXT },
  { label: "엣지 라벨 글자 / 엣지 라벨 바탕", fg: "textColor", bg: "edgeLabelBackground", min: AA_TEXT },
  { label: "본문 글자 / 클러스터 채움", fg: "textColor", bg: "clusterBkg", min: AA_TEXT },
  { label: "본문 글자 / 보조 채움", fg: "textColor", bg: "secondaryColor", min: AA_TEXT },
  { label: "본문 글자 / 3차 채움", fg: "textColor", bg: "tertiaryColor", min: AA_TEXT },
  { label: "본문 글자 / 교대 배경", fg: "textColor", bg: "altBackground", min: AA_TEXT },
  { label: "본문 글자 / 합성 상태 배경", fg: "textColor", bg: "compositeBackground", min: AA_TEXT },
  { label: "제목 글자 / 캔버스", fg: "titleColor", bg: "background", min: AA_TEXT },
  { label: "제목 글자 / 합성 상태 제목 배경", fg: "titleColor", bg: "compositeTitleBackground", min: AA_TEXT },
  { label: "라벨 상자 글자 / 라벨 상자 채움", fg: "labelTextColor", bg: "labelBoxBkgColor", min: AA_TEXT },
  { label: "액터 글자 / 액터 채움", fg: "actorTextColor", bg: "actorBkg", min: AA_TEXT },
  { label: "시그널 글자 / 캔버스", fg: "signalTextColor", bg: "background", min: AA_TEXT },
  { label: "노트 글자 / 노트 채움", fg: "noteTextColor", bg: "noteBkgColor", min: AA_TEXT },
  { label: "시퀀스 번호 글자 / 시그널 색", fg: "sequenceNumberColor", bg: "signalColor", min: AA_TEXT },
  { label: "루프 글자 / 캔버스", fg: "loopTextColor", bg: "background", min: AA_TEXT },
  { label: "루프 글자 / 교대 배경", fg: "loopTextColor", bg: "altBackground", min: AA_TEXT },
  { label: "상태 라벨 글자 / 캔버스", fg: "labelColor", bg: "background", min: AA_TEXT },
  { label: "상태 이름 글자 / 상태 채움", fg: "stateLabelColor", bg: "stateBkg", min: AA_TEXT },
  { label: "전이 라벨 글자 / 캔버스", fg: "transitionLabelColor", bg: "background", min: AA_TEXT },

  // 테두리와 선
  { label: "노드 테두리 / 노드 채움", fg: "nodeBorder", bg: "mainBkg", min: AA_NON_TEXT },
  { label: "노드 테두리 / 캔버스", fg: "nodeBorder", bg: "background", min: AA_NON_TEXT },
  { label: "노드 테두리 / 클러스터 채움", fg: "nodeBorder", bg: "clusterBkg", min: AA_NON_TEXT },
  { label: "기본 테두리 / 기본 채움", fg: "primaryBorderColor", bg: "primaryColor", min: AA_NON_TEXT },
  { label: "엣지 선 / 캔버스", fg: "lineColor", bg: "background", min: AA_NON_TEXT },
  { label: "엣지 선 / 클러스터 채움", fg: "lineColor", bg: "clusterBkg", min: AA_NON_TEXT },
  { label: "클러스터 테두리 / 캔버스", fg: "clusterBorder", bg: "background", min: AA_NON_TEXT },
  { label: "클러스터 테두리 / 클러스터 채움", fg: "clusterBorder", bg: "clusterBkg", min: AA_NON_TEXT },
  { label: "액터 테두리 / 액터 채움", fg: "actorBorder", bg: "actorBkg", min: AA_NON_TEXT },
  { label: "액터 테두리 / 캔버스", fg: "actorBorder", bg: "background", min: AA_NON_TEXT },
  { label: "액터 생명선 / 캔버스", fg: "actorLineColor", bg: "background", min: AA_NON_TEXT },
  { label: "시그널 선 / 캔버스", fg: "signalColor", bg: "background", min: AA_NON_TEXT },
  { label: "라벨 상자 테두리 / 캔버스", fg: "labelBoxBorderColor", bg: "background", min: AA_NON_TEXT },
  { label: "노트 테두리 / 노트 채움", fg: "noteBorderColor", bg: "noteBkgColor", min: AA_NON_TEXT },
  { label: "노트 테두리 / 캔버스", fg: "noteBorderColor", bg: "background", min: AA_NON_TEXT },
  { label: "활성 막대 테두리 / 활성 막대 채움", fg: "activationBorderColor", bg: "activationBkgColor", min: AA_NON_TEXT },
  { label: "활성 막대 테두리 / 캔버스", fg: "activationBorderColor", bg: "background", min: AA_NON_TEXT },
  { label: "전이 선 / 캔버스", fg: "transitionColor", bg: "background", min: AA_NON_TEXT },
  { label: "합성 상태 테두리 / 캔버스", fg: "compositeBorder", bg: "background", min: AA_NON_TEXT },
  { label: "합성 상태 테두리 / 합성 상태 배경", fg: "compositeBorder", bg: "compositeBackground", min: AA_NON_TEXT },
  { label: "특수 상태 / 캔버스", fg: "specialStateColor", bg: "background", min: AA_NON_TEXT },
  { label: "종료 상태 안쪽 / 캔버스", fg: "innerEndBackground", bg: "background", min: AA_NON_TEXT },
];

export type ContrastViolation = { label: string; fg: string; bg: string; ratio: number; min: number };

/**
 * 한쪽 모드의 대비를 전수 판정한다.
 *
 * `main` 이 아니라 순수 함수로 두는 이유는, 판정이 호출부에 흩어져 있으면
 * 그 판정을 통째로 지워도 케이스가 전부 통과하기 때문이다.
 */
export function auditContrast(
  mode: "light" | "dark",
  pairs: readonly ContrastPair[] = CONTRAST_PAIRS
): {
  checked: number;
  violations: ContrastViolation[];
} {
  const colors = MERMAID_THEME_COLORS[mode];
  const violations: ContrastViolation[] = [];

  // 목록의 길이가 아니라 **판정에 도달한** 수를 센다. 길이를 그대로 돌려주면
  // 반복이 중간에 잘려도 호출부가 그것을 알 수 없다.
  let checked = 0;

  for (const pair of pairs) {
    const fg = colors[pair.fg];
    const bg = colors[pair.bg];
    if (!fg || !bg) {
      throw new Error(`${mode} 에 없는 색 변수를 짝에 적었습니다: ${pair.fg} / ${pair.bg}`);
    }
    const ratio = contrastRatio(fg, bg);
    checked += 1;
    if (ratio < pair.min) {
      violations.push({ label: pair.label, fg, bg, ratio, min: pair.min });
    }
  }

  return { checked, violations };
}

/** 짝에 한 번도 나오지 않은 색 변수. 재지 않은 색은 재서 통과한 색과 구분되지 않으므로 비어 있어야 한다. */
export function uncheckedKeys(mode: "light" | "dark"): string[] {
  const covered = new Set(CONTRAST_PAIRS.flatMap((p) => [p.fg, p.bg]));
  return Object.keys(MERMAID_THEME_COLORS[mode]).filter((k) => !covered.has(k));
}

/** 도식 글자 크기. 색이 아니므로 대비 감사 대상에서 빠지도록 색 지도와 분리해 둔다. */
export const MERMAID_FONT_SIZE = "14px";

/** `mermaid.initialize` 의 `themeVariables` 에 그대로 넣을 값. */
export function mermaidThemeVariables(isDark: boolean): Record<string, string> {
  return { ...MERMAID_THEME_COLORS[isDark ? "dark" : "light"], fontSize: MERMAID_FONT_SIZE };
}

/**
 * 폰트를 조상에게 맡기는 값. 도식에는 이 가운데 무엇도 쓸 수 없다.
 *
 * mermaid 는 라벨 폭을 잴 때 임시 컨테이너를 `document.body` 바로 아래에 붙인다
 * (`render` 에 `svgContainingElement` 를 주지 않는 경로이며, 그 경로에서는 `fontFamily`
 * 설정이 인라인 스타일로도 걸리지 않는다). 그런데 도식이 실제로 그려지는 자리는
 * `font-sans` 가 걸린 본문 안이다. 조상이 서로 다르므로 상속에 맡기면 **재는 폰트와
 * 그리는 폰트가 갈린다.**
 *
 * 두 폰트의 자폭 차이만큼 상자가 좁게 만들어지고, `foreignObject` 는 SVG 사양상 자기 폭
 * 밖을 클리핑하므로(`overflow: visible` 이어도 소용없다) 라벨의 마지막 글자가 잘린다.
 * 조사가 붙는 한국어에서 특히 잘 드러난다 — 실측으로 한 편의 라벨 34개 가운데 **17개**가
 * 2~10px 넘쳐 「순이익」이 「순이읙」으로, 「꺼내는 장치」가 「꺼내는 장」으로 보였다.
 */
const INHERITING_FONT_VALUES = ["inherit", "initial", "unset", "revert", "revert-layer"];

/** 해석된 값을 얻지 못했을 때 쓰는 스택. 변수를 담지 않으므로 어느 조상 아래에서도 같게 풀린다. */
export const DIAGRAM_FONT_FALLBACK = "Inter, system-ui, sans-serif";

/**
 * `mermaid.initialize` 의 `fontFamily` 에 넣을 값을 정한다.
 *
 * 인자는 도식이 그려질 자리에서 읽은 `getComputedStyle(...).fontFamily` 다. 그 값은 이미
 * `var()` 가 풀린 뒤이므로 body 아래의 측정 컨테이너에서도 똑같이 해석된다.
 * 상속에 맡기는 값이 들어오면 위 결함이 되살아나므로 거부한다.
 */
export function resolveDiagramFontFamily(computed: string | null | undefined): string {
  const value = (computed ?? "").trim();
  if (value === "") return DIAGRAM_FONT_FALLBACK;
  if (INHERITING_FONT_VALUES.includes(value.toLowerCase())) return DIAGRAM_FONT_FALLBACK;
  return value;
}

/** mermaid 가 렌더 결과에 속성으로 직접 박아 넣는 색. `themeVariables` 로는 닿지 않는다. */
const HARDCODED_STROKE = 'stroke="black"';

/**
 * 테마 변수를 우회해 검정으로 남는 획을 팔레트 색으로 덮는다.
 *
 * mermaid 11 의 `insertStickTopArrowHead`·`insertStickBottomArrowHead` 는 화살촉에
 * `.attr("stroke", "black")` 을 건다. 다른 화살촉과 달리 대응하는 CSS 규칙이 없어서
 * 테마를 무엇으로 두든 검정이 남고, 다크 캔버스(`#0f172a`) 위에서 대비가 **1.18** 이 된다.
 *
 * 발행본과 문서를 통틀어 이 화살촉을 부르는 문법(`-)` 계열)은 지금 0건이라 화면에는
 * 나타나지 않는다. 그래도 덮는 이유는, 이 결함이 **문법 하나를 쓰는 순간** 나타나는데
 * 그때는 아무도 팔레트를 다시 보지 않기 때문이다.
 */
export function repaintHardcodedStrokes(svg: string, isDark: boolean): string {
  const color = MERMAID_THEME_COLORS[isDark ? "dark" : "light"].signalColor;
  return svg.split(HARDCODED_STROKE).join(`stroke="${color}"`);
}
