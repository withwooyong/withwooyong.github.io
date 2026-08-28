import { SystemDiagramCard } from "@/components/system-diagram-card";
import { diagramGroups } from "@/data/portfolio";

/**
 * 04 시스템 구조 — 회사별 아키텍처 다이어그램.
 *
 * ⚠️ **`data-diagram-group` 은 E2E 가 그룹을 세는 표지다**(`e2e/work.spec.ts`).
 *    클래스로 세면 스타일을 고치는 순간 검사가 조용히 0 이 된다.
 *
 * ⚠️ **회사명은 `group.company` 를 그대로 그린다 — 축약하지 마라.** 한때 옛 사명 병기
 *    「(구 …)」를 떼는 정규식이 여기 있었다. 이유가 「같은 문자열이 경력에도 나와
 *    strict mode 가 터진다」였는데, 그것은 **테스트 로케이터에 맞춰 사용자에게 보이는
 *    문구를 바꾼 것**이라 방향이 반대였다. 실제로는 (1) 그 정규식이 4개 그룹 중 1개만
 *    바꿨고, (2) 축약형이 이 리포의 회사명 정식 표기 규칙과 충돌했다. 충돌 자체는
 *    테스트가 로케이터를 경력 리스트로 스코프해 해소했다.
 */
export function SectionSystems() {
  return (
    <section className="border-t border-n4 py-24 sm:py-32" aria-labelledby="systems-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">04 — Systems</p>
        <h2 id="systems-heading" className="mt-4 text-section font-bold text-n9 break-keep">
          시스템 구조
        </h2>

        <div className="mt-12 space-y-16">
          {diagramGroups.map((group) => (
            <div key={group.id} data-diagram-group={group.id}>
              <h3 className="text-card-title font-semibold text-n9 break-keep">{group.company}</h3>
              <p className="tabular mt-1 text-label uppercase tracking-widest text-n6">
                {group.period}
              </p>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {group.items.map((item) => (
                  <SystemDiagramCard key={item.specId} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
