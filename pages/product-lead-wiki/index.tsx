import { SiteHead } from "@/components/site-head";
import { Card, CardContent } from "@/components/ui/card";
import { WikiShell } from "@/components/wiki-shell";
import { wikiDocs, type WikiDoc } from "@/lib/wiki";
import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

type Props = { docs: WikiDoc[] };

export function getStaticProps() {
  return { props: { docs: wikiDocs } };
}

export default function WikiIndex({ docs }: Props) {
  return (
    <>
      <SiteHead
        title="플랫폼 코어 실행 설계 위키 | 허우용 (Ted)"
        description="TVING Platform Product Lead 관점의 CMS·결제/정산·공통 어드민·거버넌스 실행 설계. 아키텍처 구성도·ERD·시퀀스·상태기계·로드맵 도식 74개를 포함한 원문 위키."
        path="/product-lead-wiki/"
        noindex
      />

      <WikiShell docs={docs}>
        <div className="max-w-3xl space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              TVING · Platform Product Lead
            </p>
            <h1 className="text-2xl font-bold leading-[1.3] break-keep sm:text-3xl md:text-4xl">플랫폼 코어 실행 설계 위키</h1>
            <p className="leading-relaxed break-keep text-slate-600 sm:text-lg dark:text-slate-300">
              CMS · 결제/정산 · 공통 어드민 · 거버넌스. 네 개 코어 도메인을 어떤 순서로, 어떤 근거로 다시 세울 것인지를 도식
              중심으로 정리한 원문 문서군입니다. 시스템 구성도, ERD, 시퀀스, 상태기계, 로드맵 간트를 그대로 담았습니다.
            </p>
          </div>

          <Card className="border-amber-300 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30">
            <CardContent className="flex gap-3 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div className="space-y-1.5 text-sm leading-relaxed break-keep text-amber-900 dark:text-amber-200">
                <p className="font-semibold">이 문서군의 전제</p>
                <p>
                  모든 As-Is 도식은 공개정보에서 추론한 <strong>가설</strong>입니다. 티빙 내부 자료가 아닙니다. 로드맵의 기간과
                  목표치도 전부 <strong>가정</strong>이며, 실제 순서와 기간은 부임 후 실측 결과와 조직 규모에 따라 팀과 함께
                  재산정합니다.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">문서</h2>
            {docs.map((d, i) => (
              <Link key={d.slug} href={`/product-lead-wiki/${d.slug}/`} className="block">
                <Card className="transition-all hover:border-blue-400 hover:shadow-md">
                  <CardContent className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                    <span className="shrink-0 text-xl font-bold tabular-nums text-slate-200 sm:text-2xl dark:text-slate-700">
                      {String(i).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <p className="font-bold break-keep">{d.title}</p>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{d.posting}</span>
                      </div>
                      <p className="text-sm break-keep text-slate-500 dark:text-slate-400">{d.subtitle}</p>
                      <p className="pt-1 text-sm leading-relaxed break-keep text-slate-700 dark:text-slate-300">
                        &ldquo;{d.essence}&rdquo;
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <p className="border-t border-slate-200 pt-6 text-sm text-slate-500 break-keep dark:border-slate-800 dark:text-slate-400">
            핵심만 빠르게 훑고 싶다면{" "}
            <Link href="/product-lead-loadmap/" className="text-blue-600 underline underline-offset-2 dark:text-blue-400">
              요약 페이지
            </Link>
            를 보세요. 이 위키는 도식과 데이터 모델까지 포함한 원문입니다.
          </p>
        </div>
      </WikiShell>
    </>
  );
}
