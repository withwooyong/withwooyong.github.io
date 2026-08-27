# CLAUDE.md

**이 저장소의 문서·주석·커밋 메시지는 모두 한글로 쓴다.**
이 파일은 **매 세션 로드된다.** 그래서 여기 있는 것은 **「모르면 실제로 잘못된 행동을 하는 것」만**이다.

| 찾는 것 | 정본 |
| --- | --- |
| 명령 전체 목록 · CI 단계 | `package.json` 의 `scripts` · `.github/workflows/deploy.yml` |
| 금칙어 목록 | `scripts/check-forbidden.mjs` — **문서로 복사하지 마라** |
| 도구 함정의 재현·실측·경위 | [`docs/TOOL-TRAPS.md`](docs/TOOL-TRAPS.md) |
| 사람이 판단해야 하는 발행 규칙 | [`docs/superpowers/PUBLISHING-CHECKLIST.md`](docs/superpowers/PUBLISHING-CHECKLIST.md) |

## 어겨도 빌드가 통과하는 제약

빌드는 이것들의 대체재가 아니다. 어겨도 전부 멀쩡히 컴파일되고 배포된다.

- **App Router 금지.** Pages Router 다(`pages/_app.tsx`). `app/` 관례를 Next.js 가 거부하지는 않는다 — 이 프로젝트의 전제를 깨뜨릴 뿐이다.
- **경로 별칭 `@/`.** 상대 경로 import 도 빌드를 통과한다. `@/lib/...`, `@/components/...` 를 쓴다.
- **`tsconfig.json` 은 동결.** `target` 을 바꾸면 프로젝트 전체가 재방출되어 「기존 페이지 불변」 보장이 조용히 깨진다. 타입 오류는 호출부에서 고친다.
- 한글 본문에 **`break-keep`**, 새 컴포넌트마다 **`dark:` 변종**.
- **커밋 메시지는 한글. 사용자가 명시적으로 요청하지 않는 한 `git push` 금지.**

## 아키텍처 — GitHub Pages 에 정적 배포되는 한국어 포트폴리오 + 기술 블로그 (허우용 / Ted)

| 항목 | 내용 |
| --- | --- |
| 프레임워크 | Next.js 14 **Pages Router** |
| 정적 내보내기 | `output: "export"`, `trailingSlash: true`, `images.unoptimized: true`. **Node 런타임이 필요한 것은 빌드를 깨뜨린다** — API 라우트·ISR·`next/image` 로더·서버 액션. 전부 빌드 시점 또는 클라이언트에서 해결돼야 한다 |
| 라우트 | `pages/` 아래. 포트폴리오(`index`·`product-lead*`·`en`), 블로그(`blog/**`), 아틀라스(`atlas/**`). 어느 하나가 「거의 전부」인 구조는 아니다 — 건드리기 전에 `find pages -name '*.tsx' \| xargs wc -l` 로 실제 분포를 본다 |
| 콘텐츠 | `content/blog/<분류>/*.md`. 분류 폴더 + `categories.ts` + `tags.ts` |
| UI·스타일 | `components/ui/` 의 shadcn/ui("new-york", neutral) — 새 shadcn 컴포넌트도 여기에. Tailwind + 커스텀 `primary`, 본문 Inter, 전역 CSS 는 `styles/globals.css`, 조건부 클래스는 `lib/utils.ts` 의 `cn()` |
| 정적 자산 | `public/` (프로필 `public/images/Ted_yanadoo.png`, 파비콘 `public/favicon.svg`) |

## 검사 — 0 을 믿기 전에 계수기가 살아 있음을 먼저 증명한다

`:verify` 가 있는 검사기는 그것이 먼저다. **증명되지 않은 「0건」은 거짓 음성과 구분되지 않는다.**
실제로 금칙어 목록에 라틴 표기만 있어 한글 표기를 통째로 놓쳤고, 그 거짓 0 이 사실로 기록된 적이 있다.

| 대상 | 순서 |
| --- | --- |
| 금칙어 (`content/blog/` 를 건드렸을 때마다) | `check-forbidden:verify` → `check-forbidden` (**HARD 0** 이어야 한다) |
| 금칙어 — 빌드 산출물 | `npm run build` → `check-forbidden:built`. **소스가 깨끗해도 페이지가 깨끗하다는 증거가 아니다** — 템플릿이 `og:image` 와 제목을 주입한다. `out/blog` 가 없으면 거짓 0 대신 2 로 종료 |
| 축자 중복 | `dup-scan:verify` → `dup-scan -- --category <slug>`. **대상이 없으면 1 로 종료한다** (맨 `dup-scan` 은 아무것도 검사하지 않는다) |
| Pagefind 색인 | `check-pagefind:verify` → `check-pagefind`. **`pagefind` 는 아무것도 색인하지 않아도 0 으로 종료한다.** 검색 동작을 바꿨다면 `probe-search` 로 실제 색인에 한국어 질의를 쏜다(갓 만든 `out/` 필요) |
| 발행본 수 · 산출물 불변 | `check-counts:verify` → `check-counts` (CI). `npm run build && npm run check-baseline` (**로컬 전용**, CI 에서는 주석 처리) |

