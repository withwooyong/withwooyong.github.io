import { describe, expect, it } from "vitest";
import {
  DEFAULT_EDGE_DURATION,
  REST_SECONDS,
  computeSchedule,
  hasSequence,
  inboundWindows,
  nodeStatusAt,
  packetKeyframes,
  pulseKeyframes,
  stepIndexAt,
} from "@/components/flow-diagram/sequence";
import { toStackedSpec } from "@/components/flow-diagram/stacked-layout";
import type { FlowEdge, FlowSpec } from "@/components/flow-diagram/types";
import { validateFlowSpec } from "@/components/flow-diagram/validate";
import { skbFlowSearchSpec } from "@/data/diagrams/skb-flow-search";

/** 노드 셋과 엣지 둘짜리 최소 스펙. 엣지만 갈아 끼워 규칙을 시험한다 */
function specWith(edges: FlowEdge[], steps?: FlowSpec["steps"]): FlowSpec {
  return {
    id: "t",
    title: "t",
    desc: "t",
    viewBox: { w: 600, h: 120 },
    nodes: [
      { id: "a", label: "A", shape: "box", x: 10, y: 30, w: 100, h: 40 },
      { id: "b", label: "B", shape: "box", x: 200, y: 30, w: 100, h: 40 },
      { id: "c", label: "C", shape: "box", x: 400, y: 30, w: 100, h: 40 },
    ],
    edges,
    steps,
  };
}

const ab = { from: "a", to: "b", kind: "data" } as const;
const bc = { from: "b", to: "c", kind: "data" } as const;

describe("computeSchedule — 엣지 시작 시각", () => {
  it("order 가 없으면 창도 한 바퀴 길이도 없다", () => {
    const s = computeSchedule([{}, { duration: 2 }]);
    expect(s.windows).toEqual([]);
    expect(s.cycleSeconds).toBe(0);
    expect(s.edgeStarts).toEqual([null, null]);
    expect(hasSequence([{}, { duration: 2 }])).toBe(false);
  });

  it("순서대로 이어 붙는다: 기본 duration 0.8 이면 0 · 0.8 · 1.6 초에 시작한다", () => {
    const s = computeSchedule([{ order: 1 }, { order: 2 }, { order: 3 }]);
    expect(s.edgeStarts[0]).toBeCloseTo(0);
    expect(s.edgeStarts[1]).toBeCloseTo(DEFAULT_EDGE_DURATION);
    expect(s.edgeStarts[2]).toBeCloseTo(DEFAULT_EDGE_DURATION * 2);
    expect(s.playSeconds).toBeCloseTo(DEFAULT_EDGE_DURATION * 3);
  });

  it("마지막 order 가 끝나면 2초 쉰다", () => {
    const s = computeSchedule([{ order: 1 }, { order: 2 }]);
    expect(REST_SECONDS).toBe(2);
    expect(s.cycleSeconds).toBeCloseTo(s.playSeconds + 2);
    expect(computeSchedule([{ order: 1 }], 5).cycleSeconds).toBeCloseTo(0.8 + 5);
  });

  it("같은 order 는 동시에 시작하고, 다음 order 는 가장 긴 엣지가 끝난 뒤 시작한다", () => {
    const s = computeSchedule([
      { order: 1, duration: 0.5 },
      { order: 1, duration: 1.5 },
      { order: 2 },
    ]);
    expect(s.edgeStarts[0]).toBe(0);
    expect(s.edgeStarts[1]).toBe(0);
    expect(s.edgeEnds[0]).toBeCloseTo(0.5);
    expect(s.edgeEnds[1]).toBeCloseTo(1.5);
    expect(s.edgeStarts[2]).toBeCloseTo(1.5);
    expect(s.windows.map((w) => w.order)).toEqual([1, 2]);
  });

  it("엣지 배열의 순서와 무관하게 order 순으로 재생한다", () => {
    const s = computeSchedule([{ order: 2 }, { order: 1 }]);
    expect(s.edgeStarts[1]).toBe(0);
    expect(s.edgeStarts[0]).toBeCloseTo(0.8);
  });

  it("order 가 없는 엣지는 null 이고 일정에 끼지 않는다", () => {
    const s = computeSchedule([{}, { order: 1 }]);
    expect(s.edgeStarts).toEqual([null, 0]);
    expect(s.edgeEnds[0]).toBeNull();
    expect(s.windows).toHaveLength(1);
  });

  it("양수가 아닌 duration 은 기본값으로 받는다", () => {
    for (const duration of [0, -1, Number.NaN]) {
      const s = computeSchedule([{ order: 1, duration }, { order: 2 }]);
      expect(s.edgeStarts[1]).toBeCloseTo(DEFAULT_EDGE_DURATION);
    }
  });
});

