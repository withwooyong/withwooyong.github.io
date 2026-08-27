import type { AtlasEdge, AtlasGraph, AtlasNode } from "@/lib/atlas/types";

export type Point = { x: number; y: number };

/**
 * 아틀라스 화면이 쓰는 순수 계산. 설계서 §7.5·§7.7 · 계획서 T10.
 *
 * 좌표(`layoutRadial`) · 그릴 엣지(`visibleEdges`) · 강조 대상(`neighborsOf`) ·
 * 목록 구획(`listSections`) 이 전부 여기 있다. 화면 컴포넌트는 받은 것을 그리기만 한다.
 *
 * **왜 컴포넌트가 아니라 여기인가:** 이 리포에는 jsdom 이 없고 `vitest.config.ts` 가
 * 일부러 안 넣었다고 적어 두었다. 규칙이 `.tsx` 안에 있으면 영구 게이트를 못 건다.
 */

/**
 * 원의 반지름. `components/atlas/dot-renderer.tsx` 와 `tests/atlas/layout.test.ts` 가
 * **여기서 가져다 쓴다.** 렌더러와 테스트가 각자 숫자를 들고 있으면 한쪽만 바뀌어도
 * 「겹치지 않는다」는 단언이 조용히 거짓이 된다.
 *
 * ⚠️ 공유에는 대가가 있다. 겹침 테스트가 이 값을 import 하므로 반지름을 **줄이는**
 *    변경은 기대값도 같이 줄어 원리상 못 잡는다(뮤테이션 실측: `selected 1.5→0.9` 생존).
 *    그래서 테스트가 이 객체의 **값 자체를 리터럴로 못박는다.** 그 단언을 지우지 마라.
 */
export const NODE_RADIUS = { topic: 1.9, artifact: 0.9, selected: 1.5 } as const;

/** 엣지 굵기. 강조된 선만 굵어진다. */
export const EDGE_WIDTH = { resting: 0.12, lit: 0.3 } as const;

/**
 * 화면 팔레트. **토큰 이름만 담고 색값은 담지 않는다** — 색은 `styles/globals.css` 가
 * 테마별로 정의하고, SVG 속성에 넣은 `var(--x)` 는 다크 전환을 그대로 따라간다(실측).
 *
 * ⚠️ `--n4`(테두리)·`--n5`(비활성)를 쓰지 마라. 두 토큰은 `globals.css` 주석이
 *    「WCAG 대비 요건 제외 대상」이라 밝힌 것이고, 실제로 **어떤 불투명도에서도
 *    3:1 에 못 닿는다**(실측 최대 n5 2.39/2.59 · n4 1.23/1.40). 아틀라스의 점은
 *    비활성 장식이 아니라 **클릭 대상이자 본문**이라 WCAG 1.4.11 의 3:1 이 적용된다.
 *    `tests/atlas/layout.test.ts` 가 이 표의 모든 칸을 재고 자기검사까지 한다.
 */
export const ATLAS_PALETTE = {
  /** 토픽 점 — 항상 */
  topic: { token: "--n7", opacity: 1 },
  /** 글 점 — 선택 없음 */
  artifact: { token: "--n6", opacity: 1 },
  /** 글 점 — 선택된 것의 이웃이 아님. 흐리게 하되 대비선 아래로 내려가지 않는다 */
  dimmed: { token: "--n6", opacity: 0.85 },
  /** 선택된 것과 그 이웃 — 액센트는 여기에만 쓴다(GC-9) */
  accent: { token: "--signal", opacity: 1 },
  /** 엣지 — 선택 없음 */
  edge: { token: "--n6", opacity: 0.85 },
  /** 엣지 — 강조 */
  edgeLit: { token: "--signal", opacity: 1 },
} as const;

/** `ATLAS_PALETTE` 항목을 SVG 속성값으로. */
export const paint = (p: { token: string }) => `var(${p.token})`;

/** viewBox 중심. 렌더러의 `viewBox="0 0 100 100"` 과 짝이다. */
const CX = 50;
const CY = 50;

/** 토픽 노드가 놓이는 원의 반지름. */
const TOPIC_R = 32;

/** 어떤 좌표도 이 반지름을 넘지 않는다 — viewBox 안에 여백을 남긴다. */
const VIEWBOX_LIMIT = 48;

/**
 * 클러스터 안쪽 빈 반지름. 토픽 원(1.9) + **선택된** 글 원(1.5) = 3.4 를 넘겨야 한다.
 * 쉬는 상태의 0.9 로 잡으면 선택하는 순간 토픽 라벨을 파고든다.
 */