**「있다」는 세 단계다 — 산출물에 문자열이 있다 ≠ 렌더됐다 ≠ 보인다. 각각 따로 증명하라.** Next 는 props 를
`__NEXT_DATA__` 에, 제목을 `<title>`·`og:title` 에 중복해 싣는다 — `</head>` 이후만 보고 **파싱 실패는 빨개지게** 하라.
화면은 **열어서 그려진 요소를 세라** — `/atlas` 는 엣지 1,053 중 156 만 그리는데 E2E 74건이 전부 통과했다.

`npm test` 는 타입을 검사하지 않는다(esbuild/oxc 가 벗겨낸다). **`npx tsc --noEmit` 을 별도 단계로 돌린다.**

## `npm run e2e` — 첫 줄을 읽어라

개발 서버가 아니라 **빌드된 `out/`** 을 서빙하므로 `npm run build` 를 먼저 돌린다.
`e2e/global-setup.ts` 는 `out/` 이 소스보다 오래되면 어제 산출물을 검사하는 대신 종료 코드 1 로 거부한다.

**이 거부는 테스트를 하나도 돌리지 않고 1 로 끝나서 진짜 실패와 똑같이 보인다** — `$?` 말고 첫 줄을 읽어라.
가드가 내용이 아니라 mtime 을 보므로 `scripts/` 에 파일을 하나 추가하거나 `components/` 아래 **주석만 고쳐도** `out/` 이 무효가 된다.

**일부 실패는 정상일 수 있고, 그 판정은 센티넬이 내린다.** 센티넬은 **자기 파일**의 침묵이 정당한지를 답한다 —
그것이 없는 스위트는 미구현과 회귀를 구분하지 못한 채 조용히 초록이 되므로, 같은 조건을 여러 파일이 일부러 중복 검사한다.
**무엇이 왜 빨간지는 문서가 아니라 `describe` 제목과 실패 메시지에 있다** — 여기에 건수를 적으면 그 줄이 먼저 썩는다.

## pre-commit 훅

`.githooks/pre-commit` 은 커밋이 `content/blog/` 를 건드릴 때만 돈다(`npm install` 이 연결한다;
손으로는 `git config core.hooksPath .githooks`). 금칙어 자체 검사 → `vitest run tests/blog tests/atlas` → 금칙어 검사.

2 단계에 **`tests/atlas`** 가 있는 이유는 하나다. `tests/atlas/integrity.test.ts` 는 **다른 어떤 글도 링크하지 않는**
새 글을 실패시키는데, 새 글은 정의상 그런 글이다. 훅이 `tests/blog` 만 돌리던 때는 이 실패가 커밋과 푸시를 통과해
CI 에서 터졌다. 빠져나갈 길은 둘이고 실패 메시지가 둘 다 말해 준다 — **다른 글에서 그 글로 링크하거나**,
정말 그 분류의 최상위 지도라면 프론트매터에 `role: map` 을 넣는다.
`role: map` 은 빨강을 초록으로 바꾸는 스위치가 아니라 **그 글에 대한 주장**이다.

## 규칙이 사는 곳

발행 규칙은 산문이 아니라 검사기에 산다. 기계가 판정할 수 있는 것(스키마·금칙어·링크·크기·빌드 산출물)은
`scripts/` 와 `tests/blog/` 에, 사람의 판단만 남는 것(출처 표기·전수 배정·삭제 여파·익명화·어조)은
`PUBLISHING-CHECKLIST.md` 에, 만료된 규칙은 설계 문서 `§11` 에 취소선으로 남긴다 — 지우지 않는 이유는
다른 문서가 번호로 인용하기 때문이다. 전수 분류 근거는 `docs/superpowers/reports/2026-08-18-rule-triage.md`.

**검사기의 판정 기준을 문서로 복사하지 마라** — 위의 거짓 0 이 그 분리에서 나왔다. 반대로 배치 한정 지시를
영구 규칙에 넣지 마라 — 영구 규칙은 **모든** 배치에서 참이어야 한다.

## 이 환경에서 도구가 거짓말하는 방식

지금까지 겪은 것이 **전부 같은 모양이다: 「없다」와 「읽을 수 없었다」가 같은 출력으로 나온다.**
그래서 대응도 하나로 모인다 — **확실히 존재하는 대조군을 먼저 측정하라.** 0 을 받았을 때 그것이 진짜인지는
계수기가 살아 있음을 증명해야만 안다. grep 이 0 건, 뮤턴트가 전부 생존, 테스트가 전부 skip, 부정 단언이 초록 — 전부 이것 하나로 막힌다.

