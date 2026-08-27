import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/atlas/build";
import {
  ATLAS_PALETTE,
  EDGE_WIDTH,
  NODE_RADIUS,
  OTHER_SECTION_KEY,
  layoutRadial,
  listSections,
  neighborsOf,
  paint,
  visibleEdges,
  type Point,
} from "@/lib/atlas/layout";
import type { AtlasEdge, AtlasGraph, AtlasNode } from "@/lib/atlas/types";
import { contrastRatio, parseHex } from "@/lib/design/contrast";
import { readPosts } from "@/lib/blog/loader";

const graph = buildGraph(readPosts());

const dist = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y);

/** 무방향 선분의 정체성. 그리는 선 하나가 곧 이 키 하나다. */
const segment = (e: { from: string; to: string }) =>
  e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`;

/**
 * 겹침 판정. 한 번에 하나만 선택되므로 최악은 「한쪽이 선택된 상태」다.
 * 글끼리면 `selected + artifact`, 토픽·글이면 `topic + selected`.
 * 둘 다 `artifact` 반지름으로 재면 선택하는 순간 겹치는 것을 못 잡는다.
 */
const needGap = (a: string, b: string) =>
  a === "concept" || b === "concept"
    ? (a === "concept" ? NODE_RADIUS.topic : NODE_RADIUS.selected) +
      (b === "concept" ? NODE_RADIUS.topic : NODE_RADIUS.selected)
    : NODE_RADIUS.selected + NODE_RADIUS.artifact;

/** 가장 아슬아슬한 두 원의 여유. 음수면 겹친 것이다. */
function worstOverlap(g: AtlasGraph) {
  const pos = layoutRadial(g);
  let worst = { pair: "(없음)", gap: Number.POSITIVE_INFINITY };
  for (let i = 0; i < g.nodes.length; i++) {
    for (let j = i + 1; j < g.nodes.length; j++) {
      const a = pos.get(g.nodes[i].id);
      const b = pos.get(g.nodes[j].id);
      if (!a || !b) continue;
      const gap = dist(a, b) - needGap(g.nodes[i].type, g.nodes[j].type);
      if (gap < worst.gap) worst = { pair: `${g.nodes[i].id} ↔ ${g.nodes[j].id}`, gap };
    }
  }
  return worst;
}

/** 자기 토픽이 아닌 토픽에 더 가까운 글. 클러스터가 이웃을 삼키면 여기에 쌓인다. */
function strayMembers(g: AtlasGraph) {
  const pos = layoutRadial(g);
  const topics = g.nodes.filter((n) => n.type === "concept");
  const out: string[] = [];
  for (const a of g.nodes.filter((n) => n.type === "artifact")) {
    const own = topics.find((t) => t.topics[0] === a.topics[0]);
    if (!own) continue;
    const dOwn = dist(pos.get(a.id)!, pos.get(own.id)!);
    if (topics.some((t) => t.id !== own.id && dist(pos.get(a.id)!, pos.get(t.id)!) < dOwn)) {
      out.push(a.id);
    }
  }
  return out;
}

/** 합성 그래프. 토픽 K 개 · 토픽당 글 N 편. 실측 데이터가 못 가는 축을 재는 데 쓴다. */
function syntheticGraph(topicCount: number, perTopic: number): AtlasGraph {
  const nodes: AtlasNode[] = [];
  const base = {
    summary: "",
    origin: "mine" as const,
    confidence: "working" as const,
    tags: [],
    updated: "2026-01-01",
  };
  for (let k = 0; k < topicCount; k++) {
    const slug = `t${String(k).padStart(2, "0")}`;
    nodes.push({ ...base, id: `topic/${slug}`, type: "concept", title: slug, topics: [slug] });
    for (let i = 0; i < perTopic; i++) {
      nodes.push({
        ...base,
        id: `${slug}/p${String(i).padStart(4, "0")}`,
        type: "artifact",
        title: `${slug} ${i}`,
        topics: [slug],
      });
    }
  }
  return { nodes, edges: [], meta: graph.meta };
}

describe("layoutRadial", () => {
  it("모든 노드에 좌표를 준다", () => {
    const pos = layoutRadial(graph);
    expect(graph.nodes.filter((n) => !pos.has(n.id)).map((n) => n.id)).toHaveLength(0);
  });

  it("결정론적이다 — 두 번 돌려 같은 값", () => {
    const a = layoutRadial(graph);
    const b = layoutRadial(graph);
    for (const n of graph.nodes) expect(a.get(n.id)).toEqual(b.get(n.id));
  });

  /**
   * 계획서 T10 의 「정렬을 빼지 마라」가 실제로 지키려던 불변식이다.
   * 「두 번 돌려 같다」로는 이걸 못 잡는다 — 같은 배열을 두 번 넣기 때문이다.
   */
  it("graph.nodes 배열 순서에 의존하지 않는다", () => {
    const base = layoutRadial(graph);
    const shuffled = graph.nodes
      .map((n, i) => ({ n, k: (i * 7919) % graph.nodes.length }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.n);
    expect(shuffled.map((n) => n.id)).not.toEqual(graph.nodes.map((n) => n.id));

    const after = layoutRadial({ ...graph, nodes: shuffled });
    for (const n of graph.nodes) expect(after.get(n.id)).toEqual(base.get(n.id));
  });

  /**
   * ⚠️ 정렬이 `localeCompare` 면 로컬 Windows 와 CI Linux 의 ICU 차이로 순서가 갈리고
   *    산출물 해시가 흔들린다(`lib/atlas/build.ts` 가 같은 이유로 금지한다).
   *    오늘의 156 개 id 로는 두 정렬이 한 자리도 안 다르므로 **실데이터로는 못 잡는다** —
   *    두 비교가 실제로 갈리는 id 를 합성해 넣는다.
   */
  it("정렬이 로케일이 아니라 코드포인트다", () => {
    const ids = ["a/Zeta", "a/alpha"];
    const codepoint = ids.slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const locale = ids.slice().sort((a, b) => a.localeCompare(b));
    expect(codepoint).not.toEqual(locale); // 대조군: 이 픽스처는 두 정렬을 실제로 가른다

    const base = { summary: "", origin: "mine" as const, confidence: "working" as const, tags: [], updated: "2026-01-01" };
    const g: AtlasGraph = {
      nodes: [
        { ...base, id: "topic/a", type: "concept", title: "A", topics: ["a"] },
        { ...base, id: ids[0], type: "artifact", title: "Zeta", topics: ["a"] },
        { ...base, id: ids[1], type: "artifact", title: "alpha", topics: ["a"] },
      ],
      edges: [],
      meta: graph.meta,
    };
    const pos = layoutRadial(g);
    // 코드포인트 순이면 대문자 Zeta 가 0번 슬롯(가장 안쪽)이다. 로케일 순이면 alpha 가 온다.
    const rTopic = { x: pos.get("topic/a")!.x, y: pos.get("topic/a")!.y };
    expect(dist(pos.get(ids[0])!, rTopic)).toBeLessThan(dist(pos.get(ids[1])!, rTopic));
  });

  it("좌표가 viewBox 0..100 안에 있다", () => {
    for (const p of Array.from(layoutRadial(graph).values())) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });

  it("좌표는 소수점 2자리다 — 스냅샷과 기준선 해시가 부동소수점으로 흔들리지 않게", () => {
    for (const p of Array.from(layoutRadial(graph).values())) {
      expect(p.x).toBe(Math.round(p.x * 100) / 100);
      expect(p.y).toBe(Math.round(p.y * 100) / 100);
    }
  });

  /**
   * 계획서 원안은 데이터가 없으면 `return` 으로 조용히 통과했다.
   * 「면제가 동작했다」와 「이 픽스처는 애초에 대상이 아니었다」가 같은 초록이 된다.
   * 픽스처 존재를 **먼저 단언**해 그 침묵을 없앤다.
   */
  it("같은 토픽의 글이 서로 가깝다", () => {
    const pos = layoutRadial(graph);
    const of = (topic: string) =>
      graph.nodes.filter((n) => n.type === "artifact" && n.topics[0] === topic);
    const rag = of("rag");
    const other = of("search-engineering");
    expect(rag.length).toBeGreaterThanOrEqual(2);
    expect(other.length).toBeGreaterThanOrEqual(1);

    const d = (a: string, b: string) => dist(pos.get(a)!, pos.get(b)!);
    expect(d(rag[0].id, rag[1].id)).toBeLessThan(d(rag[0].id, other[0].id));
  });

  it("모든 글은 자기 토픽 노드에 가장 가깝다", () => {
    expect(graph.nodes.filter((n) => n.type === "concept").length).toBeGreaterThanOrEqual(2);
    expect(strayMembers(graph)).toEqual([]);
  });

  it("두 노드의 원이 겹치지 않는다", () => {
    const worst = worstOverlap(graph);
    expect(
      worst.gap >= 0 ? "겹침 없음" : `겹침: ${worst.pair} (${worst.gap.toFixed(2)})`,
    ).toBe("겹침 없음");
  });

  /**
   * ⚠️ 겹침 테스트는 `NODE_RADIUS` 를 피검체와 **같은 모듈에서** 가져온다. 그래서 반지름을
   *    줄이는 변경은 기대값도 같이 줄어 원리상 못 잡는다(뮤테이션 실측: `selected 1.5→0.9` 생존).
   *    값을 리터럴로 못박아 그 구멍을 막는다. 반지름을 바꾸려면 이 줄도 같이 고쳐야 하고,
   *    그때 위의 겹침 여유를 다시 확인하게 된다.
   */
  it("반지름과 굵기가 임의로 줄어들지 않는다", () => {
    expect(NODE_RADIUS).toEqual({ topic: 1.9, artifact: 0.9, selected: 1.5 });
    expect(EDGE_WIDTH).toEqual({ resting: 0.12, lit: 0.3 });
  });
});

/**
 * 오늘의 데이터가 못 가는 축. 계획서 원안은 「무리 최대 32편」을 상수에 굳혔다가
 * 51편에서 깨졌고, 그것을 고친 첫 판은 「토픽 6개」를 상수에 굳혔다가 8개에서 깨졌다.
 * 같은 실수를 세 번째 하지 않도록 두 축 모두 합성 데이터로 봉투를 친다.
 */
describe("레이아웃이 견디는 범위 — 합성 데이터로 두 축을 민다", () => {
  it("합성 그래프 생성기 자체 증명", () => {
    const g = syntheticGraph(3, 4);
    expect(g.nodes.filter((n) => n.type === "concept")).toHaveLength(3);
    expect(g.nodes.filter((n) => n.type === "artifact")).toHaveLength(12);
    expect(new Set(g.nodes.map((n) => n.id)).size).toBe(g.nodes.length);
  });

  /**
   * **실측 격자.** 처음에는 `syntheticGraph(k, round(156/k))` 로 총 노드를 156 에 묶었는데,
   * 그러면 K 가 커질 때 n 이 자동으로 줄어 **격자의 대각선 하나만** 훑는다. K 와 n 은
   * 서로를 잡아먹는 두 축이다 — 상한은 K 로 줄고 필요 반지름은 n 으로 큰다. 둘을 따로 민다.
   *
   * 값은 2026-08-27 실측이다. K≤4 가 전부 114 인 것은 이웃 클러스터가 아니라
   * **viewBox 상한**이 먼저 물기 때문이고, K≥6 부터 이웃 한계가 먼저 물어 급격히 좁아진다.
   *
   * ⚠️ **K=8 은 n=49 에서 깨지는데 오늘 `ai-agent` 가 51 편이다.** 카테고리를 둘만 더 만들면
   *    그 자리에서 겹친다. 지금 고칠 수 없다 — K=8·n=51 은 이웃 조건이 `TOPIC_R ≥ 36.85` 를,
   *    viewBox 조건이 `TOPIC_R ≤ 35.10` 을 요구해 **해가 없다.** 밀도(`AREA_PER_NODE`)를
   *    낮춰야 풀리고, 그건 모든 좌표를 바꾸는 재설계다. 그때 이 표를 다시 재라.
   */
  const FIRST_BREAK: [number, number][] = [
    [2, 114],
    [6, 96],
    [7, 68],
    [8, 49],
    [9, 37],
    [10, 27],
    [11, 20],
    [12, 15],
    [14, 9],
    [17, 9],
    [20, 4],
  ];

  it("격자의 안쪽 — 처음 깨지는 n 의 바로 직전까지는 겹치지 않는다", () => {
    const broken: string[] = [];
    for (const [k, n] of FIRST_BREAK) {
      const g = syntheticGraph(k, n - 1);
      const gap = worstOverlap(g).gap;
      const strays = strayMembers(g);
      if (gap < 0 || strays.length > 0) broken.push(`K=${k} n=${n - 1} gap=${gap.toFixed(3)} strays=${strays.length}`);
    }
    expect(broken).toEqual([]);
  });

  /**
   * 격자의 **바깥**도 못박는다. 한계를 적어 두지 않으면 「지금 안전」과 「영원히 안전」이
   * 구별되지 않는다. 이 테스트가 빨개졌다면 한계를 넘긴 것이 아니라 **한계가 움직인 것**이니,
   * 격자를 다시 재고 위 표를 갱신해라 — 개선이면 축하할 일이고 악화면 회귀다.
   */
  it("격자의 경계 — 그 n 에서 실제로 깨진다", () => {
    const wrong: string[] = [];
    for (const [k, n] of FIRST_BREAK) {
      const gap = worstOverlap(syntheticGraph(k, n)).gap;
      if (gap >= 0) wrong.push(`K=${k} n=${n} 이 아직 안 깨진다 (gap=${gap.toFixed(3)})`);
    }
    expect(wrong).toEqual([]);
  });

  /**
   * viewBox 상계. `clusterCap` 의 `byViewBox` 항이 없으면 K 가 작을 때 클러스터가
   * 화면 밖으로 나가고 `clamp` 가 테두리에 노드를 쌓는다.
   */
  it("어떤 (K, n) 에서도 중심에서 48 을 넘지 않는다", () => {
    const over: string[] = [];
    for (const [k, n] of [...FIRST_BREAK, [2, 200] as [number, number], [3, 150] as [number, number]]) {
      const ext = Math.max(
        ...Array.from(layoutRadial(syntheticGraph(k, n)).values()).map((p) => Math.hypot(p.x - 50, p.y - 50)),
      );
      if (ext > 48) over.push(`K=${k} n=${n} 확장 ${ext.toFixed(2)}`);
    }
    expect(over).toEqual([]);
  });

  /**
   * ⚠️ 이 단언은 **원리상 빨개지기 어렵다.** `r² = inner² + span·(mi+0.5)/n` 의 계수가 (0,1) 이라
   *    r² 는 늘 inner² 와 outer² 사이고 둘 다 제곱이라 음수가 못 된다 — 여기 있던
   *    `Math.max(CLUSTER_R_INNER + 0.5, …)` 바닥이 「NaN 방지」라는 거짓 근거로 서 있었고,
   *    실제로는 상한을 이웃 한계 위로 밀어올려 K≥17 에서 겹침을 만들었다. 바닥은 걷어냈다.
   *    이 테스트는 게이트가 아니라 **연기 감지기**다 — 0 나누기 같은 다른 경로로 NaN 이
   *    들어오는 것을 본다. 그 성격을 알고 두는 것이니 「검증됨」으로 읽지 마라.
   */
  it("토픽이 1개뿐이거나 20개여도 좌표가 유한하다", () => {
    for (const k of [1, 20]) {
      const pos = layoutRadial(syntheticGraph(k, 30));
      const bad = Array.from(pos.values()).filter((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y));
      expect(bad).toEqual([]);
      expect(pos.size).toBe(k * 31);
    }
  });

  /**
   * 고아 노드는 실측 0건이라 실데이터로는 이 가지를 지나가지 않는다.
   * 링 반지름을 고정하면 21개를 넘는 순간 겹치므로, 합성으로 그 지점을 넘겨 본다.
   */
  it("어느 토픽에도 안 붙는 글이 30편 있어도 겹치지 않는다", () => {
    const g = syntheticGraph(6, 10);
    const base = { summary: "", origin: "mine" as const, confidence: "working" as const, tags: [], updated: "2026-01-01" };
    const orphans: AtlasNode[] = Array.from({ length: 30 }, (_, i) => ({
      ...base,
      id: `zz/orphan${String(i).padStart(3, "0")}`,
      type: "artifact" as const,
      title: `고아 ${i}`,
      topics: ["no-such-topic"],
    }));
    const withOrphans: AtlasGraph = { ...g, nodes: [...g.nodes, ...orphans] };

    const pos = layoutRadial(withOrphans);
    expect(orphans.filter((o) => !pos.has(o.id))).toHaveLength(0); // 대조군: 실제로 배치됐다
    const worst = worstOverlap(withOrphans);
    expect(worst.gap >= 0 ? "겹침 없음" : `겹침: ${worst.pair} (${worst.gap.toFixed(2)})`).toBe(
      "겹침 없음",
    );
  });
});

describe("visibleEdges — 엣지를 다 그리지 않는다", () => {
  const topicIds = new Set(graph.nodes.filter((n) => n.type === "concept").map((n) => n.id));

  it("계획서가 요구한 축소가 실제로 일어난다", () => {
    expect(graph.edges.length).toBe(1053);
    expect(visibleEdges(graph, null)).toHaveLength(156);
  });

  it("선택이 없으면 토픽이 끝점인 엣지만 — 방사형 살", () => {
    const initial = visibleEdges(graph, null);
    expect(initial.filter((e) => !topicIds.has(e.from) && !topicIds.has(e.to))).toEqual([]);
  });

  it("노드를 고르면 그 노드에 붙은 것만 — 1-hop", () => {
    for (const id of ["topic/ai-agent", "agentic-coding/agentic-coding-qna-setup"]) {
      const shown = visibleEdges(graph, id);
      expect(shown.length).toBeGreaterThan(0);
      expect(shown.filter((e) => e.from !== id && e.to !== id)).toEqual([]);
    }
  });

  it("가장 붐비는 노드조차 Dot 임계(300) 안이다", () => {
    const counts = graph.nodes.map((n) => visibleEdges(graph, n.id).length).sort((a, b) => a - b);
    expect(counts[counts.length - 1]).toBeLessThanOrEqual(300);
    expect(counts[Math.floor(counts.length / 2)]).toBe(8); // 중앙값 — 낡으면 여기서 터진다
  });

  /**
   * ⚠️ `build.ts` 가 만드는 `instantiates` 는 전부 글→토픽이라 **토픽이 `from` 인 엣지가
   *    0 개다.** 그래서 `topicIds.has(e.from)` 가지는 실데이터로 한 번도 안 지나가고,
   *    지워도 아무 테스트가 반응하지 않았다(뮤테이션 실측 생존). 합성으로 그 가지를 민다.
   */
  it("방향이 뒤집힌 토픽 엣지도 방사형 살로 본다", () => {
    const topic = graph.nodes.find((n) => n.type === "concept")!;
    const article = graph.nodes.find((n) => n.type === "artifact" && n.topics[0] !== topic.topics[0])!;
    expect(graph.edges.filter((e) => topicIds.has(e.from))).toEqual([]); // 대조군: 오늘은 0건

    const reversed: AtlasEdge = { from: topic.id, to: article.id, type: "extends" };
    const g: AtlasGraph = { ...graph, edges: [...graph.edges, reversed] };
    expect(visibleEdges(g, null).some((e) => segment(e) === segment(reversed))).toBe(true);
  });

  /**
   * ⚠️ 픽스처를 **술어로** 고른다. 처음에는 `null` 과 `topic/ai-agent` 로 썼는데 둘 다
   *    중복이 원래 없는 자리였다 — 초기 화면과 토픽의 1-hop 은 전부 `instantiates` 라
   *    토픽↔글이 1:1 이다. 중복은 전부 글↔글 `extends` 에서 나온다.
   *    중복 제거를 통째로 지운 뮤턴트가 **살아남아서** 드러났다.
   */
  const withDuplicates = graph.nodes.filter((n) => {
    const attached = graph.edges.filter((e) => e.from === n.id || e.to === n.id);
    return attached.length > new Set(attached.map(segment)).size;
  });

  it("중복을 가진 노드가 실제로 있다 — 아래 두 테스트의 전제다", () => {
    expect(withDuplicates.length).toBeGreaterThan(0);
  });

  it("같은 두 점을 잇는 선을 두 번 그리지 않는다", () => {
    for (const n of withDuplicates.slice(0, 20)) {
      const attached = graph.edges.filter((e) => e.from === n.id || e.to === n.id);
      expect(attached.length).toBeGreaterThan(new Set(attached.map(segment)).size); // 대조군
      const shown = visibleEdges(graph, n.id);
      expect(new Set(shown.map(segment)).size).toBe(shown.length);
    }
  });

  it("중복을 지우되 선분은 하나도 잃지 않는다", () => {
    const cases: (string | null)[] = [null, ...withDuplicates.slice(0, 20).map((n) => n.id)];
    for (const sel of cases) {
      const raw = new Set(
        graph.edges
          .filter((e) =>
            sel == null ? topicIds.has(e.from) || topicIds.has(e.to) : e.from === sel || e.to === sel,
          )
          .map(segment),
      );
      expect(new Set(visibleEdges(graph, sel).map(segment))).toEqual(raw);
    }
  });

  it("React key 로 쓰는 선분 키가 모든 선택 상태에서 유일하다", () => {
    for (const sel of [null, ...graph.nodes.map((n) => n.id)]) {
      const keys = visibleEdges(graph, sel).map((e) => `${e.from}|${e.to}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe("neighborsOf", () => {
  /**
   * ⚠️ 첫 판은 픽스처를 `inbound == 0` 인 지도 글로 골랐다. 그런데 **inbound 가 0 인 노드는
   *    이웃이 100% outbound 에서 온다** — inbound 가지를 통째로 지워도 값이 한 자리도 안 변한다.
   *    백링크를 지키려고 쓴 테스트가 백링크 제거를 원리상 못 잡았다(뮤테이션 실측 생존).
   *    올바른 픽스처는 그 반대다: **inbound 는 있고 outbound 는 없는** 노드.
   */
  const inboundOnly = graph.nodes.filter(
    (n) =>
      graph.edges.some((e) => e.to === n.id) && !graph.edges.some((e) => e.from === n.id),
  );

  it("inbound 만 있는 노드가 실재한다 — 아래 테스트의 전제다", () => {
    expect(inboundOnly.length).toBeGreaterThan(0);
    // 대조군: 방향을 따지면 이 노드들의 이웃은 0 이 된다. 그래야 아래 단언이 무언가를 잰다.
    for (const n of inboundOnly) {
      expect(graph.edges.filter((e) => e.from === n.id)).toEqual([]);
    }
  });

  it("방향을 따지지 않는다 — 백링크가 사라지면 토픽이 외톨이가 된다", () => {
    for (const n of inboundOnly) expect(neighborsOf(graph, n.id).size).toBeGreaterThan(0);
  });

  it("outbound 만 있는 노드도 이웃을 갖는다", () => {
    const outboundOnly = graph.nodes.filter(
      (n) => graph.edges.some((e) => e.from === n.id) && !graph.edges.some((e) => e.to === n.id),
    );
    expect(outboundOnly.length).toBeGreaterThan(0); // T9 실측: role:map 인 글 4편
    for (const n of outboundOnly) expect(neighborsOf(graph, n.id).size).toBeGreaterThan(0);
  });

  it("선택이 없으면 빈 집합이다", () => {
    expect(neighborsOf(graph, null).size).toBe(0);
  });

  /**
   * ⚠️ 실측 자기참조 엣지는 0 건이다. 실제 그래프로 단언하면 `set.delete` 가 있든 없든
   *    초록이 된다 — 자기참조를 직접 만들어 넣고, 빼기 전에는 잡히는지부터 확인한다.
   */
  it("자기참조가 있어도 자기 자신은 이웃이 아니다", () => {
    expect(graph.edges.filter((e) => e.from === e.to)).toEqual([]);

    const target = graph.nodes[0].id;
    const spiked: AtlasGraph = {
      ...graph,
      edges: [...graph.edges, { from: target, to: target, type: "extends" }],
    };
    const naive = new Set<string>();
    for (const e of spiked.edges) {
      if (e.from === target) naive.add(e.to);
      if (e.to === target) naive.add(e.from);
    }
    expect(naive.has(target)).toBe(true); // 대조군

    expect(neighborsOf(spiked, target).has(target)).toBe(false);
  });

  it("SVG 강조와 목록이 보는 이웃 집합이 화면 엣지와 어긋나지 않는다", () => {
    for (const n of graph.nodes) {
      const drawn = new Set<string>();
      for (const e of visibleEdges(graph, n.id)) {
        drawn.add(e.from === n.id ? e.to : e.from);
      }
      expect(Array.from(neighborsOf(graph, n.id)).filter((id) => !drawn.has(id))).toEqual([]);
    }
  });
});

