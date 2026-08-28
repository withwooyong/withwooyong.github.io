import { HeroStripeBackdrop } from "@/components/hero-stripe-backdrop";
import { PortfolioNav } from "@/components/portfolio-nav";
import { CoinFlipDeck } from "@/components/coin-flip-deck";
import { SectionReveal } from "@/components/section-reveal";
import { SiteHead } from "@/components/site-head";
import { SystemDiagramCard } from "@/components/system-diagram-card";
import { ThesisSummaryDialog } from "@/components/thesis-summary-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { navItems, skillCategories, diagramGroups, writingLinks } from "@/data/portfolio";
import { getPostSummaries } from "@/lib/blog/loader";
import { absoluteUrl, NOTION_RESUME_URL } from "@/lib/site";
import type { PostSummary } from "@/lib/blog/types";
import { ArrowRight, Award, Bot, Code, Database, ExternalLink, Github, Mail, Users, Wrench } from "lucide-react";
import type { GetStaticProps } from "next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const skillIconMap = {
  code: Code,
  database: Database,
  bot: Bot,
  wrench: Wrench,
} as const;

/** 목록에 쓰는 필드만 추린다. props는 __NEXT_DATA__로 HTML에 실리므로 안 쓰는 필드는 용량만 늘린다. */
type FeaturedPost = Pick<PostSummary, "title" | "description" | "slug" | "categorySlug">;

type HomeProps = { featuredPosts: FeaturedPost[] };

export const getStaticProps: GetStaticProps<HomeProps> = () => {
  // loader는 node:fs를 쓴다. 반드시 getStaticProps 안에서만 부른다 —
  // 컴포넌트 본문에서 참조하면 클라이언트 번들에 fs가 딸려 들어가 빌드가 깨진다.
  const featuredPosts = getPostSummaries()
    .filter((p) => p.featured)
    .map(({ title, description, slug, categorySlug }) => ({ title, description, slug, categorySlug }));

  return { props: { featuredPosts } };
};

