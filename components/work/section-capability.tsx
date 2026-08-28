import { FOCUS_RING } from "@/components/work/focus-ring";
import { capabilityMap } from "@/data/work";

/**
 * 01 요구 역량 매핑 — 채용 요구사항과 이력을 한 행씩 마주 놓는 표.
 *
 * ⚠️ **표가 `min-w-*` 라 좁은 화면에서 반드시 가로로 스크롤된다.** 스크롤 컨테이너에
 *    `tabIndex` 가 없으면 키보드 사용자는 그 영역에 포커스할 수 없어 **오른쪽 열을
 *    영영 읽지 못한다.** 그리고 포커스 정지점이 생겼으면 포커스 링도 함께 와야 한다 —
 *    다크 배경 위에서 브라우저 기본 outline 은 대비가 낮고, 이 페이지의 다른 정지점과
 *    모양이 달라 「여기서 방향키로 스크롤하라」는 신호가 서지 않는다.
 *
 * ⚠️ **이름은 이 구간에 딱 하나만 둔다.**
 *    - `<section aria-labelledby>` — landmark. h2 를 **안에** 품는다
 *    - 스크롤 `<div>` — `tabIndex={0}` + 같은 h2 를 가리키는 접근명. **`role="region"` 은 달지 않는다**
 *    - `<table>` — **접근명 없음**
 *
 *    2026-08-28 리뷰가 잡은 것이 이 배치의 근거다. 스크롤 div 에 `role="region"` 을 주면
 *    landmark 가 되어 바깥 `<section>` 과 같은 이름이 겹치고, 그것을 피하려고 `<section>` 에서
 *    이름을 떼면 **h2 가 landmark 밖으로 밀려난다.** 게다가 그 안쪽 `<table>` 이 같은
 *    `aria-label` 을 갖고 있어 「요구 역량 매핑, 영역」 직후 「요구 역량 매핑, 표」가
 *    연달아 낭독됐다 — 피하려던 중복이 위치만 옮겨 살아남은 상태였다.
 *
 *    **키보드 도달을 만드는 것은 `role="region"` 이 아니라 `tabIndex` 다.** `role` 은
 *    landmark 목록에 띄우는 별개 기능이고, 여기서는 그 이득보다 비용이 크다.
 *
 * ⚠️ `<table>` 에서 이름을 뺐으므로 `e2e/work.spec.ts` 는 `getByRole("table")` 을 **이름 없이**
 *    잡는다. 이 리포에서 `<table>` 은 지금 이 파일에만 있다 — 다른 곳에 표가 생기면
 *    그 검사가 먼저 빨개진다. 그때 이름을 붙이지 말고 **검사 쪽을 스코프하라.**
 */
export function SectionCapability() {
  return (
    <section aria-labelledby="capability-heading" className="border-t border-n4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">01 — Capability</p>
        <h2 id="capability-heading" className="mt-4 text-section font-bold text-n9 break-keep">
          요구 역량 매핑
        </h2>

        <div
          aria-labelledby="capability-heading"
          tabIndex={0}
          className={`mt-12 overflow-x-auto ${FOCUS_RING}`}
        >
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-n4">
                <th
                  scope="col"
                  className="w-1/3 py-3 pr-6 text-label uppercase tracking-widest text-n6 break-keep"
                >
                  요구 역량
                </th>
                <th
                  scope="col"
                  className="py-3 text-label uppercase tracking-widest text-n6 break-keep"
                >
                  뒷받침하는 이력
                </th>
              </tr>
            </thead>
            <tbody>
              {capabilityMap.map((row) => (
                <tr key={row.need} className="border-b border-n4 align-top">
                  <th scope="row" className="py-4 pr-6 text-body font-semibold text-n9 break-keep">
                    {row.need}
                  </th>
                  <td className="py-4 text-body text-n7 break-keep">{row.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