const CLUSTER_R_INNER = 4.5;

/** 두 원이 겹치지 않으려면 필요한 최소 중심 거리(최악: 한쪽이 선택된 상태). */
const MIN_GAP = NODE_RADIUS.selected + NODE_RADIUS.artifact;

/** 글 하나가 차지할 면적. 무리가 커져도 밀도가 일정하게 유지되는 근거다. */
const AREA_PER_NODE = 9;

/**
 * 어느 토픽에도 안 붙는 노드를 두는 중앙 링의 **최소** 반지름.
 * 가장 안쪽 클러스터가 `TOPIC_R − 클러스터반지름` 에서 시작하므로 그 안은 비어 있다.
 */
const ORPHAN_R_MIN = 6;

/** 황금각. 해바라기 배치가 어떤 개수에서도 고르게 퍼지는 이유다. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * ⚠️ `localeCompare` 를 쓰지 마라. `lib/atlas/build.ts` 가 같은 이유로 금지해 두었다 —
 *    로컬 Windows 와 CI Linux 의 ICU 데이터가 다르면 내용이 같아도 순서가 갈리고
 *    산출물 해시가 달라져 `check-baseline` 이 흔들린다. 코드포인트 비교여야 한다.
 */
const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * 결정론적 방사형 배치. 설계서 §7.5 의 Dot 렌더러용.
 *
 * 토픽을 큰 원주에 균등 배치하고, 각 토픽의 글을 그 주위 원반에 해바라기 배치로 채운다.
 * 같은 토픽이 뭉치므로 클러스터가 눈에 보이고, `extends` 엣지가 클러스터를 가로지르는 선이 된다.
 *
 * **왜 힘 기반이 아닌가:** 시뮬레이션은 빌드마다 결과가 달라 스냅샷과 기준선 해시를 흔든다.
 * 노드 162 개는 §7.5 의 Dot 임계(≤300) 안이라 정적 배치로 충분하다.
 *
 * **왜 링 분할이 아니라 해바라기인가 (계획서 원안에서 바꾼 곳):**
 * 원안은 `MEMBER_R=15` 에 한 링당 16칸이었다. 그런데 실측 최대 무리가 **51편**(`ai-agent`)이라
 * 링 3까지 가고 반지름이 `15×(1+3×0.45)=35.25` 가 되는데, 토픽 원 반지름은 26 이었다 —
 * **클러스터가 이웃 토픽을 통째로 삼킨다.** 원안은 최대 32편을 가정한 상수였다.
 * 해바라기는 칸 수를 미리 못박지 않으므로 무리 크기가 변해도 이 실패가 재발하지 않는다.
 *
 * ⚠️ **좌표 안정성은 「같은 입력 → 같은 출력」까지다.** 글이 1편 늘면 그 토픽에서
 *    정렬 뒤쪽 슬롯이 한 칸씩 밀리고, 한 칸은 황금각(137.5°)이라 밀린 노드는 크게 움직인다
 *    (실측: `ai-agent` 에 1편 추가 → 51 중 12개 이동, 최대 Δ24). 다른 토픽은 안 움직인다.
 *    **카테고리가 1개 늘면 스포크 각이 전부 재계산돼 162 중 130개가 움직인다.**
 *    스냅샷·기준선을 새 카테고리와 함께 갱신할 각오를 하고 추가해라.
 *
 * ⚠️ 정렬을 빼지 마라. `graph.nodes` 의 순서에 의존하면 로더가 파일을 다른 순서로 읽는 것만으로
 *    전체 좌표가 밀린다. `tests/atlas/layout.test.ts` 의 「배열 순서에 의존하지 않는다」가 잡는다.
 */