전수 목록과 재현 절차는 [`docs/TOOL-TRAPS.md`](docs/TOOL-TRAPS.md) 에 있다.
아래는 **그 원칙으로 막을 수 없는 것**, 즉 미리 알지 못하면 반드시 당하는 것만 남긴 것이다.

| # | 하면 벌어지는 일 | 대신 |
| --- | --- | --- |
| [14](docs/TOOL-TRAPS.md#t14) | **`sed -i` 가 CRLF 파일의 CR 을 전부 날린다.** `git diff`·`cat -A` 는 이를 보지 못한다 | `Edit` 이나 Node 로. 검증은 `tr -cd '\r' \| wc -c` |
| [16](docs/TOOL-TRAPS.md#t16) | **`Write` 로 CRLF 파일을 통째로 교체하면 CR 이 0 이 된다** | 쓰기 **전에** CR 을 센다. LF 면 `Write` 무방, CRLF 면 `Edit`. 쓴 뒤 다시 센다 |
| [21](docs/TOOL-TRAPS.md#t21) | **`npm ci --dry-run` 이 실제로 `node_modules` 를 지운다.** 이후 모든 도구가 「설치되지 않았다」고 한다 | 드라이런을 쓰지 마라. `package-lock.json` 을 읽어라. 이미 돌렸다면 `npm ci` 로 복구 |
| [13](docs/TOOL-TRAPS.md#t13) | 아무도 import 하지 않은 파일을 가리키며 빌드가 죽는다 | **주석에 Tailwind 대괄호 임의값 클래스를 넣지 마라** — Tailwind 는 주석도 훑는다 |
| [8](docs/TOOL-TRAPS.md#t8) | 히어독 안의 정규식이 `SyntaxError` — `\\` 가 `\` 로 도착한다 | `Write`/`Edit` 로 파일에 쓰거나 `String.fromCharCode(92)` |
| [19](docs/TOOL-TRAPS.md#t19) | Playwright 가 0 인데 통과가 아니고, 1 인데 실패가 아니다 | `$?` 말고 요약 줄을 읽는다. `retries: 0` 유지 |
| [35](docs/TOOL-TRAPS.md#t35) | **Git Bash 가 `node` 인자 안의 `/atlas/` 를 `C:/Program Files/Git/atlas/` 로 바꾼다** — 홑따옴표도 못 막는다. 뮤턴트가 엉뚱한 문자열로 주입돼 **「사멸」이 거짓이 된다** | 치환 문자열은 인자 말고 **스크립트 파일**에. 넘겨야 하면 `MSYS_NO_PATHCONV=1`. 주입 뒤 그 줄을 `grep` 으로 본다 |
| [1](docs/TOOL-TRAPS.md#t1) | 파이프를 거친 명령이 항상 성공으로 보인다 — `$?` 는 마지막 명령의 것이다 | 종료 코드를 읽을 명령은 파이프 없이 단독 실행 |

**새 함정을 추가할 때** — 먼저 위 원칙으로 흡수되는지 본다. 흡수되면 `docs/TOOL-TRAPS.md` 에만 적는다.
그리고 **해소된 항목이 있는지 하나만 확인한다** — 이 표는 한 번도 줄어든 적이 없다.

## 배포

`.github/workflows/deploy.yml` 이 `main` 으로의 모든 푸시에서 돈다. 프리뷰 환경은 없다 — **`main` 이 곧 프로덕션이다.**
CI 는 빌드만 하지 않는다 — lint·타입·금칙어·테스트·발행본 수·Pagefind 가 `deploy` 앞에 선다(정본은 워크플로
파일). `deploy` 는 `needs: build` 뒤라 **하나라도 실패하면 배포되지 않는다.**

## 이 파일을 고칠 때

- **실측 수치를 적지 마라.** 테스트 개수·발행본 수·E2E 통과 수는 **명령을 적고 결과는 적지 않는다** — 낡은
  숫자는 다음 사람에게 회귀와 구분되지 않는다. 게이트가 필요하면 문서가 아니라 검사기로 만든다(`check-counts`).
  **측정값은 썩고 결정값은 썩지 않는다** — 상한·금지·순서는 적어도 된다.
- **상한 200줄**(`wc -l CLAUDE.md`). 여유가 있어도 **한 줄을 더하면 한 줄을 뺀다.** 늘어날 것 같으면
  `.claude/rules/` 의 `paths:` 로 경로 스코프를 걸어 그 파일을 만질 때만 로드시키거나, `/doctor` 로 트림을 받는다.
- 근거·경위·재현 절차는 여기가 아니라 `docs/` 다. 여기엔 **행동을 바꾸는 문장만** 둔다.
