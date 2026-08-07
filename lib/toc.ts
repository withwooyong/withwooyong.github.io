import GithubSlugger from "github-slugger";
import type { TocEntry } from "@/lib/blog/types";

export type { TocEntry };

const FENCE = /^\s*```/;

/**
 * 마크다운에서 H2·H3 목차를 만든다.
 *
 * 렌더링될 헤딩과 동일한 id를 만들기 위해 rehype-slug와 같은 슬러거를 쓴다.
 * 코드펜스 안의 `#`을 헤딩으로 오인하지 않도록 펜스 상태를 추적한다.
 *
 * 위키(lib/wiki.ts)와 블로그(lib/blog)가 공유한다. `fs`에 의존하지 않는다.
 */
export function buildToc(md: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const toc: TocEntry[] = [];
  let inFence = false;

  // CRLF로 잘라야 한다. Windows에서 git이 md를 CRLF로 체크아웃하면 줄 끝에 \r이 남는데,
  // JS의 `.`은 \r을 line terminator로 보아 제외하므로 아래 `(.*)$`가 $에 닿지 못한다.
  // 결과적으로 헤딩이 하나도 매치되지 않아 목차가 통째로 비어버린다.
  for (const line of md.split(/\r?\n/)) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = /^(##|###)\s+(.*)$/.exec(line);
    if (!m) continue;

    // 마크다운 강조 기호를 제거한 텍스트가 실제로 렌더링되는 값이다.
    const text = m[2].replace(/[*`]/g, "").trim();
    toc.push({ depth: m[1].length as 2 | 3, text, id: slugger.slug(text) });
  }

  return toc;
}
