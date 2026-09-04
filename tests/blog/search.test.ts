import { describe, expect, it } from "vitest";
import { MIN_QUERY_LENGTH, normalize, search, tokenize, type SearchIndex } from "@/lib/blog/search";

const INDEX: SearchIndex = {
  v: 1,
  posts: [
    {
      c: "ai-agent",
      s: "langgraph-state-reducer",
      t: "LangGraph는 그래프 라이브러리가 아니다 — State와 Reducer가 정하는 것",
      d: "랭그래프를 쓰면서 자주 어긋나는 지점",
      g: ["ai-agent", "langgraph"],
      e: "langgraph-core",
      o: 1,
      h: [
        ["State와 Reducer", "state와-reducer"],
        ["Reducer가 정하는 것", "reducer가-정하는-것"],
        ["채널이라는 이름", "채널이라는-이름"],
        ["덧붙임", "덧붙임"],
      ],
    },
    {
      c: "rag",
      s: "rag-pipeline-1",
      t: "RAG 파이프라인 (1) 왜 RAG인가",
      d: "도입 근거와 대안",
      g: ["rag"],
      e: "rag-pipeline",
      o: 1,
      h: [["랭그래프와의 비교", "랭그래프와의-비교"]],
    },
    {
      c: "rag",
      s: "rag-standalone",
      t: "검색 품질을 재는 법",
      d: "랭그래프 이야기는 나오지 않는다",
      g: ["rag", "search"],
      h: [],
    },
  ],
};

// ③ 전방 일치 보너스 전용 픽스처. 같은 토큰("토큰")을 두 편에 넣되 한쪽은 제목
// 맨 앞에, 한쪽은 제목 중간에 두어 다른 필드·다른 질의로 흔들리지 않게 한다.
// front 는 title(100) + titleFront(50) = 150, inner 는 title(100) 뿐이라 차이는
// 정확히 프런트 보너스(50)와 같아야 한다.
const FRONT_BONUS_INDEX: SearchIndex = {
  v: 1,
  posts: [
    {
      c: "misc",
      s: "front-bonus-front",
      t: "토큰 우선순위 실험",
      d: "이 편은 맨 앞에서 그것을 다룬다",
      g: [],
      h: [],
    },
    {
      c: "misc",
      s: "front-bonus-inner",
      t: "실험은 토큰 우선순위다",
      d: "이 편은 중간에서 그것을 다룬다",
      g: [],
      h: [],
    },
  ],
};

// ② 동점 정렬 전용 픽스처. 다섯 편 모두 질의 "tiebreak"가 설명(d) 중간에만 걸려
// 점수가 정확히 같다(description base 20점, 전방 보너스 없음). 그래서 정렬은
// 전부 타이브레이커(o → 제목 가나다순)로만 갈린다.
//   - tie-a(o:1), tie-b(o:2): o 오름차순
//   - tie-alpha-2(o:5,"가나…"), tie-alpha-1(o:5,"다라…"): o 동점 → 제목 가나다순
//   - tie-no-o(o 없음): o 있는 편보다 항상 뒤
const TIE_INDEX: SearchIndex = {
  v: 1,
  posts: [
    {
      c: "misc",
      s: "tie-a",
      t: "마바사 알림",
      d: "여기 tiebreak 지점이 있다",
      g: [],
      e: "tie-series",
      o: 1,
      h: [],
    },
    {
      c: "misc",
      s: "tie-b",
      t: "자차카 알림",
      d: "여기 tiebreak 지점이 있다",
      g: [],
      e: "tie-series",
      o: 2,
      h: [],
    },
    {
      c: "misc",
      s: "tie-alpha-1",
      t: "다라 알림",
      d: "여기 tiebreak 지점이 있다",
      g: [],
      e: "tie-series2",
      o: 5,
      h: [],
    },
    {
      c: "misc",
      s: "tie-alpha-2",
      t: "가나 알림",
      d: "여기 tiebreak 지점이 있다",
      g: [],
      e: "tie-series2",
      o: 5,
      h: [],
    },
    {
      c: "misc",
      s: "tie-no-o",
      t: "바사아 알림",
      d: "여기 tiebreak 지점이 있다",
      g: [],
      h: [],
    },
  ],
};

