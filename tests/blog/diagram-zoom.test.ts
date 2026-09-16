import { describe, expect, it } from "vitest";
import {
  DEFAULT_KIND_NAME,
  TAP_SLOP_PX,
  clampScale,
  fitScale,
  isDismissClick,
  mermaidKindName,
  withObjectParticle,
} from "@/lib/diagram-zoom";

describe("확대 뷰어의 맞춤 배율", () => {
  const viewport = { width: 1000, height: 600 };

  // 사용자 보고: 「크게보기는 화면사이즈에 맞게 도식이 나와야 되는데 엄청 크게 나오는 경우가 있어」
  it("가로로 긴 도식은 폭에 맞춘다", () => {
    expect(fitScale(viewport, { width: 2400, height: 400 })).toBe(1);
  });

  it("세로로 긴 도식은 높이에 맞춘다 — 폭만 맞추면 높이가 화면을 넘는다", () => {
    const s = fitScale(viewport, { width: 400, height: 2000 });
    // 폭 s·1000, 높이 s·1000·5 = 600 이어야 한다
    expect(s).toBeCloseTo(0.12, 10);
    expect(s * viewport.width * (2000 / 400)).toBeCloseTo(viewport.height, 6);
  });

  it("화면과 비율이 같으면 폭과 높이가 동시에 꼭 맞는다", () => {
    expect(fitScale(viewport, { width: 500, height: 300 })).toBeCloseTo(1, 10);
  });

  it("크기를 모르면 폭 맞춤(1)으로 연다", () => {
    expect(fitScale({ width: 0, height: 600 }, { width: 400, height: 2000 })).toBe(1);
    expect(fitScale(viewport, { width: 400, height: 0 })).toBe(1);
  });

  it("맞춤 배율 아래로 줄이지 않고, 상한 위로 키우지 않는다", () => {
    expect(clampScale(0.05, 0.12)).toBe(0.12);
    expect(clampScale(99, 0.12)).toBe(12);
    expect(clampScale(2, 0.12)).toBe(2);
  });
});

describe("확대 화면을 누르면 닫힌다", () => {
  const down = { x: 100, y: 100 };

  it("제자리 클릭은 닫는다", () => {
    expect(isDismissClick({ down, up: { x: 102, y: 101 }, onScrollbar: false })).toBe(true);
  });

  it("끌어서 이동한 뒤 손을 뗀 것은 닫지 않는다", () => {
    expect(isDismissClick({ down, up: { x: 100 + TAP_SLOP_PX + 1, y: 100 }, onScrollbar: false })).toBe(false);
  });

  it("스크롤바를 누른 것은 닫지 않는다", () => {
    expect(isDismissClick({ down, up: down, onScrollbar: true })).toBe(false);
  });

  it("pointerdown 이 없는 click(키보드)은 닫는다", () => {
    expect(isDismissClick({ down: null, up: down, onScrollbar: false })).toBe(true);
  });
});

describe("캡션의 도식 종류 이름", () => {
  it("발행본에 쓰인 세 종류를 이름으로 바꾼다", () => {
    expect(mermaidKindName("flowchart LR\n  A --> B")).toBe("플로우차트");
    expect(mermaidKindName("sequenceDiagram\n  A->>B: hi")).toBe("시퀀스 다이어그램");
    expect(mermaidKindName("stateDiagram-v2\n  [*] --> A")).toBe("상태 다이어그램");
  });

  it("간트 차트와 graph 별칭도 이름을 갖는다", () => {
    expect(mermaidKindName("gantt\n  title x")).toBe("간트 차트");
    expect(mermaidKindName("graph TD;A-->B")).toBe("플로우차트");
  });

  it("앞의 빈 줄 · 주석 · front matter 를 건너뛴다", () => {
    expect(mermaidKindName("\n%% 주석\n  sequenceDiagram\n")).toBe("시퀀스 다이어그램");
    expect(mermaidKindName("---\ntitle: flowchart\n---\ngantt\n")).toBe("간트 차트");
  });

  it("모르는 선언은 기본 이름으로 둔다", () => {
    expect(mermaidKindName("sankey-beta\n a,b,1")).toBe(DEFAULT_KIND_NAME);
    expect(mermaidKindName("")).toBe(DEFAULT_KIND_NAME);
  });

  it("받침에 따라 조사를 고른다", () => {
    expect(withObjectParticle("플로우차트")).toBe("플로우차트를");
    expect(withObjectParticle("상태 다이어그램")).toBe("상태 다이어그램을");
    expect(withObjectParticle("도식")).toBe("도식을");
    expect(withObjectParticle("Git 그래프")).toBe("Git 그래프를");
    expect(withObjectParticle("ER")).toBe("ER을(를)");
  });
});
