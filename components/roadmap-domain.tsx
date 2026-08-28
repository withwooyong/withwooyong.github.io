import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Domain } from "@/data/product-lead-domains";
import { ChevronDown } from "lucide-react";

/**
 * 도메인 accent → 완성된 Tailwind 클래스.
 * 템플릿 문자열로 조립하면 빌드 시 클래스 스캔에서 누락되므로 정적 매핑으로 둔다.
 */
const accentStyles: Record<Domain["accent"], { ring: string; text: string; bg: string; bar: string }> = {
  blue: {
    ring: "ring-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    bar: "bg-blue-600",
  },
  emerald: {
    ring: "ring-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    bar: "bg-emerald-600",
  },
  amber: {
    ring: "ring-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    bar: "bg-amber-600",
  },
  violet: {
    ring: "ring-violet-500/30",
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    bar: "bg-violet-600",
  },
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h4>
      {children}
    </div>
  );
}

export function RoadmapDomain({ domain }: { domain: Domain }) {
  const a = accentStyles[domain.accent];

  return (
    <article id={domain.id} className="scroll-mt-20 space-y-8">
      {/* 도메인 헤더 */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`grid place-items-center h-10 w-10 rounded-lg text-white font-bold ${a.bar}`}>{domain.no}</span>
          <h3 className="text-2xl font-bold break-keep">{domain.title}</h3>
          <Badge variant="secondary">{domain.posting}</Badge>
        </div>

        <blockquote className={`rounded-lg px-5 py-4 ring-1 ${a.ring} ${a.bg}`}>
          <p className={`text-lg font-semibold break-keep leading-relaxed ${a.text}`}>&ldquo;{domain.headline}&rdquo;</p>
        </blockquote>

        <p className="text-slate-600 dark:text-slate-300 leading-relaxed break-keep">{domain.summary}</p>
      </div>

      {/* 내부 고객 / 관심사 */}
      {domain.customers ? (
        <Block title="내부 고객">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                      <th className="px-4 py-2.5 font-semibold whitespace-nowrap">누구</th>
                      <th className="px-4 py-2.5 font-semibold">하는 일</th>
                      <th className="px-4 py-2.5 font-semibold">{domain.id === "admin" ? "필요 권한" : "고통"}</th>
                      {domain.customers.some((c) => c.risk) ? (
                        <th className="px-4 py-2.5 font-semibold whitespace-nowrap">위험도</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {domain.customers.map((c) => (
                      <tr key={c.who} className="border-b border-slate-100 dark:border-slate-800 last:border-0 align-top">
                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200 break-keep md:whitespace-nowrap">
                          {c.who}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 break-keep">{c.job}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 break-keep">{c.pain}</td>
                        {domain.customers?.some((x) => x.risk) ? (
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{c.risk ?? "—"}</td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </Block>
      ) : null}

      {domain.concerns ? (
        <Block title="분리해야 할 세 가지 관심사">
          <div className="grid sm:grid-cols-3 gap-4">
            {domain.concerns.map((c) => (
              <Card key={c.title}>
                <CardContent className="p-4 space-y-1">
                  <p className="font-semibold break-keep">{c.title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 break-keep">{c.question}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Block>
      ) : null}

      {/* 설계 원칙 */}
      <Block title="설계 원칙">
        <ol className="space-y-2.5">
          {domain.principles.map((p, i) => (
            <li key={p.title} className="flex gap-3">
              <span className={`shrink-0 grid place-items-center h-6 w-6 rounded-md text-white text-xs font-bold ${a.bar}`}>
                {i + 1}
              </span>
              <div className="space-y-0.5">
                <p className="font-semibold break-keep leading-snug">{p.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 break-keep leading-relaxed">{p.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Block>

      {/* As-Is → To-Be */}
      <Block title="As-Is 가설 → To-Be">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                    <th className="px-4 py-2.5 font-semibold whitespace-nowrap">축</th>
                    <th className="px-4 py-2.5 font-semibold">As-Is (가설)</th>
                    <th className="px-4 py-2.5 font-semibold">To-Be</th>
                    <th className="px-4 py-2.5 font-semibold">근거</th>
                  </tr>
                </thead>
                <tbody>
                  {domain.transitions.map((t) => (
                    <tr key={t.axis} className="border-b border-slate-100 dark:border-slate-800 last:border-0 align-top">
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200 break-keep md:whitespace-nowrap">
                        {t.axis}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 break-keep line-through decoration-slate-300 dark:decoration-slate-600">
                        {t.asIs}
                      </td>
                      <td className={`px-4 py-2.5 font-medium break-keep ${a.text}`}>{t.toBe}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 break-keep">{t.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Block>

      {/* 로드맵 */}
      <Block title="전환 로드맵">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep">{domain.phaseNote}</p>
        <ol className="relative space-y-4 pl-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
          {domain.phases.map((phase) => (
            <li key={phase.name} className="relative">
              <span className={`absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-slate-50 dark:ring-slate-950 ${a.bar}`} />
              <div className="flex flex-wrap items-baseline gap-x-3">
                <p className="font-semibold break-keep">{phase.name}</p>
                <span className="text-xs text-slate-500 dark:text-slate-400">{phase.period}</span>
              </div>
              <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                {phase.items.map((item) => (
                  <li
                    key={item}
                    className="break-keep before:mr-2 before:text-slate-300 before:content-['·'] first:before:hidden dark:before:text-slate-600"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              {phase.milestone ? (
                <p className={`mt-1.5 text-sm font-medium break-keep ${a.text}`}>완료 조건 · {phase.milestone}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </Block>

      {/* 지표 */}
      <Block title="성과지표">
        <div className="grid md:grid-cols-3 gap-4">
          <Card className={`ring-1 ${a.ring} ${a.bg}`}>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">북극성</p>
              <p className={`font-bold break-keep ${a.text}`}>{domain.northStar}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">입력 지표</p>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {domain.inputMetrics.map((m) => (
                  <li key={m} className="break-keep">
                    {m}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-rose-200 dark:border-rose-900">
            <CardContent className="p-4 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">가드레일</p>
              <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {domain.guardrails.map((g) => (
                  <li key={g} className="break-keep">
                    {g}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </Block>

      {/* 깊이 보기 — 네이티브 details로 JS 없이 접기 */}
      <details className="group rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 font-semibold text-sm">
          <span className="break-keep">진단 · 설계 결정 · 빌드/바이 · 중단 기준 자세히 보기</span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
        </summary>

        <div className="space-y-8 border-t border-slate-200 dark:border-slate-800 px-5 py-6">
          {/* As-Is 문제 */}
          <Block title="As-Is 가설이 참이라면 생기는 문제">
            <div className="grid sm:grid-cols-2 gap-3">
              {domain.asIsProblems.map((p) => (
                <div key={p.code} className="rounded-md border border-slate-200 dark:border-slate-800 p-3.5">
                  <p className="text-sm font-semibold break-keep">
                    <span className="mr-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">{p.code}</span>
                    {p.problem}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 break-keep leading-relaxed">{p.why}</p>
                </div>
              ))}
            </div>
            <Card className="border-l-4 border-l-rose-500">
              <CardContent className="p-4 space-y-1.5">
                <p className="font-semibold text-rose-700 dark:text-rose-400 break-keep">{domain.worstProblem.title}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep">{domain.worstProblem.body}</p>
              </CardContent>
            </Card>
          </Block>

          {/* 검증 설계 */}
          <Block title={domain.verification.title}>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              {domain.verification.items.map((item) => (
                <li key={item} className="flex gap-2 break-keep">
                  <span className="text-slate-400 dark:text-slate-600" aria-hidden>
                    ·
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep border-l-2 border-slate-300 dark:border-slate-700 pl-4">
              {domain.verification.note}
            </p>
          </Block>

          {/* 설계 결정 */}
          <Block title="설계 결정 — 왜 이렇게 나눴는가">
            <div className="space-y-3">
              {domain.decisions.map((d) => (
                <div key={d.title} className="rounded-md bg-slate-50 dark:bg-slate-950/60 p-4">
                  <p className="font-semibold break-keep leading-snug">{d.title}</p>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep">{d.body}</p>
                </div>
              ))}
            </div>
          </Block>

          {/* 빌드 / 바이 */}
          <Block title="빌드 vs 바이">
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className={`text-sm font-bold ${a.text}`}>빌드 — 소유해야 하는 것</p>
                  <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {domain.build.map((b) => (
                      <li key={b} className="break-keep">
                        {b}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-2">
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">바이 — 사는 게 싼 것</p>
                  <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {domain.buy.map((b) => (
                      <li key={b} className="break-keep">
                        {b}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-keep border-l-2 border-slate-300 dark:border-slate-700 pl-4">
              {domain.buildBuyNote}
            </p>
          </Block>

          {/* 중단 기준 */}
          <Block title="중단 기준 — 시작 전에 정한다">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                    <th className="px-3 py-2 font-semibold">조건</th>
                    <th className="px-3 py-2 font-semibold">조치</th>
                  </tr>
                </thead>
                <tbody>
                  {domain.stopRules.map((r) => (
                    <tr key={r.condition} className="border-b border-slate-100 dark:border-slate-800 last:border-0 align-top">
                      <td className="px-3 py-2 text-slate-800 dark:text-slate-200 break-keep">{r.condition}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300 break-keep">{r.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>
        </div>
      </details>
    </article>
  );
}
