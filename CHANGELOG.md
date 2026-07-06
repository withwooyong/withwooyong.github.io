# Changelog

이 저장소의 사용자에게 영향이 큰 변경만 날짜별로 간단히 적습니다. (커밋 해시는 선택적으로 추적합니다.)

## 2026-07-06

### 추가

- 경력 카드에 **근속기간(연·개월)** 표시 — 날짜(뱃지)와 분리해 파란색으로 강조, 스캔 시 재직 기간이 바로 읽히도록 함 [`pages/index.tsx`](pages/index.tsx). 소개 "현재 포지션" 카드도 동일 표기로 통일 (`b370439`)
- 히어로 인사말을 **macOS "hello" 손글씨 스타일**로 변경 — Nanum Pen Script(Google Fonts, [`pages/_document.tsx`](pages/_document.tsx)) + 왼→오 획이 그려지는 손글씨 리빌 애니메이션 [`styles/globals.css`](styles/globals.css), `prefers-reduced-motion` 존중 (`b370439`)

### 변경

- 쌍용정보통신 재직 시작을 **정식 채용일 기준**으로 정정: `2005.05` → `2005.11 - 2012.06 (6년 8개월)` [`pages/index.tsx`](pages/index.tsx) (`b370439`)
- 프로덕트 리더십 페이지 결제·정산·구독 역량 문구를 총괄 기준 정식 문구로 교체(플레이스홀더 제거) [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) (`b370439`)

## 2026-07-05

### 추가

- 프로덕트 리더십 요약 페이지 [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) — 공개 라우트 `/product-lead/`. 핵심 요약 4·대표 여정 3(맥락→접근→임팩트)·플랫폼 프로덕트 리드 요구 역량 매핑 표. 정성 서술 기반이며 정량 지표는 실측치 확보 후 보강 예정 (`b9b88a6`)
- 홈 `#product` "프로덕트 리더십" 요약 섹션 + 히어로 보조 CTA(`플랫폼 프로덕트 리더로 보기`) + 내비 앵커 [`pages/index.tsx`](pages/index.tsx), [`data/portfolio.ts`](data/portfolio.ts) (`b9b88a6`)
- [`public/sitemap.xml`](public/sitemap.xml) — `/product-lead/` 등록(공개 색인) (`b9b88a6`)

### 변경

- 회사 표기 정비: `야나두` → **(주)야나두 a kakao company (구 카카오키즈)**, 직책을 **커머스개발실장**으로 [`pages/index.tsx`](pages/index.tsx)·[`pages/en/index.tsx`](pages/en/index.tsx)의 JSON-LD·메타 description·히어로·경력 카드에 반영. 서비스/제품명("야나두 AI 서비스", "야나두 앱")은 유지 (`b9b88a6`)

## 2026-06-02

### 추가

- 소개 카드 동전 회전: [`components/coin-flip-deck.tsx`](components/coin-flip-deck.tsx) — 스크롤 진입 시 현재 포지션/전문 분야/팀 규모 카드가 0.18s 간격으로 순차적으로 Y축 360° 한 바퀴 회전 후 감속 정지 (`prefers-reduced-motion: reduce` 시 비활성), [`styles/globals.css`](styles/globals.css) 키프레임 (`c94f3f6`)

### 변경

- [`pages/index.tsx`](pages/index.tsx) — 히어로 소개를 20년+ 엔지니어링 리더 관점으로 재작성(KT 추가, 온프레미스(IDC)/AWS 경험 명시), 개발자 철학을 코드 가독성 중심 메시지로 다듬고 AI 업무 효율 극대화 단락 추가, 메타 `description` 정비 (`7d05e2c`)
- [`pages/en/index.tsx`](pages/en/index.tsx) — 영문 페이지를 한글 버전과 동일한 톤으로 갱신(소개·Highlights·메타 description) (`2b08b35`)

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
