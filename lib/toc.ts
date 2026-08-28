import GithubSlugger from "github-slugger";
import type { TocEntry } from "@/lib/blog/types";

export type { TocEntry };

const FENCE = /^\s*```/;

interface Heading {
  depth: number;
  text: string;
}

/**
 * 본문의 헤딩을 깊이와 텍스트로 뽑는다. **슬러그는 만들지 않는다.**
 *
 * `buildToc`(H2·H3만 내보낸다)과 `headingIds`(전 깊이)가 이 함수를 공유한다.
 * 나눠 놓은 이유는 「헤딩을 알아보는 방법」이 둘로 갈리면 목차의 id와 앵커 검사기가
 * 보는 id가 조용히 어긋나기 때문이다 — 그때 검사기는 거짓 0을 낸다.
 *
 * 렌더링될 헤딩과 동일한 id를 만들기 위해 rehype-slug와 같은 슬러거를 쓴다.
 * 코드펜스 안의 `#`을 헤딩으로 오인하지 않도록 펜스 상태를 추적한다.
 *
 * CRLF로 잘라야 한다. Windows에서 git이 md를 CRLF로 체크아웃하면 줄 끝에 \r이 남는데,
 * JS의 `.`은 \r을 line terminator로 보아 제외하므로 아래 `(.*)$`가 $에 닿지 못한다.
 * 결과적으로 헤딩이 하나도 매치되지 않아 목차가 통째로 비어버린다.
 */
function scanHeadings(md: string): Heading[] {
  const out: Heading[] = [];
  let inFence = false;

  for (const line of md.split(/\r?\n/)) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (!m) continue;

    // 마크다운 강조 기호를 제거한 텍스트가 실제로 렌더링되는 값이다.
    out.push({ depth: m[1].length, text: m[2].replace(/[*`]/g, "").trim() });
  }

  return out;
}

/**
 * 마크다운에서 H2·H3 목차를 만든다.
 *
 * 블로그(lib/blog)가 쓴다. 위키(lib/wiki.ts)와 공유하던 것이었으나 T14 가 위키를 지웠다.
 * `fs`에 의존하지 않는다.
 */
export function buildToc(md: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const toc: TocEntry[] = [];

  for (const h of scanHeadings(md)) {
    if (h.depth !== 2 && h.depth !== 3) continue;
    toc.push({ depth: h.depth as 2 | 3, text: h.text, id: slugger.slug(h.text) });
  }

  return toc;
}

/**
 * 렌더링된 페이지에 실제로 붙는 헤딩 id 전부. **앵커 링크의 도착지 집합**이다.
 *
 * `buildToc`과 달리 깊이를 가리지 않는다. rehype-slug가 H1~H6 전부에 id를 붙이므로
 * `#### 어떤 제목`을 가리키는 앵커도 살아 있는 링크다 — H2·H3만 세면 그것을
 * 「깨진 앵커」로 잘못 잡는다.
 *
 * 슬러거가 상태를 들고 있어(같은 제목이 다시 나오면 `-1`을 붙인다) **문서 순서대로
 * 한 번에** 돌려야 한다. 깊이로 걸러 낸 뒤 슬러그하면 번호가 페이지와 어긋난다.
 */
export function headingIds(md: string): string[] {
  const slugger = new GithubSlugger();
  return scanHeadings(md).map((h) => slugger.slug(h.text));
}
