import { SectionReveal } from "@/components/section-reveal";
import { SiteHead } from "@/components/site-head";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { absoluteUrl } from "@/lib/site";
import { ArrowRight, Bot, ExternalLink, Github, Layers, Mail, Search, ShoppingCart, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const NOTION_RESUME_URL = "https://www.notion.so/282845b3742d8060bff8cd6f0012ef63?source=copy_link";

/** 핵심 요약 4가지 — 플랫폼 프로덕트 리더로서의 강점 */
const summaryCards = [
  {
    Icon: Layers,
    iconClassName: "text-blue-600 dark:text-blue-400",
    title: "콘텐츠 플랫폼 코어 엔진",
    body: "OTT·N-Screen의 CMS·검색·편성·메타데이터·통합 API를 직접 설계하고 운영해 온, 콘텐츠 파이프라인의 코어를 아는 리더.",
  },
  {
    Icon: Search,
    iconClassName: "text-indigo-600 dark:text-indigo-400",
    title: "CMS 재구축·현대화",
    body: "TVING CMS를 처음 구축한 파트 리드이자, 레거시 CMS를 MSA 기반으로 재설계한 경험 — 원조 구축과 현대화 양쪽을 모두 통과.",
  },
  {
    Icon: ShoppingCart,
    iconClassName: "text-emerald-600 dark:text-emerald-400",
    title: "커머스 + AI",
    body: "교육·커머스 플랫폼을 총괄하고, 다양한 AI 챗봇·서비스를 직접 기획·런칭. 콘텐츠를 넘어 커머스와 AI까지 잇는 제품 감각.",
  },
  {
    Icon: Users,
    iconClassName: "text-purple-600 dark:text-purple-400",
    title: "조직·거버넌스",
    body: "기획·UI/UX·프론트·백엔드·앱·데브옵스 전 직군 20~30명을 총괄한 크로스펑셔널 리딩. 확장 가능한 플랫폼 설계를 석사 논문으로 연구.",
  },
];

/** 대표 여정 — 최신 경력부터 역순, 각 단계를 맥락 → 역할 → 접근 → 임팩트(정성)로 서술 */
const journey = [
  {
    period: "2022.02 - 재직중",
    duration: "4년 6개월",
    org: "(주)야나두 a kakao company (구 카카오키즈)",
    role: "커머스개발실장",
    context: "교육·커머스 도메인에서 제품 성장과 AI 전환을 동시에 요구받는 국면.",
    approach: "기획~데브옵스 전 직군을 총괄하며 교육·커머스 서비스를 제품 단위로 운영하고, 다양한 챗봇형 AI 서비스를 기획·런칭.",
    impact: "콘텐츠·커머스·AI·조직을 연결해 제품을 성장시키는 프로덕트 리더십으로 확장 — 메타데이터·검색 경험을 AI 자동화로 잇는 기반.",
  },
  {
    period: "2017.04 - 2021.06",
    duration: "4년 3개월",
    org: "SK 브로드밴드 (B tv 백엔드 · 미디어클라우드)",
    role: "B tv 백엔드 개발 매니저 / PM",
    context: "대규모 트래픽의 IPTV·OTT를 모듈화된 플랫폼으로 진화시켜야 했던 단계.",
    approach: "차세대 CMS(NCMS) 재구축의 발주사 PM으로 MSA 설계·검토를 진행하고, 검색·딥메타·개인화, 통합 이미지 플랫폼, EPG/VOD 편성 플랫폼을 리딩.",
    impact: "레거시를 모듈화·MSA로 재구축하는 제품·아키텍처 관점을 확립 — 확장성과 유연성을 플랫폼 거버넌스로 다루는 경험.",
  },
  {
    period: "2012.06 - 2017.04",
    duration: "4년 11개월",
    org: "CJ 헬로비전 (TVING 서비스개발팀)",
    role: "N-Screen(Web·TV·Mobile) CMS 개발 파트 리드",
    context: "콘텐츠가 여러 화면으로 흐르는 OTT의 초기 — 통합 CMS와 콘텐츠 파이프라인이 필요했던 시기.",
    approach: "CMS·검색·랭킹 추천·이미지·미디어 트랜스코딩과 N-Screen 통합 API를 설계·개발하며 콘텐츠 코어 엔진을 세움.",
    impact: "여러 디바이스로 일관되게 콘텐츠가 배급되는 코어 플랫폼을 팀과 함께 구축 — 오늘의 CMS 재구축을 '내부에서 겪어 본' 관점.",
  },
];

/** 플랫폼 프로덕트 리드 요구 역량 ↔ 근거 매핑 */
const capabilityMap: { need: string; evidence: string; confirm?: boolean }[] = [
  { need: "콘텐츠·플랫폼 코어 엔진 로드맵", evidence: "OTT·N-Screen의 CMS·검색·편성·통합 API를 설계·운영 (CJ헬로비전, SKB)" },
  { need: "대규모 CMS 재구축·현대화", evidence: "TVING CMS 원조 구축 + SKB 차세대 CMS(NCMS) 재구축 발주사 PM(MSA 설계·검토)" },
  { need: "커머스 결제·정산·구독 도메인", evidence: "야나두 교육·커머스 플랫폼 총괄 — 결제·정산·구독 등 커머스 핵심 도메인 서비스 개발 관리" },
  { need: "플랫폼 거버넌스·요구사항 모듈화", evidence: "MSA 설계, 통합 이미지/API 플랫폼, 확장 가능한 DB 설계 연구(석사 논문)" },
  { need: "MSA · API 설계 · 클라우드", evidence: "Spring Boot 기반 API·MSA, 온프레미스(IDC)와 AWS 모두 운영" },
  { need: "백오피스·내부 운영 UX 고도화", evidence: "CMS·편성·백오피스 운영 도구 개발을 제품 단위로 총괄" },
  { need: "OTT · 스트리밍 도메인", evidence: "KT·CJ헬로비전·SK브로드밴드에서 OTT/N-Screen/STB 20년" },
  { need: "커머스 플랫폼", evidence: "야나두 교육·커머스 플랫폼 총괄" },
  { need: "AI 기반 메타데이터 자동화", evidence: "검색·추천·딥메타 실무 + AI 챗봇 서비스 직접 개발·런칭" },
  { need: "PM·크로스펑셔널 조직 리딩", evidence: "기획·PM 포함 전 직군 20~30명 총괄" },
];

export default function ProductLead() {
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "허우용",
    alternateName: ["Ted", "Wooyong Heo"],
    url: absoluteUrl("/product-lead/"),
    image: absoluteUrl("/images/Ted_yanadoo.png"),
    sameAs: ["https://github.com/withwooyong"],
    jobTitle: "Platform / Product Leader",
    worksFor: { "@type": "Organization", name: "(주)야나두 a kakao company (구 카카오키즈)" },
  };

  return (
    <>
      <SiteHead
        title="허우용 — 플랫폼 프로덕트 리더"
        description="20년간 OTT·커머스 플랫폼의 코어를 설계하고 조직과 함께 제품으로 완성해 온 리더. TVING CMS를 처음 구축한 개발 리드에서, 커머스·AI 플랫폼을 총괄하는 프로덕트 리더로. CMS 재구축·플랫폼 거버넌스·AI 메타데이터 관점의 요약 한 장."
        path="/product-lead/"
        jsonLd={personJsonLd}
      />

      <div
        lang="ko"
        className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100"
      >
        <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/85 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline" hrefLang="ko">
              ← 전체 포트폴리오
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main id="main" className="max-w-4xl mx-auto px-4 py-12 space-y-14">
          {/* 헤더 / 포지셔닝 */}
          <SectionReveal>
          <section className="flex flex-col sm:flex-row items-center gap-8">
            <div className="profile-coin-group w-28 h-28 shrink-0">
              <div className="relative h-full w-full rounded-full shadow-lg ring-2 ring-white/50 dark:ring-slate-600">
                <div className="profile-coin-face">
                  <Image src="/images/Ted_yanadoo.png" alt="허우용 프로필 사진" width={112} height={112} className="w-full h-full object-cover" priority />
                </div>
              </div>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">For Platform / Product Leadership</p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">허우용 · 플랫폼 프로덕트 리더</h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                20년간 OTT·커머스 플랫폼의 코어를 설계하고, 조직과 함께 제품으로 완성해 온 리더.
              </p>
              <p className="text-base text-blue-700 dark:text-blue-300 font-medium mt-2">
                TVING CMS를 처음 만든 개발 리드에서, 커머스·AI 플랫폼을 총괄하는 프로덕트 리더로.
              </p>
            </div>
          </section>
          </SectionReveal>

          {/* CTA */}
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
              <Link href="/">전체 포트폴리오 보기</Link>
            </Button>
            <Button asChild variant="outline" className="transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
              <a href={NOTION_RESUME_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                경력기술서 (Notion)
              </a>
            </Button>
          </div>

          {/* 핵심 요약 */}
          <SectionReveal>
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">핵심 요약</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {summaryCards.map(({ Icon, iconClassName, title, body }) => (
                <Card key={title} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className={`h-5 w-5 ${iconClassName}`} />
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
          </SectionReveal>

          {/* 대표 여정 */}
          <SectionReveal>
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">대표 여정</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">최신 경력부터 역순으로, 각 단계를 맥락 → 역할 → 접근 → 임팩트 순서로 정리했습니다.</p>
            <div className="space-y-4">
              {journey.map((j) => (
                <Card key={j.period} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{j.role}</CardTitle>
                        <CardDescription className="text-blue-600 dark:text-blue-400 font-medium">{j.org}</CardDescription>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
                        <Badge variant="secondary" className="w-fit">{j.period}</Badge>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{j.duration}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">맥락 · </span>{j.context}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">접근 · </span>{j.approach}</p>
                    <p><span className="font-semibold text-slate-800 dark:text-slate-200">임팩트 · </span>{j.impact}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
          </SectionReveal>

          {/* 역량 매핑 */}
          <SectionReveal>
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">플랫폼 프로덕트 리드 요구 역량 매핑</h2>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">요구 역량</th>
                        <th className="px-4 py-3 font-semibold">근거</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capabilityMap.map(({ need, evidence, confirm }) => (
                        <tr key={need} className="border-b border-slate-100 dark:border-slate-800 last:border-0 align-top">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {need}
                            {confirm ? <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(확인 필요)</span> : null}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 leading-relaxed">{evidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
          </SectionReveal>

          {/* 연결 */}
          <SectionReveal>
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">더 보기</h2>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/">
                  전체 포트폴리오
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href={NOTION_RESUME_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  경력기술서 (Notion)
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="https://github.com/withwooyong" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4 mr-2" />
                  GitHub
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="mailto:withwooyong@gmail.com">
                  <Mail className="h-4 w-4 mr-2" />
                  이메일
                </a>
              </Button>
            </div>
            <p className="pt-4 text-xs text-slate-400 dark:text-slate-500">
              <Bot className="inline h-3.5 w-3.5 mr-1 align-text-bottom" />
              콘텐츠·플랫폼·AI를 잇는 프로덕트 리더십 요약 페이지입니다.
            </p>
          </section>
          </SectionReveal>
        </main>
      </div>
    </>
  );
}
