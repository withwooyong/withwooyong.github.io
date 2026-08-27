import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/atlas/build";
import { neighborsOf, nodeDetailProps } from "@/lib/atlas/neighbors";
import type { AtlasEdge, AtlasGraph, AtlasNode } from "@/lib/atlas/types";
import { readPosts } from "@/lib/blog/loader";
import { getStaticPaths, getStaticProps } from "@/pages/atlas/[...id]";

/**
 * T11 — `neighborsOf`/`nodeDetailProps` 의 계약 테스트 (TDD red 단계, 구현 없음).
 *
 * 계약 1~7 은 합성 `AtlasGraph` 로 검증한다 — 실제 156편에 의존하면 글이 늘 때 낡는다.
 * 페이로드 예산 테스트만 `buildGraph(readPosts())` 실측 그래프를 쓴다(아래 별도 describe).
 */

/** 최소 AtlasNode 를 만드는 헬퍼. `id`·`type` 만 필수, 나머지는 합리적 기본값. */
function node(over: Partial<AtlasNode> & { id: string; type: AtlasNode["type"] }): AtlasNode {
  return {
    title: `제목 ${over.id}`,
    summary: "설명",
    origin: "mine",
    confidence: "working",
    topics: [],
    tags: [],
    updated: "2026-01-01",
    ...over,
  };
}

/** 최소 AtlasGraph 를 만드는 헬퍼. counts 는 이 테스트들이 검사하지 않으므로 0 으로 채운다. */
function graph(nodes: AtlasNode[], edges: AtlasEdge[]): AtlasGraph {
  return {
    nodes,
    edges,
    meta: {
      latest: "2026-01-01",
      counts: {
        artifact: 0,
        concept: 0,
        extendsEdges: 0,
        instantiatesEdges: 0,
        sequenceEdges: 0,
      },
    },
  };
}

describe("neighborsOf — 계약", () => {
  it("① 방향 무관하게 이웃을 잡는다 — from 쪽이든 to 쪽이든", () => {
    const g = graph(
      [node({ id: "a", type: "artifact" }), node({ id: "b", type: "artifact" })],
      [{ from: "a", to: "b", type: "extends" }]
    );
    expect(neighborsOf(g, "a").map((n) => n.id)).toEqual(["b"]);
    expect(neighborsOf(g, "b").map((n) => n.id)).toEqual(["a"]);
  });

  it("② 무방향 dedupe — 같은 (type, {a,b}) 쌍이 양방향으로 들어와도 한 건만 남는다", () => {
    const g = graph(
      [node({ id: "a", type: "artifact" }), node({ id: "b", type: "artifact" })],
      [
        { from: "a", to: "b", type: "extends" },
        { from: "b", to: "a", type: "extends" },
      ]
    );
    expect(neighborsOf(g, "a")).toHaveLength(1);
    expect(neighborsOf(g, "b")).toHaveLength(1);
  });

  it("③ 타입이 다르면 같은 이웃이라도 유지한다 — extends 와 sequence 동시 존재", () => {
    const g = graph(
      [node({ id: "a", type: "artifact" }), node({ id: "b", type: "artifact" })],
      [
        { from: "a", to: "b", type: "extends" },
        { from: "a", to: "b", type: "sequence" },
      ]
    );
    const result = neighborsOf(g, "a");
    expect(result).toHaveLength(2);
    expect(result.map((n) => n.type).slice().sort()).toEqual(["extends", "sequence"]);
  });

  it("④ 그래프에 없는 id 를 가리키는 엣지는 버린다", () => {
    const g = graph(
      [node({ id: "a", type: "artifact" })],
      [{ from: "a", to: "ghost", type: "extends" }]
    );
    expect(neighborsOf(g, "a")).toEqual([]);
  });

  it("⑤ 존재하지 않는 nodeId 는 빈 배열을 낸다", () => {
    const g = graph([node({ id: "a", type: "artifact" })], []);
    expect(neighborsOf(g, "ghost")).toEqual([]);
  });

  it("⑥ 결정론적 순서 — type 코드포인트 다음 이웃 id 코드포인트 (이 테스트가 규칙을 못박는다)", () => {
    // EDGE_TYPES 코드포인트 순서상 "extends" < "sequence" 다 (lib/atlas/build.ts 의
    // edges.sort 와 같은 타이브레이커 — localeCompare 가 아니라 코드포인트 비교).
    const g = graph(
      [
        node({ id: "a", type: "artifact" }),
        node({ id: "b", type: "artifact" }),
        node({ id: "c", type: "artifact" }),
        node({ id: "d", type: "artifact" }),
      ],
      [
        // 입력 순서를 일부러 결과 순서와 다르게 섞는다.
        { from: "c", to: "a", type: "sequence" },
        { from: "d", to: "a", type: "extends" },
        { from: "a", to: "b", type: "extends" },
      ]
    );
    expect(neighborsOf(g, "a").map((n) => `${n.type}:${n.id}`)).toEqual([
      "extends:b",
      "extends:d",
      "sequence:c",
    ]);
  });

  it("⑦ 자기 자신을 가리키는 엣지(self-loop)는 이웃에 포함하지 않는다", () => {
    const g = graph(
      [node({ id: "a", type: "artifact" })],
      [{ from: "a", to: "a", type: "extends" }]
    );
    expect(neighborsOf(g, "a")).toEqual([]);
  });

  it("AtlasNeighbor 는 type·id·title·nodeType 네 필드만 갖는다", () => {
    const g = graph(
      [node({ id: "a", type: "artifact" }), node({ id: "b", type: "concept", title: "타이틀 b" })],
      [{ from: "a", to: "b", type: "instantiates" }]
    );
    expect(neighborsOf(g, "a")).toEqual([
      { type: "instantiates", id: "b", title: "타이틀 b", nodeType: "concept" },
    ]);
  });
});