export default function Home({ featuredPosts }: HomeProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const personJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "허우용",
      alternateName: ["Ted", "Wooyong Heo"],
      url: absoluteUrl("/"),
      image: absoluteUrl("/images/Ted_profile.png"),
      sameAs: ["https://github.com/withwooyong"],
      jobTitle: "개발총괄·CTO 지향 백엔드·플랫폼 리더",
    }),
    []
  );

  const year = new Date().getFullYear();

  return (
    <>
      <SiteHead
        title="허우용 · 개발총괄·CTO 지향 20년차 백엔드·플랫폼 리더"
        description="허우용(Ted)의 개발자 포트폴리오입니다. 20년 경력의 엔지니어링 리더이자 직전 (주)야나두(a kakao company, 구 카카오키즈) 커머스개발실장으로, KT·CJ헬로비전·SK브로드밴드에서 1,000만+ 사용자 서비스 개발과 플랫폼 구축을 주도한 플랫폼 아키텍트입니다. AI를 활용해 개발 생산성과 업무 효율을 극대화하고 있습니다."
        path="/"
        jsonLd={personJsonLd}
      />

      <main
        id="main"
        className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden text-slate-900 dark:text-slate-100"
      >
        <div className="absolute inset-0 opacity-30 dark:opacity-20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-cyan-500/10" />

        <PortfolioNav items={navItems} brand="허우용" englishHref="/en/" />

        <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 relative z-10 overflow-hidden">
          <HeroStripeBackdrop />
          <div
            className="pointer-events-none absolute -top-28 left-[8%] z-[1] w-[min(480px,85vw)] h-[min(480px,85vw)] rounded-full bg-blue-400/30 dark:bg-blue-500/20 blur-3xl hero-blob"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-8 right-[-5%] z-[1] w-[min(420px,75vw)] h-[min(420px,75vw)] rounded-full bg-purple-400/25 dark:bg-purple-500/15 blur-3xl hero-blob--alt"
            aria-hidden
          />
          <div className="relative z-10 max-w-7xl mx-auto">
            <div className={cn("text-center", isLoaded && "hero-motion")}>
              <div className="mx-auto mb-6 flex justify-center hero-stagger-1">
                <div className="profile-coin-group h-32 w-32">
                  <div className="relative h-full w-full rounded-full shadow-lg ring-2 ring-white/50 dark:ring-slate-600">
                    <div className="profile-coin-face">
                      <Image
                        src="/images/Ted_profile.png"
                        alt="허우용 프로필 사진"
                        width={128}
                        height={128}
                        className="h-full w-full object-cover"
                        priority
                      />
                    </div>
                  </div>
                </div>
              </div>
              <h1 className="hero-hello text-5xl sm:text-6xl md:text-8xl text-slate-900 dark:text-slate-50 mb-4 hero-stagger-2">
                <span className="hero-hello-write">
                  안녕하세요, <span className="text-blue-600 dark:text-blue-400">허우용</span>입니다
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-8 hero-stagger-3">개발총괄·CTO 지향 20년차 백엔드·플랫폼 리더</p>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-4xl mx-auto leading-relaxed mb-8 hero-stagger-4">
                20년 이상 경력의 엔지니어링 리더.
                <br className="hidden sm:inline" />{" "}
직전 <strong>(주)야나두 a kakao company (구 카카오키즈) 커머스개발실장</strong>으로 30명 규모 개발 조직과 교육·커머스 플랫폼 총괄.
                <br className="hidden sm:inline" />{" "}
                <strong>KT, CJ헬로비전, SK브로드밴드</strong>에서 1,000만+ 사용자 서비스 개발 및 플랫폼 구축 주도.
                <br className="hidden sm:inline" />{" "}
                온프레미스(IDC)와 AWS 클라우드 환경 모두 경험한 플랫폼 아키텍트.
                <br className="hidden sm:inline" />{" "}
                AI·플랫폼·조직을 연결해 서비스 성장과 개발 생산성 향상을 이끌어온 기술 리더.
              </p>
              <div className="flex flex-wrap justify-center gap-3 hero-stagger-5">
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
                  <a href={NOTION_RESUME_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    경력기술서 보기
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
                  <Link href="/product-lead-v2/">
                    플랫폼 프로덕트 리더로 보기
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="py-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm relative z-10 border-y border-transparent dark:border-slate-800/50">
          <SectionReveal>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-slate-50 mb-12">소개</h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">개발 리더로서의 철학</h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  개발의 실행은 이미 AI로 옮겨가고 있습니다. 리더가 할 일은 무엇을 만들지 정하는 판단과, AI가 안전하게 일할 수 있는 틀을 세우는 것이라고 믿습니다. 좋은 코드의 기준도 사람이 읽기 좋은 코드에서,
                  AI가 정확히 읽고 안전하게 고칠 수 있는 구조로 옮겨가고 있습니다. 20년간 개발과 리딩을 함께 해 오며, 이 기준을 팀의 표준으로 세우는 일이 결국 팀의 속도와 서비스의 안정성을 만든다고 믿습니다.
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  좋은 제품은 기획·디자인·개발이 같은 그림을 볼 때 나온다고 믿습니다. 기획, UI/UX부터 프론트, 백엔드, 앱, 데브옵스까지 전 직군을 총괄하며, 요구사항을 그대로 구현하기보다 문제 정의 단계부터
                  기획자·디자이너와 함께 고민해 사용자 경험과 기술 구조가 어긋나지 않는 접점을 찾아 왔습니다. 개발 리더가 제품과 사용자의 언어를 함께 쓸 때, 팀의 결과물은 기능을 넘어 제품이 됩니다.
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  기술적 결정은 팀이 감당할 수 있는 복잡도 안에서 내리고, 위임과 코드 리뷰를 통해 동료의 성장이 곧 조직의 성장이 되도록 이끕니다. 리더의 일은 아키텍처 표준과 코드 리뷰·보안 게이트, 검증 파이프라인을
                  세워 AI가 안전하게 일하도록 만드는 것이라 보고, 야나두에서도 다양한 챗봇 형태의 AI 서비스를 직접 개발·런칭하며 이 방식을 실천해 왔습니다.
                </p>
              </div>
              <CoinFlipDeck className="grid grid-cols-1 gap-6">
                <Card className="coin-flip-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      직전 포지션
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 dark:text-slate-300">(주)야나두 a kakao company (구 카카오키즈) 커머스개발실장 (2022.02 ~ 2026.07 · 4년 6개월)</p>
                  </CardContent>
                </Card>
                <Card className="coin-flip-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-green-600 dark:text-green-400" />
                      전문 분야
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 dark:text-slate-300">AI 서비스, N-Screen, OTT, STB, CMS 개발</p>
                  </CardContent>
                </Card>
                <Card className="coin-flip-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      팀 규모
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 dark:text-slate-300">20~30명 개발팀 총괄 경험</p>
                  </CardContent>
                </Card>
              </CoinFlipDeck>
            </div>
          </div>
          </SectionReveal>
        </section>

        <section id="product" className="py-16 relative z-10">
          <SectionReveal>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="relative overflow-hidden rounded-3xl border border-blue-100/80 dark:border-slate-700/70 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-8 md:p-12 shadow-sm">
                <div className="max-w-3xl mx-auto text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">플랫폼 · 프로덕트 리더십</p>
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">개발 리더를 넘어, 제품을 이끄는 리더</h2>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                    OTT·커머스 플랫폼의 코어 엔진 설계부터 CMS 재구축·현대화, AI, 그리고 조직까지 — 20년의 경험을 제품 관점으로 정리한 한 장 요약입니다.
                  </p>
                  <ul className="flex flex-wrap justify-center gap-2 mb-8">
                    {["콘텐츠 코어 엔진", "CMS 재구축·현대화", "커머스 + AI", "크로스펑셔널 조직"].map((chip) => (
                      <li
                        key={chip}
                        className="rounded-full border border-blue-200/80 dark:border-slate-600 bg-white/70 dark:bg-slate-800/70 px-4 py-1.5 text-sm text-slate-700 dark:text-slate-200"
                      >
                        {chip}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
                  >
                    <Link href="/product-lead-v2/">
                      플랫폼 프로덕트 리더로 보기
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </SectionReveal>
        </section>

        <section id="experience" className="py-16 bg-gradient-to-r from-slate-50/80 to-blue-50/80 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm relative z-10">
          <SectionReveal>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-slate-50 mb-12">경력</h2>
            <div className="space-y-8">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-xl">커머스개발실장</CardTitle>
                      <CardDescription className="text-blue-600 dark:text-blue-400 font-medium">(주)야나두 a kakao company (구 카카오키즈)</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">2022.02 - 2026.07</Badge>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">4년 6개월</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">기획, UI/UX, 프론트, 백엔드, 앱, 데브옵스 포지션의 인력(20~30명)으로 야나두 전반적인 서비스 개발 총괄</p>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start">
                      <span className="text-blue-500 dark:text-blue-400 mr-2">•</span>
                      다양한 챗봇 형태의 AI 기술 서비스 개발 및 런칭
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 dark:text-blue-400 mr-2">•</span>
                      교육&커머스 도메인 서비스 개발 총괄
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 dark:text-blue-400 mr-2">•</span>
                      풀스택 개발팀 리딩 및 프로젝트 관리
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-xl">Senior 엔지니어 & PM</CardTitle>
                      <CardDescription className="text-green-600 dark:text-green-400 font-medium">SK Broadband (AI 서비스 개발스쿼드/미디어클라우드스쿼드)</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">2017.04 - 2021.06</Badge>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">4년 3개월</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">BTV 백엔드 개발 매니저 (PM)로 검색, 딥메타, NUGU 음성 AI 연동, CMS, 로그연동 개인화, 통합이미지플랫폼 등 다양한 서비스 개발</p>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start">
                      <span className="text-green-500 dark:text-green-400 mr-2">•</span>
                      N-Screen 백엔드 연동 서비스를 위한 Spring Boot / Elasticsearch 기반 API 개발
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 dark:text-green-400 mr-2">•</span>
                      검색 시스템 개발 / 추천 서비스 API 개발 및 ELK Stack 구축
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 dark:text-green-400 mr-2">•</span>
                      대용량 데이터 처리 및 분석을 위한 Kafka Consumer, ELK 구성 데이터 연동 적재모듈 개발
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 dark:text-green-400 mr-2">•</span>
                      차세대 CMS(NCMS) 재구축 발주사 PM — MSA 설계·검토 및 오픈 조율
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-xl">CMS 개발 파트 리드</CardTitle>
                      <CardDescription className="text-purple-600 dark:text-purple-400 font-medium">CJ Hellovision (TVING 서비스개발팀)</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">2012.06 - 2017.04</Badge>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">4년 11개월</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">TVING CMS 개발 파트 리드로 CMS, 검색, 이미지, 미디어트랜스코딩 등 N-Screen 서비스 개발</p>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start">
                      <span className="text-purple-500 dark:text-purple-400 mr-2">•</span>
                      Spring Framework 기반 CMS 개발
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 dark:text-purple-400 mr-2">•</span>
                      검색 시스템 / 랭킹추천 서비스 API 개발
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 dark:text-purple-400 mr-2">•</span>
                      N-Screen 통합API 개발을 위한 MongoDB 기반 API 개발
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 dark:text-purple-400 mr-2">•</span>
                      이미지 resizing 서버 개발
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-xl">시스템 개발</CardTitle>
                      <CardDescription className="text-orange-600 dark:text-orange-400 font-medium">쌍용정보통신 (통신연구소/뉴미디어기술팀)</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">2005.11 - 2012.06</Badge>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">6년 8개월</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">KT 가입자계 통합보안 관제시스템 개발 및 KT QOOK TV A-MOC 플랫폼 개발</p>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start">
                      <span className="text-orange-500 dark:text-orange-400 mr-2">•</span>
                      KT 가입자계 통합보안관리시스템(ISM) 프로젝트 수행
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 dark:text-orange-400 mr-2">•</span>
                      KT QOOK TV A-MOC 플랫폼 개발 프로젝트 수행
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
          </SectionReveal>
        </section>

        <section id="projects" className="py-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm relative z-10">
          <SectionReveal>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-slate-50 mb-12">주요 프로젝트</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="hover:shadow-lg transition-shadow overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute inset-0 bg-[url('/images/yanadoo-logo.png')] bg-center bg-no-repeat bg-contain opacity-40"></div>
                  <span className="text-white text-2xl font-bold relative z-10 drop-shadow-lg">야나두</span>
                </div>
                <CardHeader>
                  <CardTitle>야나두 AI 서비스</CardTitle>
                  <CardDescription>교육&커머스 도메인의 AI 챗봇 서비스 개발</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">커머스</Badge>
                    <Badge variant="secondary">AI</Badge>
                    <Badge variant="secondary">챗봇</Badge>
                    <Badge variant="secondary">교육</Badge>
                    <Badge variant="secondary">B2B</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" className="w-full">
                      <a href="https://www.yanadoo.co.kr/AIYanadoo" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        AI 맞춤학습
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <a href="https://www.yanadoo.co.kr/AIContents" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        서비스 보기
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute inset-0 bg-[url('/images/skb-logo.png')] bg-center bg-no-repeat bg-contain opacity-40"></div>
                  <span className="text-white text-2xl font-bold relative z-10 drop-shadow-lg">BTV</span>
                </div>
                <CardHeader>
                  <CardTitle>SK Broadband BTV</CardTitle>
                  <CardDescription>BTV 백엔드 연동 CMS/검색/추천/이미지 시스템 개발</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">OTT</Badge>
                    <Badge variant="secondary">검색</Badge>
                    <Badge variant="secondary">추천</Badge>
                    <Badge variant="secondary">이미지</Badge>
                    <Badge variant="secondary">CMS</Badge>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <a href="https://www.bworld.co.kr/product/btv/mobile_btv.do?menu_id=P03050200" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      서비스 보기
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/10"></div>
                  <div className="absolute inset-0 bg-[url('/images/tving-logo.png')] bg-center bg-no-repeat bg-contain opacity-40"></div>
                  <span className="text-white text-2xl font-bold relative z-10 drop-shadow-lg">TVING</span>
                </div>
                <CardHeader>
                  <CardTitle>TVING</CardTitle>
                  <CardDescription>N-Screen 통합 CMS 및 검색/추천 서비스 개발</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">N-Screen</Badge>
                    <Badge variant="secondary">CMS</Badge>
                    <Badge variant="secondary">검색</Badge>
                    <Badge variant="secondary">API</Badge>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <a href="https://www.tving.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      서비스 보기
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
          </SectionReveal>
        </section>

        <section id="systems" className="py-16 bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-slate-900/90 dark:to-slate-800/90 backdrop-blur-sm relative z-10">
          <SectionReveal>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-slate-50 mb-12">시스템 구성도</h2>
            <div className="space-y-16">
              {diagramGroups.map((group) => (
                <div key={group.id}>
                  <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-200 pb-3 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {group.company}
                    </h3>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {group.period}
                    </span>
                  </div>
                  <div className="space-y-8">
                    {group.items.map((item) => (
                      <SystemDiagramCard key={item.specId} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          </SectionReveal>
        </section>

        <section id="skills" className="py-16 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm relative z-10">
          <SectionReveal>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-slate-50 mb-12">기술 스택</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {skillCategories.map((s) => {
                const Icon = skillIconMap[s.icon];
                const tone =
                  s.icon === "code"
                    ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                    : s.icon === "database"
                      ? "bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400"
                      : s.icon === "bot"
                        ? "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                        : "bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400";
                return (
                  <Card key={s.title} className="text-center hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className={`w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center ${tone}`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <CardTitle>{s.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-600 dark:text-slate-300 text-sm">{s.body}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          </SectionReveal>
        </section>

        <section id="writing" className="py-16 bg-gradient-to-r from-slate-50/80 to-indigo-50/80 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm relative z-10">
          <SectionReveal>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-slate-50 mb-4">글·링크</h2>
            <p className="text-center text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto">
              직접 정리한 기술 노트와 외부에 공개된 자료·저장소로 연결합니다.
            </p>
            {featuredPosts.length > 0 ? (
              // 개수를 가정하지 않는 세로 목록. 2열 그리드로 두면 featured가 홀수일 때 칸이 빈다.
              // 구분선을 전용 유틸리티가 아니라 인덱스로 주는 이유: 이 페이지에서 처음 쓰이는
              // Tailwind 클래스가 생기면 CSS 번들 해시가 바뀌어 기존 페이지의 stylesheet 링크까지
              // 전부 달라진다(GC-6). 같은 이유로 주석에도 클래스명을 적지 않는다 —
              // Tailwind는 소스를 텍스트로 스캔해 주석 안의 토큰도 클래스로 인식한다.
              <Card className="max-w-3xl mx-auto mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">먼저 읽어볼 글</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {featuredPosts.map((p, i) => (
                    <div
                      key={`${p.categorySlug}/${p.slug}`}
                      className={cn(i > 0 && "border-t border-slate-200 pt-4 dark:border-slate-800")}
                    >
                      <Link
                        href={`/blog/${p.categorySlug}/${p.slug}/`}
                        className="font-semibold text-slate-900 transition-colors hover:text-blue-600 hover:underline dark:text-slate-100 dark:hover:text-blue-400 break-keep"
                      >
                        {p.title}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 break-keep">{p.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {writingLinks.map((w) => {
                // 같은 사이트 안의 이동(/blog/)에 target="_blank"가 붙으면 안 된다.
                const external = /^https?:\/\//.test(w.href);
                return (
                  <Card key={w.href} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{w.label}</CardTitle>
                      {w.description ? <CardDescription>{w.description}</CardDescription> : null}
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="outline" className="w-full">
                        <a href={w.href} {...(external && { target: "_blank", rel: "noopener noreferrer" })}>
                          {external ? (
                            <ExternalLink className="h-4 w-4 mr-2" />
                          ) : (
                            <ArrowRight className="h-4 w-4 mr-2" />
                          )}
                          열기
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          </SectionReveal>
        </section>

        <section id="education" className="py-16 bg-gradient-to-r from-green-50/80 to-teal-50/80 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm relative z-10 scroll-mt-20">
          <SectionReveal>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 dark:text-slate-50 mb-12">학력</h2>
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">서울시립대학교 (석사)</CardTitle>
                <CardDescription className="text-lg">
                  <strong>논문:</strong> 시스템 통합 서비스를 위한 확장 가능한 NoSQL 설계방법 연구
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-center gap-3">
                <ThesisSummaryDialog />
                <Button asChild>
                  <a href="https://drive.google.com/file/d/1eAv426PXVEaCpMvQAvcUHkMUZ2WggM4j/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    논문 보기
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
          </SectionReveal>
        </section>

        <section id="contact" className="py-16 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm relative z-10 scroll-mt-20">
          <SectionReveal>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-8">연락하기</h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-12">함께 일하고 싶으시다면 언제든 연락해주세요!</p>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                    <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle>이메일</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <a
                    href="mailto:withwooyong@gmail.com"
                    className="inline-flex text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
                  >
                    이메일 보내기
                  </a>
                  <p className="text-xs text-muted-foreground break-all">withwooyong@gmail.com</p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                    <Github className="h-8 w-8 text-slate-600 dark:text-slate-300" />
                  </div>
                  <CardTitle>GitHub</CardTitle>
                </CardHeader>
                <CardContent>
                  <a href="https://github.com/withwooyong" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    github.com/withwooyong
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
          </SectionReveal>
        </section>

        <footer className="bg-slate-900 text-white py-8 relative z-10 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-300">
            <p>
              &copy; {year} 허우용. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
