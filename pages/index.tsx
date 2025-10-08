import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Award, Bot, Code, Database, ExternalLink, Github, Mail, Phone, Users, Wrench } from "lucide-react";
import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <>
      <Head>
        <title>허우용 - Agile Developer & Tech Lead</title>
        <meta name="description" content="허우용의 개발자 포트폴리오입니다. 야나두 개발실장, SK Broadband Senior 엔지니어, CJ Hellovision CMS PL 경험을 바탕으로 한 풀스택 개발자입니다." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
        </div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5"></div>
        {/* Navigation */}
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="text-xl font-bold text-slate-900">허우용</div>
              <div className="hidden md:flex space-x-8">
                <a href="#about" className="text-slate-600 hover:text-slate-900 transition-colors">
                  소개
                </a>
                <a href="#experience" className="text-slate-600 hover:text-slate-900 transition-colors">
                  경력
                </a>
                <a href="#projects" className="text-slate-600 hover:text-slate-900 transition-colors">
                  프로젝트
                </a>
                <a href="#systems" className="text-slate-600 hover:text-slate-900 transition-colors">
                  시스템 구성
                </a>
                <a href="#skills" className="text-slate-600 hover:text-slate-900 transition-colors">
                  기술
                </a>
                <a href="#contact" className="text-slate-600 hover:text-slate-900 transition-colors">
                  연락
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className={`text-center transition-all duration-1000 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="mb-8">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden shadow-lg">
                  <Image src="/images/Ted_yanadoo.png" alt="허우용 프로필 사진" width={128} height={128} className="w-full h-full object-cover" />
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-4">
                  안녕하세요, <span className="text-blue-600">허우용</span>입니다
                </h1>
                <p className="text-xl md:text-2xl text-slate-600 mb-8">Agile Developer & Tech Lead</p>
                <p className="text-lg text-slate-500 max-w-4xl mx-auto leading-relaxed">
                  <strong>야나두 개발실장</strong>으로서 20~30명의 개발팀을 총괄하며,
                  <br />
                  <strong>SK Broadband, CJ Hellovision</strong>에서 1000만 이상 유저를 보유한 서비스 개발 경험을 가지고 있습니다.
                  <br />
                  N-Screen, OTT, STB, AI 서비스 등 다양한 도메인에서 풀스택 개발과 팀 리딩을 담당해왔습니다.
                </p>
              </div>
              <div className="flex justify-center">
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <a href="https://www.notion.so/282845b3742d8060bff8cd6f0012ef63?source=copy_link" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    경력기술서 보기
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 bg-white/70 backdrop-blur-sm relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-12">소개</h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-6">개발자로서의 철학</h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  전반적인 IT 기술 트렌드를 따라가기 위해 노력하고 있으며, 특히 AI 활용 서비스에 대한 인사이트를 얻기 위해 다양한 노력을 기울이고 있습니다. Staff/PL/PM 등의 포지션에서 맡아온 개발업무가 다양해 특정기술에 대해 최고라고 자부할
                  순 없지만 배우고자 하는 열정이 있고 다양한 개발 업무 경험을 토대로 맡은 업무이상을 해나갈 자세로 임하고 있습니다.
                </p>
                <p className="text-slate-600 leading-relaxed">야나두의 경우 개발실장 보직을 겸하면서 다양한 챗봇 형태의 AI 기술 서비스를 개발하고 런칭하였습니다.</p>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      현재 포지션
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">야나두 개발실장 (2022.2 ~ 재직중)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5 text-green-600" />
                      전문 분야
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">AI 서비스, N-Screen, OTT, STB, CMS 개발</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-purple-600" />팀 규모
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600">20~30명 개발팀 총괄 경험</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Experience Section */}
        <section id="experience" className="py-16 bg-gradient-to-r from-slate-50/80 to-blue-50/80 backdrop-blur-sm relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-12">경력</h2>
            <div className="space-y-8">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-xl">개발실장</CardTitle>
                      <CardDescription className="text-blue-600 font-medium">야나두 (커머스개발실)</CardDescription>
                    </div>
                    <Badge variant="secondary">2022.02 - 재직중</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 leading-relaxed mb-4">기획, UI/UX, 프론트, 백엔드, 앱, 데브옵스 포지션의 인력(20~30명)으로 야나두 전반적인 서비스 개발 총괄</p>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      다양한 챗봇 형태의 AI 기술 서비스 개발 및 런칭
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      교육&커머스 도메인 서비스 개발 총괄
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
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
                      <CardDescription className="text-green-600 font-medium">SK Broadband</CardDescription>
                    </div>
                    <Badge variant="secondary">2017.04 - 2021.06</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 leading-relaxed mb-4">BTV 백엔드 개발 매니저 (PM)로 검색, 딥메타, NUGU 음성 AI 연동, CMS, 로그연동 개인화, 통합이미지플랫폼 등 다양한 서비스 개발</p>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      N-Screen 백엔드 연동 서비스를 위한 Spring Boot / Elasticsearch 기반 API 개발
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      검색 시스템 개발 / 추천 서비스 API 개발 및 ELK Stack 구축
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      대용량 데이터 처리 및 분석을 위한 Kafka Consumer, ELK 구성 데이터 연동 적재모듈 개발
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      New CMS 프로젝트 MSA 구축 설계 참여
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-xl">CMS 개발 파트 리드</CardTitle>
                      <CardDescription className="text-purple-600 font-medium">CJ Hellovision (TVING 서비스개발팀)</CardDescription>
                    </div>
                    <Badge variant="secondary">2012.06 - 2017.04</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 leading-relaxed mb-4">TVING CMS 개발 파트 리드로 CMS, 검색, 이미지, 미디어트랜스코딩 등 N-Screen 서비스 개발</p>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      Spring Framework 기반 CMS 개발
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      검색 시스템 / 랭킹추천 서비스 API 개발
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      N-Screen 통합API 개발을 위한 MongoDB 기반 API 개발
                    </li>
                    <li className="flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
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
                      <CardDescription className="text-orange-600 font-medium">쌍용정보통신 (통신연구소/뉴미디어기술팀)</CardDescription>
                    </div>
                    <Badge variant="secondary">2005.11 - 2012.06</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 leading-relaxed mb-4">KT 가입자계 통합보안 관제시스템 개발 및 KT QOOK TV A-MOC 플랫폼 개발</p>
                  <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2">•</span>
                      KT 가입자계 통합보안관리시스템(ISM) 프로젝트 수행
                    </li>
                    <li className="flex items-start">
                      <span className="text-orange-500 mr-2">•</span>
                      KT QOOK TV A-MOC 플랫폼 개발 프로젝트 수행
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section id="projects" className="py-16 bg-white/70 backdrop-blur-sm relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-12">주요 프로젝트</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="hover:shadow-lg transition-shadow">
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

              <Card className="hover:shadow-lg transition-shadow">
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

              <Card className="hover:shadow-lg transition-shadow">
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
        </section>

        {/* System Architecture Section */}
        <section id="systems" className="py-16 bg-gradient-to-r from-purple-50/80 to-pink-50/80 backdrop-blur-sm relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-12">시스템 구성도</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* 야나두 AI 서비스 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-600" />
                    야나두 AI 서비스
                  </CardTitle>
                  <CardDescription>AI 챗봇 및 교육 플랫폼</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                        <Image src="/images/ai.png" alt="야나두 AI 서비스 구성도" width={400} height={300} className="w-full h-full object-cover" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                      <DialogClose asChild>
                        <div className="relative w-full h-full cursor-pointer">
                          <Image src="/images/ai.png" alt="야나두 AI 서비스 구성도" width={800} height={600} className="w-full h-auto object-contain" />
                        </div>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                  <p className="text-sm text-slate-600 mt-4">AI 챗봇 서비스와 교육 플랫폼의 시스템 아키텍처입니다. (클릭하여 크게 보기)</p>
                </CardContent>
              </Card>

              {/* 야나두 전체 시스템 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-green-600" />
                    야나두 전체 시스템
                  </CardTitle>
                  <CardDescription>교육&커머스 통합 플랫폼</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                        <Image src="/images/yanadoo_all.png" alt="야나두 전체 시스템 구성도" width={400} height={300} className="w-full h-full object-cover" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                      <DialogClose asChild>
                        <div className="relative w-full h-full cursor-pointer">
                          <Image src="/images/yanadoo_all.png" alt="야나두 전체 시스템 구성도" width={800} height={600} className="w-full h-auto object-contain" />
                        </div>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                  <p className="text-sm text-slate-600 mt-4">야나두의 전체 교육&커머스 시스템 아키텍처입니다. (클릭하여 크게 보기)</p>
                </CardContent>
              </Card>

              {/* SK Broadband BTV */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-purple-600" />
                    SK Broadband BTV
                  </CardTitle>
                  <CardDescription>N-Screen 서비스 아키텍처</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                        <Image src="/images/BTV.png" alt="SK Broadband BTV 시스템 구성도" width={400} height={300} className="w-full h-full object-cover" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                      <DialogClose asChild>
                        <div className="relative w-full h-full cursor-pointer">
                          <Image src="/images/BTV.png" alt="SK Broadband BTV 시스템 구성도" width={800} height={600} className="w-full h-auto object-contain" />
                        </div>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                  <p className="text-sm text-slate-600 mt-4">SK Broadband BTV N-Screen 서비스의 시스템 아키텍처입니다. (클릭하여 크게 보기)</p>
                </CardContent>
              </Card>

              {/* SKB 아키텍처 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-orange-600" />
                    SKB 시스템 아키텍처
                  </CardTitle>
                  <CardDescription>SK Broadband 시스템 구조</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                        <Image src="/images/SKB_Arch.png" alt="SKB 시스템 아키텍처" width={400} height={300} className="w-full h-full object-cover" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                      <DialogClose asChild>
                        <div className="relative w-full h-full cursor-pointer">
                          <Image src="/images/SKB_Arch.png" alt="SKB 시스템 아키텍처" width={800} height={600} className="w-full h-auto object-contain" />
                        </div>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                  <p className="text-sm text-slate-600 mt-4">SK Broadband의 전체 시스템 아키텍처입니다. (클릭하여 크게 보기)</p>
                </CardContent>
              </Card>

              {/* SKB 플로우 1 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-cyan-600" />
                    SKB 서비스 플로우 1
                  </CardTitle>
                  <CardDescription>서비스 처리 플로우</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                        <Image src="/images/SKB_flow1.png" alt="SKB 서비스 플로우 1" width={400} height={300} className="w-full h-full object-cover" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                      <DialogClose asChild>
                        <div className="relative w-full h-full cursor-pointer">
                          <Image src="/images/SKB_flow1.png" alt="SKB 서비스 플로우 1" width={800} height={600} className="w-full h-auto object-contain" />
                        </div>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                  <p className="text-sm text-slate-600 mt-4">SK Broadband 서비스의 주요 처리 플로우입니다. (클릭하여 크게 보기)</p>
                </CardContent>
              </Card>

              {/* SKB 플로우 2 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-pink-600" />
                    SKB 서비스 플로우 2
                  </CardTitle>
                  <CardDescription>추가 서비스 플로우</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                        <Image src="/images/SKB_flow2.png" alt="SKB 서비스 플로우 2" width={400} height={300} className="w-full h-full object-cover" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                      <DialogClose asChild>
                        <div className="relative w-full h-full cursor-pointer">
                          <Image src="/images/SKB_flow2.png" alt="SKB 서비스 플로우 2" width={800} height={600} className="w-full h-auto object-contain" />
                        </div>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                  <p className="text-sm text-slate-600 mt-4">SK Broadband의 추가 서비스 처리 플로우입니다. (클릭하여 크게 보기)</p>
                </CardContent>
              </Card>

              {/* TVING CMS */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-indigo-600" />
                    TVING
                  </CardTitle>
                  <CardDescription>N-Screen Service</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                        <Image src="/images/TVING.png" alt="TVING CMS 시스템 구성도" width={400} height={300} className="w-full h-full object-cover" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                      <DialogClose asChild>
                        <div className="relative w-full h-full cursor-pointer">
                          <Image src="/images/TVING.png" alt="TVING CMS 시스템 구성도" width={800} height={600} className="w-full h-auto object-contain" />
                        </div>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                  <p className="text-sm text-slate-600 mt-4">CJ Hellovision TVING의 N-Screen 통합 CMS 시스템입니다. (클릭하여 크게 보기)</p>
                </CardContent>
              </Card>

              {/* 경력 타임라인 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-600" />
                    경력 타임라인
                  </CardTitle>
                  <CardDescription>개발자 경력 연혁</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                        <Image src="/images/Career.png" alt="개발자 경력 타임라인" width={400} height={300} className="w-full h-full object-cover" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                      <DialogClose asChild>
                        <div className="relative w-full h-full cursor-pointer">
                          <Image src="/images/Career.png" alt="개발자 경력 타임라인" width={800} height={600} className="w-full h-auto object-contain" />
                        </div>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                  <p className="text-sm text-slate-600 mt-4">허우용님의 개발자 경력 타임라인입니다. (클릭하여 크게 보기)</p>
                </CardContent>
              </Card>

              {/* 야나두 앱 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-violet-600" />
                    야나두 앱
                  </CardTitle>
                  <CardDescription>모바일 애플리케이션</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                        <Image src="/images/yanadoo_app.png" alt="야나두 앱" width={400} height={300} className="w-full h-full object-cover" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                      <DialogClose asChild>
                        <div className="relative w-full h-full cursor-pointer">
                          <Image src="/images/yanadoo_app.png" alt="야나두 앱" width={800} height={600} className="w-full h-auto object-contain" />
                        </div>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                  <p className="text-sm text-slate-600 mt-4">야나두 모바일 애플리케이션의 시스템 구성입니다. (클릭하여 크게 보기)</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Skills Section */}
        <section id="skills" className="py-16 bg-white/70 backdrop-blur-sm relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-12">기술 스택</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Code className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle>Backend</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm">Spring Boot, Java, Kotlin, Node.js, Python, C++</p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-lg flex items-center justify-center">
                    <Database className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle>Database</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm">AWS RDS, MongoDB, Oracle, MSSQL, PostgreSQL, Elasticsearch, Redis</p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Bot className="h-8 w-8 text-purple-600" />
                  </div>
                  <CardTitle>AI & Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm">OpenAI, Google Gemini, DeepL, LangChain, LangGraph, LaLM, ELK Stack, Kafka, AI 챗봇, 검색엔진, 추천시스템</p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Wrench className="h-8 w-8 text-orange-600" />
                  </div>
                  <CardTitle>DevOps & Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm">AWS EC2, AWS RDS, AWS S3, CI/CD, Jira, Confluence, Jandi, Slack</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Education Section */}
        <section className="py-16 bg-gradient-to-r from-green-50/80 to-teal-50/80 backdrop-blur-sm relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-12">학력</h2>
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">서울시립대학교 (석사)</CardTitle>
                <CardDescription className="text-lg">
                  <strong>논문:</strong> 시스템 통합 서비스를 위한 확장 가능한 NoSQL의 설계에 관한 연구
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild>
                  <a href="https://drive.google.com/file/d/1eAv426PXVEaCpMvQAvcUHkMUZ2WggM4j/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    논문 보기
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-16 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 backdrop-blur-sm relative z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8">연락하기</h2>
            <p className="text-xl text-slate-600 mb-12">함께 일하고 싶으시다면 언제든 연락해주세요!</p>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle>이메일</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">withwooyong@gmail.com</p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-lg flex items-center justify-center">
                    <Phone className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle>전화번호</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">010-2627-4952</p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Github className="h-8 w-8 text-slate-600" />
                  </div>
                  <CardTitle>GitHub</CardTitle>
                </CardHeader>
                <CardContent>
                  <a href="https://github.com/withwooyong" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                    github.com/withwooyong
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p>&copy; 2025 허우용. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
