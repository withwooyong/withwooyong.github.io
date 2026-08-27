import Link from "next/link";
import { useMemo } from "react";
import { listSections, neighborsOf } from "@/lib/atlas/layout";
import type { AtlasGraph } from "@/lib/atlas/types";

/**
 * 선택된 항목 옆에만 뜨는 상세 페이지 링크.
 *
 * **왜 필요한가.** 선택하면 우측 `<aside>` 패널에 요약과 이웃 링크가 뜨는데, 그 패널은
 * DOM 상 이 목록보다 **앞**에 있다. 마지막 구획에서 고르면 패널에 닿는 데 Shift+Tab 이
 * 최대 156 회다 — 라이브 영역이 낭독은 해도 **이웃 링크로 가는 경로가 없다.**
 *
 * 고른 해법과 버린 해법:
 *
 * | 안 | 내용 | 왜 안 골랐나 |
 * | --- | --- | --- |
 * | (a) | 선택 시 `<aside>` 로 포커스를 옮긴다 | 포커스 이동만으로도 낭독이 일어나 라이브 영역과 **두 번 낭독**된다. 목록 탐색 흐름도 끊긴다 |
 * | (b) | 패널을 DOM 상 목록 뒤로 옮기고 시각 배치만 CSS 로 유지 | DOM 순서와 시각 순서가 갈린다. 그리드 재구성 범위도 크다 |
 * | (c) | **선택된 항목에만** 상세 링크를 붙인다 ← 채택 | 정지점이 156 → 157 로 **1개만** 는다. 포커스를 뺏지 않아 낭독이 겹치지 않는다 |
 *
 * (c) 를 **모든** 항목에 붙이면 정지점이 312 개가 된다 — `dot-renderer.tsx` 가 SVG 에
 * 정지점을 두지 않기로 한 것과 같은 이유로 그건 피한다.
 */
function DetailLink({ id, title }: { id: string; title: string }) {
  return (
    <Link
      href={`/atlas/${id}/`}
      // 「상세 →」 만으로는 링크 목록에서 어느 글인지 분간되지 않는다.
      aria-label={`${title} 상세 페이지로 이동`}
      className="ml-2 whitespace-nowrap text-label text-n6 underline underline-offset-4 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n0"
    >
      상세 →
    </Link>
  );
}

/**
 * 목록 뷰. 설계서 §7.7 — `prefers-reduced-motion` 과 저사양의 기본값이다.
 *
 * 그래프가 「보기 좋은 것」이라면 이쪽은 **「반드시 닿는 것」**이다.
 * `<DotRenderer />` 는 포인터 전용이므로 **키보드·스크린리더의 유일한 경로가 여기다.**
 * 그래서 `/atlas` 는 reduced-motion 여부와 무관하게 이 뷰를 항상 실어야 한다(T11).
 *
 * 구획을 여기서 계산하지 않고 `listSections` 에서 가져오는 이유:
 * 두 뷰가 **같은 노드 집합**을 덮는지 테스트가 재야 하는데, 이 리포에는 jsdom 이 없어
 * `.tsx` 안의 로직에는 게이트를 못 건다. 특히 어느 토픽에도 안 붙는 글은
 * 그래프에는 그려지므로, 목록에서 빠지면 그 글은 **키보드로 도달 불가**가 된다.
 *
 * ⚠️ `@/lib/atlas/types` 에서 값을 가져오지 마라 — `zod` 가 브라우저 번들에 실린다.
 *
 * 다크 대응은 `dark:` 변형이 아니라 토큰이 한다. `text-n9` 는 `var(--n9)` 로 풀리고
 * `--n9` 자체가 테마별로 재정의된다(`styles/globals.css`). 색을 리터럴로 쓰지 마라.
 */
