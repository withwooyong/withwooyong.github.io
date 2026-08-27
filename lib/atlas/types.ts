import { z } from "zod";

/**
 * 아틀라스 스키마. 설계서 §7.1~7.2 · 계획서 T7.
 *
 * ⚠️ 1차 데이터에는 `claim`·`procedure` 노드가 **없다.**
 *    글은 주장이 아니라 산출물이라 자동 매핑으로 나오지 않는다 — 저작이 필요한 단계 5 의 일이다.
 *    그래도 타입에는 넣어 둔다. 나중에 노드를 추가할 때 **UI 를 고치지 않아도 되게** 하는 것이
 *    하이브리드 스키마를 고른 이유다(§7.9).
 *
 * ⚠️ 태그는 노드가 아니다(D-2). `tags` 필드로만 남고 사이드바 필터가 쓴다.
 *    최대 허브 `ai-agent` 가 44 편을 이어 힘 기반 레이아웃을 지배하기 때문이다.
 *
 * ⚠️ **클라이언트 컴포넌트는 이 모듈에서 값을 가져오지 마라.** `zod` 가 브라우저 번들에
 *    실려 나간다. 타입만 필요하면 `import type { AtlasGraph } from "@/lib/atlas/types"` 로
 *    쓴다 — `isolatedModules: true` 라 `import type` 이 아니면 트랜스파일러가 지우지 못한다.
 *    `NODE_TYPES` 같은 상수를 화면에서 써야 하면 그때 값 전용 모듈로 분리한다.
 *    T10 에서 `components/atlas/*` 를 만들 때 빌드 후
 *    `grep -rlF 'ZodError' out/_next/static/chunks/` 로 확인하라 — 0 이어야 한다.
 */

/** 토픽 노드 id 의 접두사. 카테고리 slug 와 충돌하면 안 된다 — `tests/atlas/types.test.ts` 가 잡는다. */
export const TOPIC_PREFIX = "topic";

export const NODE_TYPES = ["artifact", "concept", "claim", "procedure"] as const;
export const ORIGINS = ["mine", "external", "derived"] as const;
export const CONFIDENCES = ["settled", "working", "speculative"] as const;
export const EDGE_TYPES = [
  "supports",
  "contradicts",
  "extends",
  "instantiates",
  "depends_on",
  "sequence",
] as const;

export const atlasNodeSchema = z.object({
  /** URL 조각이다. 글은 `<category>/<slug>`, 토픽은 `topic/<slug>`. */
  id: z.string().min(1),
  type: z.enum(NODE_TYPES),
  title: z.string().min(1),
  summary: z.string(),
  origin: z.enum(ORIGINS),
  confidence: z.enum(CONFIDENCES),
  /** 소속 카테고리 slug. 토픽 노드는 자기 자신을 담는다. */
  topics: z.array(z.string()),
  tags: z.array(z.string()),
  source: z.object({ kind: z.enum(["note", "external"]), ref: z.string() }).optional(),
  updated: z.string(),
});

export const atlasEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(EDGE_TYPES),
  note: z.string().optional(),
});

export const atlasGraphSchema = z.object({
  nodes: z.array(atlasNodeSchema),
  edges: z.array(atlasEdgeSchema),
  meta: z.object({
    /**
     * 빌드 시각이 아니라 **글의 최신 `updated`** 다.
     * 빌드마다 바뀌면 `graph` 가 들어간 산출물의 해시가 매번 달라지고
     * `check-baseline` 이 영원히 빨개진다. 내용이 안 바뀌면 값도 안 바뀌어야 한다.
     */
    latest: z.string(),
    counts: z.object({
      artifact: z.number().int().nonnegative(),
      concept: z.number().int().nonnegative(),
      extendsEdges: z.number().int().nonnegative(),
      instantiatesEdges: z.number().int().nonnegative(),
      sequenceEdges: z.number().int().nonnegative(),
    }),
  }),
});

export type AtlasNode = z.infer<typeof atlasNodeSchema>;
export type AtlasEdge = z.infer<typeof atlasEdgeSchema>;
export type AtlasGraph = z.infer<typeof atlasGraphSchema>;

export type AtlasNodeType = (typeof NODE_TYPES)[number];
export type AtlasEdgeType = (typeof EDGE_TYPES)[number];

/**
 * 토픽 노드의 id. 글 id(`<category>/<slug>`)와 절대 겹치지 않게 접두사를 둔다.
 *
 * 결과에 슬래시가 하나 들어가므로 글 노드와 세그먼트 수가 같다 —
 * `/atlas/[...id]` catch-all 이 둘을 같은 모양으로 받는다.
 */
export function topicId(slug: string): string {
  return `${TOPIC_PREFIX}/${slug}`;
}
