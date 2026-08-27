import { describe, expect, it } from "vitest";

import { collectHits } from "@/lib/search/collect";
import { isIndexNoise, stripParticle } from "@/lib/search/korean";
import type { PagefindData, PagefindResult } from "@/lib/search/pagefind-loader";

/**
 * `data()` 호출 횟수를 실제로 세는 가짜 결과 목록.
 * 브라우저도 Pagefind 도 필요 없다 — 배치 전략만 검증한다.
 */
function makeResults(
  urls: string[],
  options?: { rejectAt?: number },
): { results: PagefindResult[]; calls: () => number } {
  const rejectAt = options && options.rejectAt !== undefined ? options.rejectAt : -1;
  let calls = 0;

  const results = urls.map(function (url, index): PagefindResult {
    return {
      id: "id-" + String(index),
      data: function () {
        calls += 1;
        if (index === rejectAt) {
          return Promise.reject(new Error("fragment load failed: " + url));
        }
        const data: PagefindData = {
          url: url,
          excerpt: "본문 발췌 " + String(index),
          meta: { title: "제목 " + String(index) },
        };
        return Promise.resolve(data);
      },
    };
  });

  return {
    results: results,
    calls: function () {
      return calls;
    },
  };
}

/** 잡음이 아닌 글 URL 을 n 개 만든다. */
function posts(n: number, prefix?: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push("/blog/rag/" + (prefix ? prefix + "-" : "") + "post-" + String(i) + "/");
  }
  return out;
}

/** 태그 목록 URL 을 n 개 만든다. 전부 잡음이다. */
function tags(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push("/blog/tags/tag-" + String(i) + "/");
  }
  return out;
}

describe("stripParticle", () => {
  it("실측 7종의 조사를 뗀다", () => {
    // 인덱스 242건에서 실제로 재검색 폭이 넓어진 7종.
    expect(stripParticle("임베딩의")).toBe("임베딩");
    expect(stripParticle("벡터가")).toBe("벡터");
    expect(stripParticle("프롬프트를")).toBe("프롬프트");
    expect(stripParticle("검색엔진을")).toBe("검색엔진");
    expect(stripParticle("컨텍스트에")).toBe("컨텍스트");
    expect(stripParticle("트랜잭션이")).toBe("트랜잭션");
    expect(stripParticle("인덱스는")).toBe("인덱스");
  });

  it("오작동 대조군 20개는 그대로 남는다", () => {
    // 이 테스트가 이 파일의 핵심이다. 조사 목록을 누가 넓히면 여기서 빨개져야 한다.
    // 특히 「유사도」— 조사 목록에 「도」를 넣으면 「유사」로 잘린다.
    const control = [
      "평가",
      "증가",
      "속도",
      "경로",
      "정의",
      "강의",
      "유사도",
      "가용성",
      "데이터",
      "카프카",
      "메타",
      "동기화",
      "의존",
      "빈도",
      "제도",
      "국가",
      "추가",
      "단가",
      "회의",
      "주의",
    ];
    expect(control.length).toBe(20);
    for (const word of control) {
      expect(stripParticle(word)).toBe(word);
    }
  });

  it("긴 조사를 먼저 검사한다", () => {
    // 「서」가 아니라 「에서」가 떨어져야 한다.
    expect(stripParticle("에이전트에서")).toBe("에이전트");
    expect(stripParticle("에이전트에서는")).toBe("에이전트");
    expect(stripParticle("파이프라인으로")).toBe("파이프라인");
  });

  it("여러 어절이면 마지막 어절에만 적용한다", () => {
    expect(stripParticle("벡터 검색을")).toBe("벡터 검색");
    expect(stripParticle("하이브리드 검색 파이프라인의")).toBe(
      "하이브리드 검색 파이프라인",
    );
  });

  it("뗄 조사가 없으면 그대로 돌려준다", () => {
    expect(stripParticle("RAG")).toBe("RAG");
    expect(stripParticle("임베딩")).toBe("임베딩");
    expect(stripParticle("검색엔진")).toBe("검색엔진");
  });

  it("어절이 3글자 미만이면 아무것도 하지 않는다", () => {
    // 「가」로 끝나지만 「증」만 남기면 안 된다.
    expect(stripParticle("증가")).toBe("증가");
    expect(stripParticle("의")).toBe("의");
  });

  it("조사를 뗀 나머지가 2글자 미만이면 적용하지 않는다", () => {
    // 「에게」를 떼면 「사」 한 글자만 남는다.
    expect(stripParticle("사에게")).toBe("사에게");
  });

  it("공백만 있거나 빈 문자열이면 빈 문자열이다", () => {
    expect(stripParticle("")).toBe("");
    expect(stripParticle("   ")).toBe("");
    expect(stripParticle("\t\n ")).toBe("");
  });

  it("앞뒤 공백은 잘라 낸다", () => {
    expect(stripParticle("  임베딩의  ")).toBe("임베딩");
    expect(stripParticle("  RAG  ")).toBe("RAG");
  });
});

