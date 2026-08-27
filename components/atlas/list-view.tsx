import { useMemo } from "react";
import { listSections, neighborsOf } from "@/lib/atlas/layout";
import type { AtlasGraph } from "@/lib/atlas/types";

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
      {sections.map((section) => (
        <section key={section.key} aria-labelledby={`atlas-topic-${section.key}`}>
          <h3
            id={`atlas-topic-${section.key}`}
            className="text-card-title font-semibold text-n9 break-keep"
          >
            {section.title} <span className="text-label text-n6">{section.members.length}편</span>
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
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