export function layoutRadial(graph: AtlasGraph): Map<string, Point> {
  const pos = new Map<string, Point>();

  const topics = graph.nodes.filter((n) => n.type === "concept").slice().sort(byId);
  const cap = clusterCap(topics.length);

  /** 글을 `topics[0]`(소속 카테고리 slug) 로 미리 묶는다. 토픽마다 전체를 훑지 않기 위해서다. */
  const membersOf = new Map<string, AtlasNode[]>();
  for (const n of graph.nodes.filter((x) => x.type === "artifact").slice().sort(byId)) {
    const key = n.topics[0] ?? "";
    const bucket = membersOf.get(key);
    if (bucket) bucket.push(n);
    else membersOf.set(key, [n]);
  }

  topics.forEach((t, ti) => {
    // -π/2 로 시작해 첫 토픽이 12시 방향에 온다. 방향은 미관이고 불변식이 아니다.
    const spoke = (2 * Math.PI * ti) / Math.max(1, topics.length) - Math.PI / 2;
    const tx = CX + TOPIC_R * Math.cos(spoke);
    const ty = CY + TOPIC_R * Math.sin(spoke);
    pos.set(t.id, { x: round(tx), y: round(ty) });

    const members = membersOf.get(t.topics[0] ?? "") ?? [];
    if (members.length === 0) return;

    const outer = clusterRadius(members.length, cap);
    const span = outer * outer - CLUSTER_R_INNER * CLUSTER_R_INNER;
    // 토픽마다 시작 각을 어긋낸다. 무리들이 같은 무늬로 보이는 것을 줄이는 미관 조정이고
    // 불변식이 아니다 — 이 항을 0 으로 바꿔도 겹침·클러스터 성질은 그대로다.
    const phase = ti * GOLDEN_ANGLE;

    members.forEach((m, mi) => {
      // 넓이에 비례해 반지름을 키운다(등간격이면 바깥이 성기다). `+0.5` 는 각 고리의 넓이 중점.
      const r = Math.sqrt(CLUSTER_R_INNER * CLUSTER_R_INNER + (span * (mi + 0.5)) / members.length);
      const angle = mi * GOLDEN_ANGLE + phase;
      pos.set(m.id, {
        x: round(clamp(tx + r * Math.cos(angle))),
        y: round(clamp(ty + r * Math.sin(angle))),
      });
    });
  });

  // 방어: 어느 토픽에도 안 붙는 노드. 2026-08-27 실측 0건이지만 데이터가 변하면 생길 수 있다.
  // 전부 같은 점에 몰면 「겹치지 않는다」 테스트가 터지므로 중앙 링에 흩어 둔다.
  // ⚠️ `listSections` 도 같은 노드를 「그 밖의 글」로 받아야 한다. 한쪽만 그리면
  //    그래프에는 보이는데 목록에는 없는 글이 생기고, 목록이 키보드 경로라 **도달 불가**가 된다.
  const rest = graph.nodes.filter((n) => !pos.has(n.id)).slice().sort(byId);
  const orphanR = orphanRing(rest.length);
  rest.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, rest.length) - Math.PI / 2;
    pos.set(n.id, {
      x: round(clamp(CX + orphanR * Math.cos(angle))),
      y: round(clamp(CY + orphanR * Math.sin(angle))),
    });
  });

  return pos;
}

/**
 * 클러스터가 가질 수 있는 **최대** 반지름. 토픽 개수 K 에 따라 달라진다.
 *
 * ⚠️ 이 값을 상수로 굳히지 마라. 처음에는 `14` 로 두고 「`TOPIC_R/2 = 16` 보다 작으니
 *    안전」이라고 적었는데, 그 부등식은 **K 가 정확히 6 일 때만 참이다.** 이웃 토픽 중심 간
 *    거리는 `2·TOPIC_R·sin(π/K)` 이고 K 가 커지면 줄어든다 — K=7 이면 13.89 라 이미 14 를
 *    넘고, K=8 에서 실제로 클러스터가 서로를 삼킨다(실측 worstGap −0.572). 계획서 원안이
 *    「무리 크기」축에서 저지른 실수를 「토픽 개수」축에 그대로 재현한 것이었다.
 *
 * K < 2 면 부딪힐 이웃이 없으므로 viewBox 만 제약이다.
 */
function clusterCap(topicCount: number): number {
  const byNeighbour =
    topicCount < 2
      ? Number.POSITIVE_INFINITY
      : TOPIC_R * Math.sin(Math.PI / topicCount) - MIN_GAP / 2;
  const byViewBox = VIEWBOX_LIMIT - TOPIC_R;
  // ⚠️ 여기에 `Math.max(CLUSTER_R_INNER + 0.5, …)` 바닥을 두었었다. 「안쪽 빈 원보다 작아지면
  //    span 이 음수가 되어 NaN 이 된다」는 이유였는데 **그런 일은 일어나지 않는다** —
  //    `r² = inner² + span·(mi+0.5)/n` 의 계수가 (0,1) 이라 r² 는 항상 inner² 와 outer² 사이고
  //    둘 다 제곱이라 음수가 못 된다. 오히려 그 바닥이 상한을 이웃 한계 **위로** 밀어올려
  //    K≥17 에서 겹침을 만들었다(실측 K=17·n=5: 바닥 있음 −0.045 / 없음 +0.314).
  //    0 바닥만 남긴다 — 음수 반지름은 기하학적으로 무의미하다.
  return Math.max(0, Math.min(byViewBox, byNeighbour));
}

