import Link from "next/link";

import { SiteHead } from "@/components/site-head";
import { SiteShell } from "@/components/site-shell";
// FOCUS_RING 은 `/work` 전용이 아니다. 이름공간이 어긋나 보이지만 여기서 8번째 복붙을
// 만드는 것보다 낫다 — 승격(6개 파일 동시 수정)은 T11 이 범위 밖으로 판단해 미뤄 둔 빚이고,
// 그 판단은 `components/work/focus-ring.ts` 머리 주석에 남아 있다.
import { FOCUS_RING } from "@/components/work/focus-ring";
import { aboutFacts, leadershipPhilosophy } from "@/data/about";
import { education } from "@/data/education";
import { skillCategories, thesisSummaryNarration } from "@/data/portfolio";
import { cn } from "@/lib/utils";

/**
 * `/about` — 「누구인가」. 「무엇을 했나」는 `/work` 다.
 *
 * ⚠️ **이 페이지의 콘텐츠는 세 파일에 흩어져 있고, 두 개는 여기 말고 소비자가 없다.**
 *    T10 이 구 `pages/index.tsx`(537줄)를 전면 재작성하면서 `#about`·`#education` 의
 *    문자열이 그 파일에서 사라졌고, 소실을 막으려고 `data/about.ts`·`data/education.ts`
 *    로 옮겨 뒀다. 계획서 T12 의 코드 조각은 셋을 **import 만 하고 렌더하지 않아**,
 *    그 조각을 그대로 옮기면 계획서가 경고한 「학교 이름도 논문 제목도 없는 학력 페이지」가
 *    그대로 나온다. 여기서는 셋을 전부 화면에 올린다.
 *
 *    | 데이터 | 여기서 쓰는 것 |
 *    | --- | --- |
 *    | `data/about.ts` | `aboutFacts` 3장 · `leadershipPhilosophy` 3문단 |
 *    | `data/education.ts` | 학교명 · 논문 제목 · 논문 PDF 링크 |
 *    | `data/portfolio.ts` | `skillCategories` 4개 · `thesisSummaryNarration`(논문 요약 원문) |
 *
 * ⚠️ **철학 3문단의 경어체(「~습니다」)는 오타가 아니라 보존이다.** 구 `#about` 의 원문
 *    그대로다(`data/about.ts` 머리 주석). 신규 섹션의 평서체와 어투가 다른 것이 눈에 띄면
 *    고칠 곳은 **`data/about.ts` 하나**다 — 여기에 다시 쓴 사본을 만들면 두 벌이 되고
 *    한 벌이 먼저 썩는다.
 *
 * ⚠️ **`aboutHeadings` 는 일부러 쓰지 않는다.** 그것은 구 제목의 **기록**이지 이 페이지의
 *    제목이 아니다(그 파일이 「문구를 다시 쓸 때 원본이 무엇이었는지 남긴다」고 적어 뒀다).
 *    데이터에 묶으면 기록이 슬그머니 살아 있는 콘텐츠가 된다.
 *
 * ⚠️ **`aria-label` 과 `<h2>` 접근명은 장식이 아니라 `e2e/about.spec.ts` 의 접합면이다.**
 *    개수 검사는 전부 데이터에서 센 수와 화면에서 센 수를 맞춘다 — 이름을 바꾸면 검사가
 *    「틀렸다」가 아니라 **「못 찾는다」** 쪽으로 조용히 무너진다.
 *
 * 조립 코드인 `/work`·`/`(메인)과 달리 섹션을 컴포넌트로 쪼개지 않았다. 계획서 T12 의
 * 산출물이 이 파일 하나이고, 여기는 데이터를 순서대로 펴는 문서형 페이지라
 * 섹션을 따로 가져다 쓸 자리가 없다.
 */
