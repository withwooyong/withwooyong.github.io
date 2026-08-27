# 우용의 포트폴리오

개발자 우용(Ted)의 포트폴리오 웹사이트이자 기술 블로그입니다.
Next.js 14 Pages Router로 만들어 **정적 export**하고 GitHub Pages에 배포합니다.

읽는 방법이 셋입니다 — 목록으로 훑는 **`/blog`**, 글끼리의 관계를 보는 **`/atlas`**,
어디서든 열리는 한국어 전문 검색 **`⌘K`**.

| | 규모 | 확인 |
|---|---|---|
| 블로그 발행본 | **156편 / 6개 카테고리** | `npm run check-counts` (CI 게이트) |
| 페이지 라우트 | 포트폴리오 · 프로덕트 리드 · 블로그 · 아틀라스 | `find pages -name '*.tsx' ! -name '_*'` |
| 아틀라스 노드 · sitemap | 발행본 + 노드 상세 | `npm run build` 후 `grep -c '<loc>' out/sitemap.xml` |

**숫자는 검사기가 지키는 것만 적습니다.** 발행본 수는 `check-counts`가 이 파일의 4자리를 실제 파일과
대조하므로 틀리면 CI가 막습니다. 나머지는 명령만 적습니다 — 게이트 없는 숫자는 다음 사람에게 회귀와
구분되지 않기 때문이고, 실제로 이 표의 라우트 수(12→14)와 sitemap URL 수(196→233)가 썩은 채 남아 있었습니다.

## 문서

| 문서 | 설명 |
|------|------|
| [HANDOFF.md](HANDOFF.md) | 다음 작업 세션용 인수인계(브랜치, 검증 명령, 후속 과제) |
| [CHANGELOG.md](CHANGELOG.md) | 날짜별 주요 변경 요약 |
| [CLAUDE.md](CLAUDE.md) | Claude Code 등 에이전트용 저장소 메모 — **모르면 잘못된 행동을 하는 것만** (상한 200줄) |
| [docs/TOOL-TRAPS.md](docs/TOOL-TRAPS.md) | 이 환경에서 도구가 조용히 실패하는 방식 — 재현·실측·경위 |
| [docs/superpowers/PUBLISHING-CHECKLIST.md](docs/superpowers/PUBLISHING-CHECKLIST.md) | 기계가 판정할 수 없는 발행 규칙 (출처 표기 · 익명화 · 어조) |
| [docs/site-renewal-roadmap.md](docs/site-renewal-roadmap.md) | 리뉴얼 로드맵 |
| [docs/site-renewal-completion-report.md](docs/site-renewal-completion-report.md) | 완료·QA·보안 요약 보고 |
| [docs/superpowers/specs/](docs/superpowers/specs/) | 요구사항 명세 (기술 블로그 · 리디자인/아틀라스) |
| [docs/superpowers/plans/](docs/superpowers/plans/) | 분할 설계서 (카테고리별 · 리디자인 단계 · 아틀라스/검색) |

## 기술 스택

