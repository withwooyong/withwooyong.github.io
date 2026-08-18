# 우용의 포트폴리오

개발자 우용(Ted)의 포트폴리오 웹사이트이자 기술 블로그입니다.
Next.js 14 Pages Router로 만들어 **정적 export**하고 GitHub Pages에 배포합니다.

| | 규모 |
|---|---|
| 페이지 라우트 | 12개 (포트폴리오 · 프로덕트 리드 · 블로그) |
| 블로그 발행본 | **128편 / 6개 카테고리** |
| sitemap | 196 URL |

## 문서

| 문서 | 설명 |
|------|------|
| [HANDOFF.md](HANDOFF.md) | 다음 작업 세션용 인수인계(브랜치, 검증 명령, 후속 과제) |
| [CHANGELOG.md](CHANGELOG.md) | 날짜별 주요 변경 요약 |
| [CLAUDE.md](CLAUDE.md) | Claude Code 등 에이전트용 저장소 메모 |
| [docs/site-renewal-roadmap.md](docs/site-renewal-roadmap.md) | 리뉴얼 로드맵 |
| [docs/site-renewal-completion-report.md](docs/site-renewal-completion-report.md) | 완료·QA·보안 요약 보고 |
| [docs/superpowers/specs/](docs/superpowers/specs/) | 기술 블로그 요구사항 명세 |
| [docs/superpowers/plans/](docs/superpowers/plans/) | 카테고리별 분할 설계서 (`agentic-coding` · `ai-transformation` 등) |

## 기술 스택