export default function About() {
  return (
    <>
      <SiteHead
        title="About — 허우용 · Ted"
        description="백엔드에서 시작해 플랫폼과 조직으로. 20년의 경로와 학력, 그리고 지금 쓰는 기술."
        path="/about/"
      />
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <p className="text-label uppercase tracking-widest text-signal">About</p>
          <h1 className="mt-4 text-hero font-bold text-n9 break-keep">허우용 · Ted</h1>
          <p className="mt-8 text-body text-n7 break-keep">
            백엔드 개발자로 시작해 플랫폼과 조직을 맡았다. 교육·커머스 플랫폼을 30명 규모의
            조직으로 굴렸고, 검색은 두 번 다시 세웠다. 지금은 그 판단들을 글로 남기고 있다.
          </p>

          <dl aria-label="요약" className="mt-12 grid gap-8 sm:grid-cols-3">
            {aboutFacts.map((fact) => (
              <div key={fact.label} className="border-t border-n3 pt-4">
                <dt className="text-label uppercase tracking-widest text-n6">{fact.label}</dt>
                <dd className="mt-2 text-body text-n8 break-keep">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {/* 경력 전문은 `/work` 와 겹친다. 여기서는 요약만 두고 보낸다(계획서 T12·스펙 §4). */}
          <Link
            href="/work/"
            className={cn(
              "mt-10 inline-block rounded-sm text-body text-signal hover:underline transition-interactive break-keep",
              FOCUS_RING,
            )}
          >
            경력 전문 보기 <span aria-hidden="true">→</span>
          </Link>

          <section className="mt-20" aria-labelledby="about-philosophy">
            <h2 id="about-philosophy" className="text-section font-bold text-n9 break-keep">
              개발 리더로서의 철학
            </h2>
            <div className="mt-8 space-y-6">
              {leadershipPhilosophy.map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="text-body text-n7 break-keep">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <section className="mt-20" aria-labelledby="about-skills">
            <h2 id="about-skills" className="text-section font-bold text-n9 break-keep">
              기술
            </h2>
            <dl aria-label="기술 분류" className="mt-8 space-y-8">
              {skillCategories.map((category) => (
                <div key={category.title} className="border-t border-n3 pt-4">
                  <dt className="text-card-title font-semibold text-n9 break-keep">
                    {category.title}
                  </dt>
                  <dd className="mt-2 text-body text-n7 break-keep">{category.body}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-20" aria-labelledby="about-education">
            <h2 id="about-education" className="text-section font-bold text-n9 break-keep">
              학력
            </h2>
            <ul aria-label="학력" className="mt-8 space-y-6">
              {education.map((item) => (
                <li key={item.school} className="border-t border-n3 pt-4">
                  <h3 className="text-card-title font-semibold text-n9 break-keep">
                    {item.school}
                  </h3>
                  <p className="mt-2 text-body text-n7 break-keep">{item.thesisTitle}</p>
                  {/* 접근명을 렌더에서 만든다 — 링크 목록 낭독에서 「논문 PDF」만으로는
                      어느 논문인지 구분되지 않는다(`components/work/section-projects.tsx` 와 같은 이유). */}
                  <a
                    href={item.thesisPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${item.thesisTitle} 논문 PDF — 새 창`}
                    className={cn(
                      "mt-3 inline-block rounded-sm text-body text-signal hover:underline transition-interactive break-keep",
                      FOCUS_RING,
                    )}
                  >
                    논문 PDF <span aria-hidden="true">→</span>
                  </a>
                </li>
              ))}
            </ul>

            {/*
              논문 요약은 `education` 의 항목 필드가 아니라 `data/portfolio.ts` 에 문자열
              하나로 있다(구 `ThesisSummaryDialog` 가 쓰던 것). 그래서 목록 **밖**에 둔다 —
              학력이 두 줄이 되는 날 이 자리는 「어느 논문의 요약인지」를 잃는다.
              그때 고칠 곳은 이 마크업이 아니라 데이터 모양이다.

              ⚠️ `whitespace-pre-line` 이 없으면 안 된다. 원문은 빈 줄로 나뉜 여러 문단인데
                 HTML 은 줄바꿈을 공백으로 접어, 문단 구분이 통째로 사라진 벽 텍스트가 된다.
            */}
            <details className="mt-8 border-t border-n3 pt-4">
              <summary
                className={cn(
                  "cursor-pointer rounded-sm text-body text-signal transition-interactive break-keep",
                  FOCUS_RING,
                )}
              >
                논문 요약
              </summary>
              <p className="mt-4 whitespace-pre-line text-body text-n7 break-keep">
                {thesisSummaryNarration}
              </p>
            </details>
          </section>
        </div>
      </SiteShell>
    </>
  );
}
