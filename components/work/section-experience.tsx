import { experiences } from "@/data/experience";

/**
 * 02 경력 — 메인은 대표 3건만 싣고(`components/home/section-selected-work.tsx`),
 * 여기가 전체를 펴는 자리다. 그래서 `slice` 하지 않는다 —
 * `e2e/work.spec.ts` 가 화면에서 센 수를 데이터에서 센 수와 맞춘다.
 *
 * ⚠️ **바깥 `<ul>` 에만 이름을 준다.** 안쪽 `highlights` 목록에 `aria-label` 을 달면
 *    같은 이름의 list 가 둘이 되어 개수 검사가 어느 쪽을 잡을지 알 수 없게 된다.
 *
 * ⚠️ **`data/experience.ts` 의 과도기 색상 필드는 하나도 소비하지 않는다.**
 *    회사 라벨용·불릿용 둘 다 구 4색 액센트를 담고 있어, 하나라도 쓰면
 *    신규 단일 시그널 토큰 체계를 조용히 우회하게 된다.
 */
export function SectionExperience() {
  return (
    <section className="border-t border-n4 py-24 sm:py-32" aria-labelledby="experience-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">02 — Experience</p>
        <h2 id="experience-heading" className="mt-4 text-section font-bold text-n9 break-keep">
          경력
        </h2>

        <ul aria-label="경력" className="mt-12 space-y-12">
          {experiences.map((exp) => (
            <li key={`${exp.company}-${exp.period}`} className="border-l-2 border-n4 pl-6">
              <p className="tabular text-label uppercase tracking-widest text-n6">
                {exp.period} · {exp.duration}
              </p>
              <h3 className="mt-2 text-card-title font-semibold text-n9 break-keep">{exp.role}</h3>
              <p className="text-body text-n6 break-keep">{exp.company}</p>
              <p className="mt-3 text-body text-n7 break-keep">{exp.summary}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 marker:text-signal">
                {exp.highlights.map((highlight, index) => (
                  <li key={index} className="text-body text-n7 break-keep">
                    {highlight}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
