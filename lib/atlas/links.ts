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
 * ⚠️ 이 함수를 **두 곳이 함께 쓴다** — 링크 무결성 검사(tests/blog/content/links.test.ts)와
 *    아틀라스 엣지 생성(lib/atlas/build.ts). 승격한 이유가 그것이다: 따로 구현하면 그때부터
 *    엣지와 검사가 어긋날 수 있다(설계서 §7.4).
 *    효과는 실측됐다 — T2 가 이 함수로 센 extends 798 과, 중복 제거·자기참조 제외 규칙을
 *    새로 정한 T8 의 buildGraph 가 낸 798 이 같다(2026-08-27). 추출을 따로 구현했다면
 *    그 두 수가 같을 이유가 없다.
 */
/** 줄 수를 보존하며 지운다 — 다른 검사기가 줄 번호로 보고할 수 있어야 한다. */
function blank(hit: string): string {
  return hit.replace(/[^\n]/g, " ");
}

/**
 * 마크다운에서 **산문이 아닌 구간**(코드 펜스·인라인 코드·HTML 주석)을 공백으로 지운다.
 *
 * 왜 필요한가: 이 파일의 링크 정규식은 마크다운 구조를 모르고 raw text 를 훑는다.
 * 그래서 「아틀라스는 이렇게 링크한다」 같은 **설명글을 쓰는 순간 예시가 진짜 관계가 된다.**
 * 거울상 결함이 더 아프다 — `tests/blog/content/links.test.ts` 의 슬래시 검사와 앵커 검사도
 * 같은 raw body 를 읽으므로, 코드 펜스 안의 잘못된 예시가 **가짜 위반**으로 잡혀 발행을 막는다.
 * 세 곳이 같은 전처리를 보게 하려고 여기서 export 한다(설계서 §7.4 와 같은 이유).
 *
 * ⚠️ 줄 수를 보존한다. 지운 구간을 빈 문자열로 만들면 줄 번호로 보고하는 검사기가 어긋난다.
 * ⚠️ 닫히지 않은 펜스는 **끝까지 코드로 본다.** 열어 놓고 안 닫은 문서에서 뒷부분 전체가
 *    코드일 가능성이 높고, 반대로 산문으로 보면 없는 관계가 대량으로 생긴다.
 *
 * 실측 2026-08-27: 156편에 이 전처리를 넣어도 `extends` 798 이 그대로다 — 오늘 펜스·인라인
 * 코드·주석 안에 내부 링크가 하나도 없다. **지금 넣는 이유는 오늘의 수치가 아니라,
 * 이 리포가 지금 그런 글을 쓰는 중이라서다.**
 */
export function proseOnly(md: string): string {
  // ① 펜스는 줄 단위로 토글한다. 정규식 역참조보다 안전하고 닫히지 않은 펜스를 다룰 수 있다.
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of md.split("\n")) {
    const m = line.match(/^[ \t]*(`{3,}|~{3,})/);
    if (fence === null) {
      if (m) {
        fence = m[1].charAt(0);
        out.push("");
        continue;
      }
      out.push(line);
      continue;
    }
    // 같은 문자의 펜스만 닫는다 — ``` 안의 ~~~ 는 코드다
    if (m && m[1].charAt(0) === fence) fence = null;
    out.push("");
  }

  let s = out.join("\n");
  s = s.replace(/<!--[\s\S]*?-->/g, blank);
  // ② 펜스를 먼저 지웠으므로 남은 백틱은 인라인이다. 이중 백틱을 먼저 처리한다
  s = s.replace(/``[\s\S]*?``/g, blank);
  s = s.replace(/`[^`\n]*`/g, blank);
  return s;
}

export function outboundKeys(post: Post): string[] {
  const keys: string[] = [];
  for (const m of Array.from(
    proseOnly(post.body).matchAll(/\]\(\/blog\/([^)#?]+?)\/?(?:[#?][^)]*)?\)/g),
  )) {
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