describe("isIndexNoise", () => {
  it("404 와 태그 목록은 잡음이다", () => {
    // 인덱스에 `/404/` 와 `/404.html` 이 둘 다 있다 — 둘 다 잡아야 한다.
    expect(isIndexNoise("/404/")).toBe(true);
    expect(isIndexNoise("/404.html")).toBe(true);
    expect(isIndexNoise("/blog/tags/rag/")).toBe(true);
  });

  it("404 로 시작할 뿐인 정상 슬러그는 삼키지 않는다", () => {
    // 접두 매칭이면 이 글이 조용히 사라진다.
    expect(isIndexNoise("/404-postmortem/")).toBe(false);
    expect(isIndexNoise("/blog/ops/404-postmortem/")).toBe(false);
    expect(isIndexNoise("/blog/tags-and-more/")).toBe(false);
  });

  it("아틀라스 노드 상세는 잡음이다 — 글의 제목·요약을 그대로 실은 중복이다", () => {
    // 실측 2026-08-27: 쿼리 8종의 상위 10 에 들어온 `/atlas/…` 17건이 **전부**
    // 같은 목록 안에 `/blog/…` 원문을 가진 중복이었다(최대 40%).
    expect(isIndexNoise("/atlas/rag/rag-pipeline-retrieval/")).toBe(true);
    expect(isIndexNoise("/atlas/topic/rag/")).toBe(true);
  });

  it("아틀라스 목록 자체는 남긴다", () => {
    // 1건뿐이라 결과를 뒤덮지 못하고, 넓은 쿼리에서는 좋은 목적지다.
    // `scripts/generate-sitemap.mjs` 가 `/^atlas\/.+/` 로 상세만 뺀 것과 같은 판정이다.
    expect(isIndexNoise("/atlas/")).toBe(false);
  });

  it("atlas 로 시작할 뿐인 정상 슬러그는 삼키지 않는다", () => {
    // 접두에 슬래시가 없으면(`indexOf("/atlas") === 0`) 이 둘이 조용히 사라진다.
    expect(isIndexNoise("/atlas-postmortem/")).toBe(false);
    expect(isIndexNoise("/blog/ai-agent/atlas/")).toBe(false);
  });

  it("글·카테고리 목록·인덱스·일반 페이지는 남긴다", () => {
    expect(isIndexNoise("/blog/rag/rag-pipeline-retrieval/")).toBe(false);
    expect(isIndexNoise("/blog/ai-agent/")).toBe(false);
    expect(isIndexNoise("/blog/")).toBe(false);
    expect(isIndexNoise("/")).toBe(false);
    expect(isIndexNoise("/en/")).toBe(false);
    expect(isIndexNoise("/product-lead/")).toBe(false);
  });

  it("빈 URL 은 잡음이 아니다", () => {
    expect(isIndexNoise("")).toBe(false);
  });
});