/**
 * 글 `n` 편이 밀도 `AREA_PER_NODE` 로 들어가는 원반의 반지름.
 *
 * ⚠️ `cap` 이 걸리는 순간부터 밀도가 계속 올라가 **원끼리 겹친다.** 이건 안전망이 아니라
 *    클러스터 충돌을 노드 충돌로 바꾸는 것이다 — 100×100 viewBox 의 유한한 용량이
 *    드러나는 자리다. **실측(2026-08-27, K=6): 한 토픽 70편에서 상한이 발동하고 96편에서 겹친다.**
 *    현재 최대는 51편이라 K=6 에서는 여유가 있다. 문제는 K 축이다 —
 *    **K=8 이면 49편에서 깨진다.** 카테고리를 둘만 더 만들면 오늘의 51편이 그 자리에서 겹친다.
 *    `tests/atlas/layout.test.ts` 의 (K, n) 격자가 두 축을 함께 못박는다.
 */
function clusterRadius(n: number, cap: number): number {
  const need = CLUSTER_R_INNER * CLUSTER_R_INNER + (n * AREA_PER_NODE) / Math.PI;
  return Math.min(cap, Math.sqrt(need));
}

/**
 * 고아 노드 링의 반지름. 이웃한 두 원의 중심 거리가 `2r·sin(π/n)` 이므로
 * 그것이 두 반지름의 합을 넘도록 r 을 키운다. **고정 6 으로 두면 16 개부터 겹친다**(실측) —
 * 실측 고아 0건이라 안 드러날 뿐인 잠재 결함이다.
 * 상한 15 는 가장 안쪽 클러스터를 침범하지 않기 위한 것이다.
 *
 * ⚠️ 그 상한에도 대가가 있다 — **고아가 39 개를 넘으면 링 위에서 서로 겹친다**
 *    (`2·15·sin(π/n) < 2.4`). 상한이 클러스터 충돌을 노드 충돌로 바꾸는 것이라
 *    `clusterRadius` 와 같은 성질이다. 실측 고아 0 건이라 테스트는 30 개까지만 민다 —
 *    **상한 값 자체는 어떤 테스트도 안 잠근다.** 그만큼 많은 고아가 실제로 생기면
 *    링이 아니라 중앙 원반에 해바라기로 깔아라.
 */
function orphanRing(n: number): number {
  if (n < 2) return ORPHAN_R_MIN;
  const need = (NODE_RADIUS.topic + NODE_RADIUS.selected) / (2 * Math.sin(Math.PI / n));
  return Math.min(15, Math.max(ORPHAN_R_MIN, need));
}

/**
 * viewBox 밖으로 나가는 것을 막는 **이중** 안전망.
 *
 * ⚠️ `clusterCap` 의 `byViewBox` 항이 이미 `TOPIC_R + 반지름 ≤ VIEWBOX_LIMIT(48)` 을 보장하므로
 *    이 가지는 **그 계산이 틀렸을 때만** 지나간다. 즉 어떤 (K, n) 으로도 테스트가 여기를
 *    못 밟는다 — 이 함수를 항등으로 바꿔도 아무 테스트가 빨개지지 않는다.
 *    실측 최대 확장은 47.87(K=2·n=200). **알고 두는 미검증 가지다.** 지우려면
 *    `byViewBox` 가 유일한 방어가 된다는 것을 알고 지워라.
 */
const clamp = (v: number) => Math.min(98, Math.max(2, v));

/** 소수점 2자리. 부동소수점 꼬리가 스냅샷과 기준선 해시를 흔드는 것을 막는다. */
const round = (v: number) => Math.round(v * 100) / 100;