describe("normalize", () => {
  it("소문자화하고 연속 공백을 하나로 줄인다", () => {
    expect(normalize("  LangGraph   State ")).toBe("langgraph state");
  });

  // ① 브리프 원안은 소스에 같은 글자 「가」를 두 번 적어 항상 참이었다(정규화가
  // 실제로 돌지 않아도 통과한다). 조합형(NFD, U+1100 자모 ㄱ + U+1161 자모 ㅏ)과
  // 완성형(NFC, U+AC00)을 실제로 다르게 적어야 NFC 정규화가 검증된다.
  it("유니코드를 NFC 로 맞춘다 — 조합형과 완성형이 같아져야 한다", () => {
    expect(normalize("가")).toBe("가");
  });
});

describe("tokenize", () => {
  it("공백으로 나눈다", () => {
    expect(tokenize("랭그래프 state")).toEqual(["랭그래프", "state"]);
  });

  it(`${MIN_QUERY_LENGTH}자 미만 토큰을 버린다`, () => {
    expect(tokenize("a 랭그래프")).toEqual(["랭그래프"]);
  });

  it("남는 토큰이 없으면 빈 배열이다", () => {
    expect(tokenize("a b")).toEqual([]);
  });
});

describe("search", () => {
  it("🔴 조사가 붙어도 찾는다 — 「랭그래프」가 「랭그래프를」을 건진다", () => {
    const hits = search(INDEX, "랭그래프");
    expect(hits.map((h) => h.post.s)).toContain("langgraph-state-reducer");
  });

  it("🔴 토크나이저를 쓰지 않으므로 낱말 중간도 걸린다", () => {
    // 「랭그래프와의」는 토크나이저라면 다른 토큰이 된다.
    const hits = search(INDEX, "랭그래프");
    expect(hits.map((h) => h.post.s)).toContain("rag-pipeline-1");
  });

  it("전 토큰 AND — 둘 다 있는 편만 남는다", () => {
    const hits = search(INDEX, "랭그래프 reducer");
    expect(hits.map((h) => h.post.s)).toEqual(["langgraph-state-reducer"]);
  });

  it(`${MIN_QUERY_LENGTH}자 미만 질의는 0건이다`, () => {
    expect(search(INDEX, "랭")).toEqual([]);
    expect(search(INDEX, "")).toEqual([]);
  });

  it("제목 매치가 설명 매치보다 앞선다", () => {
    const hits = search(INDEX, "rag");
    expect(hits[0].post.s).toBe("rag-pipeline-1");
  });

  // ③ 브리프 원안은 서로 다른 질의("langgraph" vs "그래프 라이브러리")를 비교해
  // 여유가 10점뿐이었다. 같은 토큰("토큰")으로 위치만 다르게 둔 두 편을 비교하면
  // 점수 차이가 정확히 전방 일치 보너스(50점)와 같아야 한다.
  it("전방 일치에 보너스가 정확히 50점 붙는다 — 같은 토큰, 다른 위치", () => {
    const hits = search(FRONT_BONUS_INDEX, "토큰");
    const front = hits.find((h) => h.post.s === "front-bonus-front");
    const inner = hits.find((h) => h.post.s === "front-bonus-inner");
    expect(front?.score).toBe(150);
    expect(inner?.score).toBe(100);
    expect((front?.score ?? 0) - (inner?.score ?? 0)).toBe(50);
  });

  it("태그 완전 일치를 잡는다", () => {
    const hits = search(INDEX, "search");
    expect(hits.map((h) => h.post.s)).toContain("rag-standalone");
  });

  it("매치된 헤딩을 최대 3개까지 단다", () => {
    const hits = search(INDEX, "reducer");
    const target = hits.find((h) => h.post.s === "langgraph-state-reducer");
    expect(target?.headings.length).toBeLessThanOrEqual(3);
    expect(target?.headings[0].id).toBe("state와-reducer");
  });

  it("매치가 없으면 빈 배열이다", () => {
    expect(search(INDEX, "존재하지않는말")).toEqual([]);
  });

  // ② 브리프 원안은 search(INDEX, "rag") 의 순서만 봤는데 두 편의 점수가
  // 230 대 80 으로 크게 달라 사실상 점수 순서 검사였다. TIE_INDEX 의 다섯 편은
  // 전부 같은 점수(20)이므로 여기서는 타이브레이커(o → 제목 가나다순)만 순서를
  // 정한다.
  it("동점이면 시리즈 순서 다음 제목 가나다순으로 안정 정렬한다", () => {
    const hits = search(TIE_INDEX, "tiebreak");
    expect(hits.map((h) => h.score)).toEqual([20, 20, 20, 20, 20]);
    expect(hits.map((h) => h.post.s)).toEqual(["tie-a", "tie-b", "tie-alpha-2", "tie-alpha-1", "tie-no-o"]);
  });
});
