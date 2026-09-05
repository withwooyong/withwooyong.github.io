import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT_OPTIONS, layout, separationVector } from "@/lib/blog/graph-layout";
import type { GraphEdge } from "@/lib/blog/types";

const OPT = DEFAULT_LAYOUT_OPTIONS;

/** 중심 하나에 이웃 n 개를 달고, 이웃끼리도 사슬로 잇는다 */
function ring(n: number): { centerId: string; nodeIds: string[]; edges: GraphEdge[] } {
  const nodeIds = ["c"];
  const edges: GraphEdge[] = [];
  for (let i = 0; i < n; i++) {
    nodeIds.push(`n${i}`);
    edges.push({ from: "c", to: `n${i}` });
    if (i > 0) edges.push({ from: `n${i - 1}`, to: `n${i}` });
  }
  return { centerId: "c", nodeIds, edges };
}

describe("겹침 해소 벡터", () => {
  it("0 이 아닌 방향을 낸다 — 0 이면 거리가 0 인 채로 남아 NaN 이 된다", () => {
    const v = separationVector(0, 1);
    expect(Math.abs(v.dx) + Math.abs(v.dy)).toBeGreaterThan(0);
  });

  it("같은 쌍에 항상 같은 방향을 낸다 — 난수를 쓰지 않는다", () => {
    expect(separationVector(3, 7)).toEqual(separationVector(3, 7));
  });

  it("다른 쌍에는 다른 방향을 낸다", () => {
    expect(separationVector(0, 1)).not.toEqual(separationVector(0, 2));
  });
});

describe("좌표 계산", () => {
  it("같은 입력에 같은 좌표를 낸다", () => {
    expect(layout(ring(8))).toEqual(layout(ring(8)));
  });

  it("중심 노드가 뷰박스 한가운데에 온다", () => {
    const p = layout(ring(8)).find((q) => q.id === "c")!;
    expect(p.x).toBeCloseTo(OPT.width / 2, 6);
    expect(p.y).toBeCloseTo(OPT.height / 2, 6);
  });

  it("🔴 모든 좌표가 유한하다 — NaN 이면 SVG 가 오류 없이 아무것도 그리지 않는다", () => {
    for (const n of [0, 1, 2, 3, 12]) {
      for (const p of layout(ring(n))) {
        expect(Number.isFinite(p.x), `${n}개: ${p.id}.x`).toBe(true);
        expect(Number.isFinite(p.y), `${n}개: ${p.id}.y`).toBe(true);
      }
    }
  });

  it("모든 좌표가 뷰박스 안에 있다", () => {
    // 🔴 기본 뷰박스 하나만 보면 **가로 축의 축소 계산을 통째로 지워도 통과한다.**
    // `width` 가 `height` 보다 넓어 세로 한계가 늘 먼저 걸리기 때문이다 — 뮤턴트 G7 이
    // 실측으로 그렇게 생존했다. 가로가 좁은 뷰박스를 함께 넣어야 두 축이 각각 검사된다.
    const boxes: Array<[string, typeof OPT]> = [
      ["기본", OPT],
      ["가로가 좁은 뷰박스", { ...OPT, width: 80 }],
      ["최소 간격이 큰 뷰박스", { ...OPT, width: 96, minGap: 40 }],
    ];
    for (const [name, opt] of boxes) {
      for (const p of layout(ring(12), opt)) {
        expect(p.x, `${name}: ${p.id}.x`).toBeGreaterThanOrEqual(0);
        expect(p.x, `${name}: ${p.id}.x`).toBeLessThanOrEqual(opt.width);
        expect(p.y, `${name}: ${p.id}.y`).toBeGreaterThanOrEqual(0);
        expect(p.y, `${name}: ${p.id}.y`).toBeLessThanOrEqual(opt.height);
      }
    }
  });

  it("서로 다른 두 노드가 최소 간격의 절반보다 가깝지 않다", () => {
    // 이 케이스가 실패하면 임계값을 낮추지 말고 REPULSION 을 올려라.
    // 임계값을 낮추는 것은 「겹쳐도 된다」로 규칙을 바꾸는 일이다.
    const points = layout(ring(12));
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
        expect(d, `${points[i].id} 와 ${points[j].id}`).toBeGreaterThanOrEqual(OPT.minGap / 2);
      }
    }
  });

  it("연결선이 하나도 없어도 배치가 된다", () => {
    const points = layout({ centerId: "c", nodeIds: ["c", "a", "b"], edges: [] });
    expect(points).toHaveLength(3);
    expect(points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it("중심만 있어도 배치가 된다", () => {
    expect(layout({ centerId: "c", nodeIds: ["c"], edges: [] })).toEqual([
      { id: "c", x: OPT.width / 2, y: OPT.height / 2 },
    ]);
  });

  it("노드에 없는 id 를 가리키는 연결선은 무시한다", () => {
    const points = layout({ centerId: "c", nodeIds: ["c", "a"], edges: [{ from: "c", to: "없음" }] });
    expect(points.map((p) => p.id)).toEqual(["c", "a"]);
  });

  it("틱을 0 으로 주면 초기 원형 배치가 그대로 나온다", () => {
    const points = layout(ring(4), { ...OPT, ticks: 0 });
    expect(points.every((p) => Number.isFinite(p.x))).toBe(true);
    // 중심을 뺀 넷의 중심으로부터의 거리가 모두 같다 — 원주 위에 균등 배치했기 때문이다.
    const c = points.find((p) => p.id === "c")!;
    const ds = points.filter((p) => p.id !== "c").map((p) => Math.hypot(p.x - c.x, p.y - c.y));
    for (const d of ds) expect(d).toBeCloseTo(ds[0], 6);
  });
});