/**
 * **화면에 실제로 그릴 엣지.** 설계서 §7.5 의 「엣지를 선택 노드 주변만 그린다」 규칙이다.
 *
 * 실측 1,053 개는 Dot 임계(≤300)의 3.5 배다. 노드 162 개는 임계 안이므로
 * **노드는 전부 그리고 엣지만 줄인다.** 선택이 없으면 토픽이 끝점인 것만(방사형 살),
 * 선택되면 그 노드에 붙은 것만(1-hop). 수치는 테스트가 못박는다 — 여기 적으면 낡는다.
 *
 * 엣지 **타입**이 아니라 **끝점이 토픽인가**로 고른다. 오늘은 둘이 같지만
 * (토픽이 끝점인 것이 곧 `instantiates` 전량), 타입 이름이 바뀌어도
 * 「방사형 살만 그린다」는 의도는 안 깨져야 한다.
 *
 * ⚠️ `topicIds.has(e.from)` 가지는 오늘 **한 번도 안 지나간다** — `build.ts` 가 만드는
 *    `instantiates` 는 전부 글→토픽이라 토픽이 `from` 인 엣지가 0 개다. 방향이 뒤집힌
 *    엣지가 생겨도 살아남게 하는 것이 목적이고, 테스트가 합성 엣지로 그 가지를 지나간다.
 */
export function visibleEdges(graph: AtlasGraph, selected: string | null): AtlasEdge[] {
  const topicIds = new Set(graph.nodes.filter((n) => n.type === "concept").map((n) => n.id));
  const chosen =
    selected == null
      ? graph.edges.filter((e) => topicIds.has(e.from) || topicIds.has(e.to))
      : graph.edges.filter((e) => e.from === selected || e.to === selected);

  // 같은 두 점을 잇는 선은 하나면 된다. 겹쳐 그리면 그 선만 진해져
  // 「더 굵은 연결」이라는 없는 정보를 준다. 두 글 사이에 `extends` 와 `sequence` 가
  // 동시에 있을 수 있고(실측 93쌍), 렌더러가 타입을 안 읽으므로 오늘 잃는 정보는 없다.
  // ⚠️ 나중에 타입별 색을 넣으면 「임의로 고른 타입으로 칠한다」가 된다. 그때 여기를 고쳐라.
  const seen = new Set<string>();
  const out: AtlasEdge[] = [];
  for (const e of chosen) {
    const key = e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/**
 * 선택 노드에 **무방향으로** 붙은 노드들. 방향을 따지면 백링크가 사라진다 —
 * 토픽 노드는 outbound 가 0 이라 방향을 따지는 순간 이웃이 전부 없어지고,
 * SVG 의 강조도 `aria-label` 의 「이어진 글 N편」도 통째로 거짓이 된다.
 */
export function neighborsOf(graph: AtlasGraph, selected: string | null): Set<string> {
  const set = new Set<string>();
  if (selected == null) return set;
  for (const e of graph.edges) {
    if (e.from === selected) set.add(e.to);
    if (e.to === selected) set.add(e.from);
  }
  set.delete(selected); // 자기참조가 생겨도 자기 자신은 이웃이 아니다
  return set;
}

/** 목록 뷰의 한 구획. `topic` 이 `null` 이면 어느 토픽에도 안 붙는 글 모음이다. */
export type AtlasSection = {
  key: string;
  title: string;
  topic: AtlasNode | null;
  members: AtlasNode[];
};

/** 어느 토픽에도 안 붙는 글이 모이는 구획의 키. 토픽 slug 와 부딪히지 않게 접두사를 쓴다. */
export const OTHER_SECTION_KEY = "__other";

/**
 * 목록 뷰의 구획. `layoutRadial` 과 **같은 노드 집합**을 덮어야 한다.
 *
 * ⚠️ 처음에는 토픽별 구획만 만들었는데, 그러면 `topics[0]` 이 어느 토픽과도 안 맞는 글이
 *    **어느 구획에도 안 들어간다.** 그래프는 같은 글을 고아 링에 그리므로 두 뷰의 노드
 *    집합이 갈라지고, 목록이 키보드 경로라서 그 글은 **키보드로 도달 불가**가 된다.
 *    실측 0건이라 안 드러날 뿐이었다. 테스트가 두 뷰의 집합 일치를 잠근다.
 */
export function listSections(graph: AtlasGraph): AtlasSection[] {
  const artifacts = graph.nodes.filter((n) => n.type === "artifact").slice().sort(byId);
  const topics = graph.nodes.filter((n) => n.type === "concept").slice().sort(byId);
  const claimed = new Set<string>();

  const sections: AtlasSection[] = topics.map((topic) => {
    const members = artifacts.filter((n) => n.topics[0] === topic.topics[0]);
    for (const m of members) claimed.add(m.id);
    return { key: topic.topics[0] ?? topic.id, title: topic.title, topic, members };
  });

  const rest = artifacts.filter((n) => !claimed.has(n.id));
  if (rest.length > 0) {
    sections.push({ key: OTHER_SECTION_KEY, title: "그 밖의 글", topic: null, members: rest });
  }
  return sections;
}
