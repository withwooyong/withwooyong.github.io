# CLAUDE.md

Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 지침이다.
**이 저장소의 문서·주석·커밋 메시지는 모두 한글로 쓴다.**

## 명령어

| 명령 | 하는 일 |
| --- | --- |
| `npm run dev` | 개발 서버 (http://localhost:3000) |
| `npm run build` | `out/` 으로 정적 내보내기. `output: "export"` 가 빌드 시점에 돌므로 별도 `next export` 단계는 없다 (README의 `npm run export` 언급은 낡았다). 끝에 `npx pagefind --site out` 이 붙어 있다 |
| `npm run start` | 프로덕션 빌드 서빙. 정적 배포라 쓸 일이 거의 없다 |
| `npm test` | Vitest. 범위는 `vitest.config.ts` 의 `include`(`tests/**/*.test.ts`)이지 `tests/blog/` 만이 아니다. Vitest는 타입을 검사하지 않고 esbuild로 벗겨내므로 `npx tsc --noEmit` 을 **별도 단계로** 돌린다 |
| `npm run lint` | `next lint` |
| `npm run e2e` | Playwright. 아래 주의사항을 반드시 읽을 것 |
| `npm run e2e:ui` | Playwright UI 모드 |

**측정값 (2026-08-27)** — 전체 vitest **350개 통과 / 15파일**, 발행본 **156편**(`content/blog/` 하위 6개 분류 폴더).

### `npm run e2e` 주의사항

개발 서버가 아니라 **빌드된 `out/`** 을 서빙하므로 `npm run build` 를 먼저 돌린다.
`e2e/global-setup.ts` 는 `out/` 이 소스보다 오래되면 어제 산출물을 검사하는 대신 종료 코드 1로 거부한다.

**이 거부는 테스트를 하나도 돌리지 않고 1로 끝나서 진짜 실패와 똑같이 보인다** — `$?` 말고 첫 줄을 읽어라.
`scripts/` 도 소스로 치므로 스크립트를 하나 추가하면 `out/` 이 무효가 되고, 가드가 내용이 아니라 mtime을 보므로
`components/` 아래 **주석만 고쳐도** 마찬가지다.

현재는 **48개 중 4개 실패가 정상**이다 (18 통과 · 26 skip, 2026-08-27 측정 — 이번 검토에서는 재실행하지 않았으므로 미검증).
셸이 어느 페이지에도 붙어 있지 않아 `/atlas/` 센티넬이 `shell.spec.ts` 와 `search.spec.ts` **양쪽에서**,
데스크톱·모바일 × 2로 일부러 빨갛다. 이 중복은 의도된 것이다 — 센티넬은 **자기 파일**의 침묵이 정당한지를 답하고,
센티넬이 없는 스위트는 조용히 초록이 된다. 이 수치를 최신으로 유지할 것: 낡은 숫자는 다음 사람에게 회귀와 구분되지 않는다.

### 발행 전 검사 (`content/blog/` 를 건드렸을 때마다)

| 명령 | 검사하는 것 |
| --- | --- |
| `npm run check-forbidden:verify` | **이것부터 돌린다.** 금칙어 검사기가 실제로 잡는지를 증명한다. 몇 건을 돌렸는지 찍는데, 그 수는 문서가 아니라 코드에 있어서 낡을 수 없다 |
| `npm run check-forbidden` | `content/blog` 를 훑는다. 발행 전 **HARD 0** 이어야 하고 아니면 1로 종료 |
| `npm run check-forbidden:built` | **빌드 산출물**(`out/blog` + 대응하는 `_next/data` JSON)을 훑는다. `npm run build` 뒤에 돌린다. 소스가 깨끗해도 페이지가 깨끗하다는 증거가 아니다 — 템플릿이 `og:image` 와 제목도 주입하며, 그래서 소스 검사가 계속 0을 보고하는 동안 `Ted_yanadoo.png` 가 366곳에 있었다. `out/blog` 가 없으면 거짓 0 대신 2로 종료한다 |
| `npm run dup-scan:verify` → `npm run dup-scan -- --category <slug>` | 축자 중복 검사. 순서는 같다 — 증명하고 나서 검사한다. 대상이 필요하다: 맨 `npm run dup-scan` 은 「대상이 없다」와 함께 1로 종료. 배치 전체를 한 번에 넘겨도 안전하다(2026-08-18 이후) — 각 대상이 **자기 자신을 뺀 전부**와 비교된다. 그 수정 전에는 검사기가 **모든** 대상을 비교 집합에서 빼서, 가장 필요한 경우인 새 배치를 넘기면 조용히 0이 나왔다. 자체 검사 ⑤·⑥ 이 이 동작을 붙들고 있다 |

두 검사기 모두 같은 규칙을 따른다: **0을 믿기 전에 자체 검사를 먼저 돌린다.**
증명되지 않은 「0건」은 거짓 음성과 구분되지 않는다 — 여기서 실제로 일어났다. 금칙어 목록에 라틴 표기(`FASTCAMPUS`, `teddynote`)만
있어서 한글 표기(「패스트캠퍼스」, 「테디노트」)를 조용히 놓쳤고, 거짓 0이 CHANGELOG에 사실로 기록됐다 (2026-08-18 수정).

금칙어 정본 목록은 **어떤 문서도 아닌** `scripts/check-forbidden.mjs` 에 있다. 문서로 복사하지 마라 — 위 실패가 바로 그 분리에서 나왔다.

### 문서화되지 않았던 검사기

| 명령 | 성격 | 언제 |
| --- | --- | --- |
| `npm run check-counts` / `:verify` | **CI 게이트.** 발행본 수가 문서 여러 곳에 흩어져 아무도 세지 않는 문제를 막는다. README 세 곳이 128편에 멈춰 있는 동안 실제로는 149편이었다 | CI에서 빌드 직전 2단계 |
| `npm run check-baseline` / `:update` | **로컬 전용 게이트** (GC-6). 블로그가 아닌 페이지의 빌드 산출물이 안 바뀌었음을 확인한다. CI에서는 주석 처리돼 있다 | `npm run build && npm run check-baseline` |
| `npm run compose` / `:verify` | 게이트가 아니라 **측정기**. 원본 마크다운을 절별로 갈라 성분(도식·코드·표·인용·불릿·산문) 바이트를 센다 | 분할 설계 시 |
| `npm run check-pagefind` / `:verify` | Pagefind 색인이 비어 있지 않음을 증명한다. `pagefind` 는 **아무것도 색인하지 않아도 0으로 종료한다** | CI에서 빌드 직후 |
| `npm run probe-search` / `:verify` | 한국어 질의 13개를 Playwright로 실제 색인에 쏜다 (설계서 §8.5의 게이트). 갓 만든 `out/` 이 필요하다. CI에는 없다 | 검색 동작이 바뀌었을 때 |

## 게이트

발행 규칙은 산문이 아니라 검사기에 산다. 2026-08-18 에 누적된 105개 규칙을 전수 분류해
(`docs/superpowers/reports/2026-08-18-rule-triage.md`) 네 갈래로 나눴다.

| 규칙이 사는 곳 | 거기 속하는 것 |
| --- | --- |
| 검사기 (`scripts/`, `tests/blog/`) | 기계가 판정할 수 있는 것 — 스키마, 금칙어, 링크, 크기, 빌드 산출물 |
| `docs/superpowers/PUBLISHING-CHECKLIST.md` | 사람의 판단만 — 출처 표기, 전수 배정, 삭제 여파, 익명화, 도식 근거, 링크 약속, 어조 |
| 이 파일 | 이 환경에서 도구가 실패하는 방식, 그리고 빌드가 강제하지 **않는** 코드 제약 |
| 설계 문서 `§11` (취소선) | 배치와 함께 만료된 규칙. 지우지 않고 남긴다 — 다른 문서가 번호로 인용한다 |

**검사기의 판정 기준을 문서로 복사하지 마라.** 위의 거짓 0이 그 분리에서 나왔다.
반대로 배치 한정 지시(「이번엔 범위 밖」, 「그 파일의 §4만」)를 영구 규칙 목록에 넣지 마라 —
영구 규칙은 **모든** 배치에서 참이어야 한다. 105개 중 14개가 이 시험에 걸려 취소선 처리됐다.

### pre-commit 훅

`.githooks/pre-commit` 은 커밋이 `content/blog/` 를 건드릴 때만 소스 검사를 돌린다. 안 건드리는 커밋은 그냥 통과한다.
`npm install` 이 `prepare` 스크립트로 훅을 연결한다 — 손으로 하려면 `git config core.hooksPath .githooks`.

훅이 돌리는 것은 셋이다.

| 단계 | 명령 |
| --- | --- |
| 1 | `node scripts/check-forbidden.mjs --self-test` |
| 2 | `npx vitest run tests/blog tests/atlas` |
| 3 | `node scripts/check-forbidden.mjs` |

2단계 범위는 `tests/blog` **와 `tests/atlas`** 다 (2026-08-27 실측 **199개 / 11파일**).
atlas 쪽이 있는 이유는 하나다: `tests/atlas/integrity.test.ts` 는 **다른 어떤 글도 링크하지 않는** 새 글을 실패시키는데,
새 글은 정의상 그런 글이다 — 현재 156편 중 57편이 남의 본문에 인용되는 것만으로 유입 엣지를 얻는다.
이전에는 훅이 `tests/blog` 만 돌려서 이 실패가 커밋과 푸시를 통과해 CI에서 터졌고, 거기서 `deploy` 는 `needs: build` 뒤에 있다.
빠져나갈 길은 둘이고 실패 메시지가 둘 다 말해 준다: **다른 글에서 그 글로 링크하거나**, 정말 그 분류의 최상위 지도라면
프론트매터에 `role: map` 을 넣는다. `role: map` 은 빨강을 초록으로 바꾸는 스위치가 아니라 **그 글에 대한 주장**이다.

빌드가 필요한 검사는 훅 대신 CI에서 돈다.

### 빌드가 잡아 주지 않는 제약

빌드는 이것들의 대체재가 아니다. 어겨도 전부 멀쩡히 컴파일되고 배포된다.

- **App Router 금지.** `app/` 관례를 Next.js가 거부하지는 않는다 — 이 프로젝트의 전제를 깨뜨릴 뿐이다.
- **경로 별칭.** 상대 경로 import도 빌드를 통과한다. `@/lib/...`, `@/components/...` 를 쓴다.
- **`tsconfig.json` 은 동결.** `target` 을 바꾸면 프로젝트 전체가 재방출되어 "기존 페이지 불변" 보장이 조용히 깨진다. 타입 오류는 호출부에서 고친다.
- 한글 본문에 **`break-keep`**, 새 컴포넌트마다 **`dark:` 변종**.
- **커밋 메시지는 한글. 사용자가 명시적으로 요청하지 않는 한 `git push` 금지.**

## 이 환경의 도구 함정

내용에 대한 규칙이 아니라 **도구가 거짓을 보고하는 방식**이다. 전부 이 리포에서 실제로 당했다.

| # | 함정 | 실제로 일어나는 일 | 대응 |
| --- | --- | --- | --- |
| 1 | 파이프 뒤 종료 코드 | `$?` 는 **마지막** 명령의 것이라 `grep … \| sort \| uniq -c` 는 항상 0 | 종료 코드를 읽을 명령은 파이프 없이 단독 실행 |
| 2 | 한글 1인칭 | grep이 양방향으로 실패한다. 「동시성 문**제가**」·「메이**저는**」은 오탐, 「**내** 검색 커리어」는 누락. `내 [가-힣]{2,6}` 으로 넓히면 「인덱스 **내** 문서」가 쏟아진다 | 매칭된 줄을 열어 읽는다. **1인칭은 검사기에 넣지 마라** |
| 3 | 한글 종결어미는 줄 끝에 오지 않는다 | 「…있습니다.」는 마침표로 끝나므로 `습니다$` 는 **아무것도** 안 맞고 구조적 0을 보고한다. 브리프에 「~로 끝나는 줄」이라고 쓰면 에이전트가 정확히 그 패턴을 짠다 | 앵커가 아니라 **부분 문자열**로 센다. 줄이 아니라 출현 횟수를 센다 — 한 줄에 둘이 올 수 있다. 0이 아님이 확실한 절로 대조 |
| 4 | 마크다운 강조가 단어를 쪼갠다 | `**IDOL**을` 은 `IDOL을` 에 안 걸린다. 한글 조사가 바로 붙으므로 구조적으로 발생한다 (영어는 띄어쓰기가 있어 안 생긴다) | 강조를 벗긴 패턴도 같이 검색 |
| 5 | 로케일이 한글과 이모지를 가린다 | `LC_ALL=C` 없이는 이모지 grep이 거짓 0. `LC_ALL=C grep -P '[\x{1F300}-\x{1FAFF}]'` 는 "range out of order" 로 죽고, 출력 없음은 발견 없음처럼 보인다 | `LC_ALL=C` 고정, 이모지는 UTF-8 바이트 패턴으로 매칭. `\|\| echo "0건"` 을 절대 붙이지 마라 — 「파일 없음」과 「0건」이 같은 문자열이 된다 |
| 6 | 단어 안의 부분 문자열 | `grep -o '비용'` 이 「대**비용**(對比用)」도 센다 | 히트한 줄을 열어 의도한 단어인지 확인 |
| 7 | 축자 중복 검사의 맹점 | `dup-scan.mjs` 는 "같은 뜻, 다른 표현"을 못 본다 | 문자열뿐 아니라 뜻으로도 정의를 대조 |
| 8 | 히어독이 백슬래시 한 겹을 먹는다 | 따옴표를 씌운 `<<'EOF'` 에서도 정규식의 `\\` 가 `\` 로 도착해 `SyntaxError` 를 낸다. 홑겹은 살아남고 겹겹만 벗겨진다. 히어독 안의 셸 따옴표가 히어독 자체를 깨뜨릴 수도 있다 | 그런 파일은 `Write`/`Edit` 도구로 쓰거나 `String.fromCharCode(92)` 로 문자를 만든다 |
| 9 | grep은 CRLF를 감지하지 못한다 | CR을 줄 끝으로 처리해서 CR이 393개인 파일을 "LF 전용"으로 보고했다 | `tr -cd` 로 바이트를 센다 |
| 10 | `core.autocrlf=true` 가 줄바꿈 변경을 숨긴다 | git이 정규화한 뒤 비교하므로 통째로 다시 쓴 파일도 깨끗한 diff로 보인다. 이 리포는 실제로 CRLF와 LF가 섞여 있다 | 깨끗한 diff는 아무것도 안 바뀌었다는 증거가 아니다. 대조 파일과 CR/LF를 직접 센다 |
| 11 | 서브에이전트가 보고 없이 유휴 상태가 된다 | `reviewer` 와 `scout` 에는 `Write` 도구가 없다. `scout` 과 `verifier` 가 통지 3번에 걸쳐 아무것도 내놓지 않은 적이 있다 | 메시지가 아니라 파일로 판단한다: 유휴 통지마다 `ls -la <스크래치패드>`, 그다음 `SendMessage` 로 보고서를 회수. **원래 질문을 그대로** 다시 보낸다 — 「아까 물어본 대로」는 껄끄러운 항목부터 떨군다 |
| 12 | `grep -r` 이 `out/` 과 `node_modules` 를 훑는다 | 120초 타임아웃 | `Grep` 도구를 쓰거나 `--include` / 명시적 경로 |
| 13 | Tailwind가 주석까지 훑는다 | 클래스 추출기가 원본 텍스트에 대한 정규식이라 주석을 걸러내지 않는다. **주석 안**에 쓴 임의값 클래스가 진짜 CSS로 방출된다. 주석에 남긴 `bg-[url('./${logo}')]` 예시가 규칙이 되어 PostCSS가 해석을 시도했고, 빌드는 아무도 import하지 않은 파일 이름을 가리키는 `Cannot find module './${logo}'` 로 죽었다 | 주석에 대괄호 임의값 클래스를 절대 넣지 마라. 예시는 산문으로 쓰거나 필드 이름만 적는다 |
| 14 | Git Bash의 `sed -i` 가 CR을 전부 지운다 | 파일을 LF로 다시 쓴다. CRLF 파일이면 CR 531개가 조용히 사라지고, `core.autocrlf=true` 가 정규화하므로 `git diff` 는 여전히 한 줄짜리 깨끗한 변경으로 보인다. git 기반 검사 전부에 이 손상이 안 보인다 | CRLF 파일에 `sed -i` 금지. `Edit` 도구(부분 치환이라 주변 CR 보존)나 Node로 읽고 쓴다 — **`Write` 는 안 된다, 다음 항목 참조.** 검증은 바이트 수(`tr -cd '\r' \| wc -c`)로 하고 `git diff` 나 `cat -A` 로 하지 마라 — MSYS의 `sed \| cat -A` 도 CR을 지워서 어느 쪽이든 LF 전용으로 보고한다 |
| 15 | Tailwind variant 클래스는 빌드된 CSS에 백슬래시를 문자로 갖는다 | `.focus-visible\:ring-signal{…}` 에서 `\` 는 이스케이프가 아니라 셀렉터 텍스트의 일부다. 잘못 이스케이프한 패턴으로 grep하면 **0과 종료 코드 1** 이 나오고, 이는 "Tailwind가 그 클래스를 방출한 적 없다"와 똑같이 읽힌다. 실측: 같은 파일에서 `grep -c 'focus-visible\\:ring-signal'` → 0, `grep -cF 'focus-visible\:ring-signal'` → 1 | 빌드된 CSS 셀렉터는 `-F` 와 홑 백슬래시로 grep한다. 증명하지 않은 0으로 "클래스가 방출되지 않았다"를 결론짓지 마라 — 존재가 확실한 클래스를 대조군으로 먼저 검색한다 |
| 16 | `Write` 도구가 전체 교체 시 CRLF를 떨어뜨린다 | 받은 문자열을 그대로 쓰는데 그 문자열에 CR을 넣을 실질적 방법이 없어서, 전체 파일 쓰기는 항상 LF로 떨어진다. 3줄 CRLF 표본 실측: `Edit` 후 CR 3 / LF 3, `Write` 후 CR **0** / LF 3. 위 14번이 `sed -i` 의 대안으로 `Write` 를 지목했었기 때문에 더 나쁘다 — 권장 해법의 절반이 같은 결함을 갖고 있었다 | 먼저 파일의 줄바꿈을 확인한다(`tr -cd '\r' \| wc -c`). LF 파일이면 `Write` 무방. CRLF면 `Edit`, 전체를 바꿔야 하면 Node로. 그리고 항상 CR을 다시 센다 — `git diff` 는 이것을 보여주지 못한다 |
| 17 | `next/head` 가 하이드레이션 때 head 태그를 다시 넣어서, DOM 단언은 없어진 태그를 볼 수 없다 | `out/blog/index.html` 에서 `<link rel="canonical">` 을 통째로 지워도 E2E 검사는 **초록**이었다. Next의 head 매니저가 하이드레이션에서 되돌려 놓고 로케이터는 복원된 DOM만 본다. 태그는 배포되는 바이트에 실제로 없었고, 그것이 Slack·카카오톡 언펄과 대부분의 크롤러가 읽는 것이다. `check-forbidden:built` 와 같은 모양이다 — 깨끗한 소스 ≠ 깨끗한 산출물, 여기서는 깨끗한 *DOM* ≠ 깨끗한 산출물 | **원본 응답**에 대해 단언한다(`page.request.get(path)` + 텍스트 정규식). DOM도 보되 두 번째의 **별개** 측정으로 본다. 헬퍼는 `e2e/raw-html.ts` |
| 18 | React가 하이드레이션 중 `#__next` 안에 손으로 넣은 마크업을 버린다 | 셀렉터를 시험하려고 `out/index.html` 의 `#__next` 아래에 탐침 `<div>` 를 넣었더니 **0건**이 나왔다. 하이드레이션이 트리를 조정하며 떨궜다. 검사기는 멀쩡한데 실험이 "검사기가 고장났다"로 읽힌다 | React 영역 밖을 건드린다: `<body>` 의 속성이나 `<head>` 노드. `<body data-site-shell>` 로 같은 탐침을 다시 돌리니 설계대로 게이트가 뒤집혔다 |
| 19 | Playwright의 종료 코드는 양방향으로 거짓말한다 | 아무것도 맞지 않는 `-g` 패턴은 `No tests found` 와 함께 **1** 로 종료한다 — 언뜻 진짜 실패와 구분되지 않는다 (실제 사례: 어떤 제목에도 없던 `-g "다크 기본"`). 반대 방향으로, `retries: 1` 이면 두 번째에 통과한 테스트가 `flaky` 로 집계되고 실행은 **0** 으로 끝난다 (실측: 같은 스펙, `CI` 미설정 → 1, `CI=true` → `1 flaky`, 0). 별개로 `list` 리포터는 `test.skip` 사유를 찍지 않아서 게이트된 스위트가 설명 없는 침묵으로 보인다 | `$?` 만이 아니라 요약 줄을 읽는다. `retries: 0` 을 유지한다 — 이유는 `playwright.config.ts` 에 적혀 있다. 게이트 상태를 `describe` 제목에 넣어 skip이 스스로 설명하게 한다 |
| 20 | `-g` 필터가 스위트의 skip을 정당화하던 센티넬을 조용히 없앤다 | 이 리포는 게이트된 스위트마다 **별도** `describe` 에 센티넬을 짝지어 둔다. 그래서 게이트된 테스트를 고를 만큼 좁은 필터는 센티넬도 같이 떨군다. 2026-08-27 실측: `npx playwright test e2e/search.spec.ts -g "검색 팔레트" --project=desktop` → `4 skipped`, **종료 코드 0**. 완벽한 조용한 초록이다 — 의미 있는 것이 전부 skip되고 그것을 말해 줄 유일한 테스트가 필터로 빠졌기 때문에 성공을 보고한다 | 필터를 건 실행의 초록을 통과로 취급하지 마라. 게이트 상태는 **전체** 실행으로 판단하고 `$?` 가 아니라 skip 수를 읽는다. 센티넬과 그 게이트는 한 몸이고 필터는 그것을 가른다 |
| 21 | `npm ci --dry-run` 이 실제로 `node_modules` 를 지운다 | 시뮬레이션이 아니다. npm은 멈출지 결정하기 **전에** 트리를 지우므로 "드라이런"이 설치 패키지 **0개** 를 남긴다 (실측 590 → 0). 이후 모든 도구가 npm이 아니라 자기 이야기를 하며 실패한다 — 그 시점에 `npm test` 를 읽은 병렬 에이전트가 `'vitest' is not recognized` 를 받고 "vitest가 설치되지 않았다"고 보고했다 | 무엇이 설치될지 보려고 `npm ci --dry-run` 을 쓰지 마라. 대신 `package-lock.json` 을 읽는다(`os`/`cpu`/`optional` 필드에 플랫폼 정보가 있다). 이미 돌렸다면 `npm ci` 로 복구하고, 이후의 어떤 실패든 믿기 전에 `ls node_modules \| wc -l` 로 확인한다 |
| 22 | Pagefind 조각은 gzip이라 `out/` 을 grep하는 것이 구조적으로 눈멀어 있다 | `npx pagefind --site out` 이 `\037\213\b` 로 시작하는 `.pf_fragment` 242개를 쓴다. 확실히 안에 있는 문자열도 `grep -a` 가 0을 낸다 — 대조군(`url`)도 0이므로 그 0은 "없다"가 아니라 "읽을 수 없다"는 뜻이다. `check-forbidden:built` 는 `out/blog` 를 훑으므로 이 파일들을 아예 보지 않는다: 배포 바이트에 본문 사본이 들어 있는데 어떤 검사기도 읽지 않는다. 손으로 한 번 확인함 (242개를 전부 펼쳐 3,992,070바이트, 스캔 — **오늘은 유출 없음**) | 펼친 뒤 스캔한다: `for f in out/pagefind/fragment/*.pf_fragment; do gzip -dc "$f"; done > /tmp/frag.txt`. 확실히 있는 대조 문자열을 항상 먼저 grep한다 — 압축된 입력에 대한 0은 증거가 아니다. 펼친 바이트도 순수 JSON이 아니다: 각 조각이 `pagefind_dcd` 접두로 시작해서 `JSON.parse` 가 `Unexpected token 'p'` 로 죽는다 — 첫 `{` 부터 잘라 쓴다 |
| 23 | `/` 로 시작하는 지정자에는 `declare module` 이 절대 적용될 수 없다 | `import("/pagefind/pagefind.js")` 가 TS2307을 던진다. `types/pagefind.d.ts` 에 `declare module "/pagefind/pagefind.js";` 를 넣어도 아무것도 달라지지 않는데, `tsc --noEmit --listFiles \| grep types/pagefind` 는 **그 d.ts가 프로그램에 포함되어 있음을 확인해 준다** — "선언은 로드됐으니 문제는 다른 데 있다"로 읽힌다. 아니다: TypeScript는 `/` 접두 지정자를 모듈 이름이 아니라 루트 경로로 해석하므로 어떤 앰비언트 선언도 맞을 수 없다. 이 확인 출력이 비용을 키운다 — `include` 패턴을 뒤지게 만든다 | `tsconfig` 추적을 멈춘다. 번들러도 체커도 파싱할 수 없는 형태를 쓴다: `new Function('return import("/path.js")')()`. 가정하지 말고 실제 브라우저에서 확인한다 — 여기서는 콘솔 에러 0에 결과 45건으로 실측됐다. `unsafe-eval` 이 필요한데 GitHub Pages는 제한하지 않는다 (더 엄격한 호스트라면 문제가 된다) |
| 24 | 모르는 `--reporter` 는 테스트 하나 돌기 전에 vitest를 죽이고, 그 침묵이 결과처럼 읽힌다 | `--reporter=basic` 은 vitest 4에 존재하지 않는다 — **커스텀 리포터 모듈**로 취급되어 해석에 실패하고, 아무것도 실행하지 않은 채 1로 종료한다. 그 출력에서 `Tests  N failed` 를 파싱하던 뮤테이션 테스트 하네스가 뮤턴트 **14개 중 14개를 "생존"으로 채점**했다 — 완벽하고 그럴듯한 거짓 보고였고, 앞선 리뷰어의 발견과 일치해서 더 설득력 있어 보였다 | 카운트가 없다고 "실패 없음"을 추론하지 마라 — 파싱하기 전에 실행이 **시작됐는지**(출력에 `/Test Files/`) 확인한다. 반드시 잡히는 것을 아는 **대조 뮤턴트**를 항상 포함시킨다. 대조가 죽지 않으면 코드가 아니라 하네스가 고장난 것이다. 여기서 동작이 확인된 것은 `--reporter=verbose` |
| 25 | 테스트의 `console.log` 가 파이프 아래에서 사라진다 | vitest 기본 리포터는 stdout이 TTY가 아니면 테스트 stdout을 억제한다. TTY 실행에서는 찍히는 줄이 `npm test \| grep 노드` 에서 0이 된다. 그 0은 "찍히지 않았다"가 아니라 "읽을 수 없었다" — Pagefind gzip과 같은 부류다 | 파일로 리다이렉트하고 `--reporter=verbose` 로 돌린 뒤 그 파일을 grep한다. `×` 같은 비ASCII 표식은 `grep -a` / `LC_ALL=C` 주의가 필요하다 |
| 26 | 링크 검사 전에 코드 펜스를 벗기는 것은 링크 쪽에는 맞고 헤딩 쪽에는 틀리다 | `lib/atlas/links.ts` 의 `proseOnly` 는 펜스·인라인 코드·HTML 주석을 지워서 산문 속 **예시** 링크가 진짜 엣지가 되지 않게 하고, 슬래시·앵커 검사기가 그것을 고칠 수 없는 위반으로 잡지 않게 한다. 이것을 **대상** 쪽에도 적용했더니 앵커 2개가 깨졌다: `headingIds` 는 인라인 코드를 **포함한** 헤딩 텍스트에서 id를 만들기 때문에 `` `master`/`slave` `` 를 비우면 id가 바뀌고 `#master--slave-…` 가 해석되지 않는다 | 링크를 **뽑아내는** 곳에서만 전처리하고, 헤딩을 **색인하는** 곳에서는 절대 하지 않는다. 이 변환은 대칭이 아니다 — "일관되게 어디에나 적용"이 여기서는 결함 그 자체다 |
| 27 | `locator('[role="dialog"]')` 는 숨은 다이얼로그를 세고 `getByRole('dialog')` 는 세지 않는다 | 한 페이지에서 실측: CSS 속성 로케이터는 **2** 를 반환하고 (이 리포의 모바일 드로어가 `hidden` 뒤에서 DOM에 남는다), ARIA 로케이터는 **1** 을 반환한다. "정확히 하나의 다이얼로그가 열려 있다"는 테스트가 어느 로케이터를 쓰느냐만으로 통과와 실패가 갈린다 — 게다가 속성 셀렉터 쪽이 더 문자 그대로여서 손이 먼저 간다 | 다이얼로그 개수는 `getByRole` 로 단언한다. 마크업이 아니라 **로케이터**가 무엇을 측정했는지를 결정한다 |
| 28 | 소스의 생 NUL 바이트가 ripgrep으로 하여금 파일 전체를 조용히 건너뛰게 만든다 | `tests/atlas/build.test.ts` 가 오프셋 11273/11283에 진짜 NUL 2개를 갖고 있었다 — 이스케이프로 의도한 템플릿 리터럴 구분자가 제어문자 자체로 들어갔다. 리포 전체 `Grep` 으로 `정준\|결정론` 을 찾으니 23개 파일이 나왔고 **이 파일만 아무 표시 없이 빠졌다.** UTF-8로 읽으니 정준 ×2, 결정론 ×1, `sort` ×3이 있었다. 「이 파일에 그것이 없다」와 「이 파일은 스캔된 적이 없다」가 **같은 침묵**이라, "정준 순서 테스트가 없다"는 거짓 발견이 나올 뻔했다. 재현으로 기전 확인: 도구 인자가 JSON으로 도착하므로 `\uXXXX` 는 파일에 닿기 전에 그 코드포인트로 파싱되지만, 8진 `\0` 형태는 유효한 JSON 이스케이프가 아니라서 텍스트로 살아남는다 — 같은 파일의 한쪽만 오염된 이유다. 한 세션에 **세 번** 당했고, 세 번째는 Bash 도구가 제어문자가 든 명령을 거부해서 겨우 드러났다 | 그런 시퀀스를 문자 그대로 두려면 백슬래시를 겹치거나 `String.fromCharCode(92) + "u0000"` 으로 만든다. 이스케이프가 든 파일을 쓴 뒤에는 NUL을 센다: `node -e "const d=require('fs').readFileSync(F); console.log(d.filter(b=>b===0).length)"`. 파일이 실제로 읽혔음을 증명하지 않은 채 리포 전체 grep의 결과로 "없다"를 결론짓지 마라 |
| 29 | 부정 단언은 검사기가 동작해도, 픽스처가 애초에 후보가 아니어도 똑같이 초록이다 | `expect(x).not.toContain(y)` 는 「면제가 동작한다」와 「이 픽스처는 후보였던 적이 없다」를 구분하지 못한다. 실측: 픽스처가 `graph.nodes[0]` (오늘의 정렬 순서 덕분에 우연히 artifact인 것)이던 자체 검사가, 첫 노드를 다른 타입으로 바꾸는 뮤테이션 아래에서도 **초록**을 유지했다. 반면 양성 형제 단언은 빨강이 됐다. 스위트는 한 번도 실행한 적 없는 면제 경로를 완전히 커버했다고 보고한다 | 모든 부정 단언에 **차등 대조군**을 짝지운다: 면제 조건을 적용하기 **전에** 그것이 잡히는지 단언하고, 적용한 뒤에 잡히지 않는지 단언한다. 픽스처는 인덱스가 아니라 술어로 고른다 (`filter(n => n.type === "artifact")[0]`) |
| 30 | 살아남은 뮤턴트는 테스트가 약한 게 아니라 뮤테이션이 아무것도 안 했다는 뜻일 수 있다 | "생존"은 서로 다른 두 상태를 덮는다: 테스트가 닿지 못하는 분기, 그리고 어떤 출력도 바꿀 **수 없는** 변경. 여기서 두 번 측정됐다. `CLUSTER_R_MAX 14 -> 30` 은 계산된 클러스터 반경(12.90)이 상한에 닿은 적이 없어서 생존했다 — 그 상수는 무력했다. `lib/atlas/layout.ts` 의 `clamp` 는 오늘 순수 항등(`v => v`)으로 생존한다: `npx vitest run tests/atlas` 는 여전히 통과를 보고하는데, `clusterCap` 의 viewBox 항이 이미 모든 좌표를 범위 안에 붙들고 있기 때문이다. 첫 경우는 "이 테스트가 약하다"로 읽혀서 멀쩡한 테스트를 다시 쓰게 만든다 | "생존"을 믿기 전에 그 뮤턴트가 **출력을 바꾸는지** 증명한다 — 양쪽 버전의 값을 찍어 본다. 한계처럼 읽히는 상수가 아니라 실제로 **구속하는** 상수를 바꾼다. 정말 무력한 분기를 남겨 두는 것은 괜찮지만 주석으로 말한다: "여기서 항등은 빨강이 되지 않으며, 그 이유는" |
| 31 | `getByRole` 개수는 Playwright 자신의 role 계산이지 브라우저의 접근성 트리가 아니다 | Playwright는 `node_modules/playwright-core/lib/coreBundle.js` 안에 태그→role 표(`inputTypeToRole`)를 갖고 있다 — `injectedScript` 가 들어 있는 바로 그 번들(참조 50회) — 그래서 role은 주입된 JS에서 DOM으로부터 유도된다. 따라서 `getByRole` 개수와 실제 브라우저 측정(탭 순서, 포커스 이동)이 **한 번의 도구 호출에서 똑같이 권위 있어 보이는데**, 엔진 자신의 답인 것은 두 번째뿐이다. 실제 사례: 여기 코드 주석이 `getByRole("button")` 5 대 2 결과에 "Chromium 실측"이라고 적었고, 리뷰어가 둘을 갈라내야 했다 | 각 수치 뒤의 엔진을 밝힌다. `getByRole` 은 스크린 리더가 노출하는 것의 강력한 근사이지만 플랫폼 a11y 트리는 아니다 — 그 위에 실측이라고 쓰지 마라. 27번과 같은 부류다: 로케이터가 무엇을 측정했는지를 결정한다 |

## 아키텍처

GitHub Pages에 정적 배포되는 한국어 단일 페이지 포트폴리오 (허우용 / Ted).

| 항목 | 내용 |
| --- | --- |
| 프레임워크 | Next.js 14 **Pages Router** (`pages/_app.tsx`, `pages/index.tsx`). App Router가 아니다. `app/` 관례를 도입하지 마라 |
| 정적 내보내기 | `next.config.js` 가 `output: "export"`, `trailingSlash: true`, `images.unoptimized: true`. Node 런타임이 필요한 것(API 라우트, ISR, `next/image` 로더, 서버 액션)은 빌드를 깨뜨린다 — 전부 클라이언트에서 렌더 가능해야 한다 |
| 콘텐츠 | 사이트 거의 전부가 `pages/index.tsx`(~760줄)에 있다. 섹션(about / experience / projects / systems / skills / contact)은 라우트 분리 없이 그 한 파일 안에서 앵커로 연결된다 |
| UI 프리미티브 | `components/ui/` 아래 shadcn/ui ("new-york" 스타일, neutral 베이스) — `badge`, `button`, `card`, `dialog`. 새 shadcn 컴포넌트도 같은 디렉터리에 넣는다. `components.json` 은 이미 설정돼 있다 (`@/components`, `@/lib/utils`, CSS 변수 on, RSC off) |
| 스타일 | Tailwind CSS + `tailwind.config.js` 의 커스텀 `primary` 팔레트, 본문 글꼴 Inter. 전역 CSS는 `styles/globals.css`. 조건부 클래스 조합은 `lib/utils.ts` 의 `cn()`(clsx + tailwind-merge) |
| 경로 별칭 | `@/*` → 리포 루트 (`tsconfig.json`). 상대 경로보다 `@/components/...`, `@/lib/utils` 를 쓴다 |
| 정적 자산 | `public/` 아래 (프로필 이미지 `public/images/Ted_yanadoo.png`, 파비콘 `public/favicon.svg`) |

## 배포

`.github/workflows/deploy.yml` 이 `main` 으로의 모든 푸시에서 돈다.
프리뷰 환경은 없다 — **`main` 이 곧 프로덕션이다.** `main` 에 함부로 푸시하지 말고 로컬에서 빌드를 먼저 확인한다.

CI는 빌드만 하는 것이 아니다. `deploy` 앞에 다음이 순서대로 서 있다.

| 순서 | 단계 |
| --- | --- |
| 1 | `npm ci` |
| 2 | `npm run lint` |
| 3 | `npx tsc --noEmit` |
| 4 | `npm run check-forbidden:verify` |
| 5 | `npx vitest run --reporter=verbose` (전체 범위) |
| 6 | `npm run check-forbidden` |
| 7 | `npm run check-counts:verify` |
| 8 | `npm run check-counts` |
| 9 | `npm run build` (끝에 `npx pagefind --site out` 포함) |
| 10 | `npm run check-pagefind:verify` |
| 11 | `npm run check-pagefind` |
| 12 | `npm run check-forbidden:built` |
| 13 | `./out` 을 Pages 아티팩트로 업로드 → `actions/deploy-pages` |

`npm run check-baseline` 은 워크플로에 주석 처리돼 있다. 로컬에서는 그대로 유효하다: `npm run build && npm run check-baseline`.

`deploy` 는 `needs: build` 뒤에 있으므로 위 12단계 중 **하나라도 실패하면 배포가 일어나지 않는다.**
