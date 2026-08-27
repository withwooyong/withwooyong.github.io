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
| 이 파일 | 도구 함정의 **증상과 대응**, 그리고 빌드가 강제하지 **않는** 코드 제약 |
| [`docs/TOOL-TRAPS.md`](docs/TOOL-TRAPS.md) | 그 함정들의 **재현 절차·실측 수치·당시 경위.** 규칙을 의심할 때 여는 문서 |
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

아래 표는 **「무엇처럼 보이나 → 어떻게 하나」만** 담는다.
재현 절차·실측 수치·당시 경위는 [`docs/TOOL-TRAPS.md`](docs/TOOL-TRAPS.md) 에 있다 — 번호를 누르면 그 항목으로 간다.

31건이 전부 같은 모양이다: **「없다」와 「읽을 수 없었다」가 같은 출력으로 나온다.**
그래서 대응도 하나로 모인다 — **확실히 존재하는 대조군을 먼저 측정하라.**

| # | 무엇처럼 보이나 | 대응 |
| --- | --- | --- |
| [1](docs/TOOL-TRAPS.md#t1) | 파이프를 거친 명령이 항상 성공으로 보인다 — `$?` 는 마지막 명령의 것이다 | 종료 코드를 읽을 명령은 파이프 없이 단독 실행 |
| [2](docs/TOOL-TRAPS.md#t2) | 한글 1인칭 grep이 오탐과 누락을 동시에 낸다 (「메이**저는**」 · 「**내** 검색 커리어」) | 매칭된 줄을 열어 읽는다. **1인칭은 검사기에 넣지 마라** |
| [3](docs/TOOL-TRAPS.md#t3) | `습니다$` 가 0건 — 한글 종결어미는 마침표 앞이라 줄 끝에 오지 않는다 | 앵커 말고 **부분 문자열**로, 줄이 아니라 출현 횟수를 센다 |
| [4](docs/TOOL-TRAPS.md#t4) | `**IDOL**을` 이 `IDOL을` 에 안 걸린다 — 조사가 강조 바깥에 붙는다 | 강조를 벗긴 패턴도 같이 검색 |
| [5](docs/TOOL-TRAPS.md#t5) | 이모지 grep이 0건 — `LC_ALL=C` 가 없거나 `-P` 가 `range out of order` 로 죽었다 | `LC_ALL=C` 고정 + UTF-8 바이트 패턴. `\|\| echo "0건"` 금지 — 「파일 없음」과 같은 문자열이 된다 |
| [6](docs/TOOL-TRAPS.md#t6) | `grep -o '비용'` 이 「대**비용**(對比用)」도 센다 | 히트한 줄을 열어 의도한 단어인지 확인 |
| [7](docs/TOOL-TRAPS.md#t7) | `dup-scan` 이 0건 — 같은 뜻 다른 표현은 보지 못한다 | 문자열뿐 아니라 뜻으로도 정의를 대조 |
| [8](docs/TOOL-TRAPS.md#t8) | 히어독 안의 정규식이 `SyntaxError` — `\\` 가 `\` 로 도착한다 | `Write`/`Edit` 로 파일에 쓰거나 `String.fromCharCode(92)` 로 문자를 만든다 |
| [9](docs/TOOL-TRAPS.md#t9) | CR이 393개인 파일이 "LF 전용"으로 보고된다 | `tr -cd '\r' \| wc -c` 로 바이트를 센다 |
| [10](docs/TOOL-TRAPS.md#t10) | 통째로 다시 쓴 파일인데 `git diff` 가 깨끗하다 | 깨끗한 diff는 증거가 아니다. 대조 파일을 두고 CR/LF를 직접 센다 |
| [11](docs/TOOL-TRAPS.md#t11) | 서브에이전트가 통지만 보내고 보고서가 없다 | 메시지가 아니라 파일로 판단 — `ls -la <스크래치패드>` 후 `SendMessage` 로 **원래 질문을 그대로** 재전송 |
| [12](docs/TOOL-TRAPS.md#t12) | `grep -r` 이 120초 타임아웃 | `Grep` 도구를 쓰거나 `--include` / 명시적 경로 |
| [13](docs/TOOL-TRAPS.md#t13) | 아무도 import하지 않은 파일 이름을 가리키며 빌드가 죽는다 | 주석에 대괄호 임의값 클래스를 넣지 마라 — Tailwind는 주석도 훑는다 |
| [14](docs/TOOL-TRAPS.md#t14) | `sed -i` 뒤 `git diff` 는 깨끗한데 CR이 전부 사라져 있다 | CRLF 파일에 `sed -i` 금지. `Edit` 이나 Node로. 검증은 CR 바이트 수로 — `git diff`·`cat -A` 는 못 본다 |
| [15](docs/TOOL-TRAPS.md#t15) | 빌드된 CSS에서 variant 클래스 grep이 0 + 종료 코드 1 | `-F` 와 홑 백슬래시로 grep. 존재가 확실한 클래스를 대조군으로 먼저 |
| [16](docs/TOOL-TRAPS.md#t16) | `Write` 로 전체 교체한 CRLF 파일의 CR이 0이 된다 | 먼저 CR을 센다. LF면 `Write` 무방, CRLF면 `Edit`/Node. 쓴 뒤 다시 센다 |
| [17](docs/TOOL-TRAPS.md#t17) | 산출물에서 지운 head 태그인데 E2E가 초록이다 | **원본 응답**에 단언(`page.request.get`). DOM은 별개의 두 번째 측정. 헬퍼는 `e2e/raw-html.ts` |
| [18](docs/TOOL-TRAPS.md#t18) | `#__next` 에 넣은 탐침이 0건 — 검사기가 고장난 것처럼 보인다 | React 영역 밖을 건드린다 — `<body>` 속성이나 `<head>` 노드 |
| [19](docs/TOOL-TRAPS.md#t19) | Playwright가 0인데 통과가 아니고, 1인데 실패가 아니다 | `$?` 말고 요약 줄을 읽는다. `retries: 0` 유지. 게이트 상태를 `describe` 제목에 |
| [20](docs/TOOL-TRAPS.md#t20) | 필터를 건 실행이 전부 skip인데 0으로 끝난다 | 필터 실행의 초록은 통과가 아니다. **전체** 실행으로 판단하고 skip 수를 읽는다 |
| [21](docs/TOOL-TRAPS.md#t21) | `npm ci --dry-run` 뒤 모든 도구가 "설치되지 않았다"고 한다 | 드라이런이 실제로 지운다(590 → 0). `package-lock.json` 을 읽어라. 이미 돌렸다면 `npm ci` 로 복구 |
| [22](docs/TOOL-TRAPS.md#t22) | `out/` grep이 0건 — Pagefind 조각이 gzip이다 | `gzip -dc` 로 펼친 뒤 스캔. 대조 문자열을 먼저. `pagefind_dcd` 접두 때문에 첫 `{` 부터 자른다 |
| [23](docs/TOOL-TRAPS.md#t23) | `declare module` 을 넣고 `--listFiles` 로 확인까지 했는데 TS2307이 남는다 | `/` 접두는 모듈명이 아니라 루트 경로다. `new Function('return import("/path.js")')()` |
| [24](docs/TOOL-TRAPS.md#t24) | 뮤턴트가 전부 "생존"으로 채점된다 | 파싱 전에 실행이 시작됐는지(`Test Files`) 확인. **대조 뮤턴트** 필수. `--reporter=verbose` |
| [25](docs/TOOL-TRAPS.md#t25) | 테스트가 찍은 줄이 파이프 뒤에서 0건 | 파일로 리다이렉트 + `--reporter=verbose` 로 돌린 뒤 그 파일을 grep |
| [26](docs/TOOL-TRAPS.md#t26) | 펜스 제거를 일관되게 적용했더니 앵커가 깨진다 | 링크를 **뽑는** 곳에서만 전처리. 헤딩 **색인** 쪽엔 금지 — 이 변환은 대칭이 아니다 |
| [27](docs/TOOL-TRAPS.md#t27) | "다이얼로그 하나" 단언이 로케이터에 따라 통과·실패가 갈린다 | 개수는 `getByRole` 로 단언. 속성 셀렉터는 `hidden` 인 것도 센다 |
| [28](docs/TOOL-TRAPS.md#t28) | 리포 전체 grep에서 특정 파일만 아무 표시 없이 빠진다 | 생 NUL이 있으면 ripgrep이 파일을 통째로 건너뛴다. NUL을 센 뒤 판단 |
| [29](docs/TOOL-TRAPS.md#t29) | 부정 단언이 초록인데 그 경로를 한 번도 타지 않았다 | **차등 대조군** — 면제 전에 잡히는지, 후에 안 잡히는지 둘 다. 픽스처는 인덱스가 아니라 술어로 |
| [30](docs/TOOL-TRAPS.md#t30) | 뮤턴트가 살아남아 테스트가 약한 것처럼 보인다 | 출력이 실제로 바뀌는지 먼저 증명. 한계처럼 읽히는 상수가 아니라 **구속하는** 상수를 바꾼다 |
| [31](docs/TOOL-TRAPS.md#t31) | `getByRole` 개수를 브라우저 실측인 것처럼 적게 된다 | Playwright 자신의 role 계산이다. 수치마다 그 뒤의 엔진을 밝혀라 |

**새 함정을 추가할 때** — 이 표에 한 행, `docs/TOOL-TRAPS.md` 에 재현·실측.
그리고 **해소된 항목이 있는지 하나만 확인한다.** 이 표는 커밋 19번 동안 0 → 31로 자라며 한 번도 줄지 않았다.

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
