/**
 * 04 Atlas — **단계 4에서 켠다. 지금은 어디에서도 렌더하지 않는다.**
 *
 * ⚠️ 계획서(2026-08-25 §Task 10)는 「`/atlas` 가 없어서 죽은 링크가 된다」를 이유로
 *    적었지만 **그 전제는 이미 낡았다** — `pages/atlas/index.tsx` 와 `[...id].tsx` 가
 *    다른 계획서에서 먼저 생겼고, 헤더 NAV 에도 Atlas 가 들어 있다.
 *    그래도 렌더하지 않는 결정은 유지한다. 이유가 바뀌었을 뿐이다:
 *    이 섹션이 약속하는 것은 링크가 아니라 **그래프 미리보기와 토픽별 노드 수**인데,
 *    그 집계가 아직 없다. 숫자 없는 미리보기는 링크 한 줄만 못하다.
 *
 * `tests/home/task-10-structure.test.ts` 가 이 규약을 지킨다. 그 파일은
 * 「section-atlas.tsx 는 존재하고, pages/index.tsx 안의 SectionAtlas 사용은 0건」을
 * 동시에 단언한다. 켜는 시점에 그 단언부터 고쳐야 한다.
 *
 * 단계 4에서 채울 것: 그래프 미리보기 + 토픽별 노드 수, 그리고 `/atlas` 로 잇는 링크.
 * 지금 껍데기가 담은 것은 자리와 제목뿐이다.
 */
export function SectionAtlas() {
  return (
    <section id="atlas" className="border-t border-n4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">04 — Atlas</p>
        <h2 className="mt-4 text-section font-bold text-n9 break-keep">
          글은 목록이 아니라 지도로 이어져 있다
        </h2>
        <p className="mt-6 max-w-2xl text-body text-n7 break-keep">
          그래프 미리보기와 토픽별 노드 수는 단계 4 에서 채운다. 그 집계가 아직 없어
          지금은 이 섹션 자체를 그리지 않는다.
        </p>
      </div>
    </section>
  );
}
