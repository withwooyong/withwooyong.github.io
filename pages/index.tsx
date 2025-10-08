import Head from "next/head";
import { useEffect, useState } from "react";

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <>
      <Head>
        <title>우용 - 개발자 포트폴리오</title>
        <meta name="description" content="우용의 개발자 포트폴리오입니다. 프론트엔드 개발자로서의 경험과 프로젝트를 소개합니다." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="text-xl font-bold text-gray-900">우용</div>
              <div className="hidden md:flex space-x-8">
                <a href="#about" className="text-gray-600 hover:text-primary-600 transition-colors">
                  소개
                </a>
                <a href="#experience" className="text-gray-600 hover:text-primary-600 transition-colors">
                  경력
                </a>
                <a href="#projects" className="text-gray-600 hover:text-primary-600 transition-colors">
                  프로젝트
                </a>
                <a href="#skills" className="text-gray-600 hover:text-primary-600 transition-colors">
                  기술
                </a>
                <a href="#contact" className="text-gray-600 hover:text-primary-600 transition-colors">
                  연락
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className={`text-center transition-all duration-1000 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <div className="mb-8">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">우</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
                  안녕하세요, <span className="text-primary-600">우용</span>입니다
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 mb-8">프론트엔드 개발자</p>
                <p className="text-lg text-gray-500 max-w-3xl mx-auto leading-relaxed">
                  사용자 경험을 중시하며, 깔끔하고 효율적인 코드를 작성하는 것을 좋아합니다.
                  <br />
                  새로운 기술을 배우고 적용하는 것에 열정을 가지고 있습니다.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#projects" className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
                  프로젝트 보기
                </a>
                <a href="#contact" className="px-8 py-3 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors font-medium">
                  연락하기
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">소개</h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-6">개발자로서의 철학</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  코드는 단순히 동작하는 것이 아니라, 읽기 쉽고 유지보수하기 쉬워야 한다고 생각합니다. 사용자의 관점에서 생각하며, 직관적이고 아름다운 인터페이스를 만드는 것을 목표로 합니다.
                </p>
                <p className="text-gray-600 leading-relaxed">지속적인 학습과 성장을 통해 더 나은 개발자가 되기 위해 노력하고 있습니다. 팀워크를 중시하며, 함께 성장할 수 있는 환경을 만들어가는 것을 좋아합니다.</p>
              </div>
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">🎯 목표</h4>
                  <p className="text-gray-600">사용자 중심의 웹 애플리케이션 개발</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">💡 가치관</h4>
                  <p className="text-gray-600">깔끔한 코드와 지속 가능한 개발</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">🚀 성장</h4>
                  <p className="text-gray-600">지속적인 학습과 새로운 기술 도전</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Experience Section */}
        <section id="experience" className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">경력</h2>
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">프론트엔드 개발자</h3>
                    <p className="text-primary-600 font-medium">회사명</p>
                  </div>
                  <span className="text-gray-500 text-sm">2023.01 - 현재</span>
                </div>
                <p className="text-gray-600 leading-relaxed">React, Next.js를 활용한 웹 애플리케이션 개발 및 유지보수를 담당했습니다. 사용자 경험 개선을 위한 UI/UX 최적화와 성능 향상에 집중했습니다.</p>
                <ul className="mt-4 space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-primary-500 mr-2">•</span>
                    React 기반 SPA 개발 및 상태 관리
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-500 mr-2">•</span>
                    TypeScript를 활용한 타입 안전성 확보
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-500 mr-2">•</span>
                    반응형 웹 디자인 구현
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">웹 개발자</h3>
                    <p className="text-primary-600 font-medium">이전 회사</p>
                  </div>
                  <span className="text-gray-500 text-sm">2021.06 - 2022.12</span>
                </div>
                <p className="text-gray-600 leading-relaxed">다양한 웹 프로젝트를 통해 풀스택 개발 경험을 쌓았습니다. 프론트엔드와 백엔드 개발을 모두 경험하며 전체적인 시스템 이해도를 높였습니다.</p>
                <ul className="mt-4 space-y-2 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-primary-500 mr-2">•</span>
                    Vue.js를 활용한 프론트엔드 개발
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-500 mr-2">•</span>
                    Node.js 기반 백엔드 API 개발
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-500 mr-2">•</span>
                    데이터베이스 설계 및 최적화
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section id="projects" className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">프로젝트</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">프로젝트 1</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">E-commerce 웹사이트</h3>
                  <p className="text-gray-600 mb-4">React와 Node.js를 활용한 온라인 쇼핑몰 플랫폼입니다.</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full">React</span>
                    <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full">Node.js</span>
                    <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full">MongoDB</span>
                  </div>
                  <div className="flex gap-2">
                    <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                      데모 보기
                    </a>
                    <a href="#" className="text-gray-600 hover:text-gray-700 font-medium">
                      코드 보기
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="h-48 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">프로젝트 2</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">할일 관리 앱</h3>
                  <p className="text-gray-600 mb-4">Next.js와 TypeScript로 개발한 개인 생산성 도구입니다.</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Next.js</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">TypeScript</span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Tailwind CSS</span>
                  </div>
                  <div className="flex gap-2">
                    <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                      데모 보기
                    </a>
                    <a href="#" className="text-gray-600 hover:text-gray-700 font-medium">
                      코드 보기
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="h-48 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">프로젝트 3</span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">날씨 앱</h3>
                  <p className="text-gray-600 mb-4">실시간 날씨 정보를 제공하는 반응형 웹 애플리케이션입니다.</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">Vue.js</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">API</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">PWA</span>
                  </div>
                  <div className="flex gap-2">
                    <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">
                      데모 보기
                    </a>
                    <a href="#" className="text-gray-600 hover:text-gray-700 font-medium">
                      코드 보기
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Skills Section */}
        <section id="skills" className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">기술 스택</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">⚛️</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Frontend</h3>
                <p className="text-gray-600 text-sm">React, Next.js, Vue.js, TypeScript, HTML5, CSS3</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🖥️</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Backend</h3>
                <p className="text-gray-600 text-sm">Node.js, Express, Python, REST API, GraphQL</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🗄️</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Database</h3>
                <p className="text-gray-600 text-sm">MongoDB, PostgreSQL, Redis, MySQL</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🛠️</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Tools</h3>
                <p className="text-gray-600 text-sm">Git, Docker, AWS, Vercel, Figma</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">연락하기</h2>
            <p className="text-xl text-gray-600 mb-12">함께 일하고 싶으시다면 언제든 연락해주세요!</p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📧</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">이메일</h3>
                <p className="text-gray-600">withwooyong@gmail.com</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💼</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">LinkedIn</h3>
                <p className="text-gray-600">linkedin.com/in/withwooyong</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🐙</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">GitHub</h3>
                <p className="text-gray-600">github.com/withwooyong</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p>&copy; 2024 우용. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