describe("nodeDetailProps — 계약", () => {
  it("존재하는 노드는 { node, neighbors } 를 반환한다", () => {
    const g = graph(
      [node({ id: "a", type: "artifact" }), node({ id: "b", type: "artifact" })],
      [{ from: "a", to: "b", type: "extends" }]
    );
    const result = nodeDetailProps(g, "a");
    expect(result).not.toBeNull();
    expect(result!.node.id).toBe("a");
    expect(result!.neighbors).toHaveLength(1);
    expect(result!.neighbors[0].id).toBe("b");
  });

  it("⑤ 존재하지 않는 nodeId 는 null 을 반환한다", () => {
    const g = graph([node({ id: "a", type: "artifact" })], []);
    expect(nodeDetailProps(g, "ghost")).toBeNull();
  });
});

describe("페이로드 예산 — T11 이 존재하는 이유", () => {
  // 실제 로더 + 실제 buildGraph. `readPosts()`·`buildGraph()` 는 draft 를 이미 걸러 낸다
  // (tests/atlas/integrity.test.ts 와 같은 패턴).
  const posts = readPosts();
  const realGraph = buildGraph(posts);

  it(
    "노드당 16,384B · 전체 합 1,048,576B(1MB) 예산 안이다 — " +
      "같은 그래프의 { graph, node } full 페이로드가 먼저 예산을 초과함을 확인해 검사가 살아있음을 증명한다",
    () => {
      // 상한의 근거 (2026-08-27 실측, buildGraph(readPosts()) 기준):
      //   - 전체 그래프 JSON.stringify: 226,605B (nodes 111,285 / edges 115,170 / meta 123)
      //   - { node, neighbors } 162개 총합: 427,706B (평균 2,640 · 최대 9,803 = topic/ai-agent)
      // 아래 상한은 이 실측값에 여유를 둔 것이다 — 글이 늘어도 당장 깨지지 않게.
      // 노드당 16,384B 는 실측 최대(9,803)의 약 1.7배, 전체 1,048,576B(1MB)는 실측 합(427,706)의
      // 약 2.45배. 이 상한이 깨지면 그래프가 그만큼 커졌다는 뜻이고, 그때는 페이로드 설계를
      // 다시 검토해야 한다(예: 이웃을 더 줄이거나 페이지네이션).
      const PER_NODE_BUDGET = 16384;
      const TOTAL_BUDGET = 1048576;

      expect(realGraph.nodes.length).toBeGreaterThan(0);

      let fullTotalBytes = 0;
      let dedupedTotalBytes = 0;

      for (const n of realGraph.nodes) {
        // 차등 대조 절반 1 — 계획서 초안 그대로 그래프 전체를 심었을 때의 크기.
        const fullPayload = { graph: realGraph, node: n };
        fullTotalBytes += Buffer.byteLength(JSON.stringify(fullPayload), "utf8");

        // 차등 대조 절반 2 — 이번 태스크가 만드는 `nodeDetailProps` 의 크기.
        const props = nodeDetailProps(realGraph, n.id);
        expect(props).not.toBeNull();
        // `graph` 키가 없어야 한다 — 이 단언은 아래 fullTotalBytes 초과 단언과 짝을 이룰 때만
        // 의미가 있다(부정 단언 단독으로는 "검사가 산다"와 "애초에 후보가 아니었다"를 못 가른다).
        expect(props).not.toHaveProperty("graph");

        const bytes = Buffer.byteLength(JSON.stringify(props), "utf8");
        expect(bytes).toBeLessThanOrEqual(PER_NODE_BUDGET);
        dedupedTotalBytes += bytes;
      }

      // 검사가 살아 있다는 증거: 같은 그래프로 만든 full 페이로드는 예산을 압도적으로 초과해야 한다.
      expect(fullTotalBytes).toBeGreaterThan(TOTAL_BUDGET);
      // 실제로 만들 nodeDetailProps 총합은 예산 안이어야 한다.
      expect(dedupedTotalBytes).toBeLessThanOrEqual(TOTAL_BUDGET);
    }
  );
});