describe("collectHits", () => {
  it("잡음이 없으면 want 만큼만 담고 배치 1회로 끝낸다", async () => {
    const fake = makeResults(posts(20));
    const hits = await collectHits(fake.results);

    expect(hits.length).toBe(8);
    // 초과 로드 금지 — 20건 전부 부르면 안 된다.
    expect(fake.calls()).toBe(8);
    expect(hits[0].id).toBe("id-0");
    expect(hits[0].url).toBe("/blog/rag/post-0/");
    expect(hits[0].meta.title).toBe("제목 0");
  });

  it("첫 배치에 태그가 4건 섞이면 두 번째 배치를 불러 8건을 채운다", async () => {
    const first = tags(4).concat(posts(4, "a"));
    const fake = makeResults(first.concat(posts(12, "b")));

    const hits = await collectHits(fake.results);

    expect(hits.length).toBe(8);
    // 두 번째 배치는 8건이 아니라 **6건**만 받는다 — 남은 필요 4 + 여유 2.
    expect(fake.calls()).toBe(14);
    expect(hits.every((hit) => !isIndexNoise(hit.url))).toBe(true);
    expect(hits[0].url).toBe("/blog/rag/a-post-0/");
  });

  it("전부 잡음이면 빈 배열이고 maxLoad 를 넘겨 부르지 않는다", async () => {
    const fake = makeResults(tags(40));
    const hits = await collectHits(fake.results);

    expect(hits).toEqual([]);
    expect(fake.calls()).toBe(24);
    expect(fake.calls()).toBeLessThanOrEqual(24);
  });

  it("results 가 want 보다 적으면 있는 만큼만 돌려준다", async () => {
    const fake = makeResults(posts(3));
    const hits = await collectHits(fake.results);

    expect(hits.length).toBe(3);
    expect(fake.calls()).toBe(3);
  });

  it("results 가 비면 아무것도 부르지 않는다", async () => {
    const fake = makeResults([]);
    const hits = await collectHits(fake.results);

    expect(hits).toEqual([]);
    expect(fake.calls()).toBe(0);
  });

  it("data() 하나가 reject 해도 나머지는 살아 돌아온다", async () => {
    const fake = makeResults(posts(12), { rejectAt: 2 });
    const hits = await collectHits(fake.results);

    expect(hits.length).toBe(8);
    // 실패한 id-2 만 빠지고 두 번째 배치에서 채운다.
    expect(hits.map((hit) => hit.id)).not.toContain("id-2");
    // 두 번째 배치는 남은 필요 1 + 여유 2 = 3건. 12건 전부 받지 않는다.
    expect(fake.calls()).toBe(11);
  });

  it("want·batch·maxLoad 를 바꿀 수 있다", async () => {
    const fake = makeResults(posts(30));
    const hits = await collectHits(fake.results, { want: 3, batch: 2, maxLoad: 10 });

    expect(hits.length).toBe(3);
    // 2건씩 두 배치면 4건 — want 3 에 도달해 멈춘다.
    expect(fake.calls()).toBe(4);
  });

  it("maxLoad 가 batch 보다 작으면 maxLoad 에서 끊는다", async () => {
    const fake = makeResults(tags(30));
    const hits = await collectHits(fake.results, { want: 8, batch: 8, maxLoad: 5 });

    expect(hits).toEqual([]);
    expect(fake.calls()).toBe(5);
  });

  it("남은 필요 건수보다 큰 배치를 받지 않는다", async () => {
    // want 2 면 첫 배치도 2+2=4 건까지만. batch 8 을 통째로 받으면 안 된다.
    const fake = makeResults(posts(30));
    const hits = await collectHits(fake.results, { want: 2 });

    expect(hits.length).toBe(2);
    expect(fake.calls()).toBe(4);
  });

  it("shouldContinue 가 처음부터 false 면 한 건도 부르지 않는다", async () => {
    const fake = makeResults(posts(20));
    const hits = await collectHits(fake.results, {
      shouldContinue: () => false,
    });

    expect(hits).toEqual([]);
    expect(fake.calls()).toBe(0);
  });

  it("배치 도중 취소되면 모은 것까지만 돌려주고 더 부르지 않는다", async () => {
    // 첫 배치 8건 중 4건이 태그 → 4건만 모인 상태에서 취소된다.
    const fake = makeResults(tags(4).concat(posts(4, "a")).concat(posts(20, "b")));
    let allowed = 1;
    const hits = await collectHits(fake.results, {
      shouldContinue: () => {
        const ok = allowed > 0;
        allowed -= 1;
        return ok;
      },
    });

    // want 8 에 못 미쳐도 그대로 반환한다. 죽은 쿼리가 왕복을 더 쓰면 안 된다.
    expect(hits.length).toBe(4);
    expect(fake.calls()).toBe(8);
  });

  it("shouldContinue 가 계속 true 면 기본 동작과 같다", async () => {
    const fake = makeResults(posts(20));
    const hits = await collectHits(fake.results, { shouldContinue: () => true });

    expect(hits.length).toBe(8);
    expect(fake.calls()).toBe(8);
  });
});
