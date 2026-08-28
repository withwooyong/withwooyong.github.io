import { domains } from "@/data/product-lead-domains";

/**
 * 05 도메인 실행 설계 — 도메인별 실행 요약.
 *
 * ⚠️ 도메인은 `id`·`title`·`summary` 만 쓴다. 로드맵 상세와 `RoadmapDomain` 인터랙션은
 *    T14 가 지웠다 — 여기서 그것들을 묶어 뒀다면 T14 가 자기가 만든 코드를 되돌려야 했다.
 *    `data/product-lead-domains.ts` 만 남은 이유가 이 섹션이다.
 */
export function SectionDomains() {
  return (
    <section className="border-t border-n4 py-24 sm:py-32" aria-labelledby="domains-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">05 — Domains</p>
        <h2 id="domains-heading" className="mt-4 text-section font-bold text-n9 break-keep">
          도메인 실행 설계
        </h2>

        <ul aria-label="도메인 실행 설계" className="mt-12 grid gap-6 sm:grid-cols-2">
          {domains.map((domain) => (
            <li key={domain.id} className="rounded-lg border border-n4 bg-n1 p-6">
              <h3 className="text-card-title font-semibold text-n9 break-keep">{domain.title}</h3>
              <p className="mt-3 text-body text-n7 break-keep">{domain.summary}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