export function ListView({
  graph,
  selected,
  onSelect,
}: {
  graph: AtlasGraph;
  /**
   * 지금 선택된 노드. `<DotRenderer />` 가 포인터 전용이라 **선택 상태를 지각할 수 있는
   * 유일한 자리가 여기다.** SVG 의 `aria-label` 은 `role="img"` 위에 있어 포커스도
   * 라이브 영역도 아니므로 낭독되지 않는다. 빼지 마라 — 대체 경로가 성립하지 않는다.
   */
  selected?: string | null;
  onSelect: (id: string) => void;
}) {
  const sections = useMemo(() => listSections(graph), [graph]);

  /**
   * 선택이 바뀐 것을 낭독한다. `<DotRenderer />` 의 `aria-label` 은 `role="img"` 위에 있어
   * 포커스도 라이브 영역도 아니므로 **낭독되지 않는다.** 목록 버튼을 누르면 포커스가 그
   * 버튼에 남고 `aria-current` 만 붙는데, `aria-current` 는 `aria-pressed`·`aria-expanded` 와
   * 달리 포커스된 요소에서 값이 바뀌어도 안정적으로 낭독되지 않는다.
   *
   * 라이브 영역을 페이지가 아니라 **여기** 두는 이유: 이 리포의 선례가 그렇다 —
   * `components/search/command-palette.tsx` 의 `sr-only role="status"` 도 상태를 가진
   * 컴포넌트 안에 있다. `ListView` 는 `graph` 와 `selected` 를 둘 다 갖고 있어 같은 자리다.
   *
   * ⚠️ `<DotRenderer />` 에는 라이브 영역을 두지 마라. 둘 다 두면 한 번의 선택이 두 번 낭독된다.
   */
  const announcement = useMemo(() => {
    if (selected == null) return "";
    const node = graph.nodes.find((n) => n.id === selected);
    if (!node) return "";
    return `${node.title} 선택됨. 이어진 글 ${neighborsOf(graph, selected).size}편.`;
  }, [graph, selected]);

  return (
    <div className="space-y-8">
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      {sections.map((section) => {
        /*
          토픽 노드도 **선택 가능해야 한다.** `dot-renderer.tsx` 의 `<circle onClick>` 은
          162 개 전부를 고를 수 있는데 여기서 토픽 6 개를 제목으로만 두면
          「마우스로 되는 선택 6 건이 키보드로 안 되는」 상태가 된다(WCAG 2.1.1 위반).
          실측으로 잡혔다 — cursor-pointer 원 162 개 vs 목록 버튼 156 개.

          `<h3>` 은 그대로 둔다. 구획 제목이라는 의미와 `aria-labelledby` 대상이
          바뀌면 안 되므로, 제목을 버튼으로 **바꾸지 않고** 제목 **안에** 버튼을 넣는다.

          `section.topic` 이 null 인 구획(「그 밖의 글」)은 대응하는 노드가 없어
          고를 것이 없다 — 그때만 평문으로 남긴다.
        */
        const topic = section.topic;
        const topicSelected = topic != null && selected === topic.id;
        return (
          <section key={section.key} aria-labelledby={`atlas-topic-${section.key}`}>
            <h3
              id={`atlas-topic-${section.key}`}
              className="text-card-title font-semibold text-n9 break-keep"
            >
              {topic ? (
                <button
                  type="button"
                  onClick={() => onSelect(topic.id)}
                  aria-current={topicSelected ? "true" : undefined}
                  className={[
                    "text-left break-keep",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-n0",
                    // 선택 표시는 글 항목과 같은 방식이다 — 액센트 색.
                    // 굵기는 h3 가 이미 font-semibold 라 여기서 더 주지 않는다.
                    topicSelected ? "text-signal" : "text-n9 hover:text-signal",
                  ].join(" ")}
                >
                  {section.title}
                </button>
              ) : (
                section.title
              )}{" "}
              <span className="text-label text-n6">{section.members.length}편</span>
              {topic && topicSelected ? <DetailLink id={topic.id} title={topic.title} /> : null}
            </h3>
            <ul className="mt-3 space-y-1">
              {section.members.map((m) => {
                const isSelected = selected != null && m.id === selected;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(m.id)}
                      // 선택된 항목만 aria-current 를 갖는다. 스크린리더가 「현재 항목」으로
                      // 읽고, 시각적으로도 액센트로 구분된다.
                      aria-current={isSelected ? "true" : undefined}
                      className={[
                        "text-left text-body break-keep",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal",
                        "focus-visible:ring-offset-2 focus-visible:ring-offset-n0",
                        isSelected ? "font-semibold text-signal" : "text-n7 hover:text-signal",
                      ].join(" ")}
                    >
                      {m.title}
                    </button>
                    {isSelected ? <DetailLink id={m.id} title={m.title} /> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