/**
 * 위 「페이로드 예산」 describe 는 `nodeDetailProps` 만 부른다. 그래서 누군가
 * `pages/atlas/[...id].tsx` 의 `getStaticProps` 를 `{ ...nodeDetailProps(...), graph }` 로
 * 바꿔도 **계속 초록이다** — 이 태스크가 존재하는 이유(+70.5MB 회피)를 지키는 검사가
 * 정작 회귀를 못 잡는다.
 *
 * 이 리포에는 같은 모양의 전례가 둘 있다. `check-forbidden` 이 소스만 보다가 산출물의
 * 366 곳을 놓쳤고(`check-forbidden:built` 가 생긴 이유), `next/head` 는 하이드레이션에
 * 태그를 되살려 DOM 단언이 빠진 태그를 못 봤다. **깨끗한 lib 는 깨끗한 페이지의 증거가 아니다.**
 *
 * 그래서 여기서는 페이지 모듈을 직접 import 해 `getStaticProps` 의 **실제 반환값**을 잰다.
 * (`vitest.config.ts` 의 `oxc.jsx` 설정이 이 import 를 가능하게 한다 — 그 주석 참고.)
 */
describe("페이지의 실제 getStaticProps 반환값 — lib 만 봐서는 못 잡는 회귀", () => {
  it("getStaticPaths 가 낸 경로 전부에서 props 에 graph 가 없고 노드당·총합 예산 안이다", async () => {
    const PER_NODE_BUDGET = 16384;
    const TOTAL_BUDGET = 1048576;

    const pathsResult = await getStaticPaths({});
    expect(pathsResult.paths.length).toBeGreaterThan(0);

    // 차등 대조용. 계획서 초안대로 그래프를 심었을 때의 크기를 같은 루프에서 함께 잰다.
    const controlGraph = buildGraph(readPosts());

    let realTotalBytes = 0;
    let controlTotalBytes = 0;

    for (const entry of pathsResult.paths) {
      // 문자열 경로 형태로 바뀌면 params 가 사라져 이 검사가 무력해진다. 조용히 넘기지 않는다.
      if (typeof entry === "string") {
        throw new Error(`getStaticPaths 가 문자열 경로를 냈다: ${entry}`);
      }

      const result = await getStaticProps({ params: entry.params });
      if (!("props" in result)) {
        throw new Error(`props 없는 결과다: ${JSON.stringify(entry.params)}`);
      }
      const props = await result.props;

      // 계약 자체. 이 단언이 이 describe 의 핵심이다.
      expect(props).not.toHaveProperty("graph");
      expect(props.node.id).toBe(
        Array.isArray(entry.params.id) ? entry.params.id.join("/") : entry.params.id
      );

      const bytes = Buffer.byteLength(JSON.stringify(props), "utf8");
      expect(bytes).toBeLessThanOrEqual(PER_NODE_BUDGET);
      realTotalBytes += bytes;

      controlTotalBytes += Buffer.byteLength(
        JSON.stringify({ ...props, graph: controlGraph }),
        "utf8"
      );
    }

    expect(realTotalBytes).toBeLessThanOrEqual(TOTAL_BUDGET);
    // 검사가 살아 있다는 증거 — 같은 페이지에 graph 를 얹으면 예산을 압도적으로 넘는다.
    // 이 단언이 없으면 위 통과는 「검사가 산다」와 「애초에 후보가 아니었다」를 못 가른다.
    expect(controlTotalBytes).toBeGreaterThan(TOTAL_BUDGET);
  });
});
