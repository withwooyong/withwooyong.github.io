# Changelog

이 저장소의 사용자에게 영향이 큰 변경만 날짜별로 간단히 적습니다. (커밋 해시는 선택적으로 추적합니다.)

## 2026-05-01

### 추가

- 영문 요약 페이지 [`pages/en/index.tsx`](pages/en/index.tsx), 네비에서 EN 링크
- SEO: [`components/site-head.tsx`](components/site-head.tsx) — canonical, Open Graph, Twitter Card, JSON-LD `Person`
- [`public/robots.txt`](public/robots.txt), [`public/sitemap.xml`](public/sitemap.xml)
- [`lib/site.ts`](lib/site.ts) — `getSiteOrigin()` / `absoluteUrl()`, 선택적 `NEXT_PUBLIC_SITE_URL`
- [`data/portfolio.ts`](data/portfolio.ts) — 네비, 시스템 다이어그램, 스킬, 글·링크 데이터
- [`components/portfolio-nav.tsx`](components/portfolio-nav.tsx) — 스킵 링크, 모바일 메뉴, 스크롤 시 네비 강조, 데스크톱 링크 밑줄 모션
- [`components/theme-toggle.tsx`](components/theme-toggle.tsx) — 라이트/다크 (`html.dark`)
- [`components/section-reveal.tsx`](components/section-reveal.tsx) — 섹션 스크롤 등장
- [`components/system-diagram-card.tsx`](components/system-diagram-card.tsx) — 시스템 구성 다이얼로그 공통화·접근성
- [`components/hero-stripe-backdrop.tsx`](components/hero-stripe-backdrop.tsx) — 히어로 SVG 줄무늬 흐름 배경
- [`pages/_document.tsx`](pages/_document.tsx) — `lang="ko"`
- [`docs/site-renewal-completion-report.md`](docs/site-renewal-completion-report.md) — 리뉴얼 완료·QA·보안 요약 보고
- ESLint: [`.eslintrc.json`](.eslintrc.json), `npm run lint` 스크립트 및 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) CI 단계
- [`HANDOFF.md`](HANDOFF.md), [`CHANGELOG.md`](CHANGELOG.md) — 세션 인수인계 및 변경 이력

### 변경

- [`README.md`](README.md) — 문서 링크 표, 기술 스택·프로젝트 구조 보강, 로컬 `/en` 안내
- [`pages/index.tsx`](pages/index.tsx) — 위 컴포넌트·데이터 연동, 다크 모드 클래스, 연락 `mailto`/`tel`, 푸터 연도 동적화, 히어로 blob·스태거·줄무늬
- [`styles/globals.css`](styles/globals.css) — shadcn용 CSS 변수, 전역 `*` transition 제거, 히어로/섹션/네비 모션, 줄무늬 키프레임
- [`tailwind.config.js`](tailwind.config.js) — `darkMode: 'class'`, shadcn 색 토큰, `data/` content 경로
- [`pages/_app.tsx`](pages/_app.tsx) — `next/font` Inter
- Next.js **14.2.35** 및 `eslint-config-next` 정렬 ([`package.json`](package.json))

### 수정

- README에서 구식 `npm run export` 안내 제거(이전 세션), `out/`·`NEXT_PUBLIC_SITE_URL`·`lint` 반영

---

이전 기록은 Git 히스토리를 참고하세요. (초기 `CHANGELOG.md` 도입일 기준 이전 변경은 본 파일에 없을 수 있습니다.)
