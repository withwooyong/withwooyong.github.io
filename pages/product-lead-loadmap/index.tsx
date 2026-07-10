import { RoadmapDomain } from "@/components/roadmap-domain";
import { SectionReveal } from "@/components/section-reveal";
import { SiteHead } from "@/components/site-head";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { domains, pmOrg } from "@/data/product-lead-domains";
import {
  couplings,
  domainMetrics,
  firstQuestions,
  guardrails,
  metricPrinciples,
  missionMap,
  northStar,
  onboarding,
  priorityPrinciples,
  stages,
  stopRules,
} from "@/data/product-lead-roadmap";
import { AlertTriangle, ArrowRight, BookOpen, Compass, Gauge, Layers, ListOrdered, Network, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

const sectionNav = [
  { href: "#mission", label: "공고 ↔ 접근" },
  { href: "#coupling", label: "도메인 연결" },
  { href: "#priority", label: "우선순위" },
  { href: "#onboarding", label: "첫 90일" },
  { href: "#metrics", label: "지표 체계" },
  { href: "#domains", label: "도메인 상세" },
  { href: "#organization", label: "PM 조직" },
];

/** 착수 순서 4단계의 accent → Tailwind 클래스. 동적 클래스명은 purge되므로 정적 매핑으로 둔다. */
const stageAccent: Record<string, { border: string; chip: string }> = {
  emerald: {
    border: "border-l-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  amber: {
    border: "border-l-amber-500",
    chip: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  blue: {
    border: "border-l-blue-500",
    chip: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  },
  violet: {
    border: "border-l-violet-500",
    chip: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  },
};

export default function ProductLeadRoadmap() {
  return (
    <>
      <SiteHead
        title="플랫폼 코어 실행 설계 | 허우용 (Ted)"
        description="TVING Platform Product Lead 관점에서 CMS·결제/정산·공통 어드민·거버넌스 4개 코어 도메인을 어떤 순서와 근거로 다룰 것인지 정리한 실행 설계."
        path="/product-lead-loadmap/"
        noindex
      />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/product-lead-v2/" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline" hrefLang="ko">
              ← 프로덕트 리더십
            </Link>
            <nav aria-label="문서 내 이동" className="hidden lg:flex items-center gap-5">
              {sectionNav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </header>

        <main id="main" className="max-w-5xl mx-auto px-4 py-12 space-y-16">
          {/* 히어로 */}
          <SectionReveal>
            <section className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                TVING · Platform Product Lead
              </p>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight break-keep leading-[1.3]">
                플랫폼 코어를 <span className="text-blue-600 dark:text-blue-400">어떤 순서</span>로,
                <br className="hidden sm:block" /> 어떤 근거로 다시 세울 것인가
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed break-keep max-w-3xl">
                CMS · 결제/정산 · 공통 어드민 · 거버넌스. 네 개의 코어 도메인을 동시에 할 수는 없습니다. 이 문서는 무엇을 먼저
                하고 무엇을 뒤로 미룰지, 그리고 그 판단의 근거가 무엇인지를 정리한 실행 설계입니다.
              </p>

              <Link href="/product-lead-wiki/" className="block">
                <Card className="border-blue-300 bg-blue-50/60 transition-colors hover:border-blue-500 dark:border-blue-900 dark:bg-blue-950/30">
                  <CardContent className="flex items-center gap-3 p-4">
                    <BookOpen className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                    <p className="flex-1 text-sm leading-relaxed break-keep text-blue-900 dark:text-blue-200">
                      <strong className="font-semibold">아키텍처 구성도 · ERD · 시퀀스 · 상태기계 도식 73개</strong>가 포함된 원문
                      위키도 있습니다.
                    </p>
                    <ArrowRight className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                  </CardContent>
                </Card>
              </Link>

              <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30">
                <CardContent className="p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden />
                  <div className="space-y-1.5 text-sm text-amber-900 dark:text-amber-200 leading-relaxed break-keep">
                    <p className="font-semibold">이 문서의 전제</p>
                    <p>
                      모든 As-Is 서술은 공개정보에서 추론한 <strong>가설</strong>입니다. 티빙 내부 자료가 아닙니다. 로드맵의 기간과
                      목표치도 전부 <strong>가정</strong>이며, 실제 순서와 기간은 부임 후 실측 결과와 조직 규모에 따라 팀과 함께
                      재산정합니다.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </SectionReveal>

          {/* 공고 주요업무 ↔ 접근 */}
          <SectionReveal>
            <section id="mission" className="space-y-5 scroll-mt-20">
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <Compass className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden />
                  주요업무 다섯 가지에 대한 접근
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 break-keep">
                  공고가 요구하는 다섯 가지 업무 각각을, 어떤 도메인에서 어떤 방식으로 풀 것인지 대응시켰습니다.
                </p>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">주요업무</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">도메인</th>
                          <th className="px-4 py-3 font-semibold">나의 접근</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missionMap.map((m) => (
                          <tr key={m.no} className="border-b border-slate-100 dark:border-slate-800 last:border-0 align-top">
                            <td className="px-4 py-3 text-slate-800 dark:text-slate-200 break-keep min-w-[14rem]">
                              <span className="mr-2 text-xs font-bold text-blue-600 dark:text-blue-400">{m.no}</span>
                              {m.posting}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Badge variant="secondary">{m.domain}</Badge>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 leading-relaxed break-keep">{m.approach}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          </SectionReveal>

          {/* 도메인 연결 */}
          <SectionReveal>
            <section id="coupling" className="space-y-5 scroll-mt-20">
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <Network className="h-6 w-6 text-violet-600 dark:text-violet-400" aria-hidden />
                  네 도메인은 어떻게 연결되는가
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 break-keep">
                  도메인을 따로 보면 순서를 정할 수 없습니다. 무엇이 무엇을 참조하는지 먼저 봅니다.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {couplings.map((c) => (
                  <Card key={c.observation} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base break-keep leading-snug">{c.observation}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep">{c.implication}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-l-4 border-l-rose-500">
                <CardContent className="p-5 space-y-2">
                  <p className="font-semibold text-rose-700 dark:text-rose-400 break-keep">
                    가장 위험한 결합은 &lsquo;권리 → 정산&rsquo;입니다
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep">
                    콘텐츠의 권리 보유자를 CMS가 알고, 정산이 그것을 참조합니다. 두 팀이 이 모델을 각자 갖고 있으면 정산 금액이
                    틀리고, 아무도 그 사실을 모릅니다. 그래서 이 참조는 문서가 아니라 <strong>API 계약</strong>으로 명시되고 CI에서
                    강제되어야 합니다.
                  </p>
                </CardContent>
              </Card>
            </section>
          </SectionReveal>

          {/* 우선순위 */}
          <SectionReveal>
            <section id="priority" className="space-y-5 scroll-mt-20">
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <ListOrdered className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  무엇을 먼저 할 것인가
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 break-keep">
                  네 개를 동시에 할 수는 없습니다. 중요한 것은 과제의 개수가 아니라 순서를 정하는 근거입니다.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {priorityPrinciples.map((p, i) => (
                  <Card key={p.title} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">원칙 {i + 1}</span>
                      <CardTitle className="text-base break-keep leading-snug">{p.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep">{p.reason}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stages.map((s) => {
                  const accent = stageAccent[s.accent];
                  return (
                    <Card key={s.period} className={`border-l-4 ${accent.border}`}>
                      <CardHeader className="pb-2">
                        <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${accent.chip}`}>{s.period}</span>
                        <CardTitle className="text-base break-keep">{s.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                          {s.items.map((item) => (
                            <li key={item} className="flex gap-2 break-keep">
                              <span className="text-slate-400 dark:text-slate-600" aria-hidden>
                                ·
                              </span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-5 space-y-2">
                  <p className="font-semibold break-keep">왜 결제 원장이 CMS 코어보다 먼저인가</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep">
                    CMS 재구축은 이 자리의 간판 과제입니다. 하지만 원장 없이 결제를 두면, CMS를 고치는 동안 돈이 새는 것을 아무도
                    모릅니다. 그리고 원장은 <strong>기존 결제를 건드리지 않고 병렬로 기록만</strong> 하면 되므로 리스크가 낮습니다.
                    싸고, 안전하고, 효과가 큽니다.
                  </p>
                </CardContent>
              </Card>
            </section>
          </SectionReveal>

          {/* 0-30-60-90일 */}
          <SectionReveal>
            <section id="onboarding" className="space-y-5 scroll-mt-20">
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <Layers className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden />
                  부임 후 첫 90일
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 break-keep">
                  첫 분기의 목표는 재구축을 시작하는 것이 아니라, 재구축의 근거를 &lsquo;내 기억&rsquo;이 아닌 &lsquo;지금의
                  데이터&rsquo;로 세우는 것입니다.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {onboarding.map((phase) => (
                  <Card key={phase.window} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <Badge variant="secondary" className="w-fit">
                        {phase.window}
                      </Badge>
                      <CardTitle className="text-base break-keep">{phase.theme}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                        {phase.items.map((item) => (
                          <li key={item} className="flex gap-2 break-keep">
                            <span className="text-slate-400 dark:text-slate-600" aria-hidden>
                              ·
                            </span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-slate-100/70 dark:bg-slate-900">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base break-keep">첫 30일에 반드시 던지는 세 가지 질문</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2.5">
                    {firstQuestions.map((q, i) => (
                      <li key={q} className="flex gap-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-keep">
                        <span className="shrink-0 grid place-items-center h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                          {i + 1}
                        </span>
                        {q}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed break-keep">
                    세 질문 모두 답이 막히면, 그 자체가 첫 분기의 과제 목록입니다. 답이 나온다면 baseline이 이미 있다는 뜻이고,
                    그때는 곧바로 개선에 들어갈 수 있습니다.
                  </p>
                </CardContent>
              </Card>
            </section>
          </SectionReveal>

          {/* 지표 체계 */}
          <SectionReveal>
            <section id="metrics" className="space-y-5 scroll-mt-20">
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <Gauge className="h-6 w-6 text-cyan-600 dark:text-cyan-400" aria-hidden />
                  지표 체계
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 break-keep">
                  북극성 하나, 도메인마다 하나. 그리고 하나라도 깨지면 실패로 간주하는 가드레일.
                </p>
              </div>

              <Card className="border-2 border-blue-500/60 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="p-6 text-center space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">플랫폼 북극성</p>
                  <p className="text-2xl font-bold">{northStar.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 break-keep">{northStar.description}</p>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-2 gap-4">
                {domainMetrics.map((d) => (
                  <Card key={d.domain}>
                    <CardContent className="p-5 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{d.domain}</p>
                      <p className="font-semibold break-keep">{d.metric}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 break-keep">보조지표 · {d.supporting}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border-rose-300 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base text-rose-800 dark:text-rose-300">
                    <ShieldCheck className="h-5 w-5" aria-hidden />
                    전사 가드레일 — 하나라도 깨지면 실패
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-rose-900 dark:text-rose-200">
                    {guardrails.map((g) => (
                      <li key={g} className="flex gap-2 break-keep">
                        <span aria-hidden>·</span>
                        {g}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-4">
                {metricPrinciples.map((p) => (
                  <Card key={p.title}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base break-keep leading-snug">{p.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep">{p.reason}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base break-keep">중단 기준은 시작 전에 정한다</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep">
                    확산하기 전에 멈출 조건을 먼저 정합니다. 나중에 정하면 아무도 멈추자고 말하지 못합니다.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        {stopRules.map((r) => (
                          <tr key={r.domain} className="border-b border-slate-100 dark:border-slate-800 last:border-0 align-top">
                            <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {r.domain}
                            </td>
                            <td className="py-2.5 text-slate-600 dark:text-slate-300 break-keep">{r.condition}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          </SectionReveal>

          {/* 도메인 상세 */}
          <section id="domains" className="space-y-10 scroll-mt-20">
            <SectionReveal>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold">도메인별 실행 설계</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 break-keep">
                  네 개 도메인 각각을 같은 뼈대로 다룹니다. 내부 고객이 누구인지 정의하고, As-Is를 가설로 세우고, 실측으로 검증한
                  뒤, 설계 원칙과 전환 로드맵을 정하고, 마지막으로 지표와 중단 기준에 합의합니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  {domains.map((d) => (
                    <a
                      key={d.id}
                      href={`#${d.id}`}
                      className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-sm text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {d.no} · {d.title}
                    </a>
                  ))}
                </div>
              </div>
            </SectionReveal>

            {domains.map((domain) => (
              <SectionReveal key={domain.id}>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-10">
                  <RoadmapDomain domain={domain} />
                </div>
              </SectionReveal>
            ))}
          </section>

          {/* PM 조직 빌딩 */}
          <SectionReveal>
            <section id="organization" className="space-y-5 scroll-mt-20 border-t border-slate-200 dark:border-slate-800 pt-10">
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <Users className="h-6 w-6 text-violet-600 dark:text-violet-400" aria-hidden />
                  PM 조직 빌딩 — {pmOrg.headline}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed break-keep">{pmOrg.intro}</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pmOrg.roles.map((r) => (
                  <Card key={r.name}>
                    <CardContent className="p-4 space-y-0.5">
                      <p className="font-semibold text-sm">{r.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 break-keep">{r.scope}</p>
                    </CardContent>
                  </Card>
                ))}
                <Card className="bg-slate-100/70 dark:bg-slate-900">
                  <CardContent className="p-4 space-y-1">
                    <p className="font-semibold text-sm">공유 규율</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 break-keep">{pmOrg.shared.join(" · ")}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base break-keep">채용은 기준을 먼저, 사람을 나중에</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2.5">
                    {pmOrg.hiring.map((h, i) => (
                      <li key={h.step} className="flex gap-3 text-sm">
                        <span className="shrink-0 grid place-items-center h-6 w-6 rounded-md bg-violet-600 text-white text-xs font-bold">
                          {i + 1}
                        </span>
                        <p className="break-keep leading-relaxed">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{h.step} · </span>
                          <span className="text-slate-600 dark:text-slate-300">{h.detail}</span>
                        </p>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { title: "역콘웨이 기동", body: pmOrg.conway },
                  { title: "baseline이 없으면 만든다", body: pmOrg.baseline },
                  { title: "구조로 굴러가야 한다", body: pmOrg.lesson },
                ].map((c) => (
                  <Card key={c.title}>
                    <CardContent className="p-4 space-y-1.5">
                      <p className="font-semibold text-sm break-keep">{c.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep">{c.body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </SectionReveal>

          {/* 더 보기 */}
          <SectionReveal>
            <section className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-8">
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                  <Link href="/product-lead-wiki/">
                    <BookOpen className="h-4 w-4 mr-2" />
                    도식으로 보는 원문 위키
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/product-lead-v2/">
                    프로덕트 리더십 요약
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/">전체 포트폴리오</Link>
                </Button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 break-keep">
                허우용(Ted) · 플랫폼 코어 4개 도메인 실행 설계. 기간과 목표치는 모두 가정이며, 실측 후 재산정합니다.
              </p>
            </section>
          </SectionReveal>
        </main>
      </div>
    </>
  );
}
