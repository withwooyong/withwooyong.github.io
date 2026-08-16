# 우용의 포트폴리오

개발자 우용의 포트폴리오 웹사이트입니다.

## 문서

| 문서 | 설명 |
|------|------|
| [HANDOFF.md](HANDOFF.md) | 다음 작업 세션용 인수인계(브랜치, 검증, 후속 과제) |
| [CHANGELOG.md](CHANGELOG.md) | 날짜별 주요 변경 요약 |
| [docs/site-renewal-roadmap.md](docs/site-renewal-roadmap.md) | 리뉴얼 로드맵 |
| [docs/site-renewal-completion-report.md](docs/site-renewal-completion-report.md) | 완료·QA·보안 요약 보고 |
| [CLAUDE.md](CLAUDE.md) | Claude Code 등 에이전트용 저장소 메모 |

## 기술 스택

- **Frontend**: Next.js 14 (Pages Router), React 18, TypeScript
- **UI**: Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/) 스타일 컴포넌트 (`components/ui/`)
- **Deployment**: GitHub Pages — `next.config.js`의 `output: "export"`로 빌드 시 `out/` 생성

## 로컬 개발 환경 설정

1. 의존성 설치

```bash
npm install
```

2. 개발 서버 실행

```bash
npm run dev
```

3. 브라우저에서 [http://localhost:3000](http://localhost:3000) 열기 (영문 요약: [http://localhost:3000/en/](http://localhost:3000/en/))

## 빌드 및 배포

1. 프로덕션 빌드 (정적 파일은 `out/`에 생성됩니다)

```bash
npm run build
```

2. `out/` 폴더의 내용이 GitHub Actions를 통해 GitHub Pages에 배포됩니다.

3. (선택) 다른 호스트 URL로 미리보기할 때는 빌드 전에 환경 변수를 설정할 수 있습니다.

```bash
NEXT_PUBLIC_SITE_URL=https://example.com npm run build
```

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 정적 export → `out/` |
| `npm run start` | 프로덕션 서버 (로컬 검증용) |
| `npm run lint` | Next.js ESLint |
| `npm test` | Vitest — 블로그 로더·frontmatter 검증·목차 생성 단위 테스트 |
| `npm run dup-scan` | 발행본 사이의 축자 복제 스캔. `--category <slug>` · `--min N`(기본 20자) |
| `npm run dup-scan:verify` | 위 스캔의 자체 검사 (`--self-test`) |

## 프로젝트 구조

```
├── pages/           # Next.js 페이지 (한국어 `index`, 영문 `en/index`)
├── data/            # 네비·시스템 다이어그램·스킬·글 링크 (`portfolio.ts`)
├── components/      # `site-head`, `portfolio-nav`, `theme-toggle`,
│                    # `section-reveal`, `system-diagram-card`,
│                    # `hero-stripe-backdrop`, `ui/*` 등
├── lib/             # `site.ts` — canonical·OG용 절대 URL
├── public/          # 이미지, favicon, robots.txt, sitemap.xml
├── styles/          # 전역 CSS (테마·모션)
└── docs/            # 로드맵·완료 보고
```

SEO·다크 모드·접근성(스킵 링크 등)은 위 컴포넌트와 `pages/index.tsx`에 모여 있다. 상세는 [HANDOFF.md](HANDOFF.md)와 완료 보고를 참고한다.

## 라이선스

MIT License
