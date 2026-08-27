import { describe, expect, it } from "vitest";

import { blogCategories } from "@/content/blog/categories";
import {
  atlasEdgeSchema,
  atlasGraphSchema,
  atlasNodeSchema,
  CONFIDENCES,
  EDGE_TYPES,
  NODE_TYPES,
  ORIGINS,
  TOPIC_PREFIX,
  topicId,
} from "@/lib/atlas/types";

/**
 * T7 의 스키마 검사.
 *
 * ⚠️ **통과를 검사하는 것으로는 아무것도 증명되지 않는다.** zod 스키마는 필드가
 *    `z.string()` 하나로 퇴화해도 정상 입력을 계속 통과시킨다 — 그래서 이 파일의
 *    무게는 전부 「거부한다」 쪽에 있다. 리포 `CLAUDE.md` 의 「0 건을 믿기 전에
 *    self-test 를 돌려라」와 같은 논리다.
 */

/** 스키마가 살아 있는지 확인할 때 쓰는 최소 정상 노드. */
function validNode() {
  return {
    id: "rag/rag-observability",
    type: "artifact" as const,
    title: "RAG 관측 가능성",
    summary: "",
    origin: "mine" as const,
    confidence: "working" as const,
    topics: ["rag"],
    tags: ["rag"],
    updated: "2026-08-01",
  };
}

function validGraph() {
  return {
    nodes: [validNode()],
    edges: [{ from: "rag/rag-observability", to: topicId("rag"), type: "instantiates" as const }],
    meta: {
      latest: "2026-08-01",
      counts: {
        artifact: 1,
        concept: 0,
        extendsEdges: 0,
        instantiatesEdges: 1,
        sequenceEdges: 0,
      },
    },
  };
}

describe("topicId", () => {
  it("토픽 접두사를 붙인다", () => {
    expect(topicId("rag")).toBe("topic/rag");
  });

  it("슬래시가 정확히 하나다 — /atlas/[...id] 의 세그먼트 수를 고정한다", () => {
    expect(topicId("search-engineering").split("/")).toHaveLength(2);
  });
});

describe("id 는 URL 조각이다 — catch-all 이 필요한 이유", () => {
  /**
   * 글 노드의 id 는 `<category>/<slug>` 라 슬래시가 들어간다. Next.js 의 `[id]` 는
   * 한 세그먼트만 받으므로 이 사실이 곧 `[...id]` catch-all 요구사항이다.
   * 계획서 File Structure 표가 2026-08-27 까지 `[id].tsx` 라고 적고 있었다.
   */
  it("글 노드 id 에는 슬래시가 있다", () => {
    expect(validNode().id).toContain("/");
  });

  /**
   * ⚠️ 계획서는 「6 개는 …」이라며 **디렉터리만** 셌다. 실제 등록은 `categories.ts` 의
   *    12 개이고, 글이 0 편인 카테고리도 나중에 글이 생기면 노드가 된다.
   *    카테고리가 13 번째로 추가되는 날 이 검사가 막는다.
   */
  it("등록된 카테고리 slug 중 토픽 접두사와 충돌하는 것이 없다", () => {
    const collisions = blogCategories
      .map((c) => c.slug)
      .filter((slug) => slug === TOPIC_PREFIX || slug.startsWith(`${TOPIC_PREFIX}/`));
    expect(collisions).toEqual([]);
  });

  it("카테고리 slug 에는 슬래시가 없다 — 있으면 글 id 의 세그먼트 수가 흔들린다", () => {
    const withSlash = blogCategories.map((c) => c.slug).filter((slug) => slug.includes("/"));
    expect(withSlash).toEqual([]);
  });
});

describe("상수 배열", () => {
  it("claim·procedure 를 타입에 담아 둔다 — 1차 데이터에 없어도", () => {
    // 하이브리드 스키마를 고른 이유(§7.9). 나중에 노드를 더할 때 UI 를 안 고치려는 것이다.
    expect(NODE_TYPES).toContain("claim");
    expect(NODE_TYPES).toContain("procedure");
  });

  it("엣지 타입 6 종 · 출처 3 종 · 확신도 3 종", () => {
    expect(EDGE_TYPES).toHaveLength(6);
    expect(ORIGINS).toHaveLength(3);
    expect(CONFIDENCES).toHaveLength(3);
  });
});

