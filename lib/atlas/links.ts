import type { Post } from "@/lib/blog/types";

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
 *
 * ⚠️ 이 함수는 링크 무결성 검사(tests/blog/content/links.test.ts)와
 *    아틀라스 엣지 생성(lib/atlas/build.ts)이 **함께 쓴다.**
 *    두 곳이 같은 코드를 보므로 엣지와 검사가 어긋날 수 없다 — 그게 승격한 이유다(설계서 §7.4).
 */
export function outboundKeys(post: Post): string[] {
  const keys: string[] = [];
  for (const m of Array.from(post.body.matchAll(/\]\(\/blog\/([^)#?]+?)\/?(?:[#?][^)]*)?\)/g))) {
    const target = m[1].replace(/\/$/, "");
    // <category>/<slug> 두 조각이 아닌 것은 카테고리 인덱스 링크다. 편 대 편 관계가 아니다.
    if (target.split("/").length === 2) keys.push(target);
  }
  return keys;
}

/** 글 1편의 안정 키. 노드 `id` 와 엣지의 양끝이 전부 이 값이다. */
export function postKey(post: Post): string {
  return `${post.categorySlug}/${post.slug}`;
}