describe("stepIndexAt · nodeStatusAt · inboundWindows", () => {
  const s = computeSchedule([{ order: 1 }, { order: 2 }, { order: 3 }]);

  it("시각이 속한 단계를 고르고, 쉬는 동안은 마지막 단계에 머문다", () => {
    expect(stepIndexAt(s, 0)).toBe(0);
    expect(stepIndexAt(s, 0.79)).toBe(0);
    expect(stepIndexAt(s, 0.9)).toBe(1);
    expect(stepIndexAt(s, s.playSeconds + 1)).toBe(2);
  });

  it("경계에서는 atEnd 가 앞 단계를 고른다 — 한 단계를 끝까지 재생하고 멈춘 자리", () => {
    const boundary = s.windows[0].end;
    expect(stepIndexAt(s, boundary)).toBe(1);
    expect(stepIndexAt(s, boundary, true)).toBe(0);
  });

  it("도착 노드: 출발 전 idle, 이동 중 busy, 도착한 순간 done", () => {
    const inbound = [{ start: 1, end: 2 }];
    expect(nodeStatusAt(inbound, 0.99)).toBe("idle");
    expect(nodeStatusAt(inbound, 1)).toBe("busy");
    expect(nodeStatusAt(inbound, 1.99)).toBe("busy");
    expect(nodeStatusAt(inbound, 2)).toBe("done");
    expect(nodeStatusAt(undefined, 5)).toBe("idle");
  });

  it("들어오는 엣지가 둘이면 둘 다 끝나야 done 이다", () => {
    const inbound = [
      { start: 0, end: 1 },
      { start: 3, end: 4 },
    ];
    expect(nodeStatusAt(inbound, 2)).toBe("busy");
    expect(nodeStatusAt(inbound, 4)).toBe("done");
  });

  it("도착 창은 엣지의 to 노드별로 모은다", () => {
    const edges = [
      { to: "b", order: 1 },
      { to: "c", order: 2 },
      { to: "c", order: 2 },
      { to: "d" },
    ];
    const map = inboundWindows(edges, computeSchedule(edges));
    expect(map.get("b")).toEqual([{ start: 0, end: 0.8 }]);
    expect(map.get("c")).toHaveLength(2);
    expect(map.has("d")).toBe(false);
  });
});

describe("keyframes", () => {
  const cycle = 4;

  it("패킷은 자기 구간에서만 보이고 0% -> 100% 로 움직인다", () => {
    const frames = packetKeyframes(1, 2, cycle);
    const visible = frames.filter((f) => f.opacity === 1);
    expect(visible.map((f) => f.offset)).toEqual([0.25, 0.5]);
    expect(visible.map((f) => f.offsetDistance)).toEqual(["0%", "100%"]);
    expect(frames[0]).toMatchObject({ offset: 0, opacity: 0 });
    expect(frames[frames.length - 1]).toMatchObject({ offset: 1, opacity: 0 });
  });

  it("start 가 0 이면 첫 프레임부터 보인다", () => {
    expect(packetKeyframes(0, 1, cycle)[0]).toMatchObject({ offset: 0, opacity: 1 });
  });

  it("오프셋은 0~1 안에서 줄어들지 않는다", () => {
    for (const [s, e] of [[0, 0.8], [1, 2], [3.2, 4]] as const) {
      const offsets = packetKeyframes(s, e, cycle).map((f) => f.offset);
      expect(offsets.every((o) => o >= 0 && o <= 1)).toBe(true);
      expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    }
  });

  it("맥박은 도착 시각에 1 -> 1.06 -> 1 이고, 겹치는 도착은 합친다", () => {
    const frames = pulseKeyframes([1], cycle);
    expect(frames.map((f) => f.offset)).toEqual([0, 0.25, 0.3, 0.35, 1]);
    expect(frames.map((f) => f.scale)).toEqual([1, 1, 1.06, 1, 1]);

    const merged = pulseKeyframes([1, 1.2], cycle); // 0.4초 맥박 안에 또 도착
    expect(merged.filter((f) => f.scale > 1)).toHaveLength(1);
    const offsets = pulseKeyframes([1, 1.2, 2], cycle).map((f) => f.offset);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  });
});

