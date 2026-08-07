import { describe, expect, it } from "vitest";
import { buildToc } from "@/lib/toc";

describe("buildToc", () => {
  it("H2와 H3만 뽑는다", () => {
    const md = ["# 제목", "## 첫 절", "### 하위", "#### 더 하위", "본문"].join("\n");
    expect(buildToc(md)).toEqual([
      { depth: 2, text: "첫 절", id: "첫-절" },
      { depth: 3, text: "하위", id: "하위" },
    ]);
  });

  it("코드펜스 안의 #은 헤딩으로 보지 않는다", () => {
    const md = ["## 진짜 헤딩", "```bash", "# 이건 주석이다", "```", "## 두번째"].join("\n");
    expect(buildToc(md).map((t) => t.text)).toEqual(["진짜 헤딩", "두번째"]);
  });

  it("강조 기호를 제거한 텍스트로 id를 만든다", () => {
    const md = "## **굵은** 제목과 `코드`";
    expect(buildToc(md)).toEqual([{ depth: 2, text: "굵은 제목과 코드", id: "굵은-제목과-코드" }]);
  });

  it("같은 제목이 반복되면 id에 번호가 붙는다", () => {
    const md = ["## 요약", "## 요약"].join("\n");
    expect(buildToc(md).map((t) => t.id)).toEqual(["요약", "요약-1"]);
  });
});
