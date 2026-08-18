import { describe, expect, it } from "vitest";
import { readPosts } from "@/lib/blog/loader";
import type { Post } from "@/lib/blog/types";

/**
 * 링크 지형 검사.
 *
 * 「링크는 참조가 아니라 약속이다」(금지선 45). 대상이 사라지면 약속이 깨지고,
 * 들어오는 링크가 없는 편은 발행돼 있어도 아무도 도달하지 못한다 —
 * search-engineering 6편이 카테고리째 고립됐던 것이 그 경우다.
 */

/**
 * 본문의 /blog/<category>/<slug>/ 링크를 뽑는다. 앵커(#)와 질의(?)는 떼어 낸다.
 *
 * 꼬리의 `(?:[#?][^)]*)?` 를 지우지 마라. `[^)#?]` 가 #·? 를 배제하므로 이 그룹이 없으면
 * 앵커 링크는 「떼어 내지는」 것이 아니라 **매칭 자체가 실패해 통째로 사라진다.**
 * 그러면 죽은 링크 검사와 inbound 계수가 그 링크를 조용히 빠뜨린다.
 *
 * tsconfig의 `target`이 es5라 이터레이터를 for-of로 직접 돌면 TS2802가 난다.
 * vitest는 esbuild로 타입을 벗겨 내 통과시키지만 `tsc --noEmit`은 잡는다 —
 * 그래서 이 파일의 순회는 전부 Array.from으로 배열화한 뒤 돈다.
 */
function outboundKeys(post: Post): string[] {
  const keys: string[] = [];
  for (const m of Array.from(post.body.matchAll(/\]\(\/blog\/([^)#?]+?)\/?(?:[#?][^)]*)?\)/g))) {
    const target = m[1].replace(/\/$/, "");
    // <category>/<slug> 두 조각이 아닌 것은 카테고리 인덱스 링크다. 편 대 편 관계가 아니다.
    if (target.split("/").length === 2) keys.push(target);
  }
  return keys;
}

const posts = readPosts();
const key = (p: Post) => `${p.categorySlug}/${p.slug}`;
const published = new Set(posts.map(key));

describe("링크 무결성", () => {
  it("발행본을 읽었다", () => {
    // 0편이면 아래 검사가 전부 공허참이 된다.
    expect(posts.length).toBeGreaterThan(0);
  });

  it("내부 링크의 대상이 전부 실재한다", () => {
    const dead: string[] = [];
    for (const post of posts) {
      for (const target of outboundKeys(post)) {
        if (!published.has(target)) dead.push(`${key(post)} -> ${target}`);
      }
    }
    expect(dead, `죽은 링크 ${dead.length}건`).toEqual([]);
  });

  it("내부 링크가 슬래시로 끝난다", () => {
    // trailingSlash: true 이므로 슬래시가 없으면 리다이렉트가 한 번 더 돈다.
    const bad: string[] = [];
    for (const post of posts) {
      // 링크 전체를 잡은 뒤 경로부와 앵커·질의부를 갈라 본다. #·? 를 문자 클래스에서
      // 배제하면(구판 `[^)#?]*`) 앵커 링크는 매칭 자체가 실패해 검사를 통째로 빠져나간다 —
      // `/blog/rag/foo#s` 같은 진짜 위반이 조용히 통과한다.
      for (const m of Array.from(post.body.matchAll(/\]\((\/blog\/[^)]*)\)/g))) {
        const href = m[1];
        const path = href.split(/[#?]/)[0];
        // 판정은 경로부로, 보고는 원본 전체로. 경로부만 적으면 파일에서 찾지 못한다.
        if (!path.endsWith("/")) bad.push(`${key(post)}: ${href}`);
      }
    }
    expect(bad, `슬래시 누락 ${bad.length}건`).toEqual([]);
  });
});

describe("링크 고립", () => {
  it("들어오는 링크가 없는 편이 없다 (지도편 제외)", () => {
    const inbound = new Map<string, number>(posts.map((p) => [key(p), 0]));

    for (const post of posts) {
      // 같은 편을 여러 번 가리켜도 관계는 하나다.
      for (const target of Array.from(new Set(outboundKeys(post)))) {
        if (target === key(post)) continue;
        if (inbound.has(target)) inbound.set(target, inbound.get(target)! + 1);
      }
    }

    // 지도편은 카테고리 전체를 가리키는 것이 목적이라 inbound 0이 정상이다.
    const maps = new Set(posts.filter((p) => p.role === "map").map(key));
    const isolated = Array.from(inbound)
      .filter(([k, n]) => n === 0 && !maps.has(k))
      .map(([k]) => k);

    expect(isolated, `고립 ${isolated.length}편`).toEqual([]);
  });
});
