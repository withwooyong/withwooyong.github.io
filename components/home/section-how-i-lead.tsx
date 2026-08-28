/**
 * 02 How I Lead — 리더십 원칙. 각 1문장이다.
 *
 * `atlasId` 는 단계 4에서 `/atlas/[id]` 링크가 된다. 지금은 링크를 그리지 않는다.
 *
 * ⚠️ `/atlas` 자체는 이미 있다(`pages/atlas/`). 없는 것은 **이 세 id 에 해당하는
 *    노드**다. `pages/atlas/[...id].tsx` 는 정적 export 라 `getStaticPaths` 가 낸
 *    경로만 존재하므로, 지금 링크를 걸면 세 개 전부 404 로 간다(설계서 §4).
 */
const PRINCIPLES: { atlasId: string; title: string; body: string }[] = [
  {
    atlasId: "org-before-service",
    title: "조직이 먼저다",
    body: "서비스는 조직 구조를 그대로 닮는다. 구조를 못 바꾸면 서비스도 못 바꾼다.",
  },
  {
    atlasId: "measure-before-argue",
    title: "논쟁 전에 측정한다",
    body: "추측으로 합의한 결정은 추측으로 뒤집힌다. 숫자가 있으면 논쟁이 짧아진다.",
  },
  {
    atlasId: "rules-live-in-checkers",
    title: "규칙은 문서가 아니라 검사기에 둔다",
    body: "지켜지지 않을 규칙은 규칙 전체를 죽인다. 기계가 막을 수 있으면 기계가 막는다.",
  },
];

export function SectionHowILead() {
  return (
    <section id="how-i-lead" className="border-t border-n4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">02 — How I Lead</p>

        {/*
          이 섹션만 heading 이 0개였다. 위 p 는 라벨이고 아래 dt 는 heading 이 아니라
          정의 목록의 용어라, 스크린리더 사용자가 H 키로 훑으면 **원칙 3개가 문서 개요에서
          통째로 빠졌다.** 01·03·05 는 전부 h2 를 갖고 있다.

          ⚠️ 시각적 h2 를 넣지 않고 sr-only 로 둔 이유 — 「02 만 헤드라인 없음」은
             계획서 §4 의 디자인 결정이다. 개요의 구멍은 접근성 결함이지만 헤드라인의
             부재는 결함이 아니므로, 결함만 고치고 디자인은 건드리지 않는다.

          ⚠️ **위 p 와 문자열이 절대 같으면 안 된다.** 같으면 Playwright 가 같은 이름의
             요소 2개를 보고 strict mode 위반을 낸다 — components/hero.tsx:64-72 가
             같은 함정을 문서화하고 있다. 그래서 여기는 한글 문장이다.
        */}
        <h2 className="sr-only">내가 팀을 이끄는 방식</h2>

        <dl className="mt-12 grid gap-10 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.atlasId}>
              <dt className="text-card-title font-semibold text-n9 break-keep">{p.title}</dt>
              <dd className="mt-2 text-body text-n7 break-keep">{p.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