describe("listSections — 목록이 그래프와 같은 글을 덮는다", () => {
  it("두 뷰의 노드 집합이 갈라지지 않는다", () => {
    const inList = new Set(listSections(graph).flatMap((s) => s.members.map((m) => m.id)));
    const artifacts = graph.nodes.filter((n) => n.type === "artifact").map((n) => n.id);
    expect(artifacts.filter((id) => !inList.has(id))).toEqual([]);
    expect(inList.size).toBe(artifacts.length);
  });

  /**
   * ⚠️ 실측 고아 0 건이라 실데이터로는 이 가지를 지나가지 않는다.
   *    합성으로 넣고, **넣기 전에는 빠지던 것**부터 확인한다.
   */
  it("어느 토픽에도 안 붙는 글이 「그 밖의 글」로 들어온다 — 키보드 도달 불가를 막는다", () => {
    const base = { summary: "", origin: "mine" as const, confidence: "working" as const, tags: [], updated: "2026-01-01" };
    const orphan: AtlasNode = {
      ...base,
      id: "zz/orphan",
      type: "artifact",
      title: "고아 글",
      topics: ["no-such-topic"],
    };
    const g: AtlasGraph = { ...graph, nodes: [...graph.nodes, orphan] };

    // 대조군: 토픽 구획만 보면 이 글은 어디에도 없다
    const topicOnly = listSections(g).filter((s) => s.key !== OTHER_SECTION_KEY);
    expect(topicOnly.flatMap((s) => s.members.map((m) => m.id))).not.toContain(orphan.id);

    const all = listSections(g).flatMap((s) => s.members.map((m) => m.id));
    expect(all).toContain(orphan.id);
    expect(layoutRadial(g).has(orphan.id)).toBe(true); // 그래프에도 그려진다
  });

  it("구획 키가 유일하고 글이 두 구획에 겹쳐 들어가지 않는다", () => {
    const sections = listSections(graph);
    expect(new Set(sections.map((s) => s.key)).size).toBe(sections.length);
    const ids = sections.flatMap((s) => s.members.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("고아가 없으면 「그 밖의 글」 구획을 만들지 않는다", () => {
    expect(listSections(graph).map((s) => s.key)).not.toContain(OTHER_SECTION_KEY);
  });
});

/**
 * WCAG 1.4.11 비텍스트 대비. 아틀라스의 점은 **클릭 대상이자 본문**이라
 * 「비활성 요소」 면제를 받지 못한다.
 */
describe("팔레트가 비텍스트 대비 3:1 을 만족한다", () => {
  const THRESHOLD = 3;
  const LIGHT = { "--n4": "#e0e0e4", "--n5": "#a1a1aa", "--n6": "#71717a", "--n7": "#52525b", "--signal": "#a16207", "--n0": "#f7f7f8", "--n1": "#ffffff", "--n3": "#f0f0f2" };
  const DARK = { "--n4": "#2a2a31", "--n5": "#52525b", "--n6": "#7e7e86", "--n7": "#a1a1aa", "--signal": "#fbbf24", "--n0": "#08080a", "--n1": "#0b0b0d", "--n3": "#1c1c21" };

  /**
   * ⚠️ 배경을 `--n0` 하나로만 재면 구멍이 남는다. T11 이 아틀라스를 카드(`--n1`)나
   *    구분면(`--n3`) 위에 올릴 수 있고, 그때 여유가 가장 얇은 조합이 통과선 아래로
   *    내려가도 테스트는 초록으로 남는다. 세 면을 다 잰다 — 6항목 × 2테마 × 3면 = 36칸.
   */
  const SURFACES = ["--n0", "--n1", "--n3"] as const;

  /** 불투명도를 배경 위에 합성한 실제 색. opacity 를 무시하면 통과선을 잘못 읽는다. */
  function composite(fg: string, bg: string, opacity: number): string {
    const [fr, fg2, fb] = parseHex(fg);
    const [br, bg2, bb] = parseHex(bg);
    const mix = (f: number, b: number) => Math.round(opacity * f + (1 - opacity) * b);
    return `#${[mix(fr, br), mix(fg2, bg2), mix(fb, bb)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  }

  it("합성기 자체 증명 — 불투명도를 실제로 반영한다", () => {
    expect(composite("#000000", "#ffffff", 1)).toBe("#000000");
    expect(composite("#000000", "#ffffff", 0)).toBe("#ffffff");
    expect(composite("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("검사기 자체 증명 — 알려진 미달 조합을 실제로 잡는다", () => {
    // 처음 구현이 쓴 조합이다. 이게 통과로 나오면 검사가 고장 난 것이다.
    expect(contrastRatio(composite(LIGHT["--n5"], LIGHT["--n0"], 0.85), LIGHT["--n0"])).toBeLessThan(THRESHOLD);
    expect(contrastRatio(composite(DARK["--n5"], DARK["--n0"], 0.85), DARK["--n0"])).toBeLessThan(THRESHOLD);
    expect(contrastRatio(composite(LIGHT["--n4"], LIGHT["--n0"], 0.45), LIGHT["--n0"])).toBeLessThan(THRESHOLD);
  });

  for (const [theme, vars] of [["라이트", LIGHT], ["다크", DARK]] as const) {
    for (const surface of SURFACES) {
      it(`${theme}: 팔레트 6항목이 ${surface} 위에서 3:1 을 넘는다`, () => {
        const bg = (vars as Record<string, string>)[surface];
        expect(bg, `${surface} 가 이 테마 표에 없다`).toBeDefined();

        const failed: string[] = [];
        for (const [name, entry] of Object.entries(ATLAS_PALETTE)) {
          const hex = (vars as Record<string, string>)[entry.token];
          expect(hex, `${entry.token} 이 이 테마 표에 없다`).toBeDefined();
          const ratio = contrastRatio(composite(hex, bg, entry.opacity), bg);
          if (ratio < THRESHOLD) failed.push(`${name}(${entry.token}@${entry.opacity}) ${ratio.toFixed(2)}`);
        }
        expect(failed).toEqual([]);
      });
    }
  }

  /**
   * 가장 얇은 여유를 사실로 붙들어 둔다. 통과 여부만 재면 3.26 이 3.02 가 되어도
   * 아무도 모른다 — 어느 날 3.00 아래로 내려가는 것을 그때 처음 안다.
   */
  it("가장 얇은 여유가 어디인지 기록한다", () => {
    let worst = { where: "", ratio: Number.POSITIVE_INFINITY };
    for (const [theme, vars] of [["라이트", LIGHT], ["다크", DARK]] as const) {
      for (const surface of SURFACES) {
        for (const [name, entry] of Object.entries(ATLAS_PALETTE)) {
          const v = vars as Record<string, string>;
          const ratio = contrastRatio(composite(v[entry.token], v[surface], entry.opacity), v[surface]);
          if (ratio < worst.ratio) worst = { where: `${theme} ${name} on ${surface}`, ratio };
        }
      }
    }
    expect(worst.ratio).toBeGreaterThanOrEqual(THRESHOLD);
    // 여유가 10% 미만이면 색을 손댈 때 반드시 다시 재라는 뜻이다
    expect(`${worst.where} ${worst.ratio.toFixed(2)}`).toBe("라이트 dimmed on --n3 3.26");
  });

  it("팔레트가 대비 미달 토큰을 다시 들이지 않는다", () => {
    const banned = ["--n4", "--n5"];
    const used = Object.values(ATLAS_PALETTE).map((p) => p.token);
    expect(used.filter((t) => banned.includes(t))).toEqual([]);
  });

  it("paint 가 CSS 변수 참조를 낸다 — 색을 리터럴로 굳히지 않는다", () => {
    expect(paint(ATLAS_PALETTE.accent)).toBe("var(--signal)");
    for (const p of Object.values(ATLAS_PALETTE)) expect(paint(p)).toMatch(/^var\(--[\w-]+\)$/);
  });
});

/**
 * GC-9 — 액센트는 첫 화면 픽셀의 5% 이하. 선행 계획서 T9 가 15.68% 로 반려된 규칙이다.
 *
 * **뷰포트를 몰라도 상한을 증명할 수 있다.** SVG 가 `viewBox="0 0 100 100"` 에
 * 기본 `preserveAspectRatio="xMidYMid meet"` 이므로 뷰박스 전체가 요소 안에 들어간다:
 *
 *     액센트픽셀/첫화면 = (액센트/뷰박스) × (뷰박스렌더픽셀/첫화면픽셀)
 *                                          └────── 항상 ≤ 1 ──────┘
 *
 * 따라서 **뷰박스 면적 비율이 화면 비율의 상한**이다. `slice` 크롭이면 성립하지 않으니
 * 렌더러의 `preserveAspectRatio` 를 바꾸면 이 테스트의 근거가 무너진다.
 */
describe("GC-9 액센트 면적 — 뷰박스 비율로 상한을 증명한다", () => {
  const VIEWBOX_AREA = 100 * 100;
  const CAP = 0.05;

  /** 액센트로 칠해지는 넓이. 원은 π r², 선은 길이 × 굵기. 겹침을 안 빼므로 상한이다. */
  function accentArea(selected: string | null): number {
    if (selected == null) return 0; // 선택 전에는 액센트가 한 번도 안 나온다
    const pos = layoutRadial(graph);
    const neighbors = neighborsOf(graph, selected);

    let area = Math.PI * NODE_RADIUS.selected ** 2;
    for (const id of Array.from(neighbors)) {
      const node = graph.nodes.find((n) => n.id === id);
      const r = node?.type === "concept" ? NODE_RADIUS.topic : NODE_RADIUS.artifact;
      area += Math.PI * r ** 2;
    }
    for (const e of visibleEdges(graph, selected)) {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (a && b) area += dist(a, b) * EDGE_WIDTH.lit;
    }
    return area;
  }

  it("선택 전에는 액센트가 0 이다", () => {
    expect(accentArea(null)).toBe(0);
    // 대조군: 팔레트에서 선택 전에 쓰이는 항목 중 액센트 토큰은 없다
    const resting = [ATLAS_PALETTE.topic, ATLAS_PALETTE.artifact, ATLAS_PALETTE.edge];
    expect(resting.map((p) => p.token)).not.toContain(ATLAS_PALETTE.accent.token);
  });

  it("어떤 노드를 골라도 5% 를 넘지 않는다", () => {
    const worst = graph.nodes
      .map((n) => ({ id: n.id, frac: accentArea(n.id) / VIEWBOX_AREA }))
      .sort((a, b) => b.frac - a.frac)[0];
    expect(`${worst.id} ${(worst.frac * 100).toFixed(2)}%`).toBe(
      worst.frac <= CAP ? `${worst.id} ${(worst.frac * 100).toFixed(2)}%` : "5% 초과",
    );
    expect(worst.frac).toBeLessThanOrEqual(CAP);
  });

  /**
   * 계측기 자체 증명. 상한을 넘는 구성을 실제로 넘는다고 판정해야 한다.
   * 쓰는 구성은 **계획서 원안의 렌더러가 하던 것** — 엣지 1,053 개를 전부 그린다.
   */
  it("계측기 자체 증명 — 엣지를 전부 강조하면 상한을 넘는다", () => {
    const pos = layoutRadial(graph);
    let area = 0;
    for (const e of graph.edges) {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (a && b) area += dist(a, b) * EDGE_WIDTH.lit;
    }
    expect(area / VIEWBOX_AREA).toBeGreaterThan(CAP);
  });

  /**
   * ⚠️ 계획서 T10 은 「162 개를 전부 amber 로 칠하면 GC-9 를 **몇 배로** 넘는다」고 적었다.
   *    실측하면 **넘지 않는다** — 점 반지름이 0.9 라 156 개를 다 합쳐도 뷰박스의 4%대다.
   *    액센트를 아무 데나 쓰지 말라는 규칙 자체는 옳지만(액센트가 어디에나 있으면 아무것도
   *    가리키지 못한다), **면적을 지배하는 것은 점이 아니라 선이다.** 위 자기검사가
   *    엣지 쪽을 쓰는 이유이고, 이 테스트는 그 사실이 낡지 않도록 숫자를 붙들어 둔다.
   */
  it("노드를 전부 액센트로 칠해도 뷰박스 기준으로는 상한 아래다 — 계획서의 근거는 틀렸다", () => {
    const all =
      graph.nodes.filter((n) => n.type === "artifact").length * Math.PI * NODE_RADIUS.artifact ** 2 +
      graph.nodes.filter((n) => n.type === "concept").length * Math.PI * NODE_RADIUS.topic ** 2;
    const frac = all / VIEWBOX_AREA;
    expect(frac).toBeLessThan(CAP);
    expect(frac).toBeGreaterThan(0.04); // 여유가 크지 않다는 것도 사실로 남긴다
  });
});