describe("atlasNodeSchema — 거부해야 하는 것", () => {
  it("정상 노드는 통과한다 (대조군)", () => {
    expect(atlasNodeSchema.safeParse(validNode()).success).toBe(true);
  });

  it("빈 id 를 거부한다 — 빈 문자열은 URL 조각이 될 수 없다", () => {
    expect(atlasNodeSchema.safeParse({ ...validNode(), id: "" }).success).toBe(false);
  });

  it("모르는 노드 타입을 거부한다", () => {
    expect(atlasNodeSchema.safeParse({ ...validNode(), type: "tag" }).success).toBe(false);
  });

  it("모르는 출처·확신도를 거부한다", () => {
    expect(atlasNodeSchema.safeParse({ ...validNode(), origin: "borrowed" }).success).toBe(false);
    expect(atlasNodeSchema.safeParse({ ...validNode(), confidence: "certain" }).success).toBe(false);
  });

  it("빈 title 을 거부한다", () => {
    expect(atlasNodeSchema.safeParse({ ...validNode(), title: "" }).success).toBe(false);
  });

  it("topics·tags 가 배열이 아니면 거부한다", () => {
    expect(atlasNodeSchema.safeParse({ ...validNode(), topics: "rag" }).success).toBe(false);
    expect(atlasNodeSchema.safeParse({ ...validNode(), tags: null }).success).toBe(false);
  });

  it("필수 필드가 빠지면 거부한다", () => {
    const { updated, ...withoutUpdated } = validNode();
    expect(updated).toBeTruthy();
    expect(atlasNodeSchema.safeParse(withoutUpdated).success).toBe(false);
  });

  it("source 는 선택이지만, 있으면 모양을 지켜야 한다", () => {
    const ok = { ...validNode(), source: { kind: "note" as const, ref: "content/blog/rag/x.md" } };
    expect(atlasNodeSchema.safeParse(ok).success).toBe(true);
    expect(
      atlasNodeSchema.safeParse({ ...validNode(), source: { kind: "wiki", ref: "x" } }).success,
    ).toBe(false);
  });
});

describe("atlasEdgeSchema — 거부해야 하는 것", () => {
  it("정상 엣지는 통과한다 (대조군)", () => {
    expect(
      atlasEdgeSchema.safeParse({ from: "a/b", to: "topic/rag", type: "instantiates" }).success,
    ).toBe(true);
  });

  it("모르는 엣지 타입을 거부한다", () => {
    expect(atlasEdgeSchema.safeParse({ from: "a/b", to: "c/d", type: "relates" }).success).toBe(
      false,
    );
  });

  it("빈 from·to 를 거부한다 — 어디에도 안 붙은 엣지가 그래프에 남는다", () => {
    expect(atlasEdgeSchema.safeParse({ from: "", to: "c/d", type: "extends" }).success).toBe(false);
    expect(atlasEdgeSchema.safeParse({ from: "a/b", to: "", type: "extends" }).success).toBe(false);
  });
});

describe("atlasGraphSchema — meta 가 있어야 한다", () => {
  it("정상 그래프는 통과한다 (대조군)", () => {
    expect(atlasGraphSchema.safeParse(validGraph()).success).toBe(true);
  });

  it("meta 가 없으면 거부한다", () => {
    const { meta, ...withoutMeta } = validGraph();
    expect(meta).toBeTruthy();
    expect(atlasGraphSchema.safeParse(withoutMeta).success).toBe(false);
  });

  it("counts 가 음수면 거부한다", () => {
    const g = validGraph();
    g.meta.counts.artifact = -1;
    expect(atlasGraphSchema.safeParse(g).success).toBe(false);
  });

  it("counts 가 정수가 아니면 거부한다", () => {
    const g = validGraph();
    g.meta.counts.concept = 1.5;
    expect(atlasGraphSchema.safeParse(g).success).toBe(false);
  });

  it("counts 키가 빠지면 거부한다 — T9 게이트가 이 다섯 개를 읽는다", () => {
    const g = validGraph();
    const { sequenceEdges, ...rest } = g.meta.counts;
    expect(sequenceEdges).toBe(0);
    expect(atlasGraphSchema.safeParse({ ...g, meta: { ...g.meta, counts: rest } }).success).toBe(
      false,
    );
  });

  it("nodes·edges 가 빠지면 거부한다", () => {
    expect(atlasGraphSchema.safeParse({ ...validGraph(), nodes: undefined }).success).toBe(false);
    expect(atlasGraphSchema.safeParse({ ...validGraph(), edges: undefined }).success).toBe(false);
  });
});