- **Framework**: Next.js 14 (**Pages Router**), React 18, TypeScript
- **UI**: Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/) 스타일 컴포넌트 (`components/ui/` — badge · button · card · dialog)
- **콘텐츠 렌더링**: gray-matter(frontmatter), react-markdown, remark-gfm, rehype-slug, github-slugger, [mermaid](https://mermaid.js.org/)(다이어그램)
- **테스트**: Vitest (`tests/blog/`)
- **Deployment**: GitHub Pages — `next.config.js`의 `output: "export"`로 빌드 시 `out/` 생성

> 정적 export이므로 API 라우트·ISR·서버 액션·`next/image` 로더처럼 **Node 런타임이 필요한 기능은 쓸 수 없습니다.**
> mermaid 다이어그램은 `components/mermaid.tsx`에서 `useEffect`로 **클라이언트 렌더**합니다 — `out/`에 SVG가 없는 것이 정상입니다.

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

2. `out/` 폴더의 내용이 GitHub Actions([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))를 통해 GitHub Pages에 배포됩니다.
   **`main` 푸시가 곧 프로덕션 배포입니다 — 프리뷰 환경이 없으므로 푸시 전에 로컬 빌드를 확인하세요.**

3. (선택) 다른 호스트 URL로 미리보기할 때는 빌드 전에 환경 변수를 설정할 수 있습니다.

```bash
NEXT_PUBLIC_SITE_URL=https://example.com npm run build
```

> 이 프로젝트가 쓰는 환경 변수는 `NEXT_PUBLIC_SITE_URL`([`lib/site.ts`](lib/site.ts)) **하나뿐**입니다.
> `content/blog/**/*.md`의 코드 예제에 다른 API 키가 등장하지만 **글 안의 예시일 뿐 런타임에서 읽지 않습니다.**

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 정적 export → `out/` (빌드 후 `scripts/generate-sitemap.mjs` 실행) |
| `npm run start` | 프로덕션 서버 (로컬 검증용) |
| `npm run lint` | Next.js ESLint |
| `npm test` | Vitest — 블로그 로더·frontmatter 검증·목차 생성 단위 테스트 |
| `npm run dup-scan` | 발행본 사이의 축자 복제 스캔. 인자는 **`--` 뒤에** 넘긴다 — `npm run dup-scan -- --category <slug>` · `-- --min N`(기본 20자) · `-- <파일...>`. `--` 없이 쓰면 npm이 플래그를 먹어 「대상이 없다」로 종료한다 |
| `npm run dup-scan:verify` | 위 스캔의 자체 검사 (`--self-test`) |
| `npm run check-forbidden` | 발행본 금칙어 스캔. HARD 위반이 있으면 종료 코드 1. `--all`은 리포 전체를 훑되 판정하지 않는다 |
| `npm run check-forbidden:verify` | 위 스캔의 자체 검사 (`--self-test` 15건) |
| `npm run check-forbidden:built` | **빌드 산출물** 금칙어 스캔 (`out/blog` + 대응하는 `_next/data` JSON). 빌드 뒤에 돌립니다. 산출물이 없으면 종료 코드 2 |
| `npm run check-baseline` | **비블로그 페이지의 빌드 산출물이 바뀌지 않았는지** 검사 (`GC-6`). 빌드 뒤에 돌립니다. 위반이면 종료 코드 1, 산출물·기준선이 없으면 2 |
| `npm run check-baseline:update` | 위 기준선을 갱신합니다. **의도한 변경을 사람이 확인한 뒤에만** 쓰세요 — 자동으로 돌리면 이 검사는 아무것도 막지 못합니다 |

## 페이지 구성

| 경로 | 내용 |
|------|------|
| `/` | 한국어 포트폴리오 (경력·프로젝트·시스템 다이어그램·스킬) |
| `/en/` | 영문 요약 |
| `/product-lead/` · `/product-lead-v2/` | 플랫폼 프로덕트 리더 소개 페이지 (2개 판본) |
| `/product-lead-loadmap/` | 플랫폼 코어 실행 설계 로드맵 |
| `/product-lead-wiki/` · `/product-lead-wiki/[slug]/` | 실행 설계 위키 |
| `/blog/` | 블로그 전체 목록 |
| `/blog/[category]/` · `/blog/[category]/[slug]/` | 카테고리 목록 · 개별 글 |
| `/blog/tags/` · `/blog/tags/[tag]/` | 태그 목록 · 태그별 글 |

## 프로젝트 구조

```
├── pages/                  # 라우트 (Pages Router — app/ 규약을 도입하지 않습니다)
│   ├── index.tsx           # 한국어 포트폴리오
│   ├── en/                 # 영문 요약
│   ├── product-lead*/      # 프로덕트 리더 소개·로드맵·위키
│   └── blog/               # 목록 · 카테고리 · 글 · 태그
├── content/blog/           # 발행본 128편 + categories.ts · tags.ts
├── lib/
│   ├── blog/               # loader · frontmatter 검증 · types
│   ├── site.ts             # canonical·OG용 절대 URL
│   ├── toc.ts · wiki.ts    # 목차 생성 · 위키 로더
│   └── utils.ts            # cn() — clsx + tailwind-merge
├── components/             # 총 23개 — 최상위 12: site-head, portfolio-nav, markdown,
│   │                       # mermaid, system-diagram-card, wiki-shell, theme-toggle 등
│   ├── blog/               # 블로그 전용 컴포넌트 (5)
│   ├── flow-diagram/       # 흐름 다이어그램 (2)
│   └── ui/                 # shadcn/ui — badge · button · card · dialog
├── data/                   # portfolio.ts · product-lead-*.ts · diagrams/ (시스템 다이어그램 10종)
├── scripts/                # generate-sitemap.mjs · dup-scan.mjs · check-forbidden.mjs
├── tests/blog/             # Vitest — frontmatter · loader · toc (+ fixtures)
├── public/                 # 이미지, favicon, robots.txt, sitemap.xml
├── styles/                 # 전역 CSS (테마·모션)
└── docs/                   # 로드맵·완료 보고 · superpowers/{specs,plans,reports}
```

경로 별칭 `@/*`는 저장소 루트를 가리킵니다([`tsconfig.json`](tsconfig.json)) — `@/components/...`, `@/lib/utils`처럼 씁니다.
SEO·다크 모드·접근성(스킵 링크 등)은 위 컴포넌트와 `pages/index.tsx`에 모여 있습니다.

## 블로그 콘텐츠 규약

글은 `content/blog/<카테고리>/<slug>.md`에 두며, 빌드 시 [`lib/blog/`](lib/blog/)가 읽어 정적 페이지로 만듭니다.

| 항목 | 규칙 |
|------|------|
| 카테고리 | [`content/blog/categories.ts`](content/blog/categories.ts)에 **12개 등록 · 6개 발행** (`ai-agent` 51 · `agentic-coding` 31 · `rag` 25 · `ai-transformation` 11 · `search-engineering` 6 · `backend-engineering` 4) |
| 태그 | [`content/blog/tags.ts`](content/blog/tags.ts)의 통제 어휘만 사용. 글당 **3~5개**, 같은 패싯 **최대 2개** |
| frontmatter | [`lib/blog/frontmatter.ts`](lib/blog/frontmatter.ts)가 검증합니다. **선택 필드에 빈 문자열을 넣으면 빌드가 실패하므로 값이 없으면 키를 생략**하세요 |
| 중복 검사 | `npm run dup-scan -- --category <slug>`로 축자 복제를 확인합니다. 대상을 주지 않으면 종료 코드 1. **새 배치는 통째로 넘겨도 됩니다** — 각 편이 자기 자신을 뺀 나머지 전부(다른 대상 포함)와 대조됩니다 |
| 금칙어 검사 (소스) | `npm run check-forbidden`이 **HARD 0건**이어야 발행합니다. 두 검사기 모두 `:verify`(self-test)를 **먼저** 돌리세요 — 증명 없는 「0건」은 거짓 음성과 구분되지 않습니다 |
| 금칙어 검사 (산출물) | 빌드 뒤 `npm run check-forbidden:built`도 **HARD 0회**여야 합니다. 소스가 깨끗해도 템플릿이 넣은 것은 여기서만 잡힙니다 |
| 산출물 불변 검사 | 빌드 뒤 `npm run check-baseline`이 통과해야 합니다. 블로그가 아닌 페이지(`/`·`/en`·`/product-lead*`)의 산출물이 바뀌면 막습니다 |

어휘에 없는 태그나 등록되지 않은 카테고리를 쓰면 빌드가 막습니다.

### 게이트는 자동으로 돕니다

위 검사들을 손으로 기억해 돌릴 필요는 없습니다.

| 자리 | 언제 | 무엇 |
|------|------|------|
| **pre-commit 훅** ([`.githooks/pre-commit`](.githooks/pre-commit)) | `content/blog`를 건드린 커밋 | 금칙어 self-test → 콘텐츠 불변식 → 금칙어 스캔. 하나라도 실패하면 커밋이 막힙니다 |
| **CI** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) | `main` 푸시 | 위 3개 + 타입 검사 + 빌드 + 산출물 금칙어 + 산출물 불변. 실패하면 배포가 막힙니다 |

훅은 `npm install` 시 `prepare` 스크립트가 자동으로 설정합니다(`git config core.hooksPath .githooks`).
수동으로 켜려면 같은 명령을 직접 실행하세요. husky 같은 의존성은 쓰지 않습니다.

**순서가 규칙입니다** — 자기 증명(`:verify`)이 스캔보다 먼저입니다. 증명 없는 「0건」은 거짓 음성과
구분되지 않고, 이 저장소는 실제로 그 대가를 치렀습니다.

## 라이선스

MIT License
