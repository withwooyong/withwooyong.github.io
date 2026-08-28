import { workPositioning } from "@/data/work";

/**
 * 00 포지셔닝 — `/work` 에서 `<h1>` 은 여기 하나뿐이다.
 *
 * ⚠️ **`aria-labelledby` 로 h1 을 가리킨다.** 이름 없는 `section` 은 접근성 트리에서
 *    generic 으로 접히고, 나머지 다섯 섹션이 전부 이름을 갖는 페이지에서 첫 섹션만
 *    landmark 목록에서 사라진다. 2026-08-28 리뷰가 이것을 지적했다.
 *
 * ⚠️ **두 문장을 각각 단독 `<p>` 에 둔다.** 한 요소 안에 이어 붙이거나 다른 문구를
 *    같이 넣으면 `e2e/work.spec.ts` 의 exact 매칭이 못 찾는다.
 */
export function SectionPositioning() {
  return (
    <section className="py-24 sm:py-32" aria-labelledby="positioning-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">
          {workPositioning.eyebrow}
        </p>
        <h1
          id="positioning-heading"
          className="mt-4 max-w-4xl text-hero font-bold text-n9 break-keep"
        >
          {workPositioning.heading}
        </h1>
        <p className="mt-8 max-w-3xl text-body text-n7 break-keep">{workPositioning.lead}</p>
        <p className="mt-3 max-w-3xl text-body text-n6 break-keep">{workPositioning.sub}</p>
      </div>
    </section>
  );
}