- **Framework**: Next.js 14 (**Pages Router**), React 18, TypeScript
- **UI**: Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/)("new-york", neutral) 컴포넌트 (`components/ui/`), Radix UI, 디자인 토큰 + 다크 모드
- **콘텐츠 렌더링**: gray-matter(frontmatter), react-markdown, remark-gfm, rehype-slug, github-slugger, [mermaid](https://mermaid.js.org/)(다이어그램)
- **검색**: [Pagefind](https://pagefind.app/) 정적 인덱스 + `⌘K` 커맨드 팔레트 (`components/search/` · `lib/search/` — 한국어 토크나이징 포함)
- **아틀라스**: zod 스키마로 검증한 글 관계 그래프 (`lib/atlas/` · `components/atlas/`) — 빌드 시 무결성 게이트가 돕니다
- **테스트**: Vitest (`tests/` — atlas · blog · design · search · ui), Playwright E2E (`e2e/`)
- **Deployment**: GitHub Pages — `next.config.js`의 `output: "export"`로 빌드 시 `out/` 생성

> 정적 export이므로 API 라우트·ISR·서버 액션·`next/image` 로더처럼 **Node 런타임이 필요한 기능은 쓸 수 없습니다.**
> 검색 인덱스도 **빌드 시점에** 만들어 `out/`에 정적 파일로 실립니다 — 런타임 검색 서버가 없습니다.
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
| `npm run e2e` | Playwright E2E. **개발 서버가 아니라 빌드된 `out/`을 서빙**하므로 `npm run build`를 먼저 돌립니다. `out/`이 소스보다 오래되면 **테스트를 하나도 돌리지 않고 종료 코드 1**을 내는데, 그것이 진짜 실패와 똑같이 보입니다 — `$?`가 아니라 **첫 줄**을 읽으세요 |
| `npm run e2e:ui` | 위를 Playwright UI 모드로. 로컬 디버깅용 |
| `npm run check-pagefind` | 검색 인덱스가 실제로 만들어졌는지 검사. 빌드 뒤에 돌립니다 |
| `npm run check-pagefind:verify` | 위 검사의 자체 검사. **먼저 돌리세요** — `pagefind`는 아무것도 색인하지 않아도 종료 코드 0을 냅니다 |
| `npm run probe-search` | 갓 만든 인덱스에 **한국어 질의를 실제로 쏴서** 결과 수를 잽니다. 검색 동작을 바꿨다면 이걸로 확인하세요 (갓 만든 `out/` 필요) |
| `npm run probe-search:verify` | 위 프로브의 자체 검사 |
| `npm run check-counts` | 발행본 수가 기대치와 맞는지 검사 (CI 게이트) |
| `npm run check-counts:verify` | 위 검사의 자체 검사 |
| `npm run check-counts:print` | 현재 발행본 수를 출력만 합니다 (판정하지 않음) |
| `npm run compose` | 문서의 도식과 코드 블록 분리 도구 |
| `npm run compose:verify` | 위 도구의 자체 검사 |

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
| `/atlas/` | 글 관계 그래프 · 목록 뷰 |
| `/atlas/[...id]/` | 노드 상세 — 글 하나의 이웃·인용·선행 관계 |

`/notion/`은 `pages/`가 아니라 [`public/notion/index.html`](public/notion/)의 **정적 파일**입니다.
`⌘K` 검색은 라우트가 아니라 **모든 페이지의 셸**(`components/site-shell.tsx`)에 붙어 있습니다.

## 프로젝트 구조

```
├── pages/                  # 라우트 (Pages Router — app/ 규약을 도입하지 않습니다)
│   ├── index.tsx           # 한국어 포트폴리오
│   ├── en/                 # 영문 요약
│   ├── product-lead*/      # 프로덕트 리더 소개·로드맵·위키
│   ├── blog/               # 목록 · 카테고리 · 글 · 태그
│   └── atlas/              # 그래프·목록 뷰 · 노드 상세([...id])
├── content/blog/           # 발행본 156편 + categories.ts · tags.ts
├── lib/
│   ├── blog/               # loader · frontmatter 검증 · types
│   ├── atlas/              # build · layout · links · neighbors · types (zod 스키마)
│   ├── search/             # collect · excerpt · korean · pagefind-loader
│   ├── design/ · ui/       # contrast() 대비 계산 · scroll-lock
│   ├── site.ts             # canonical·OG용 절대 URL
│   ├── toc.ts · wiki.ts    # 목차 생성 · 위키 로더
│   └── utils.ts            # cn() — clsx + tailwind-merge
├── components/             # 최상위 — site-shell, site-header, site-footer, site-head,
│   │                       # theme-toggle, markdown, mermaid, portfolio-nav 등
│   ├── atlas/              # dot-renderer · list-view · node-panel
│   ├── search/             # command-palette(⌘K) · search-button
│   ├── blog/               # 블로그 전용 (blog-shell · post-card · series-nav 등)
│   ├── flow-diagram/       # 흐름 다이어그램
│   └── ui/                 # shadcn/ui — badge · button · card · dialog
├── data/                   # portfolio · experience · projects · product-lead-* · diagrams/
├── scripts/                # 게이트 8종 — check-{forbidden,counts,pagefind,baseline} ·
│                           # dup-scan · probe-search · compose · generate-sitemap
├── tests/                  # Vitest — atlas · blog · design · search · ui
├── e2e/                    # Playwright — smoke · shell · search · atlas (+ global-setup)
├── public/                 # 이미지, favicon, robots.txt, sitemap.xml, notion/
├── styles/                 # 전역 CSS (디자인 토큰·테마·모션)
└── docs/                   # TOOL-TRAPS · 로드맵·완료 보고 · superpowers/{specs,plans,reports}
```

경로 별칭 `@/*`는 저장소 루트를 가리킵니다([`tsconfig.json`](tsconfig.json)) — `@/components/...`, `@/lib/utils`처럼 씁니다.
SEO·다크 모드·접근성(스킵 링크 등)은 위 컴포넌트와 `pages/index.tsx`에 모여 있습니다.

## 블로그 콘텐츠 규약

글은 `content/blog/<카테고리>/<slug>.md`에 두며, 빌드 시 [`lib/blog/`](lib/blog/)가 읽어 정적 페이지로 만듭니다.

| 항목 | 규칙 |
|------|------|
| 카테고리 | [`content/blog/categories.ts`](content/blog/categories.ts)에 **12개 등록 · 6개 발행** (`ai-agent` 51 · `backend-engineering` 32 · `agentic-coding` 31 · `rag` 25 · `ai-transformation` 11 · `search-engineering` 6) |
| 태그 | [`content/blog/tags.ts`](content/blog/tags.ts)의 통제 어휘만 사용. 글당 **3~5개**, 같은 패싯 **최대 2개** |
| frontmatter | [`lib/blog/frontmatter.ts`](lib/blog/frontmatter.ts)가 검증합니다. **선택 필드에 빈 문자열을 넣으면 빌드가 실패하므로 값이 없으면 키를 생략**하세요 |
| 중복 검사 | `npm run dup-scan -- --category <slug>`로 축자 복제를 확인합니다. 대상을 주지 않으면 종료 코드 1. **새 배치는 통째로 넘겨도 됩니다** — 각 편이 자기 자신을 뺀 나머지 전부(다른 대상 포함)와 대조됩니다 |
| 금칙어 검사 (소스) | `npm run check-forbidden`이 **HARD 0건**이어야 발행합니다. 두 검사기 모두 `:verify`(self-test)를 **먼저** 돌리세요 — 증명 없는 「0건」은 거짓 음성과 구분되지 않습니다 |
| 금칙어 검사 (산출물) | 빌드 뒤 `npm run check-forbidden:built`도 **HARD 0회**여야 합니다. 소스가 깨끗해도 템플릿이 넣은 것은 여기서만 잡힙니다 |
| 산출물 불변 검사 | 빌드 뒤 `npm run check-baseline`. 블로그가 아닌 페이지(`/`·`/en`·`/product-lead*`)의 산출물이 바뀌면 막습니다. **로컬 전용입니다** — CI에서는 주석 처리돼 있으므로([`deploy.yml`](.github/workflows/deploy.yml)) 손으로 돌려야 합니다 |
| 검색 인덱스 검사 | 빌드 뒤 `npm run check-pagefind`. **`pagefind`는 아무것도 색인하지 않아도 0으로 종료**하므로 `:verify`가 특히 중요합니다. 검색 동작을 바꿨다면 `npm run probe-search`로 실제 색인에 한국어 질의를 쏘세요 |

어휘에 없는 태그나 등록되지 않은 카테고리를 쓰면 빌드가 막습니다.

### 게이트는 자동으로 돕니다

위 검사들을 손으로 기억해 돌릴 필요는 없습니다.

| 자리 | 언제 | 무엇 |
|------|------|------|
| **pre-commit 훅** ([`.githooks/pre-commit`](.githooks/pre-commit)) | `content/blog`를 건드린 커밋 | 금칙어 self-test → `vitest run tests/blog tests/atlas` → 금칙어 스캔. 하나라도 실패하면 커밋이 막힙니다 |
| **CI** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) | `main` 푸시 | lint → `tsc --noEmit` → 금칙어 self-test → **전체** vitest → 금칙어 → 발행본 수 → 빌드 → Pagefind → 산출물 금칙어. `deploy`가 `needs: build` 뒤라 하나라도 실패하면 배포되지 않습니다 |

훅이 `tests/blog`뿐 아니라 **`tests/atlas`까지** 도는 이유가 있습니다. `tests/atlas/integrity.test.ts`는
**다른 어떤 글도 링크하지 않는 글**을 실패시키는데, 새 글은 정의상 그런 글입니다. 훅이 `tests/blog`만 돌던 때는
이 실패가 커밋과 푸시를 통과해 CI에서 터졌습니다. 빠져나갈 길은 둘이고 실패 메시지가 둘 다 알려 줍니다 —
**다른 글에서 그 글로 링크하거나**, 정말 그 분류의 최상위 지도라면 frontmatter에 `role: map`을 넣으세요.

훅은 `npm install` 시 `prepare` 스크립트가 자동으로 설정합니다(`git config core.hooksPath .githooks`).
수동으로 켜려면 같은 명령을 직접 실행하세요. husky 같은 의존성은 쓰지 않습니다.

**순서가 규칙입니다** — 자기 증명(`:verify`)이 스캔보다 먼저입니다. 증명 없는 「0건」은 거짓 음성과
구분되지 않고, 이 저장소는 실제로 그 대가를 치렀습니다.

## 라이선스

MIT License