describe("validateFlowSpec — 순서 재생 규칙이 실제로 걸린다", () => {
  it("올바른 스펙은 통과한다", () => {
    const spec = specWith(
      [
        { ...ab, order: 1, duration: 1.2 },
        { ...bc, order: 2 },
      ],
      [
        { order: 1, caption: "가" },
        { order: 2, caption: "나" },
      ],
    );
    expect(validateFlowSpec(spec)).toEqual([]);
  });

  it("order 가 없는 스펙은 그대로 통과한다 (하위 호환)", () => {
    expect(validateFlowSpec(specWith([ab, bc]))).toEqual([]);
  });

  it.each([
    ["0", 0],
    ["음수", -1],
    ["소수", 1.5],
    ["NaN", Number.NaN],
  ])("order 가 %s 이면 걸린다", (_name, order) => {
    const errors = validateFlowSpec(specWith([{ ...ab, order }]));
    expect(errors.some((e) => e.includes("1 이상의 정수"))).toBe(true);
  });

  it("order 가 1 에서 시작하지 않으면 빈 번호로 걸린다", () => {
    const errors = validateFlowSpec(specWith([{ ...ab, order: 2 }]));
    expect(errors.some((e) => e.includes("order 1번이 비었습니다"))).toBe(true);
  });

  it("중간 번호가 비면 걸린다", () => {
    const errors = validateFlowSpec(
      specWith([
        { ...ab, order: 1 },
        { ...bc, order: 3 },
      ]),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("order 2번이 비었습니다");
  });

  it("같은 order 를 여러 엣지가 써도 빈 번호가 없으면 통과한다", () => {
    const edges: FlowEdge[] = [
      { ...ab, order: 1 },
      { ...bc, order: 1 },
    ];
    expect(validateFlowSpec(specWith(edges))).toEqual([]);
  });

  it.each([
    ["0", 0],
    ["음수", -0.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("duration 이 %s 이면 걸린다", (_name, duration) => {
    const errors = validateFlowSpec(specWith([{ ...ab, order: 1, duration }]));
    expect(errors.some((e) => e.includes("duration"))).toBe(true);
  });

  it("엣지에 없는 order 의 step 은 걸린다", () => {
    const errors = validateFlowSpec(
      specWith([{ ...ab, order: 1 }], [{ order: 1, caption: "가" }, { order: 5, caption: "없음" }]),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("order 5");
  });

  it("order 가 하나도 없는 스펙의 steps 는 전부 걸린다", () => {
    const errors = validateFlowSpec(specWith([ab], [{ order: 1, caption: "가" }]));
    expect(errors).toHaveLength(1);
  });

  it("step 의 order 가 중복되면 걸린다", () => {
    const errors = validateFlowSpec(
      specWith([{ ...ab, order: 1 }], [{ order: 1, caption: "가" }, { order: 1, caption: "나" }]),
    );
    expect(errors.some((e) => e.includes("중복"))).toBe(true);
  });
});

describe("홈 흐름도 스펙 · 좁은 화면 재배치", () => {
  it("skb-flow-search 는 검증기를 통과하고 11단계를 가진다", () => {
    expect(validateFlowSpec(skbFlowSearchSpec)).toEqual([]);
    const s = computeSchedule(skbFlowSearchSpec.edges);
    expect(s.windows.map((w) => w.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(skbFlowSearchSpec.steps).toHaveLength(11);
    // 8단계는 두 엣지가 동시에 나간다
    const eight = skbFlowSearchSpec.edges.filter((e) => e.order === 8);
    expect(eight).toHaveLength(2);
  });

  it("toStackedSpec 뒤에도 order · duration · steps 가 그대로다", () => {
    const stacked = toStackedSpec(skbFlowSearchSpec, 360);
    expect(stacked.steps).toEqual(skbFlowSearchSpec.steps);
    const key = (e: FlowEdge) => `${e.from}>${e.to}`;
    const before = new Map(skbFlowSearchSpec.edges.map((e) => [key(e), [e.order, e.duration]]));
    expect(stacked.edges).toHaveLength(skbFlowSearchSpec.edges.length);
    for (const e of stacked.edges) {
      expect([e.order, e.duration]).toEqual(before.get(key(e)));
    }
    expect(validateFlowSpec(stacked)).toEqual([]);
  });

  it("order 가 없는 스펙은 재배치 뒤에도 순서 정보가 생기지 않는다", () => {
    const stacked = toStackedSpec(specWith([ab, bc]), 300);
    expect(stacked.steps).toBeUndefined();
    expect(hasSequence(stacked.edges)).toBe(false);
  });
});
