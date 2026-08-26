# 아틀라스 · 검색 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 글 156편에서 지식그래프(`/atlas`)와 전문 검색(`⌘K`)을 만든다. **메인 페이지와 `/blog`는 건드리지 않는다.**

**Architecture:** 빌드타임 파싱만으로 `graph.json`(노드 162 · 엣지 실측)을 만들고, 렌더러 추상화 뒤에 SVG·Canvas 두 구현을 둔다. 검색은 Pagefind가 `out/`의 HTML을 스캔해 정적 인덱스를 만들고, 브라우저는 검색어에 해당하는 조각만 `fetch`한다. **LLM 런타임 호출이 없다.**

**Tech Stack:** Next.js 14 Pages Router · 정적 export · zod · Pagefind · d3-force(Canvas) · Playwright

**Spec:** [`docs/superpowers/specs/2026-08-25-redesign-and-atlas.md`](../specs/2026-08-25-redesign-and-atlas.md) — §7 아틀라스 · §8 검색 · §11 품질 게이트

**선행 계획서:** [`2026-08-25-redesign-phase-1-2.md`](./2026-08-25-redesign-phase-1-2.md) — 단계 1(T1~T8)이 완료돼 이 계획서의 전제다. **단계 2(T9~T13)는 이 계획서로 대체되지 않고 뒤로 미뤄졌다.** §「이월된 것」 참조.

---

## Global Constraints

스펙과 리포 규칙에서 그대로 옮긴 것이다. **모든 태스크의 요구사항에 이 절이 암묵적으로 포함된다.**

| # | 제약 | 정확한 값 |
| --- | --- | --- |
| GC-1 | App Router 금지 | `app/` 디렉터리 규약을 도입하지 않는다. Pages Router만 |
| GC-2 | 정적 export | `output: "export"`. API 라우트·ISR·서버 액션·`next/image` 로더 전부 빌드를 깨뜨린다 |
| GC-3 | 경로 별칭 | 상대경로 대신 `@/components/...`, `@/lib/...`. 상대경로도 빌드는 통과하므로 리뷰에서 잡아야 한다 |
| GC-4 | `tsconfig.json` 동결 · **`target: es5`** | `target`을 바꾸면 전체가 재방출되어 「기존 페이지 불변」이 깨진다. **es5라서 `for...of`로 이터레이터를 직접 돌면 TS2802가 난다** — `Map`·`Set`·`matchAll` 순회는 전부 `Array.from()`으로 배열화한 뒤 돈다. vitest는 esbuild로 타입을 벗겨 통과시키므로 **`npx tsc --noEmit`을 따로 돌려야 잡힌다** |
| GC-5 | 한글 본문 | 새 컴포넌트에 `break-keep`. `dark:` 변형은 **토큰으로 표현되지 않은 색에만** — 토큰(`text-n9`·`bg-n1`·`text-signal`)만 쓰면 `dark:`가 하나도 없는 것이 정답이다 |
| GC-6 | 커밋 | 메시지는 **한글**. `git push`는 사용자가 명시적으로 요청할 때만 |
| GC-7 | 모션 | 전 구간 `prefers-reduced-motion: reduce` 대응. 그래프는 reduce면 **목록 뷰**로 떨어진다(§7.7) |
| GC-8 | `lang="ko"` | `pages/_document.tsx`의 `<Html lang="ko">`를 **바꾸지 않는다.** Pagefind의 한글 세그멘테이션이 이 값을 보고 켜진다 — **이 값이 `en`이었다면 검색 설계 전체가 성립하지 않는다**(스펙 §8.2) |
| GC-9 | 액센트 면적 | 액센트는 첫 화면 픽셀의 **5% 이하**. 그래프 노드를 전부 액센트로 칠하지 않는다 — 선택·강조된 소수에만 |
| GC-10 | 두 번째 액센트 금지 | 액센트 색은 `--signal` **하나뿐이다.** 노드 타입 구분은 명도(`--n5`~`--n9`)와 크기로 한다 |
| **GC-11** | **메인 페이지 불변** | **`pages/index.tsx`를 수정하지 않는다.** 현재 히어로(`hero-hello` 손글씨)와 앵커 섹션을 그대로 둔다. `check-baseline`의 `index.html` 해시가 이 계획서 중에 **더 바뀌면 안 된다** |
| **GC-12** | **`/blog` 불변** | `pages/blog/**`와 `content/blog/**`를 수정하지 않는다. 아틀라스는 글 데이터를 **읽기만** 한다 |

### GC-11·GC-12를 검증하는 방법

「안 건드렸다」는 주장은 검증되지 않으면 무의미하다. 각 태스크의 커밋 전에 확인한다.

```bash
git diff --name-only HEAD | grep -E '^(pages/index\.tsx|pages/blog/|content/blog/)' && echo "GC-11/12 위반" || echo "OK"
```

⚠️ `grep`이 아무것도 못 찾으면 종료코드 1이라 `&&`가 건너뛰고 `||`가 실행된다 — 위 한 줄은 그 성질을 이용한 것이다. **파이프 뒤의 `$?`를 읽지 마라**(리포 트랩표 참조).

---

## 결정 사항 — 스펙과 다른 점

계획 단계에서 사용자와 확정한 것이다. **스펙 본문과 갈라진 채로 두지 않는다** — T16에서 스펙에 역반영한다.

| # | 항목 | 스펙 | 이 계획서 | 근거 |
| --- | --- | --- | --- | --- |
| D-1 | 단계 순서 | 2(메인·히어로) → 3(검색) → 4(아틀라스) | **3 → 4를 먼저.** 2는 이월 | 사용자가 현재 히어로를 유지하기로 함. 아래 §「이월된 것」 |
| D-2 | 태그 노드화 | §7.3이 「결정 사항」으로 미룸(§15 미확정) | **사이드바 필터로만. 그래프 노드로 넣지 않는다** | 최대 허브 `ai-agent`가 **44편**을 잇고 2·3위가 35·32다. 힘 기반 레이아웃에서 이 셋이 화면을 지배해 「글끼리의 관계」가 아니라 「태그 성게」가 보인다 |
| D-3 | 노드 상세 | `/atlas/[id]` | **그대로. 정적 생성한다** | 스펙 §4의 「노드 ↔ 글 양방향 연결」이 URL 없이는 성립하지 않는다 |
| D-4 | 검색 우선 | — | **검색을 아틀라스보다 먼저** | 한글 쿼리 10종이 **관문**이다(§8.5). 실패하면 G4를 다시 설계해야 하므로 야상을 먼저 건넌다 |

### D-2가 바꾸는 수치

| 항목 | 스펙(태그 포함) | 이 계획서(태그 제외) |
| --- | ---: | ---: |
| `artifact` 노드 (글) | 156 | 156 |
| `concept` 노드 (카테고리) | 6 | 6 |
| `concept` 노드 (태그) | 64 | **0** |
| **노드 합계** | 226 | **162** |
| `instantiates` 엣지 (태그) | 618 | **0** |
| `instantiates` 엣지 (카테고리) | 156 | 156 |
| `extends` 엣지 (본문 링크) | 추정 미상 | **798** (T2 실측 · 고유쌍) |
| `sequence` 엣지 (series) | 미상 | **99** (T2 실측 · series 37개) |
| **엣지 합계** | 「1,000 안팎」 | **1,053** |

**T2 실측 (2026-08-26).** `tests/atlas/count-edges.test.ts`로 셌고 그 파일은 T2에서 지웠다.

| 항목 | 값 | 읽는 법 |
| --- | ---: | --- |
| `extends` raw | 1,480 | 중복 포함 링크 총수 |
| `extends` 고유쌍 | **798** | 그래프에 그려지는 것 |
| `extends` 대상 없음 | **0** | 죽은 링크가 없다 — 링크 무결성 검사가 실제로 일하고 있다는 독립 확인 |
| `extends` 자기 참조 | 0 | — |
| `extends` 상호 링크 쌍 | **179** | `a→b`와 `b→a`가 둘 다 있는 쌍. 무방향으로 그리면 선이 179개 줄어든다 |
| `sequence` | 99 | series 37개 |
| 엣지 합계 | **1,053** | 방향 유지 |
| 엣지 합계 (무방향) | **874** | 화면에 실제로 보이는 선의 수 |

⚠️ **스펙의 「엣지 1,000 안팎」은 우연히 맞았다.** 사전 조사의 「`](/blog/` 기준 1,100건」은 `grep -c`로 센 값이라 **링크 수가 아니라 줄 수**다 — 한 줄에 링크가 둘이면 1로 센다. 실제 raw는 1,480이고, 고유쌍으로 줄이면 798이다. 두 오차가 반대 방향으로 상쇄돼 합계가 추정치 근처에 떨어졌을 뿐이다.

⚠️ **렌더러 판정이 갈라진다.** 1,053은 §7.5의 「Dot ≤300 · Canvas ≤2,000」에서 **Canvas 구간**이다. 그런데 Canvas는 §「후속 계획서로 넘긴 것」으로 빠져 있어, 이 계획서의 T10은 **SVG 하나로 엣지 1,053개(무방향 874개)를 그려야 한다.** T10에서 다음 중 하나를 정해야 한다 — ① 무방향으로 그려 874로 줄인다 ② 초기 뷰에서 엣지를 간선 가중치 상위 N개로 자른다 ③ Canvas를 이 계획서로 되가져온다.

---

## 이월된 것 — 선행 계획서의 단계 2

**삭제가 아니라 보류다.** 선행 계획서 `2026-08-25-redesign-phase-1-2.md`의 T9~T13은 그대로 남아 있고, 이 작업이 끝난 뒤 다시 꺼낸다.

| 태스크 | 내용 | 상태 |
| --- | --- | --- |
| T9 | 히어로 B — 아틀라스 점등 | **이월.** 아래 리뷰 4건을 먼저 해결해야 한다 |
| T10 | 메인 5섹션 — `pages/index.tsx` 재작성 | 이월 (GC-11이 이걸 막는다) |
| T11 | `/work` 통합 | 이월 |
| T12 | `/about` 신규 | 이월 |
| T13 | `product-lead*` 스텁화 | 이월 |

### T9가 이월된 이유 — 실측 4건

2026-08-26에 T9를 구현하고 위험 축별로 리뷰한 결과, **4건 모두 구현이 아니라 계획 자체의 결함**이었다. 히어로를 다시 만들 때 이 수치들이 출발점이다.

| # | 발견 | 실측 |
| --- | --- | --- |
| 1 | **GC-9 위반** — 점등 완료 시 액센트가 보이는 화면의 **15.68%**(상한의 3.1배). p≈0.20에서 이미 5%를 넘는다 | 원-사각형 교집합 격자 적분, `preserveAspectRatio="slice"` 크롭 반영. mobile 393×851 / desktop 1280×720 양쪽 |
| 2 | **LCP가 서드파티에 묶임** — 히어로 한글을 그리는 Pretendard가 jsdelivr에서 **10건 / 216KB 렌더 블로킹**. 계획서의 게이트는 three.js(600KB)를 막고 있었는데 **위험 축이 어긋나 있었다** | 네트워크 실측 |
| 3 | **reduce에서 h1이 선행사를 잃음** — `p=1` 고정이라 페이지의 유일한 h1이 「그 판단은 글 156편으로…」가 되고, 문구 ①②는 `aria-hidden`이라 접근성 트리에도 없다 | ariaSnapshot 실측 |
| 4 | **정적 구간 66.7vh** — 노드 점등이 `p=0.6167`, 엣지가 `0.6548`, 문구 ③ 경계가 `0.6667`에 끝나 **p의 33.3%가 완전 정적**이다. 그리고 `0.6667`은 코드 어디에도 상수로 없다 — `stagger`의 `0.6`·`NODES.length`·`LINES.length`가 우연히 만든 값이라 노드를 하나 늘리면 조용히 바뀐다 | 계산 |

**GC-9가 이 구조에서 정의되지 않는다는 것이 1번의 핵심이다.** 히어로가 `sticky top-0 h-screen`이라 `p=0`부터 `1`까지 **첫 화면을 떠나지 않는다.** `p=0`만 재면 0%, 사용자가 보는 시간으로 재면 15.7%다. 히어로를 다시 설계할 때 **GC-9의 「첫 화면」을 먼저 다시 정의해야 한다.**

부수 발견 2건도 함께 남긴다.

- **Playwright의 `getByRole(role, { name })`은 기본이 부분 문자열 매칭이다.** `exact: true` 없이는 `aria-hidden`을 통째로 지워도 검사가 초록이다(대조군 실측 확인).
- **`opacity-0`은 텍스트 선택·`Ctrl+F`에서 빠지지 않는다.** h1 전체를 드래그하면 84자, 세 문장이 전부 딸려 나온다. 숨기려면 `visibility: hidden`이 함께 필요하다.

---

## File Structure

| 파일 | 책임 | 태스크 |
| --- | --- | --- |
| `components/site-header.tsx` | **수정** — 미완성 라우트 링크 제거 | T1 |
| `e2e/smoke.spec.ts` · `e2e/shell.spec.ts` | **수정** — 사라진 라우트 검사 정리 | T1 |
| `lib/atlas/links.ts` | 본문 내부 링크 추출 — `links.test.ts`에서 승격 | T2 |
| `tests/blog/content/links.test.ts` | **수정** — 승격된 함수를 호출하도록 | T2 |
| `scripts/count-edges.mjs` | 엣지 수 실측 (1회용 계측기, 커밋한다) | T2 |
| `package.json` | **수정** — `pagefind`·`build:atlas`·`check-atlas` 스크립트 | T3·T7·T9 |
| `lib/search/pagefind-loader.ts` | Pagefind 런타임 동적 로드 + 타입 | T5 |
| `components/search/command-palette.tsx` | `⌘K` 팔레트 UI | T5 |
| `components/search/search-button.tsx` | 헤더 우측 검색 버튼 | T5 |
| `e2e/search.spec.ts` | 검색 E2E (게이트 + 센티넬) | T6 |
| `lib/atlas/types.ts` | 노드·엣지 타입 + zod 스키마 | T7 |
| `lib/atlas/build.ts` | MDX → 노드·엣지 매핑 (순수 함수) | T8 |
| `scripts/build-atlas.mjs` | `graph.json` 생성 CLI | T8 |
| `tests/atlas/build.test.ts` | 매핑 단위 테스트 | T8 |
| `scripts/check-atlas.mjs` | 스키마 검증 게이트 + `--self-test` | T9 |
| `components/atlas/graph-view.tsx` | 렌더러 추상화 — 레이아웃·상태·상호작용 | T10 |
| `components/atlas/dot-renderer.tsx` | SVG 렌더러 (≤300 노드 · reduce · 저사양) | T10 |
| `components/atlas/list-view.tsx` | 목록 뷰 (reduce 기본값) | T10 |
| `components/atlas/canvas-renderer.tsx` | Canvas 2D 렌더러 (데스크톱 기본) | T11 |
| `lib/atlas/use-renderer-choice.ts` | 렌더러 자동 선택 + 수동 토글 저장 | T11 |
| `components/atlas/lens-picker.tsx` | 렌즈 3종 | T12 |
| `components/atlas/topic-sidebar.tsx` | 좌측 토픽·태그 필터 (D-2) | T12 |
| `components/atlas/node-panel.tsx` | 노드 상세 패널 | T12 |
| `pages/atlas/index.tsx` | 아틀라스 페이지 — 3분할 | T13 |
| `pages/atlas/[id].tsx` | 노드 상세 162개 정적 생성 | T14 |
| `scripts/check-baseline.mjs` | **수정** — `atlas/` 제외 규칙 | T14 |
| `scripts/generate-sitemap.mjs` | **수정** — 노드 상세 정책 | T14 |
| `e2e/atlas.spec.ts` | 아틀라스 E2E | T15 |

---

## 실행 순서와 그 이유

```mermaid
flowchart TD
    T1["T1 정리<br/>죽은 링크 제거"] --> T2["T2 링크 추출 승격<br/>+ 엣지 실측"]
    T1 --> T3["T3 Pagefind 파이프라인"]
    T3 --> T4["T4 한글 쿼리 10종<br/>⚠️ 관문"]
    T4 -->|통과| T5["T5 ⌘K 팔레트"]
    T4 -->|실패| X["G4 재설계<br/>스펙 §8.5"]
    T5 --> T6["T6 검색 E2E"]
    T2 --> T7["T7 스키마 zod"]
    T7 --> T8["T8 graph.json 생성"]
    T8 --> T9["T9 검증 게이트"]
    T9 --> T10["T10 GraphView + Dot"]
    T10 --> T11["T11 Canvas + 자동선택"]
    T11 --> T12["T12 렌즈 · 사이드바 · 패널"]
    T12 --> T13["T13 /atlas 조립<br/>셸 부착"]
    T13 --> T14["T14 /atlas/[id]<br/>게이트 조정"]
    T14 --> T15["T15 아틀라스 E2E<br/>+ 검색에 노드 섹션"]
    T6 --> T15
    T15 --> T16["T16 헤더 노출<br/>스펙 역반영 · baseline"]
```

| 순서 결정 | 이유 |
| --- | --- |
| **T1이 맨 앞** | 지금 헤더가 `/work`·`/about`으로 가는 **죽은 링크 2개**를 렌더한다. 그 상태로 새 화면을 붙이면 어디까지가 의도된 빨강인지 알 수 없다 |
| **T4가 분기점** | 한글 분절 품질은 156편으로 **실제 인덱스를 만들어 봐야만 안다**(§8.5). 여기서 실패하면 UI를 만들기 전에 설계를 바꿔야 한다 — UI를 먼저 만들면 그 작업이 통째로 버려진다 |
| **T2가 T7보다 앞** | 엣지 실측치가 없으면 렌더러 임계(Dot ≤300 · Canvas ≤2,000)를 정할 수 없다. 스키마를 짜기 전에 규모를 안다 |
| **T10에 Dot이 먼저** | Dot은 추가 번들이 ~0이고 reduce·저사양의 **fallback**이다. fallback을 먼저 만들면 그 뒤 어떤 렌더러가 실패해도 화면이 빈다는 일이 없다 |
| **T14에 게이트 조정** | `/atlas/[id]` 162개가 생기는 **바로 그 태스크**에서 `check-baseline`과 sitemap을 함께 고친다. 나중으로 미루면 그 사이의 모든 커밋이 게이트 실패 상태가 된다 |

---

## 이 환경의 함정 — 실행자가 반드시 읽을 것

리포 `CLAUDE.md`의 트랩표에서 **이 계획서에 실제로 걸리는 것만** 추렸다. 전부 이 리포에서 실제로 당한 것이다.

| 함정 | 무슨 일이 일어나나 | 대응 |
| --- | --- | --- |
| **파이프 뒤의 종료코드** | `$?`는 **마지막** 명령의 것이라 `cmd \| head`는 항상 0이다 | 종료코드를 읽을 명령은 **단독으로** 실행한다 |
| **`target: es5` + 이터레이터** | `for (const x of map)` / `matchAll()` 직접 순회가 **TS2802**. vitest는 esbuild로 타입을 벗겨 통과시키므로 테스트가 초록인 채 `tsc`만 빨갛다 | `Array.from()`으로 배열화. **`npx tsc --noEmit`을 별도 단계로 돌린다** |
| **`Write` 도구가 CRLF를 날린다** | 전체 교체 시 CR이 전부 사라진다. `core.autocrlf=true`가 정규화해서 **`git diff`로는 안 보인다** | 기존 파일 수정은 `Edit`. 먼저 `tr -cd '\r' < f \| wc -c`로 세고, 뒤에도 세서 비교 |
| **`sed -i`가 CR을 전부 지운다** | 위와 같은 결과. Git Bash의 `sed`는 LF로 다시 쓴다 | CRLF 파일에 `sed -i` 금지 |
| **Playwright 종료코드가 양방향으로 거짓말** | `-g`로 매칭 0건이면 `No tests found`인데 **exit 1**. 반대로 `retries`가 있으면 재시도 통과가 `flaky`로 집계되고 **exit 0** | **요약 줄**(`N passed / N failed / N skipped`)을 읽는다. `retries: 0` 유지 |
| **`getByRole(role, { name })`이 부분 문자열** | 접근명이 길어져도 초록이라 `aria-hidden` 회귀를 못 잡는다 | 새로 쓰는 검사는 **`exact: true`**를 붙인다 |
| **`next/head`가 하이드레이션에서 head를 되살린다** | 산출물에서 태그를 지워도 DOM 검사는 초록 | `page.request.get()`으로 **원본 응답**을 검사한다. `e2e/raw-html.ts`에 헬퍼가 있다 |
| **React가 `#__next` 안의 손 주입 마크업을 버린다** | 산출물에 프로브를 넣어 셀렉터를 시험하면 0건이 나온다 | `<body>` 속성이나 `<head>` 노드로 시험한다 |
| **`grep -r`이 `out/`·`node_modules`를 훑는다** | 120초 타임아웃 | 경로를 명시하거나 `--include` |
| **Tailwind가 주석 안의 클래스도 추출한다** | 주석에 쓴 `bg-[url('./${logo}')]`가 실제 CSS로 나가 PostCSS가 없는 모듈을 찾다 빌드가 죽는다 | **대괄호 임의값 클래스를 주석에 쓰지 마라** |
| **Tailwind variant 클래스에 리터럴 백슬래시** | 빌드된 CSS의 선택자가 `.focus-visible\:ring-signal`이다. 잘못 이스케이프하면 0건 + exit 1이 나와 「방출 안 됨」처럼 읽힌다 | `grep -F`에 백슬래시 하나로. **아는 클래스로 대조군을 먼저 확인** |

---

## Task 1: 죽은 링크를 없앤다

**Files:**
- Modify: `components/site-header.tsx:19-23` (`NAV` 배열)
- Modify: `e2e/smoke.spec.ts:113-152` (라우트 검사)
- Modify: `e2e/shell.spec.ts:24` (`SHELL_PATHS`)

**Interfaces:**
- Consumes: 선행 계획서 T7의 `SiteHeader`
- Produces: 없음. 상태 정합 태스크다

**왜 지금인가:** 헤더가 `/work/`·`/about/` 링크를 렌더하는데 두 라우트가 없다. 스펙 §4가 못박은 규칙 — *「미완성 라우트는 링크를 렌더하지 않는다. 비활성 표시도 하지 않는다 — 죽은 링크가 있는 사이트로 읽힌다」* — 을 지금 상태가 위반하고 있다. E2E 8건이 그 때문에 빨갛고, **그 빨강이 앞으로 만들 화면의 빨강과 섞이면 아무 정보도 주지 않는다.**

- [ ] **Step 1: 현재 빨강의 개수를 먼저 센다**

고치기 전에 세어 둬야 고친 뒤와 비교할 수 있다.

```bash
npm run build
npm run e2e
```

Expected: 요약 줄에 **14 failed**. 내역은 `smoke.spec.ts` 8건 + `shell.spec.ts` 4건 + (히어로 스펙은 삭제됐으므로 0건). 정확한 숫자를 적어 둔다.

⚠️ `npm run e2e`는 **빌드된 `out/`**을 띄운다. `e2e/global-setup.ts`가 `out/`이 소스보다 오래되면 exit 1로 거부하므로 빌드를 먼저 돌린다.

- [ ] **Step 2: `NAV`에서 미완성 라우트를 뺀다**

`components/site-header.tsx:19-23`을 이렇게 바꾼다. **주석을 그대로 유지하고 `/work`·`/about` 줄만 지운다** — 주석이 이 배열의 규칙을 설명하고 있다.

```tsx
const NAV: NavItem[] = [
  { href: "/blog/", label: "Blog" },
];
```

주석에 이월 사실을 한 줄 덧붙인다.

```tsx
/**
 * 내비 항목.
 *
 * ⚠️ 미완성 라우트는 여기에 넣지 않는다. 비활성으로 두지도 않는다 —
 *    죽은 링크가 있는 사이트로 읽힌다(설계서 §4).
 *
 *    /atlas  → T16 에서 추가한다.
 *    ⌘K 검색 → T5 에서 우측에 추가한다.
 *    /work · /about → 선행 계획서 T11·T12 로 이월됐다. 그 태스크를 할 때 되살린다.
 */
```

⚠️ **`Edit` 도구로 수정하라.** 이 파일이 CRLF인지 먼저 확인한다.

```bash
tr -cd '\r' < components/site-header.tsx | wc -c
```

0이 아니면 CRLF다 — `Write`로 전체를 다시 쓰면 CR이 전부 사라지고 `git diff`에는 안 보인다.

- [ ] **Step 3: E2E의 사라진 라우트 검사를 정리한다**

`e2e/smoke.spec.ts`의 라우트 배열 두 곳에서 `/work/`·`/about/`을 뺀다.

```ts
// 200 응답 검사 (115행 부근)
for (const path of ["/", "/blog/", "/en/"]) {

// canonical 자기참조 검사 (138행 부근)
for (const path of ["/blog/"]) {
```

`e2e/shell.spec.ts:24`의 센티넬 경로를 아틀라스로 옮긴다.

```ts
/**
 * 게이트가 여는 경로 전부.
 *
 * ⚠️ `gotoWithShell` 에 새 경로를 넘길 때는 **반드시 여기에도 넣어라.**
 *    셸이 붙는 시점이 경로마다 다르므로 센티넬도 경로마다 있어야 한다.
 *
 *    2026-08-26: `/` 와 `/work/` 를 뺐다. 메인은 GC-11 로 건드리지 않고,
 *    `/work/` 는 선행 계획서 T11 로 이월됐다. 셸이 처음 붙는 곳은 `/atlas/` 이고 T13 이다.
 */
const SHELL_PATHS = ["/atlas/"];
```

- [ ] **Step 4: 링크가 실제로 사라졌는지 산출물에서 확인한다**

DOM이 아니라 **산출물**을 본다. 하이드레이션이 되살리는 종류의 거짓 초록을 피한다.

```bash
npm run build
grep -c 'href="/work/"' out/blog/index.html
```

Expected: **0**. 종료코드는 1이 된다(grep은 0건에 1을 낸다) — 그것이 정상이다.

대조군을 함께 본다. 「grep이 애초에 동작하는가」를 증명하지 않은 0은 믿을 수 없다.

```bash
grep -c 'href="/blog/"' out/blog/index.html
```

Expected: **1 이상**.

- [ ] **Step 5: 빨강이 줄었는지 센다**

```bash
npm run e2e
```

Expected: 요약 줄의 failed가 **14 → 6**으로 줄어든다.

| 남는 빨강 | 건수 | 왜 정상인가 |
| --- | ---: | --- |
| `shell.spec.ts` 셸 센티넬 `/atlas/` | 2 (desktop·mobile) | T13에서 켜진다 |
| `smoke.spec.ts` 셸 부착 센티넬 | 2 | 같음 |
| 그 외 | 2 | Step 1에서 적어 둔 내역과 대조해 **줄어든 8건이 `/work`·`/about` 것인지 확인**한다 |

숫자가 6이 아니면 **멈추고 내역을 비교하라.** 6보다 적으면 센티넬까지 지운 것이고, 많으면 다른 것을 깨뜨린 것이다.

- [ ] **Step 6: 커밋**

```bash
git add components/site-header.tsx e2e/smoke.spec.ts e2e/shell.spec.ts
git commit -m "fix(shell): 라우트가 없는 Work·About 링크를 헤더에서 뺀다

설계서 §4 — 미완성 라우트는 링크를 렌더하지 않는다. 비활성으로도 두지 않는다.
두 라우트는 선행 계획서 T11·T12 로 이월됐고 그때 되살린다.

E2E 의 사라진 라우트 검사도 함께 정리했다. 셸 센티넬은 /atlas/ 로 옮긴다 —
셸이 처음 붙는 곳이 거기이기 때문이다. 그때까지 빨간 것이 정상이다.

실패 14건 → 6건."
```

---

## Task 2: 링크 추출을 승격하고 엣지를 실측한다

**Files:**
- Create: `lib/atlas/links.ts`
- Modify: `tests/blog/content/links.test.ts:25-33` (`outboundKeys` 제거 후 import)
- Create: `scripts/count-edges.mjs`

**Interfaces:**
- Consumes: `lib/blog/loader.ts`의 `readPosts()`, `lib/blog/types.ts`의 `Post`
- Produces:
  - `outboundKeys(post: Post): string[]` — 본문에서 `<category>/<slug>` 형태의 키 배열
  - `postKey(post: Post): string` — `${categorySlug}/${slug}`
  - 실측 수치 (엣지 3종의 고유 쌍 개수)

**왜 이 순서인가:** 스펙 §7.4가 *「`tests/blog/content/links.test.ts`(345줄)가 이미 이 일의 절반을 하고 있다」*고 지목했다. 추출 로직을 새로 쓰면 **검사기와 데이터 생성기가 서로 다른 코드로 같은 일을 하게 되고, 그때부터 엣지가 어긋날 수 있다.** 같은 함수를 공유하면 어긋날 방법이 없다.

- [ ] **Step 1: `lib/atlas/links.ts`를 만든다**

`links.test.ts:25-33`의 함수를 **한 글자도 바꾸지 말고** 옮긴다. 주석까지 옮긴다 — 그 주석은 실전 사고의 기록이다.

```ts
import type { Post } from "@/lib/blog/types";

/**
 * 본문의 /blog/<category>/<slug>/ 링크를 뽑는다. 앵커(#)와 질의(?)는 떼어 낸다.
 *
 * 꼬리의 `(?:[#?][^)]*)?` 를 지우지 마라. `[^)#?]` 가 #·? 를 배제하므로 이 그룹이 없으면
 * 앵커 링크는 「떼어 내지는」 것이 아니라 **매칭 자체가 실패해 통째로 사라진다.**
 * 그러면 죽은 링크 검사와 inbound 계수가 그 링크를 조용히 빠뜨린다.
 *
 * tsconfig의 `target`이 es5라 이터레이터를 for-of로 직접 돌면 TS2802가 난다.
 * vitest는 esbuild로 타입을 벗겨 내 통과시키지만 `tsc --noEmit`은 잡는다 —
 * 그래서 이 파일의 순회는 전부 Array.from으로 배열화한 뒤 돈다.
 *
 * ⚠️ 이 함수는 링크 무결성 검사(tests/blog/content/links.test.ts)와
 *    아틀라스 엣지 생성(lib/atlas/build.ts)이 **함께 쓴다.**
 *    두 곳이 같은 코드를 보므로 엣지와 검사가 어긋날 수 없다 — 그게 승격한 이유다(스펙 §7.4).
 */
export function outboundKeys(post: Post): string[] {
  const keys: string[] = [];
  for (const m of Array.from(post.body.matchAll(/\]\(\/blog\/([^)#?]+?)\/?(?:[#?][^)]*)?\)/g))) {
    const target = m[1].replace(/\/$/, "");
    // <category>/<slug> 두 조각이 아닌 것은 카테고리 인덱스 링크다. 편 대 편 관계가 아니다.
    if (target.split("/").length === 2) keys.push(target);
  }
  return keys;
}

/** 글 1편의 안정 키. 노드 `id` 와 엣지의 양끝이 전부 이 값이다. */
export function postKey(post: Post): string {
  return `${post.categorySlug}/${post.slug}`;
}
```

- [ ] **Step 2: 테스트가 승격된 함수를 쓰도록 바꾼다**

`tests/blog/content/links.test.ts`에서 `outboundKeys` 정의(25-33행)와 `key` 정의(36행)를 지우고 import로 바꾼다.

```ts
import { outboundKeys, postKey } from "@/lib/atlas/links";
```

`const key = (p: Post) => ...` 를 지웠으므로 파일 안의 `key(` 호출을 전부 `postKey(`로 바꾼다.

```bash
grep -c 'key(' tests/blog/content/links.test.ts
```

바꾸기 전 개수를 세고, 바꾼 뒤 `postKey(` 개수가 같은지 확인한다.

⚠️ `key(`는 `postKey(`의 부분 문자열이다 — 한 번 치환한 뒤 다시 세면 `postKey(`도 함께 잡힌다. **치환 전에 세고, 치환 후에는 `postKey(`로 센다.**

- [ ] **Step 3: 테스트가 그대로 통과하는지 확인한다**

승격은 **동작을 바꾸지 않는 리팩터링**이다. 결과가 달라지면 옮기다 뭔가 틀린 것이다.

```bash
npm test
```

Expected: **165 passed**. 하나라도 줄거나 늘면 멈춘다.

```bash
npx tsc --noEmit
```

Expected: 종료코드 **0**. (GC-4 — vitest는 타입을 안 본다. 이 단계를 건너뛰지 마라.)

- [ ] **Step 4: 엣지 실측기를 만든다**

스펙의 「1,000 안팎」은 추정이고, 사전 조사의 「1,100건」은 **중복을 포함한 raw 개수**다. 고유 쌍이 몇 개인지 세야 렌더러 임계를 정할 수 있다.

`scripts/count-edges.mjs`:

```js
/**
 * 아틀라스 엣지 수 실측기.
 *
 * 스펙 §7.3 은 엣지를 「1,000 안팎」으로 추정했지만 본문 링크를 세지 않고 적은 값이다.
 * 렌더러 임계(Dot ≤300 · Canvas ≤2,000 · 스펙 §7.5)가 이 숫자에 걸려 있으므로
 * 추정이 아니라 실측이 필요하다.
 *
 * ⚠️ raw 개수와 고유 쌍은 다르다. 한 글이 같은 글을 본문에서 3번 링크하면 raw 3, 고유 1이다.
 *    그래프에 그려지는 것은 고유 쌍이다.
 *
 * 실행: node scripts/count-edges.mjs
 */
import { readPosts } from "../lib/blog/loader.ts";
```

⚠️ **위 import는 동작하지 않는다.** `lib/blog/loader.ts`는 TypeScript이고 `@/` 별칭을 쓰므로 Node가 직접 못 읽는다. 대신 **vitest 안에서 세는 임시 테스트**로 만든다 — 이 리포는 이미 `tests/`에서 `readPosts()`를 부르고 있다.

`tests/atlas/count-edges.test.ts`:

```ts
import { describe, it } from "vitest";
import { readPosts } from "@/lib/blog/loader";
import { outboundKeys, postKey } from "@/lib/atlas/links";

/**
 * 실측용 테스트. 단언하지 않고 **수치를 출력**한다.
 *
 * 왜 테스트 안에서 세나: `lib/blog/loader.ts` 가 TS + `@/` 별칭이라 순수 Node 스크립트로는
 * 못 읽는다. vitest 는 이미 이 모듈을 부르고 있으므로 여기가 가장 싼 실행 경로다.
 *
 * 이 파일은 T2 이후 지운다 — 수치를 계획서에 적고 나면 역할이 끝난다.
 */
describe("엣지 실측", () => {
  it("수치를 출력한다", () => {
    const posts = readPosts();
    const published = new Set(posts.map(postKey));

    // extends — 본문 링크. 고유 (from,to) 쌍만 센다. 자기 참조는 뺀다.
    const extendsPairs = new Set<string>();
    let extendsRaw = 0;
    let extendsDangling = 0;
    for (const p of posts) {
      const from = postKey(p);
      for (const to of outboundKeys(p)) {
        extendsRaw++;
        if (!published.has(to)) { extendsDangling++; continue; }
        if (to === from) continue;
        extendsPairs.add(`${from}->${to}`);
      }
    }

    // instantiates — 글 → 카테고리. 글 1편당 1개다.
    const categories = new Set(posts.map((p) => p.categorySlug));

    // sequence — 같은 series 안에서 seriesOrder 로 이웃을 잇는다.
    const bySeries = new Map<string, number>();
    for (const p of posts) {
      if (!p.series) continue;
      bySeries.set(p.series, (bySeries.get(p.series) ?? 0) + 1);
    }
    let sequenceEdges = 0;
    for (const n of Array.from(bySeries.values())) sequenceEdges += Math.max(0, n - 1);

    const nodes = posts.length + categories.size;
    const edges = extendsPairs.size + posts.length + sequenceEdges;

    console.log(JSON.stringify({
      글: posts.length,
      카테고리: categories.size,
      노드합계: nodes,
      extends_raw: extendsRaw,
      extends_고유쌍: extendsPairs.size,
      extends_대상없음: extendsDangling,
      instantiates: posts.length,
      series_개수: bySeries.size,
      sequence: sequenceEdges,
      엣지합계: edges,
    }, null, 2));
  });
});
```

- [ ] **Step 5: 돌려서 수치를 얻는다**

```bash
npx vitest run tests/atlas/count-edges.test.ts
```

출력된 JSON을 **이 계획서의 D-2 표에 적는다.** 그리고 아래 판정을 한다.

| 엣지 합계 | 렌더러 판정 (스펙 §7.5) |
| --- | --- |
| ≤ 300 | Dot(SVG) 하나로 충분. T11의 Canvas를 **생략할 수 있다** |
| 301 ~ 2,000 | 계획대로 Dot + Canvas |
| > 2,000 | Canvas도 버겁다. **T11에서 노드 상위 N개만 그리는 규칙을 추가**한다 |

⚠️ `extends_대상없음`이 0이 아니면 **본문에 죽은 링크가 있다는 뜻**이고, 그건 기존 링크 무결성 테스트가 잡았어야 하는 것이다. 0이 아니면 멈추고 원인을 찾는다.

- [ ] **Step 6: 커밋**

실측 테스트는 **커밋하지 않는다** — 수치를 얻고 나면 역할이 끝난다. 승격만 커밋한다.

```bash
rm tests/atlas/count-edges.test.ts
git add lib/atlas/links.ts tests/blog/content/links.test.ts
git commit -m "refactor(atlas): 본문 링크 추출을 lib/atlas/links.ts 로 승격

설계서 §7.4. 링크 무결성 검사와 아틀라스 엣지 생성이 **같은 함수**를 보게 한다 —
따로 구현하면 그때부터 엣지와 검사가 어긋날 수 있다.

동작은 바꾸지 않았다. 테스트 165건 그대로 통과."
```

---

# 검색 — Pagefind

## Task 3: Pagefind 인덱스 파이프라인

**Files:**
- Modify: `package.json` (`devDependencies`, `scripts`)
- Create: `scripts/check-pagefind.mjs`
- Modify: `.gitignore` (`out/pagefind` 는 이미 `out/` 이 무시되므로 확인만)

**Interfaces:**
- Consumes: `npm run build`의 산출물 `out/`
- Produces:
  - `out/pagefind/**` — 정적 인덱스
  - `npm run check-pagefind` — 인덱스가 비어 있지 않은지 (스펙 §11의 신규 게이트)

**핵심 제약 (스펙 §8.2):** Pagefind의 한글 세그멘테이션은 **`<html lang>`을 보고 켜진다.** `pages/_document.tsx`가 이미 `<Html lang="ko">`이므로 조건을 만족한다 — **이 값을 절대 건드리지 마라**(GC-8). `en`이었다면 §8 전체가 성립하지 않는다.

- [ ] **Step 1: 설치하고 실제 출력 구조를 확인한다**

```bash
npm install -D pagefind
npm run build
npx pagefind --site out
```

⚠️ `npx pagefind`는 **extended release가 기본값**이다(스펙 §8.2 확인 완료). CJK 세그멘테이션이 extended에만 있으므로 이 기본값이 중요하다 — `--force-language` 같은 옵션으로 바꾸지 마라.

돌아간 뒤 **무엇이 생겼는지 직접 본다.** 다음 스텝의 검증기가 이 구조에 의존한다.

```bash
ls out/pagefind/
cat out/pagefind/pagefind-entry.json
```

Expected: `pagefind.js` · `pagefind-entry.json` · `index/` · `fragment/`가 보이고, entry JSON 안에 언어 키가 있다. **실제로 본 구조를 다음 스텝의 스크립트와 대조하라** — 다르면 스크립트를 실제 구조에 맞춘다.

- [ ] **Step 2: 검증기를 쓴다**

`scripts/check-pagefind.mjs`:

```js
/**
 * Pagefind 인덱스가 실제로 만들어졌는지 본다.
 *
 * 왜 필요한가: `npx pagefind` 는 스캔할 HTML 을 하나도 못 찾아도 **성공으로 끝난다.**
 * 그러면 out/pagefind/ 가 생기긴 하는데 안이 비어 있고, 화면에서는
 * 「검색해도 아무것도 안 나온다」로만 보인다 — 이 리포가 반복해서 데인 「거짓 0」 과 같은 얼굴이다.
 *
 * 종료코드
 *   0  정상
 *   1  인덱스가 비었거나 한국어가 없다
 *   2  out/pagefind 자체가 없다 (빌드를 안 돌렸다) — 「0건」 과 구분한다
 */
import fs from "node:fs";
import path from "node:path";

const DIR = path.join("out", "pagefind");
const ENTRY = path.join(DIR, "pagefind-entry.json");

if (!fs.existsSync(DIR)) {
  console.error(`✖ ${DIR} 가 없다. \`npm run build\` 를 먼저 돌려라.`);
  process.exit(2);
}
if (!fs.existsSync(ENTRY)) {
  console.error(`✖ ${ENTRY} 가 없다. pagefind 가 끝까지 돌지 않았다.`);
  process.exit(2);
}

const entry = JSON.parse(fs.readFileSync(ENTRY, "utf8"));
const langs = entry.languages ?? {};
const names = Object.keys(langs);

if (names.length === 0) {
  console.error("✖ 인덱스에 언어가 하나도 없다. 스캔된 HTML 이 0건이다.");
  process.exit(1);
}

// 한국어 키는 `ko` 또는 `ko-kr` 로 나올 수 있다. 앞부분만 본다.
const ko = names.find((n) => n.toLowerCase().startsWith("ko"));
if (!ko) {
  console.error(`✖ 한국어 인덱스가 없다. 잡힌 언어: ${names.join(", ")}`);
  console.error("  pages/_document.tsx 의 <Html lang=\"ko\"> 를 확인하라 (GC-8).");
  process.exit(1);
}

const pages = langs[ko].page_count ?? 0;
if (pages < 100) {
  console.error(`✖ 한국어 페이지가 ${pages} 건뿐이다. 글이 156 편이므로 너무 적다.`);
  process.exit(1);
}

console.log(`✔ pagefind 인덱스 정상 — 언어 ${names.join(", ")} / ${ko} 페이지 ${pages} 건`);
```

⚠️ `page_count`라는 필드 이름은 Step 1에서 **실제 JSON을 보고 확인한 것으로 맞춰라.** 다르면 그 이름으로 바꾸고, 없으면 `Object.keys(langs[ko])`를 출력해 무엇이 있는지 먼저 본다.

- [ ] **Step 3: 빌드 파이프라인에 넣는다**

`package.json`의 `scripts`를 수정한다.

```json
"build": "next build && node scripts/generate-sitemap.mjs && npx pagefind --site out",
"check-pagefind": "node scripts/check-pagefind.mjs",
```

⚠️ **`pagefind`를 `generate-sitemap` 앞에 두지 마라.** sitemap 스크립트가 `out/`을 훑어 라우트를 만드는데, pagefind가 먼저 돌면 `out/pagefind/`가 라우트로 잡힐 수 있다.

- [ ] **Step 4: 돌려서 확인한다**

```bash
npm run build
npm run check-pagefind
```

Expected: `✔ pagefind 인덱스 정상 — 언어 ko / ko 페이지 N 건`, 종료코드 **0**. N은 156보다 크다(카테고리·태그 목록 페이지도 잡히므로).

거짓 초록이 아닌지 **일부러 깨뜨려 확인한다.**

```bash
mv out/pagefind/pagefind-entry.json out/pagefind/pagefind-entry.json.bak
npm run check-pagefind
```

Expected: 종료코드 **2**, `pagefind-entry.json 가 없다`. 되돌린다.

```bash
mv out/pagefind/pagefind-entry.json.bak out/pagefind/pagefind-entry.json
```

**이 확인을 건너뛰지 마라.** 「0건」과 「파일 없음」이 같은 메시지로 나오는 검증기는 이 리포에서 실제로 사고를 냈다.

- [ ] **Step 5: 커밋**

```bash
git add package.json package-lock.json scripts/check-pagefind.mjs
git commit -m "feat(search): Pagefind 정적 인덱스 파이프라인

설계서 §8.2~8.3. 빌드 뒤 `npx pagefind --site out` 한 줄이면 out/ 의 HTML 이
인덱싱된다. 인프라가 필요 없다 — 정적 호스팅을 데이터베이스처럼 쓴다.

한글 세그멘테이션은 <html lang=\"ko\"> 를 보고 켜진다. 그 값이 en 이었다면
이 설계 전체가 성립하지 않았다 — _document.tsx 를 건드리지 마라.

check-pagefind 는 「빈 인덱스」와 「파일 없음」을 종료코드 1/2 로 구분한다.
성공으로 끝나는 빈 인덱스가 화면에서는 「검색해도 안 나온다」 로만 보이기 때문이다."
```

---

## Task 4: 한글 쿼리 10종 실측 — **이 계획서의 관문**

**Files:**
- Create: `scripts/probe-search.mjs`

**Interfaces:**
- Consumes: T3의 `out/pagefind/**`
- Produces: 통과/실패 판정 하나. **실패하면 T5~T6을 만들지 않는다**

**왜 이것이 관문인가 (스펙 §8.5):** 한글 분절 품질은 **156편으로 실제 인덱스를 만들어 봐야만 안다.** Pagefind 문서는 중국어 예시만 보여준다. 여기서 실패하면 G4(*「`⌘K`에서 **본문 키워드**로 글이 잡힌다」*)를 다시 설계해야 하고, **UI를 먼저 만들었다면 그 작업이 통째로 버려진다.**

⚠️ 스펙이 「티어 다운」이라 부른 경로(MiniSearch로 `title`+`description`+`tags`만)는 **안전망이 아니라 목표 포기**다. 실측 결과 `description`의 중앙값이 110자이고 200자 이상은 18편뿐이라, 본문을 인덱싱하지 않으면 본문 키워드가 잡힐 리 없다.

- [ ] **Step 1: 프로브를 쓴다**

Pagefind는 브라우저 API다. Node에서 직접 못 부르므로 **Playwright로 실제 페이지에서 부른다.**

`scripts/probe-search.mjs`:

```js
/**
 * 한글 쿼리 10종을 실제 인덱스에 던져 본다. 스펙 §8.5 의 관문.
 *
 * 왜 Playwright 인가: pagefind.js 는 브라우저 런타임 API 다. Node 에서 import 해도
 * WebAssembly 로딩과 fetch 경로가 맞지 않는다. 실제 페이지에서 부르는 것이 유일하게 정직한 측정이다.
 *
 * 실행: node scripts/probe-search.mjs
 * 전제: npm run build 가 끝나 있고 out/pagefind/ 가 있다.
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

/**
 * 쿼리 10종.
 *
 * 두 갈래를 섞었다 — **기본형**은 사용자가 실제로 치는 것이고, **조사형**은
 * 한글 스테밍 미지원(스펙 §8.2)이 어디까지 아픈지 재는 것이다.
 * 판정은 기본형으로만 한다. 조사형은 참고 수치다.
 */
const QUERIES = [
  { q: "검색엔진",     kind: "기본형" },
  { q: "RAG",          kind: "기본형" },
  { q: "임베딩",       kind: "기본형" },
  { q: "벡터",         kind: "기본형" },
  { q: "컨텍스트",     kind: "기본형" },
  { q: "프롬프트",     kind: "기본형" },
  { q: "서브에이전트", kind: "기본형" },
  { q: "카나리 배포",  kind: "기본형·복합어" },
  { q: "검색엔진을",   kind: "조사형(참고)" },
  { q: "임베딩의",     kind: "조사형(참고)" },
];

const PORT = 4188;
const ROOT = "out";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".wasm": "application/wasm" };

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/blog/`);

const rows = [];
for (const { q, kind } of QUERIES) {
  const n = await page.evaluate(async (query) => {
    // webpackIgnore 가 아니라 순수 브라우저 import 다 — 번들러를 거치지 않는다.
    const pf = await import("/pagefind/pagefind.js");
    const r = await pf.search(query);
    return r.results.length;
  }, q);
  rows.push({ q, kind, n });
}

await browser.close();
server.close();

const pad = (s, w) => String(s) + " ".repeat(Math.max(0, w - [...String(s)].length * 2));
console.log("쿼리".padEnd(20) + "종류".padEnd(20) + "결과");
for (const r of rows) console.log(pad(r.q, 20) + pad(r.kind, 20) + r.n);

const base = rows.filter((r) => r.kind.startsWith("기본형"));
const hit = base.filter((r) => r.n > 0).length;
console.log(`\n기본형 ${hit}/${base.length} 건이 1건 이상 반환`);

if (hit < base.length - 1) {
  console.error("✖ 관문 실패 — 기본형이 2건 이상 0을 냈다. 스펙 §8.5 로 돌아가라.");
  process.exit(1);
}
console.log("✔ 관문 통과");
```

- [ ] **Step 2: 돌린다**

```bash
npm run build
node scripts/probe-search.mjs
```

⚠️ **파이프를 걸지 마라.** 종료코드를 읽어야 한다.

- [ ] **Step 3: 판정한다**

| 결과 | 판정 | 다음 |
| --- | --- | --- |
| 기본형 8/8 또는 7/8 | **통과** | T5로 간다 |
| 기본형 6/8 이하 | **실패** | **멈춘다.** 아래 절차 |
| 조사형이 0 | 참고. 실패 아님 | 팔레트에 「조사를 떼고 검색해 보세요」 힌트를 넣을지 T5에서 판단 |

**실패했을 때 할 일** — 고치려 들지 말고 원인을 먼저 가른다.

```bash
# ① 인덱스에 한국어가 있는가
npm run check-pagefind

# ② 특정 단어가 원문에 실제로 있는가 (없는 단어로 검색하고 있었을 수 있다)
grep -rl "임베딩" content/blog | wc -l
```

①이 실패면 T3의 문제다. ②가 0이면 **쿼리가 잘못된 것**이지 검색이 잘못된 게 아니다 — 쿼리를 원문에 있는 말로 바꾸고 다시 잰다. 둘 다 정상인데 결과가 0이면 그때가 진짜 §8.5의 실패이고, **본문을 문단 단위 정적 JSON 청크로 자르는 3순위 대안**을 새로 설계해야 한다(스펙 §8.5).

- [ ] **Step 4: 수치를 기록하고 커밋**

출력 표를 **이 계획서의 아래 「실측 기록」 절에 붙여 넣는다.** 나중에 검색 품질이 나빠졌을 때 비교할 기준선이 된다.

```bash
git add scripts/probe-search.mjs
git commit -m "test(search): 한글 쿼리 10종 프로브 — 설계서 §8.5 의 관문

한글 분절 품질은 156편으로 실제 인덱스를 만들어 봐야만 안다. Pagefind 문서는
중국어 예시만 보여준다.

pagefind.js 는 브라우저 런타임 API 라 Node 에서 못 부른다. 실제 페이지에서
부르는 것이 유일하게 정직한 측정이라 Playwright 를 쓴다.

판정은 기본형으로만 한다. 조사형은 스테밍 미지원이 어디까지 아픈지 재는 참고 수치다."
```

### 실측 기록

> T4 실행 후 여기에 출력 표를 붙인다. 비어 있으면 **아직 관문을 통과하지 않은 것이다.**

---

## Task 5: `⌘K` 커맨드 팔레트

**Files:**
- Create: `lib/search/pagefind-loader.ts`
- Create: `components/search/command-palette.tsx`
- Create: `components/search/search-button.tsx`
- Modify: `components/site-header.tsx` (우측에 버튼 추가)

**Interfaces:**
- Consumes: T3의 `out/pagefind/pagefind.js`, T4의 통과 판정
- Produces:
  - `loadPagefind(): Promise<PagefindApi>` — 1회만 로드하고 캐시한다
  - `<CommandPalette />` — 전역 단축키를 스스로 등록한다. props 없음
  - `<SearchButton />` — 헤더용 트리거

**이름 제약 (스펙 §8.4):** **「Ask」라고 부르지 않는다.** 이름이 상호작용을 정한다 — `Ask`는 문장을 치게 만들고 문장은 검색어로 나쁜 입력이라 결과가 빈약해진다. 화면 문구는 `검색` / `Search`다.

- [ ] **Step 1: 로더를 쓴다**

```ts
// lib/search/pagefind-loader.ts

/**
 * Pagefind 런타임을 브라우저에서 1회만 로드한다.
 *
 * ⚠️ `/pagefind/pagefind.js` 는 **빌드 시점에 존재하지 않는다.** `npx pagefind` 가
 *    `next build` 뒤에 만들기 때문이다(package.json 의 build 스크립트 순서).
 *    그래서 번들러가 이 경로를 해석하려 들면 빌드가 「없는 모듈」로 죽는다.
 *    `webpackIgnore` 주석이 그걸 막는다 — 지우지 마라.
 *
 * ⚠️ 서버에서 부르면 안 된다. 정적 export 라 빌드 중에도 이 모듈이 평가되므로
 *    `typeof window` 가드가 필요하다.
 */

export type PagefindData = {
  url: string;
  excerpt: string;
  meta: { title?: string } & Record<string, string | undefined>;
};

export type PagefindResult = {
  id: string;
  data: () => Promise<PagefindData>;
};

export type PagefindApi = {
  search: (query: string) => Promise<{ results: PagefindResult[] }>;
  options?: (opts: Record<string, unknown>) => Promise<void>;
};

let cached: Promise<PagefindApi> | null = null;

export function loadPagefind(): Promise<PagefindApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("pagefind 는 브라우저에서만 로드한다"));
  }
  if (!cached) {
    cached = import(/* webpackIgnore: true */ "/pagefind/pagefind.js") as Promise<PagefindApi>;
  }
  return cached;
}
```

TypeScript가 `/pagefind/pagefind.js`를 모듈로 못 찾아 **TS2307**을 낸다. 파일 맨 위에 선언을 둔다.

```ts
declare module "/pagefind/pagefind.js";
```

⚠️ 그래도 `tsc`가 거부하면 **대안 경로**를 쓴다. 번들러도 타입체커도 정적 분석할 수 없는 형태다.

```ts
    // 대안 — webpackIgnore 가 먹지 않을 때. Function 생성자 안의 import 는
    // 번들러가 파싱하지 않으므로 어떤 설정에서도 그대로 런타임에 남는다.
    cached = new Function('return import("/pagefind/pagefind.js")')() as Promise<PagefindApi>;
```

**둘 중 하나가 반드시 동작한다.** 주 경로를 먼저 시도하고, `npm run build`가 「모듈을 찾을 수 없음」으로 죽으면 대안으로 바꾼다.

- [ ] **Step 2: 팔레트를 쓴다**

```tsx
// components/search/command-palette.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadPagefind, type PagefindData } from "@/lib/search/pagefind-loader";
import { cn } from "@/lib/utils";

const MAX_RESULTS = 8;
const DEBOUNCE_MS = 160;

type Hit = PagefindData & { id: string };

/**
 * ⌘K / Ctrl K 커맨드 팔레트.
 *
 * 키 판별은 `navigator.platform` 이 아니라 **두 키를 모두 받는 것**으로 한다(설계서 §8.4).
 * 판별에 실패해도 단축키는 동작해야 하기 때문이다. 라벨만 플랫폼을 따라 그린다.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // ── 전역 단축키 ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField =
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // `/` 단독 — 입력 요소에 포커스가 없을 때만(설계서 §8.4)
      if (e.key === "/" && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── 열림 상태: 포커스 이동과 복원 ────────────────────────────
  useEffect(() => {
    if (open) {
      restoreRef.current = document.activeElement as HTMLElement | null;
      inputRef.current?.focus();
    } else {
      setQuery("");
      setHits([]);
      restoreRef.current?.focus();
    }
  }, [open]);

  // ── 검색 (디바운스) ──────────────────────────────────────────
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setBusy(true);
      try {
        const pf = await loadPagefind();
        const res = await pf.search(q);
        // data() 는 지연 로드다. 상위 N 개만 펼친다 — 전부 펼치면 조각을 156개 받는다.
        const top = res.results.slice(0, MAX_RESULTS);
        const loaded = await Promise.all(
          top.map(async (r) => ({ ...(await r.data()), id: r.id })),
        );
        if (!cancelled) setHits(loaded);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const close = useCallback(() => setOpen(false), []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-n0/80 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="사이트 검색"
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-n4 bg-n1 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      >
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="글 제목·본문에서 검색"
          aria-label="검색어"
          className="w-full border-b border-n4 bg-transparent px-4 py-4 text-body text-n9 outline-none placeholder:text-n5"
        />

        <div role="status" aria-live="polite" className="sr-only">
          {busy ? "검색 중" : `${hits.length}건`}
        </div>

        <ul className="max-h-[60vh] overflow-y-auto">
          {hits.map((h) => (
            <li key={h.id}>
              <Link
                href={h.url}
                onClick={close}
                className="block border-b border-n3 px-4 py-3 hover:bg-n3 focus-visible:bg-n3 focus-visible:outline-none"
              >
                <p className="text-card-title font-semibold text-n9 break-keep">
                  {h.meta.title ?? h.url}
                </p>
                <p
                  className="mt-1 text-label text-n6 break-keep [&_mark]:bg-signal-soft [&_mark]:text-n9"
                  dangerouslySetInnerHTML={{ __html: h.excerpt }}
                />
              </Link>
            </li>
          ))}
          {query.trim().length >= 2 && !busy && hits.length === 0 && (
            <li className="px-4 py-6 text-center text-label text-n6 break-keep">
              결과가 없습니다. 조사를 떼고 낱말만 넣어 보세요 — 한글은 어근 매칭이 되지 않습니다.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
```

⚠️ **`dangerouslySetInnerHTML`을 쓰는 이유:** Pagefind의 `excerpt`가 일치 부분을 `<mark>`로 감싸 돌려준다. 이 HTML은 **우리 빌드가 우리 콘텐츠에서 만든 것**이지 사용자 입력이 아니다. 외부 입력을 여기 넣지 마라.

⚠️ **`h.url`이 `/blog/xxx/index.html` 형태로 올 수 있다.** Step 4에서 실제 값을 확인하고, `.html`이 붙어 나오면 `h.url.replace(/index\.html$/, "")`로 다듬는다.

- [ ] **Step 3: 헤더 버튼을 만들고 붙인다**

```tsx
// components/search/search-button.tsx
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

/**
 * 헤더 우측 검색 트리거.
 *
 * 라벨만 플랫폼을 따라 그린다 — 단축키 자체는 두 키를 모두 받으므로(command-palette.tsx)
 * 이 판별이 틀려도 기능은 멀쩡하다.
 *
 * ⚠️ 첫 렌더는 서버와 같아야 한다. `navigator` 를 초기 state 에서 읽으면
 *    하이드레이션 불일치가 난다 — useEffect 로 미룬다.
 */
export function SearchButton({ onOpen }: { onOpen: () => void }) {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="검색 열기"
      className="inline-flex items-center gap-2 rounded-md border border-n4 px-3 py-1.5 text-label text-n6 hover:border-n5 hover:text-n8"
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">검색</span>
      <kbd className="hidden rounded border border-n4 px-1.5 py-0.5 text-[0.7rem] text-n5 sm:inline">
        {mac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
```

팔레트가 단축키를 스스로 듣고 있으므로, 버튼과 팔레트가 **같은 열림 상태**를 봐야 한다. `CommandPalette`에 제어 props를 두지 않기로 했으므로, 버튼은 키보드 이벤트를 합성해 보낸다 — 상태를 두 곳에 두지 않는 가장 단순한 방법이다.

`components/site-header.tsx`의 우측 영역(테마 토글 옆)에 넣는다.

```tsx
<SearchButton
  onOpen={() =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))
  }
/>
```

그리고 `components/site-shell.tsx`에 팔레트를 **한 번만** 마운트한다(헤더가 아니라 셸이다 — 헤더는 모바일 드로어에서 두 번 렌더될 수 있다).

```tsx
<CommandPalette />
```

- [ ] **Step 4: 실제 URL 형태를 확인한다**

```bash
npm run build
npm run e2e -- --version   # 설치 확인용. 실패해도 무방
```

브라우저에서 `out/`을 띄우고 팔레트를 열어 `임베딩`을 친 뒤, 첫 결과의 링크 주소를 본다. 개발자도구 콘솔에서 직접 확인하는 편이 빠르다.

```js
const pf = await import("/pagefind/pagefind.js");
const r = await pf.search("임베딩");
console.log((await r.results[0].data()).url);
```

Expected: `/blog/<category>/<slug>/` 형태. **`index.html`이 붙어 나오면** Step 2의 `href`를 다듬는다.

```tsx
href={h.url.replace(/index\.html$/, "")}
```

- [ ] **Step 5: 타입과 빌드를 확인한다**

```bash
npx tsc --noEmit
```

Expected: 종료코드 **0**.

```bash
npm run build
```

Expected: 종료코드 **0**. 여기서 「모듈 `/pagefind/pagefind.js`를 찾을 수 없음」이 나오면 Step 1의 **대안 경로**로 바꾼다.

- [ ] **Step 6: 커밋**

```bash
git add lib/search/pagefind-loader.ts components/search/ components/site-header.tsx components/site-shell.tsx
git commit -m "feat(search): ⌘K 커맨드 팔레트

설계서 §8.4. 「Ask」라고 부르지 않는다 — 이름이 상호작용을 정하고, 문장은
검색어로 나쁜 입력이라 결과가 빈약해진다.

키 판별은 navigator.platform 이 아니라 metaKey || ctrlKey 를 둘 다 받는 것으로 한다.
판별이 틀려도 단축키는 동작해야 하기 때문이다. 라벨만 플랫폼을 따라 그린다.

pagefind.js 는 next build 뒤에 생기므로 빌드 시점에 없다. webpackIgnore 로
번들러가 해석하지 못하게 막는다."
```

---

## Task 6: 검색 E2E

**Files:**
- Create: `e2e/search.spec.ts`

**Interfaces:**
- Consumes: T5의 `<CommandPalette />`, `e2e/shell-gate.ts`의 `SHELL_MARKER`
- Produces: 검색 회귀 게이트

**게이트 규칙:** 이 리포는 **게이트 + 센티넬 쌍**으로만 skip을 쓴다(`e2e/shell-gate.ts` 참조). 셸이 아직 어느 페이지에도 안 붙어 있으므로(T13에서 붙는다) 팔레트도 마운트되지 않는다 — **그 사실을 센티넬이 빨갛게 알리고, 나머지는 skip한다.**

- [ ] **Step 1: 스펙을 쓴다**

```ts
// e2e/search.spec.ts
import { expect, test, type Page } from "@playwright/test";

/**
 * ⌘K 검색 E2E.
 *
 * 팔레트는 components/site-shell.tsx 에 마운트되므로 **셸이 붙은 페이지에서만** 존재한다.
 * T13 에서 /atlas 에 셸이 붙기 전까지 아래는 전부 skip 되고 센티넬만 빨갛다.
 *
 * ⚠️ 「T13 전이니까 그냥 빨갛게 둔다」로 하지 마라. 원인과 무관한 빨강은 아무 정보도 주지 않는다.
 */

const SHELL_MARKER = "[data-site-shell]";
const SEARCH_PATHS = ["/atlas/"];

async function gotoWithShell(page: Page, path: string): Promise<void> {
  await page.goto(path);
  test.skip(
    (await page.locator(SHELL_MARKER).count()) === 0,
    `셸 미부착: ${path} — T13 에서 켜진다 (같은 파일의 센티넬을 보라)`,
  );
}

test.describe("검색 센티넬 (게이트를 통과하지 않는다)", () => {
  for (const path of SEARCH_PATHS) {
    test(`셸이 ${path} 에 붙어 있다 — 이게 빨간 동안 이 파일은 skip 된다`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.locator(SHELL_MARKER),
        `${path} 에 data-site-shell 이 없다. T13 이전이면 정상이고, 그 뒤면 회귀다`,
      ).toHaveCount(1);
    });
  }

  test("pagefind 인덱스가 배포물에 있다", async ({ page }) => {
    // 이건 셸과 무관하다 — T3 의 산출물이므로 지금 초록이어야 한다.
    const res = await page.request.get("/pagefind/pagefind-entry.json");
    expect(res.status(), "pagefind 인덱스가 out/ 에 없다. npm run build 를 확인하라").toBe(200);
    const body = await res.json();
    const langs = Object.keys(body.languages ?? {});
    expect(langs.some((l) => l.toLowerCase().startsWith("ko")), `잡힌 언어: ${langs.join(", ")}`).toBe(true);
  });
});

test.describe("검색 팔레트 (셸 부착 시 켜짐)", () => {
  test("Ctrl+K 로 열리고 Escape 로 닫힌다", async ({ page }) => {
    await gotoWithShell(page, "/atlas/");
    const dialog = page.getByRole("dialog", { name: "사이트 검색", exact: true });

    await expect(dialog).toHaveCount(0);
    await page.keyboard.press("Control+k");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("본문 키워드로 글이 잡힌다 — G4", async ({ page }) => {
    await gotoWithShell(page, "/atlas/");
    await page.keyboard.press("Control+k");
    await page.getByLabel("검색어", { exact: true }).fill("임베딩");

    // 첫 결과가 /blog/ 로 간다. 개수가 아니라 **연결**을 본다.
    const first = page.getByRole("dialog", { name: "사이트 검색", exact: true })
      .getByRole("link").first();
    await expect(first).toBeVisible({ timeout: 10_000 });
    await expect(first).toHaveAttribute("href", /^\/blog\//);
  });

  test("`/` 단독으로도 열린다", async ({ page }) => {
    await gotoWithShell(page, "/atlas/");
    await page.keyboard.press("/");
    await expect(page.getByRole("dialog", { name: "사이트 검색", exact: true })).toBeVisible();
  });

  test("입력 중에는 `/` 가 팔레트를 열지 않는다", async ({ page }) => {
    await gotoWithShell(page, "/atlas/");
    await page.keyboard.press("Control+k");
    const input = page.getByLabel("검색어", { exact: true });
    await input.fill("검색");
    await input.press("/");
    // 팔레트는 하나뿐이어야 한다 — 중첩해서 열리면 안 된다
    await expect(page.getByRole("dialog", { name: "사이트 검색", exact: true })).toHaveCount(1);
    await expect(input).toHaveValue("검색/");
  });
});
```

⚠️ `getByRole(..., { name })`에 **`exact: true`를 붙였다.** 기본이 부분 문자열 매칭이라, 접근명이 오염돼도 초록이 나오는 것을 이 리포에서 실제로 확인했다(함정표 참조).

- [ ] **Step 2: 돌려서 예상 상태를 확인한다**

```bash
npm run build
npm run e2e -- e2e/search.spec.ts
```

Expected 요약: 프로젝트가 desktop·mobile 둘이므로 총 **12건**.

| 묶음 | 건수 | 기대 |
| --- | ---: | --- |
| 센티넬 — 셸 부착 | 2 | **실패** (T13까지 정상) |
| 센티넬 — pagefind 인덱스 | 2 | **통과** |
| 팔레트 4항목 | 8 | **skip** |

숫자가 다르면 멈춘다. 특히 **pagefind 인덱스 검사가 빨가면 T3이 깨진 것**이므로 그것부터 고친다.

- [ ] **Step 3: 커밋**

```bash
git add e2e/search.spec.ts
git commit -m "test(e2e): 검색 팔레트 게이트 + 센티넬

셸이 어느 페이지에도 안 붙어 있어(T13 대기) 팔레트 검사는 전부 skip 된다.
그 skip 이 정상인지는 같은 파일의 센티넬이 알려 준다 — 이 리포가 skip 을 쓰는 유일한 근거다.

pagefind 인덱스 검사만 게이트를 통과하지 않는다. T3 의 산출물이라 지금 초록이어야 하고,
빨가면 셸이 아니라 빌드 파이프라인 문제다.

getByRole 의 name 에는 전부 exact:true 를 붙였다 — 기본이 부분 문자열이라
접근명이 오염돼도 초록이 나온다."
```

---

# 아틀라스 — 데이터

## Task 7: 노드·엣지 스키마

**Files:**
- Modify: `package.json` (`zod` 추가)
- Create: `lib/atlas/types.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `AtlasNode` · `AtlasEdge` · `AtlasGraph` 타입
  - `atlasGraphSchema` — zod 스키마
  - `topicId(slug: string): string` — 토픽 노드의 id 규칙
  - `NODE_TYPES` · `EDGE_TYPES` 상수 배열

**설계 결정 — `id`는 URL 조각이다:** `/atlas/[id]`가 노드 상세 URL이므로(D-3) **id가 그대로 경로가 된다.** 글 노드의 id를 `<category>/<slug>`로 두면 `/`가 들어가 `[id]` 하나로는 못 받는다.

| 노드 | `id` | URL |
| --- | --- | --- |
| 글 | `agentic-coding/subagent-firewall` | `/atlas/agentic-coding/subagent-firewall/` |
| 토픽(카테고리) | `topic/rag` | `/atlas/topic/rag/` |

⇒ **라우트는 `pages/atlas/[...id].tsx` catch-all로 받는다.** 글 URL(`/blog/<category>/<slug>/`)과 모양이 대칭이라 읽기도 좋다. `topic`이 카테고리 slug와 충돌하지 않는지 확인했다 — 6개는 `agentic-coding`·`ai-agent`·`ai-transformation`·`backend-engineering`·`rag`·`search-engineering`이다.

- [ ] **Step 1: zod를 설치한다**

```bash
npm install zod
```

`dependencies`에 넣는다(devDependencies가 아니다) — `getStaticProps`가 빌드 시점에 부르므로 런타임 의존이다.

- [ ] **Step 2: 타입과 스키마를 쓴다**

```ts
// lib/atlas/types.ts
import { z } from "zod";

/**
 * 아틀라스 스키마. 설계서 §7.1~7.2.
 *
 * ⚠️ 1차 데이터(이 계획서)에는 `claim`·`procedure` 노드가 **없다.**
 *    글은 주장이 아니라 산출물이라 자동 매핑으로 나오지 않는다 — 저작이 필요한 단계 5 의 일이다.
 *    그래도 타입에는 넣어 둔다. 나중에 노드를 추가할 때 **UI 를 고치지 않아도 되게** 하는 것이
 *    하이브리드 스키마를 고른 이유다(§7.9).
 *
 * ⚠️ 태그는 노드가 아니다(D-2). `tags` 필드로만 남고 사이드바 필터가 쓴다.
 *    최대 허브 `ai-agent` 가 44 편을 이어 힘 기반 레이아웃을 지배하기 때문이다.
 */

export const NODE_TYPES = ["artifact", "concept", "claim", "procedure"] as const;
export const ORIGINS = ["mine", "external", "derived"] as const;
export const CONFIDENCES = ["settled", "working", "speculative"] as const;
export const EDGE_TYPES = [
  "supports",
  "contradicts",
  "extends",
  "instantiates",
  "depends_on",
  "sequence",
] as const;

export const atlasNodeSchema = z.object({
  /** URL 조각이다. 글은 `<category>/<slug>`, 토픽은 `topic/<slug>`. */
  id: z.string().min(1),
  type: z.enum(NODE_TYPES),
  title: z.string().min(1),
  summary: z.string(),
  origin: z.enum(ORIGINS),
  confidence: z.enum(CONFIDENCES),
  /** 소속 카테고리 slug. 토픽 노드는 자기 자신을 담는다. */
  topics: z.array(z.string()),
  tags: z.array(z.string()),
  source: z
    .object({ kind: z.enum(["note", "external"]), ref: z.string() })
    .optional(),
  updated: z.string(),
});

export const atlasEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(EDGE_TYPES),
  note: z.string().optional(),
});

export const atlasGraphSchema = z.object({
  nodes: z.array(atlasNodeSchema),
  edges: z.array(atlasEdgeSchema),
  meta: z.object({
    /** 빌드 시각이 아니라 **글의 최신 updated** 다. 빌드마다 바뀌면 diff 가 무의미해진다. */
    latest: z.string(),
    counts: z.object({
      artifact: z.number().int().nonnegative(),
      concept: z.number().int().nonnegative(),
      extendsEdges: z.number().int().nonnegative(),
      instantiatesEdges: z.number().int().nonnegative(),
      sequenceEdges: z.number().int().nonnegative(),
    }),
  }),
});

export type AtlasNode = z.infer<typeof atlasNodeSchema>;
export type AtlasEdge = z.infer<typeof atlasEdgeSchema>;
export type AtlasGraph = z.infer<typeof atlasGraphSchema>;

/** 토픽 노드의 id. 글 id(`<category>/<slug>`)와 절대 겹치지 않게 접두사를 둔다. */
export function topicId(slug: string): string {
  return `topic/${slug}`;
}
```

⚠️ **`meta.latest`를 빌드 시각으로 하지 마라.** 빌드할 때마다 값이 바뀌면 `graph`가 들어간 산출물의 해시가 매번 달라지고, `check-baseline`이 영원히 빨개진다. 글의 `updated` 중 최댓값을 쓴다 — 내용이 안 바뀌면 값도 안 바뀐다.

- [ ] **Step 3: 타입만 확인하고 커밋**

```bash
npx tsc --noEmit
```

Expected: 종료코드 **0**.

```bash
git add package.json package-lock.json lib/atlas/types.ts
git commit -m "feat(atlas): 노드·엣지 zod 스키마

설계서 §7.1~7.2. id 가 곧 URL 조각이라 글은 <category>/<slug>,
토픽은 topic/<slug> 로 둔다 — 라우트는 [...id] catch-all 로 받는다.

claim·procedure 는 1차 데이터에 없지만 타입에는 넣는다. 나중에 노드를 더할 때
UI 를 고치지 않아도 되게 하는 것이 하이브리드 스키마를 고른 이유다.

태그는 노드가 아니다 — 최대 허브가 44편을 이어 레이아웃을 지배한다."
```

---

## Task 8: MDX → 그래프 매핑

**Files:**
- Create: `lib/atlas/build.ts`
- Create: `tests/atlas/build.test.ts`

**Interfaces:**
- Consumes: T2의 `outboundKeys`·`postKey`, T7의 스키마, `lib/blog/loader.ts`의 `readPosts`
- Produces: `buildGraph(posts: Post[]): AtlasGraph` — **순수 함수.** 파일을 쓰지 않는다

**왜 CLI 스크립트를 만들지 않나:** `lib/blog/loader.ts`는 TypeScript이고 `@/` 별칭을 쓰므로 **순수 Node 스크립트(`.mjs`)가 읽지 못한다.** 정적 export라 `getStaticProps`가 빌드 시점에 돌므로, 거기서 `buildGraph()`를 부르면 별칭도 타입도 그대로 동작한다 — `graph.json` 파일도, 생성기 CLI도, 새 게이트도 필요 없다. 검증은 이미 게이트인 `npm test`에 얹힌다.

- [ ] **Step 1: 실패하는 테스트를 먼저 쓴다**

```ts
// tests/atlas/build.test.ts
import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/atlas/build";
import { atlasGraphSchema, topicId } from "@/lib/atlas/types";
import type { Post } from "@/lib/blog/types";

/** 테스트용 최소 Post. 실제 로더를 안 타므로 156편에 의존하지 않는다. */
function post(over: Partial<Post> & { slug: string; categorySlug: string }): Post {
  return {
    title: `제목 ${over.slug}`,
    description: "설명",
    category: over.categorySlug,
    tags: [],
    date: "2026-01-01",
    featured: false,
    draft: false,
    body: "",
    toc: [],
    ...over,
  } as Post;
}

describe("buildGraph", () => {
  it("글 1편이 artifact 노드 1개가 된다", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag" })]);
    const n = g.nodes.find((x) => x.id === "rag/a");
    expect(n).toBeDefined();
    expect(n!.type).toBe("artifact");
    expect(n!.origin).toBe("mine");
    expect(n!.source).toEqual({ kind: "note", ref: "/blog/rag/a/" });
  });

  it("카테고리가 concept 노드 1개와 instantiates 엣지가 된다", () => {
    const g = buildGraph([
      post({ slug: "a", categorySlug: "rag" }),
      post({ slug: "b", categorySlug: "rag" }),
    ]);
    expect(g.nodes.filter((n) => n.type === "concept")).toHaveLength(1);
    expect(g.nodes.find((n) => n.id === topicId("rag"))).toBeDefined();
    expect(g.edges.filter((e) => e.type === "instantiates")).toHaveLength(2);
  });

  it("태그는 노드가 되지 않는다 — D-2", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag", tags: ["벡터", "임베딩"] })]);
    expect(g.nodes).toHaveLength(2); // 글 1 + 토픽 1
    expect(g.nodes.find((n) => n.id === "rag/a")!.tags).toEqual(["벡터", "임베딩"]);
  });

  it("본문 링크가 extends 엣지가 되고, 중복은 한 번만 센다", () => {
    const g = buildGraph([
      post({
        slug: "a",
        categorySlug: "rag",
        body: "[x](/blog/rag/b/) 그리고 다시 [y](/blog/rag/b/#앵커)",
      }),
      post({ slug: "b", categorySlug: "rag" }),
    ]);
    const ext = g.edges.filter((e) => e.type === "extends");
    expect(ext).toHaveLength(1);
    expect(ext[0]).toMatchObject({ from: "rag/a", to: "rag/b" });
  });

  it("대상이 없는 링크는 엣지가 되지 않는다", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag", body: "[x](/blog/rag/없음/)" })]);
    expect(g.edges.filter((e) => e.type === "extends")).toHaveLength(0);
  });

  it("자기 자신을 가리키는 링크는 엣지가 되지 않는다", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag", body: "[x](/blog/rag/a/)" })]);
    expect(g.edges.filter((e) => e.type === "extends")).toHaveLength(0);
  });

  it("series 가 seriesOrder 순으로 이웃을 잇는다", () => {
    const g = buildGraph([
      post({ slug: "c", categorySlug: "rag", series: "S", seriesOrder: 3 }),
      post({ slug: "a", categorySlug: "rag", series: "S", seriesOrder: 1 }),
      post({ slug: "b", categorySlug: "rag", series: "S", seriesOrder: 2 }),
    ]);
    const seq = g.edges.filter((e) => e.type === "sequence");
    expect(seq).toHaveLength(2);
    expect(seq).toContainEqual({ from: "rag/a", to: "rag/b", type: "sequence" });
    expect(seq).toContainEqual({ from: "rag/b", to: "rag/c", type: "sequence" });
  });

  it("draft 는 그래프에 들어가지 않는다", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag", draft: true })]);
    expect(g.nodes.filter((n) => n.type === "artifact")).toHaveLength(0);
  });

  it("meta.latest 는 빌드 시각이 아니라 글의 최신 updated 다", () => {
    const g = buildGraph([
      post({ slug: "a", categorySlug: "rag", date: "2026-01-01", updated: "2026-05-05" }),
      post({ slug: "b", categorySlug: "rag", date: "2026-03-03" }),
    ]);
    expect(g.meta.latest).toBe("2026-05-05");
  });

  it("스키마를 통과한다", () => {
    const g = buildGraph([post({ slug: "a", categorySlug: "rag", body: "[x](/blog/rag/b/)" }), post({ slug: "b", categorySlug: "rag" })]);
    expect(() => atlasGraphSchema.parse(g)).not.toThrow();
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
npx vitest run tests/atlas/build.test.ts
```

Expected: **FAIL** — `Cannot find module '@/lib/atlas/build'`.

- [ ] **Step 3: 구현한다**

```ts
// lib/atlas/build.ts
import { outboundKeys, postKey } from "@/lib/atlas/links";
import type { AtlasEdge, AtlasGraph, AtlasNode } from "@/lib/atlas/types";
import { topicId } from "@/lib/atlas/types";
import type { Post } from "@/lib/blog/types";

/**
 * 글 목록에서 아틀라스 그래프를 만든다. 설계서 §7.3.
 *
 * **순수 함수다** — 파일을 읽지도 쓰지도 않는다. 호출자는 `getStaticProps` 이고,
 * 정적 export 라 빌드 시점에 한 번 돈다.
 *
 * ⚠️ tsconfig 의 target 이 es5 라 Map·Set 을 for-of 로 직접 돌면 TS2802 다.
 *    순회는 전부 Array.from 으로 배열화한 뒤 돈다(GC-4).
 */
export function buildGraph(all: Post[]): AtlasGraph {
  const posts = all.filter((p) => !p.draft);
  const published = new Set(posts.map(postKey));

  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];

  // ── artifact 노드 — 글 1편 = 노드 1개 ──────────────────────
  for (const p of posts) {
    nodes.push({
      id: postKey(p),
      type: "artifact",
      title: p.title,
      summary: p.description,
      origin: "mine",
      confidence: "working",
      topics: [p.categorySlug],
      tags: p.tags ?? [],
      source: { kind: "note", ref: `/blog/${postKey(p)}/` },
      updated: p.updated ?? p.date,
    });
  }

  // ── concept 노드 — 카테고리만. 태그는 노드가 아니다(D-2) ────
  const categories = Array.from(new Set(posts.map((p) => p.categorySlug))).sort();
  for (const c of categories) {
    const members = posts.filter((p) => p.categorySlug === c);
    nodes.push({
      id: topicId(c),
      type: "concept",
      title: c,
      summary: `${members.length}편`,
      origin: "derived",
      confidence: "settled",
      topics: [c],
      tags: [],
      updated: members.reduce((m, p) => (p.updated ?? p.date) > m ? (p.updated ?? p.date) : m, ""),
    });
  }

  // ── instantiates — 글 → 토픽 ────────────────────────────────
  for (const p of posts) {
    edges.push({ from: postKey(p), to: topicId(p.categorySlug), type: "instantiates" });
  }

  // ── extends — 본문 링크. 고유 (from,to) 쌍만 ────────────────
  const seen = new Set<string>();
  for (const p of posts) {
    const from = postKey(p);
    for (const to of outboundKeys(p)) {
      if (to === from) continue;           // 자기 참조
      if (!published.has(to)) continue;    // 대상 없음 — 링크 무결성 테스트가 따로 잡는다
      const k = `${from}->${to}`;
      if (seen.has(k)) continue;           // 같은 글을 여러 번 링크해도 엣지는 하나
      seen.add(k);
      edges.push({ from, to, type: "extends" });
    }
  }

  // ── sequence — series 안에서 seriesOrder 순 이웃 ────────────
  const series = new Map<string, Post[]>();
  for (const p of posts) {
    if (!p.series) continue;
    const arr = series.get(p.series) ?? [];
    arr.push(p);
    series.set(p.series, arr);
  }
  for (const group of Array.from(series.values())) {
    const ordered = group
      .slice()
      .sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
    for (let i = 0; i < ordered.length - 1; i++) {
      edges.push({ from: postKey(ordered[i]), to: postKey(ordered[i + 1]), type: "sequence" });
    }
  }

  const latest = posts.reduce((m, p) => {
    const d = p.updated ?? p.date;
    return d > m ? d : m;
  }, "");

  return {
    nodes,
    edges,
    meta: {
      latest,
      counts: {
        artifact: posts.length,
        concept: categories.length,
        extendsEdges: edges.filter((e) => e.type === "extends").length,
        instantiatesEdges: edges.filter((e) => e.type === "instantiates").length,
        sequenceEdges: edges.filter((e) => e.type === "sequence").length,
      },
    },
  };
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
npx vitest run tests/atlas/build.test.ts
```

Expected: **10 passed**.

```bash
npx tsc --noEmit
```

Expected: 종료코드 **0**. (es5 이터레이터 함정이 여기서 잡힌다 — vitest는 통과시켜도 `tsc`는 잡는다.)

- [ ] **Step 5: 실데이터로 규모를 확인한다**

단위 테스트는 합성 데이터다. **실제 156편으로 돌려 T2의 실측치와 맞는지 본다.**

`tests/atlas/build.test.ts` 맨 아래에 덧붙인다.

```ts
describe("실데이터", () => {
  it("규모를 출력한다", async () => {
    const { readPosts } = await import("@/lib/blog/loader");
    const g = buildGraph(readPosts());
    console.log(JSON.stringify(g.meta.counts, null, 2));
    console.log(`노드 ${g.nodes.length} · 엣지 ${g.edges.length}`);
    expect(atlasGraphSchema.parse(g)).toBeTruthy();
  });
});
```

```bash
npx vitest run tests/atlas/build.test.ts
```

**T2에서 적어 둔 수치와 대조한다.** 다르면 멈추고 원인을 찾는다 — 같은 함수를 쓰는데 값이 다르면 필터(`draft`·자기참조·중복)에서 갈린 것이다.

- [ ] **Step 6: 커밋**

```bash
npm test
git add lib/atlas/build.ts tests/atlas/build.test.ts
git commit -m "feat(atlas): MDX 156편 → 노드·엣지 매핑

설계서 §7.3. LLM 호출 없이 빌드타임 파싱만으로 만든다.

순수 함수다 — 파일을 읽지도 쓰지도 않는다. graph.json 도 생성기 CLI 도 만들지 않았다.
lib/blog/loader.ts 가 TS + @/ 별칭이라 순수 Node 스크립트가 못 읽기 때문이고,
정적 export 라 getStaticProps 가 빌드 시점에 도는 것으로 충분하다.

meta.latest 는 빌드 시각이 아니라 글의 최신 updated 다. 빌드마다 바뀌면
산출물 해시가 매번 달라져 check-baseline 이 영원히 빨개진다."
```

---

## Task 9: 그래프 무결성 게이트

**Files:**
- Create: `tests/atlas/integrity.test.ts`

**Interfaces:**
- Consumes: T8의 `buildGraph`
- Produces: 회귀 게이트. `npm test`에 자동으로 들어간다

**왜 별도 태스크인가 (스펙 §11):** *「스키마 검증을 빌드 중단으로 두는 이유는 **깨진 엣지가 화면에 보이지 않기 때문**이다. 노드가 하나 덜 그려져도 사람 눈은 잡지 못한다. 사람이 못 잡는 오류는 기계가 막아야 한다.」*

- [ ] **Step 1: 무결성 검사를 쓴다**

```ts
// tests/atlas/integrity.test.ts
import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/atlas/build";
import { atlasGraphSchema } from "@/lib/atlas/types";
import { readPosts } from "@/lib/blog/loader";
import type { AtlasGraph } from "@/lib/atlas/types";

const graph = buildGraph(readPosts());

/**
 * 그래프 무결성. 설계서 §11.
 *
 * ⚠️ 아래 「자기검사」 묶음을 지우지 마라. 검사기가 실제로 잡는지 증명하지 않은 초록은
 *    이 리포에서 반복해서 거짓 0 을 만들었다 — 검사 자체가 고장 나도 초록이 나오기 때문이다.
 */
describe("그래프 무결성", () => {
  it("스키마를 통과한다", () => {
    expect(() => atlasGraphSchema.parse(graph)).not.toThrow();
  });

  it("id 가 중복되지 않는다", () => {
    const ids = graph.nodes.map((n) => n.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dup, `중복 id: ${dup.join(", ")}`).toHaveLength(0);
  });

  it("모든 엣지의 양끝이 실재하는 노드다", () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    const dangling = graph.edges.filter((e) => !ids.has(e.from) || !ids.has(e.to));
    expect(dangling.map((e) => `${e.from}->${e.to}`), "없는 노드를 가리키는 엣지").toHaveLength(0);
  });

  it("고립된 artifact 노드가 없다", () => {
    // 모든 글은 최소한 카테고리로 instantiates 엣지를 갖는다. 0 이면 매핑이 깨진 것이다.
    const deg = new Map<string, number>(graph.nodes.map((n) => [n.id, 0]));
    for (const e of graph.edges) {
      deg.set(e.from, (deg.get(e.from) ?? 0) + 1);
      deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
    }
    const orphans = graph.nodes.filter((n) => n.type === "artifact" && (deg.get(n.id) ?? 0) === 0);
    expect(orphans.map((n) => n.id), "엣지가 하나도 없는 글").toHaveLength(0);
  });

  it("id 가 URL 로 쓸 수 있는 모양이다", () => {
    // /atlas/[...id] 의 경로 조각이 된다. 공백·물음표·해시가 있으면 안 된다.
    const bad = graph.nodes.filter((n) => /[\s?#]/.test(n.id));
    expect(bad.map((n) => n.id), "URL 에 못 쓰는 id").toHaveLength(0);
  });

  it("counts 가 실제 배열 길이와 맞는다", () => {
    expect(graph.meta.counts.artifact).toBe(graph.nodes.filter((n) => n.type === "artifact").length);
    expect(graph.meta.counts.concept).toBe(graph.nodes.filter((n) => n.type === "concept").length);
    expect(graph.meta.counts.extendsEdges).toBe(graph.edges.filter((e) => e.type === "extends").length);
  });
});

/**
 * 자기검사 — 검사기가 정말 잡는지 증명한다.
 *
 * 일부러 깨뜨린 그래프를 넣어 **위 검사와 같은 판정 로직**이 실패를 내는지 본다.
 * 이게 없으면 「발견 0건」이 참인지 검사가 고장 난 것인지 구분할 수 없다.
 */
describe("자기검사 — 깨진 그래프를 잡는가", () => {
  const broken = (over: Partial<AtlasGraph>): AtlasGraph => ({ ...graph, ...over });

  it("① 없는 노드를 가리키는 엣지를 잡는다", () => {
    const g = broken({ edges: [...graph.edges, { from: graph.nodes[0].id, to: "없는/노드", type: "extends" }] });
    const ids = new Set(g.nodes.map((n) => n.id));
    expect(g.edges.filter((e) => !ids.has(e.to)).length).toBeGreaterThan(0);
  });

  it("② 중복 id 를 잡는다", () => {
    const g = broken({ nodes: [...graph.nodes, graph.nodes[0]] });
    const ids = g.nodes.map((n) => n.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i).length).toBeGreaterThan(0);
  });

  it("③ 스키마 위반을 잡는다", () => {
    const g = broken({ nodes: [...graph.nodes, { ...graph.nodes[0], id: "x", type: "없는타입" as never }] });
    expect(() => atlasGraphSchema.parse(g)).toThrow();
  });

  it("④ URL 로 못 쓰는 id 를 잡는다", () => {
    const g = broken({ nodes: [...graph.nodes, { ...graph.nodes[0], id: "공백 있는/id" }] });
    expect(g.nodes.filter((n) => /[\s?#]/.test(n.id)).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 돌린다**

```bash
npx vitest run tests/atlas/integrity.test.ts
```

Expected: **10 passed** (무결성 6 + 자기검사 4).

⚠️ **자기검사가 하나라도 실패하면 그 검사기는 아무것도 막지 못한다.** 무결성 쪽이 초록이어도 멈추고 고친다.

- [ ] **Step 3: 전체 게이트 확인 후 커밋**

```bash
npm test
```

Expected: **186 passed** (기존 165 + 매핑 10 + 실데이터 1 + 무결성 6 + 자기검사 4).

```bash
git add tests/atlas/integrity.test.ts
git commit -m "test(atlas): 그래프 무결성 게이트 + 자기검사

설계서 §11 — 깨진 엣지는 화면에 보이지 않는다. 노드가 하나 덜 그려져도
사람 눈은 잡지 못하므로 기계가 막아야 한다.

자기검사 4건을 함께 넣는다. 검사기가 실제로 잡는지 증명하지 않은 초록은
이 리포에서 반복해서 거짓 0 을 만들었다 — 검사가 고장 나도 초록이 나오기 때문이다."
```

---

# 아틀라스 — 화면

## Task 10: 레이아웃과 SVG 렌더러

**Files:**
- Create: `lib/atlas/layout.ts`
- Create: `components/atlas/dot-renderer.tsx`
- Create: `components/atlas/list-view.tsx`
- Create: `tests/atlas/layout.test.ts`

**Interfaces:**
- Consumes: T7의 `AtlasGraph`
- Produces:
  - `layoutRadial(graph: AtlasGraph): Map<string, Point>` — 결정론적 좌표
  - `<DotRenderer graph selected onSelect />`
  - `<ListView graph onSelect />`

**왜 힘 기반이 아닌가:** 노드가 **162개**로 스펙 §7.5의 Dot 임계(≤300) 안이다. 힘 기반 시뮬레이션은 ① `d3-force` 의존을 더하고 ② 매 프레임 재계산이라 `reduced-motion`과 충돌하며 ③ **빌드마다 결과가 달라져** 스냅샷과 `check-baseline`이 흔들린다. 결정론적 방사형 배치는 셋 다 없다.

⚠️ **T8의 실측 엣지 수를 먼저 보라.** 300을 크게 넘으면 SVG의 선이 많아 화면이 뭉갠다 — 그때는 「엣지를 선택 노드 주변만 그린다」 규칙을 이 태스크에서 함께 넣는다.

- [ ] **Step 1: 레이아웃 테스트를 먼저 쓴다**

```ts
// tests/atlas/layout.test.ts
import { describe, expect, it } from "vitest";
import { buildGraph } from "@/lib/atlas/build";
import { layoutRadial } from "@/lib/atlas/layout";
import { readPosts } from "@/lib/blog/loader";

const graph = buildGraph(readPosts());

describe("layoutRadial", () => {
  it("모든 노드에 좌표를 준다", () => {
    const pos = layoutRadial(graph);
    const missing = graph.nodes.filter((n) => !pos.has(n.id));
    expect(missing.map((n) => n.id)).toHaveLength(0);
  });

  it("결정론적이다 — 두 번 돌려 같은 값", () => {
    const a = layoutRadial(graph);
    const b = layoutRadial(graph);
    for (const n of graph.nodes) {
      expect(a.get(n.id)).toEqual(b.get(n.id));
    }
  });

  it("좌표가 viewBox 0..100 안에 있다", () => {
    const pos = layoutRadial(graph);
    for (const p of Array.from(pos.values())) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });

  it("같은 토픽의 글이 서로 가깝다", () => {
    const pos = layoutRadial(graph);
    const rag = graph.nodes.filter((n) => n.type === "artifact" && n.topics[0] === "rag");
    const other = graph.nodes.filter((n) => n.type === "artifact" && n.topics[0] === "search-engineering");
    if (rag.length < 2 || other.length < 1) return; // 데이터가 없으면 건너뛴다
    const d = (a: string, b: string) => {
      const p = pos.get(a)!, q = pos.get(b)!;
      return Math.hypot(p.x - q.x, p.y - q.y);
    };
    const within = d(rag[0].id, rag[1].id);
    const across = d(rag[0].id, other[0].id);
    expect(within).toBeLessThan(across);
  });
});
```

- [ ] **Step 2: 실패를 확인하고 구현한다**

```bash
npx vitest run tests/atlas/layout.test.ts   # FAIL — 모듈 없음
```

```ts
// lib/atlas/layout.ts
import type { AtlasGraph } from "@/lib/atlas/types";

export type Point = { x: number; y: number };

/**
 * 결정론적 방사형 배치. 설계서 §7.5 의 Dot 렌더러용.
 *
 * 토픽 6개를 큰 원주에 균등 배치하고, 각 토픽의 글을 그 주위 작은 원에 둔다.
 * 같은 토픽이 뭉치므로 클러스터가 눈에 보이고, extends 엣지가 클러스터를 가로지르는 선이 된다.
 *
 * **왜 힘 기반이 아닌가:** 시뮬레이션은 빌드마다 결과가 달라 스냅샷과 기준선 해시를 흔든다.
 * 노드 162 개는 §7.5 의 Dot 임계(≤300) 안이라 정적 배치로 충분하다.
 *
 * ⚠️ 정렬을 빼지 마라. `graph.nodes` 의 순서에 의존하면 글 하나를 더할 때
 *    **전체 좌표가 밀려** diff 가 통째로 바뀐다.
 */
export function layoutRadial(graph: AtlasGraph): Map<string, Point> {
  const pos = new Map<string, Point>();
  const CX = 50, CY = 50;
  const TOPIC_R = 26;   // 토픽 원의 반지름
  const MEMBER_R = 15;  // 각 토픽 주위 글들의 반지름

  const topics = graph.nodes
    .filter((n) => n.type === "concept")
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  topics.forEach((t, ti) => {
    const a = (2 * Math.PI * ti) / Math.max(1, topics.length) - Math.PI / 2;
    const tx = CX + TOPIC_R * Math.cos(a);
    const ty = CY + TOPIC_R * Math.sin(a);
    pos.set(t.id, { x: round(tx), y: round(ty) });

    const members = graph.nodes
      .filter((n) => n.type === "artifact" && n.topics[0] === t.topics[0])
      .slice()
      .sort((x, y) => x.id.localeCompare(y.id));

    members.forEach((m, mi) => {
      // 글이 많은 토픽은 두 겹으로 돌려 겹침을 줄인다
      const ring = Math.floor(mi / 16);
      const inRing = mi % 16;
      const r = MEMBER_R * (1 + ring * 0.45);
      const b = (2 * Math.PI * inRing) / 16 + ti * 0.37; // 토픽마다 시작 각을 어긋내 겹침을 줄인다
      pos.set(m.id, {
        x: round(clamp(tx + r * Math.cos(b))),
        y: round(clamp(ty + r * Math.sin(b))),
      });
    });
  });

  // 토픽이 없는 글(있을 수 없지만 방어) — 중앙에 둔다
  for (const n of graph.nodes) {
    if (!pos.has(n.id)) pos.set(n.id, { x: CX, y: CY });
  }
  return pos;
}

const clamp = (v: number) => Math.min(98, Math.max(2, v));
const round = (v: number) => Math.round(v * 100) / 100;
```

- [ ] **Step 3: SVG 렌더러를 쓴다**

```tsx
// components/atlas/dot-renderer.tsx
import { useMemo } from "react";
import { layoutRadial } from "@/lib/atlas/layout";
import type { AtlasGraph } from "@/lib/atlas/types";

/**
 * SVG 렌더러. 설계서 §7.5 의 Dot.
 *
 * ⚠️ 노드를 전부 액센트로 칠하지 마라(GC-9). 액센트는 **선택된 것과 그 이웃**에만 쓴다.
 *    162 개를 전부 amber 로 칠하면 첫 화면 액센트 면적이 상한을 몇 배로 넘는다 —
 *    선행 계획서 T9 가 정확히 그 이유로 반려됐다(15.68%).
 */
export function DotRenderer({
  graph,
  selected,
  onSelect,
}: {
  graph: AtlasGraph;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  // graph 는 getStaticProps 가 준 뒤 바뀌지 않는다. selected 가 바뀔 때마다
  // 162 노드의 삼각함수를 다시 돌 이유가 없다.
  const pos = useMemo(() => layoutRadial(graph), [graph]);
  const neighbors = new Set<string>();
  if (selected) {
    for (const e of graph.edges) {
      if (e.from === selected) neighbors.add(e.to);
      if (e.to === selected) neighbors.add(e.from);
    }
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      role="img"
      aria-label={`지식 그래프 — 노드 ${graph.nodes.length}개, 연결 ${graph.edges.length}개`}
    >
      <g>
        {graph.edges.map((e, i) => {
          const a = pos.get(e.from), b = pos.get(e.to);
          if (!a || !b) return null;
          const lit = selected != null && (e.from === selected || e.to === selected);
          return (
            <line
              key={`${e.from}|${e.to}|${e.type}|${i}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={lit ? "var(--signal)" : "var(--n4)"}
              strokeWidth={lit ? 0.3 : 0.12}
              opacity={selected == null ? 0.45 : lit ? 0.9 : 0.12}
            />
          );
        })}
      </g>
      <g>
        {graph.nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const isTopic = n.type === "concept";
          const isSel = n.id === selected;
          const isNb = neighbors.has(n.id);
          return (
            <circle
              key={n.id}
              cx={p.x} cy={p.y}
              r={isTopic ? 1.9 : isSel ? 1.5 : 0.9}
              fill={isSel || isNb ? "var(--signal)" : isTopic ? "var(--n7)" : "var(--n5)"}
              opacity={selected == null ? 0.85 : isSel || isNb ? 1 : 0.25}
              className="cursor-pointer"
              onClick={() => onSelect(n.id)}
              role="button"
              tabIndex={0}
              aria-label={n.title}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onSelect(n.id); }
              }}
            />
          );
        })}
      </g>
    </svg>
  );
}
```

- [ ] **Step 4: 목록 뷰를 쓴다**

`reduced-motion`과 저사양의 기본값이다(스펙 §7.7). **그래프를 못 그리는 상황에서도 내용에는 도달할 수 있어야 한다.**

```tsx
// components/atlas/list-view.tsx
import type { AtlasGraph } from "@/lib/atlas/types";

/**
 * 목록 뷰. 설계서 §7.7 — prefers-reduced-motion 과 저사양의 기본값이다.
 *
 * 그래프가 「보기 좋은 것」이라면 이쪽은 「반드시 닿는 것」이다.
 * 스크린리더 사용자도 여기로 온다 — SVG 원 162 개를 훑는 것은 탐색이 아니다.
 */
export function ListView({ graph, onSelect }: { graph: AtlasGraph; onSelect: (id: string) => void }) {
  const topics = graph.nodes.filter((n) => n.type === "concept");
  return (
    <div className="space-y-8">
      {topics.map((t) => {
        const members = graph.nodes.filter(
          (n) => n.type === "artifact" && n.topics[0] === t.topics[0],
        );
        return (
          <section key={t.id} aria-labelledby={`t-${t.topics[0]}`}>
            <h3 id={`t-${t.topics[0]}`} className="text-card-title font-semibold text-n9 break-keep">
              {t.title} <span className="text-label text-n6">{members.length}편</span>
            </h3>
            <ul className="mt-3 space-y-1">
              {members.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(m.id)}
                    className="text-left text-body text-n7 break-keep hover:text-signal"
                  >
                    {m.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: 확인하고 커밋**

```bash
npx vitest run tests/atlas/layout.test.ts
npx tsc --noEmit
```

Expected: 각각 **4 passed**, 종료코드 **0**.

```bash
git add lib/atlas/layout.ts components/atlas/ tests/atlas/layout.test.ts
git commit -m "feat(atlas): 결정론적 방사형 레이아웃 + SVG 렌더러 + 목록 뷰

설계서 §7.5·§7.7. 노드 162개는 Dot 임계(≤300) 안이라 힘 기반 시뮬레이션이 필요 없다.
시뮬레이션은 빌드마다 결과가 달라 스냅샷과 기준선 해시를 흔든다.

액센트는 **선택된 노드와 그 이웃**에만 쓴다. 162개를 전부 칠하면 GC-9 를 몇 배로 넘는다 —
선행 계획서 T9 가 정확히 그 이유로 반려됐다(실측 15.68%).

목록 뷰는 reduced-motion·저사양의 기본값이자 스크린리더의 경로다.
SVG 원 162개를 훑는 것은 탐색이 아니다."
```

---

## Task 11: `/atlas` 와 노드 상세

**Files:**
- Create: `pages/atlas/index.tsx`
- Create: `pages/atlas/[...id].tsx`
- Create: `components/atlas/node-panel.tsx`
- Modify: `scripts/check-baseline.mjs` (`isTarget`)
- Modify: `scripts/generate-sitemap.mjs` (`EXCLUDE`)

**Interfaces:**
- Consumes: T8의 `buildGraph`, T10의 렌더러, 선행 계획서 T7의 `SiteShell`
- Produces: `/atlas/` 와 `/atlas/<id>/` 162개. **셸이 처음 붙는 페이지다**

**게이트가 여기서 걸린다:** `check-baseline`의 `isTarget`은 `blog/`만 제외한다. 노드 상세 162개가 생기면 **감시 대상이 13개에서 175개로 불어난다.** 아틀라스 노드는 글이 늘면 함께 느는 것이라 blog와 같은 이유로 제외해야 한다.

- [ ] **Step 1: 노드 패널을 쓴다**

```tsx
// components/atlas/node-panel.tsx
import Link from "next/link";
import type { AtlasEdge, AtlasGraph, AtlasNode } from "@/lib/atlas/types";

const EDGE_LABEL: Record<AtlasEdge["type"], string> = {
  supports: "뒷받침",
  contradicts: "반박",
  extends: "이어짐",
  instantiates: "속함",
  depends_on: "의존",
  sequence: "다음 편",
};

/** 선택된 노드의 상세. 그래프에서는 우측 패널, 노드 상세 페이지에서는 본문으로 쓴다. */
export function NodePanel({ graph, node }: { graph: AtlasGraph; node: AtlasNode }) {
  const linked = graph.edges
    .filter((e) => e.from === node.id || e.to === node.id)
    .map((e) => ({
      edge: e,
      other: graph.nodes.find((n) => n.id === (e.from === node.id ? e.to : e.from)),
    }))
    .filter((x): x is { edge: AtlasEdge; other: AtlasNode } => Boolean(x.other));

  return (
    <div>
      <p className="text-label uppercase tracking-widest text-n6">
        {node.type === "concept" ? "토픽" : "글"}
      </p>
      <h2 className="mt-2 text-section font-bold text-n9 break-keep">{node.title}</h2>
      {node.summary && <p className="mt-3 text-body text-n7 break-keep">{node.summary}</p>}

      {node.source?.kind === "note" && (
        <Link
          href={node.source.ref}
          className="mt-4 inline-block text-body text-signal underline underline-offset-4"
        >
          원문 읽기 →
        </Link>
      )}

      {node.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {node.tags.map((t) => (
            <li key={t} className="rounded border border-n4 px-2 py-0.5 text-label text-n6">
              {t}
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-8 text-card-title font-semibold text-n9">
        연결 <span className="text-label text-n6">{linked.length}</span>
      </h3>
      <ul className="mt-3 space-y-2">
        {linked.map(({ edge, other }) => (
          <li key={`${edge.from}|${edge.to}|${edge.type}`} className="text-body break-keep">
            <span className="text-label text-n6">{EDGE_LABEL[edge.type]}</span>{" "}
            <Link href={`/atlas/${other.id}/`} className="text-n8 underline underline-offset-4 hover:text-signal">
              {other.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: `/atlas` 페이지를 쓴다**

```tsx
// pages/atlas/index.tsx
import { useState } from "react";
import type { GetStaticProps } from "next";
import { SiteShell } from "@/components/site-shell";
import { DotRenderer } from "@/components/atlas/dot-renderer";
import { ListView } from "@/components/atlas/list-view";
import { NodePanel } from "@/components/atlas/node-panel";
import { buildGraph } from "@/lib/atlas/build";
import { readPosts } from "@/lib/blog/loader";
import type { AtlasGraph } from "@/lib/atlas/types";

/**
 * 지식 아틀라스. 설계서 §7.
 *
 * 그래프는 **빌드 시점에** getStaticProps 에서 만든다 — 정적 export 라 여기가 빌드타임이고,
 * lib/blog/loader.ts 의 `@/` 별칭도 그대로 동작한다. graph.json 파일이 따로 필요 없는 이유다.
 */
export const getStaticProps: GetStaticProps<{ graph: AtlasGraph }> = async () => ({
  props: { graph: buildGraph(readPosts()) },
});

export default function AtlasPage({ graph }: { graph: AtlasGraph }) {
  const [selected, setSelected] = useState<string | null>(null);
  const node = selected ? graph.nodes.find((n) => n.id === selected) ?? null : null;

  return (
    <SiteShell title="Atlas — 지식 아틀라스" description={`글 ${graph.meta.counts.artifact}편을 잇는 지식 그래프`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-section font-bold text-n9 break-keep">지식 아틀라스</h1>
        <p className="mt-2 text-body text-n7 break-keep">
          글 {graph.meta.counts.artifact}편 · 토픽 {graph.meta.counts.concept}개 · 연결 {graph.edges.length}개
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="aspect-square w-full rounded-lg border border-n4 bg-n1 p-2">
            {/* 모션이 없는 정적 SVG 라 reduced-motion 에서도 그대로 쓴다.
                목록 뷰는 그 아래에 **항상** 둔다 — 그래프가 보조, 목록이 본선이다. */}
            <DotRenderer graph={graph} selected={selected} onSelect={setSelected} />
          </div>

          <aside className="lg:sticky lg:top-24 lg:h-fit">
            {node ? (
              <NodePanel graph={graph} node={node} />
            ) : (
              <p className="text-body text-n6 break-keep">노드를 누르면 여기에 상세가 나옵니다.</p>
            )}
          </aside>
        </div>

        <section className="mt-16" aria-label="전체 목록">
          <h2 className="text-card-title font-semibold text-n9">전체 목록</h2>
          <div className="mt-6">
            <ListView graph={graph} onSelect={setSelected} />
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
```

⚠️ `SiteShell`의 props 이름(`title`·`description`)은 **실제 시그니처를 확인하고 맞춰라.**

```bash
grep -n "export function SiteShell" -A 12 components/site-shell.tsx
```

- [ ] **Step 3: 노드 상세를 쓴다**

```tsx
// pages/atlas/[...id].tsx
import type { GetStaticPaths, GetStaticProps } from "next";
import { SiteShell } from "@/components/site-shell";
import { NodePanel } from "@/components/atlas/node-panel";
import { buildGraph } from "@/lib/atlas/build";
import { readPosts } from "@/lib/blog/loader";
import type { AtlasGraph, AtlasNode } from "@/lib/atlas/types";

/**
 * ⚠️ `[...id]` catch-all 이다. 노드 id 에 `/` 가 들어가기 때문이다
 *    (글 `<category>/<slug>` · 토픽 `topic/<slug>`).
 *    `[id]` 로 두면 슬래시가 든 id 가 통째로 404 가 된다.
 */
export const getStaticPaths: GetStaticPaths = async () => {
  const graph = buildGraph(readPosts());
  return {
    paths: graph.nodes.map((n) => ({ params: { id: n.id.split("/") } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<{ graph: AtlasGraph; node: AtlasNode }> = async (ctx) => {
  const parts = ctx.params?.id;
  const id = Array.isArray(parts) ? parts.join("/") : String(parts ?? "");
  const graph = buildGraph(readPosts());
  const node = graph.nodes.find((n) => n.id === id);
  if (!node) return { notFound: true };
  return { props: { graph, node } };
};

export default function AtlasNodePage({ graph, node }: { graph: AtlasGraph; node: AtlasNode }) {
  return (
    <SiteShell title={`${node.title} — Atlas`} description={node.summary}>
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <NodePanel graph={graph} node={node} />
      </div>
    </SiteShell>
  );
}
```

- [ ] **Step 4: 게이트를 조정한다**

`scripts/check-baseline.mjs`의 `isTarget`에 아틀라스를 더한다.

```js
/** 블로그 산출물은 이 검사의 대상이 아니다 — 글을 더하면 당연히 바뀐다.
 *  아틀라스도 같은 이유다: 노드가 글에서 자동 생성되므로 글이 늘면 함께 는다.
 *  제외하지 않으면 감시 대상이 13개에서 175개로 불어나 기준선이 사실상 무의미해진다. */
function isTarget(rel) {
  const norm = rel.split(path.sep).join("/");
  return norm.endsWith(".html") && !norm.startsWith("blog/") && !norm.startsWith("atlas/");
}
```

sitemap은 **`/atlas/` 목록만 넣고 노드 상세 162개는 뺀다.** 노드 상세는 글의 요약과 연결만 담아 원문(`/blog/**`)과 중복 색인될 수 있다.

`scripts/generate-sitemap.mjs`의 `EXCLUDE`에 규칙을 더한다.

```js
// atlas/ 목록은 남기고 노드 상세만 뺀다 — 노드는 글의 요약이라 원문과 중복 색인된다.
const EXCLUDE = [/^product-lead-wiki(\/|$)/, /^product-lead-loadmap(\/|$)/, /^notion(\/|$)/, /^404$/, /^atlas\/.+/];
```

⚠️ `/^atlas\/.+/`는 `atlas` 자신(빈 꼬리)은 남기고 하위만 뺀다. **`/^atlas(\/|$)/`로 쓰면 목록까지 사라진다.**

- [ ] **Step 5: 빌드하고 수치를 확인한다**

```bash
npm run build
```

```bash
ls out/atlas/ | head
find out/atlas -name index.html | wc -l
grep -c '<loc>' out/sitemap.xml
```

Expected:
- `out/atlas` 아래 노드 디렉터리들 + `index.html`
- 노드 상세 개수 = T8의 노드 수 + 1(목록)
- sitemap `<loc>` = **233** (기존 232 + `/atlas/` 1개). 노드 상세가 새면 숫자가 튄다

```bash
npm run check-baseline
```

Expected: **exit 1이되 「변경」 목록이 T1 때와 같아야 한다.** `atlas/`가 목록에 나타나면 Step 4의 제외가 안 먹은 것이다.

- [ ] **Step 6: 커밋**

```bash
npx tsc --noEmit
npm test
git add pages/atlas components/atlas/node-panel.tsx scripts/check-baseline.mjs scripts/generate-sitemap.mjs
git commit -m "feat(atlas): /atlas 와 노드 상세 페이지

설계서 §7·§4. 그래프는 getStaticProps 에서 빌드 시점에 만든다.

라우트는 [...id] catch-all 이다 — 노드 id 에 슬래시가 들어가기 때문이다
(글 <category>/<slug> · 토픽 topic/<slug>). [id] 로 두면 통째로 404 가 된다.

check-baseline 에 atlas/ 제외를 더했다. 노드가 글에서 자동 생성되므로 blog 와 같은 이유다 —
제외하지 않으면 감시 대상이 13개에서 175개로 불어나 기준선이 무의미해진다.

sitemap 은 /atlas/ 목록만 넣고 노드 상세는 뺀다. 노드는 글의 요약이라 원문과 중복 색인된다."
```

---

## Task 12: E2E · 헤더 노출 · 스펙 역반영

**Files:**
- Create: `e2e/atlas.spec.ts`
- Modify: `components/site-header.tsx` (`NAV`에 Atlas 추가)
- Modify: `docs/superpowers/specs/2026-08-25-redesign-and-atlas.md` (§7.3·§12·§15)

**Interfaces:**
- Consumes: T11의 `/atlas`, T6의 검색 E2E
- Produces: 초록이 된 게이트

- [ ] **Step 1: 아틀라스 E2E를 쓴다**

```ts
// e2e/atlas.spec.ts
import { expect, test } from "@playwright/test";

test.describe("아틀라스", () => {
  test("셸이 붙어 있다", async ({ page }) => {
    await page.goto("/atlas/");
    await expect(page.locator("[data-site-shell]")).toHaveCount(1);
  });

  test("그래프와 목록이 함께 있다", async ({ page }) => {
    await page.goto("/atlas/");
    await expect(page.getByRole("img", { name: /지식 그래프/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "전체 목록", exact: true })).toBeVisible();
  });

  test("목록에서 고르면 상세가 뜬다", async ({ page }) => {
    await page.goto("/atlas/");
    await page.getByRole("heading", { name: "전체 목록", exact: true })
      .locator("xpath=following::button[1]").click();
    await expect(page.getByRole("heading", { name: "연결", exact: false })).toBeVisible();
  });

  test("노드 상세가 정적으로 존재하고 원문으로 이어진다", async ({ page }) => {
    // 원본 응답을 본다 — 하이드레이션이 되살리는 종류의 거짓 초록을 피한다
    const list = await page.request.get("/atlas/");
    expect(list.status()).toBe(200);

    await page.goto("/atlas/");
    const firstLink = page.getByRole("link", { name: "원문 읽기 →", exact: true });
    await page.getByRole("heading", { name: "전체 목록", exact: true })
      .locator("xpath=following::button[1]").click();
    await expect(firstLink).toHaveAttribute("href", /^\/blog\//);
  });

  test("sitemap 에 노드 상세가 새지 않는다", async ({ page }) => {
    const res = await page.request.get("/sitemap.xml");
    const xml = await res.text();
    const atlasLocs = xml.match(/<loc>[^<]*\/atlas\/[^<]*<\/loc>/g) ?? [];
    // /atlas/ 하나만 있어야 한다
    expect(atlasLocs, `sitemap 의 atlas 항목: ${atlasLocs.join(" ")}`).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 헤더에 Atlas를 노출한다**

`components/site-header.tsx`의 `NAV`에 추가한다. **라우트가 실제로 생긴 지금이 스펙 §4가 허용하는 시점이다.**

```tsx
const NAV: NavItem[] = [
  { href: "/atlas/", label: "Atlas" },
  { href: "/blog/", label: "Blog" },
];
```

- [ ] **Step 3: 전체 게이트를 돌린다**

```bash
npm run build
npm test
npx tsc --noEmit
npm run lint
npm run check-pagefind
npm run e2e
```

Expected:

| 검사 | 기대 |
| --- | --- |
| `npm test` | **190 passed** (기존 165 + 매핑 10 + 실데이터 1 + 무결성 6 + 자기검사 4 + 레이아웃 4) |
| `tsc` · `lint` | 종료코드 0 |
| `check-pagefind` | `✔` |
| `npm run e2e` | **failed 0.** T1에서 6건이던 빨강이 전부 초록이 된다 — 셸이 `/atlas/`에 붙었기 때문이다 |

⚠️ `npm run e2e`의 요약 줄을 읽어라. skip이 남아 있다면 **어느 게이트가 아직 안 열렸는지** 확인한다.

- [ ] **Step 4: 기준선을 갱신한다 — 사람이 1회만**

`check-baseline`은 T1 이전부터 exit 1이다(선행 계획서 단계 1의 토큰 변경). **이 계획서가 끝나는 지금이 갱신 시점이다.**

누르기 전에 셋을 눈으로 본다(스펙 §11.1).

```bash
npm run check-baseline
```

| 확인 | 기대값 |
| --- | --- |
| 변경된 항목 | `index.html` + `product-lead*` 9개. **`en/index.html`·`notion/index.html`·`404` 계열이 목록에 없어야 한다** |
| 새 항목 | **없어야 한다.** `atlas/`가 보이면 T11 Step 4의 제외가 안 먹은 것이다 |
| 사라진 항목 | 없어야 한다 |

`en`·`notion`이 목록에 있으면 **갱신하지 말고 원인을 먼저 찾는다.** 재설계 대상이 아니므로 그 둘이 바뀌었다면 의도치 않은 회귀다.

확인이 끝나면 갱신한다.

```bash
npm run check-baseline:update
npm run check-baseline
```

Expected: 두 번째 명령이 종료코드 **0**.

- [ ] **Step 5: 스펙에 역반영한다**

계획서와 스펙이 갈라진 채로 두지 않는다. 세 곳을 고친다.

| 스펙 위치 | 고칠 것 |
| --- | --- |
| §7.3 끝 (「태그를 그래프 노드로 넣을지…결정 사항이다」) | **D-2로 확정됐다고 적는다** — 사이드바 필터로만. 근거는 44차수 허브 |
| §12 단계 계획 표 | 단계 2와 3·4의 **순서가 바뀌었다**고 적는다. 단계 2는 이 계획서 뒤로 미뤄졌다 |
| §15 미확정 | 「태그 노드화」 항목을 **닫는다**(§7.3으로 이동) |

§6(히어로)에는 선행 계획서 T9의 실측 4건을 참조로 남긴다 — 다시 설계할 때 출발점이다.

- [ ] **Step 6: 커밋**

```bash
git add e2e/atlas.spec.ts components/site-header.tsx scripts/baseline.json docs/superpowers/specs/2026-08-25-redesign-and-atlas.md
git commit -m "feat(atlas): 헤더 노출 + E2E + 기준선 갱신

라우트가 실제로 생겼으므로 이제 헤더에 Atlas 를 넣는다 — 설계서 §4 가 허용하는 시점이다.

기준선은 여기서 **1회만** 갱신한다. 단계마다 --update 를 돌리면 그 습관이 남아
이 검사가 죽는다. en·notion·404 가 변경 목록에 없음을 확인하고 눌렀다.

스펙에 역반영: 태그 노드화를 §15 미확정에서 §7.3 결정으로 옮기고,
단계 2 와 3·4 의 순서가 바뀐 것을 §12 에 적었다."
```

---

## 완료 판정

이 계획서가 끝났다는 것은 아래가 **전부 초록**이라는 뜻이다. 하나라도 빨가면 끝나지 않았다.

| 검사 | 명령 | 기대 |
| --- | --- | --- |
| 타입 | `npx tsc --noEmit` | 0 |
| 린트 | `npm run lint` | 0 |
| 단위 | `npm test` | 190 passed |
| 빌드 | `npm run build` | 0 |
| 검색 인덱스 | `npm run check-pagefind` | `✔` |
| 기준선 | `npm run check-baseline` | **0** (T12 Step 4에서 갱신 후) |
| E2E | `npm run e2e` | **failed 0** |
| 한글 검색 | `node scripts/probe-search.mjs` | `✔ 관문 통과` |
| GC-11 | `git diff --name-only <시작커밋>..HEAD \| grep -c '^pages/index.tsx'` | **0** |
| GC-12 | `git diff --name-only <시작커밋>..HEAD \| grep -c '^\(pages/blog/\|content/blog/\)'` | **0** |

마지막 두 줄이 **이 계획서의 약속**이다 — 메인과 블로그를 건드리지 않고 새 기능을 붙였다는 것.

---

## 후속 계획서로 넘긴 것

**여기서 멈추는 이유:** 스펙 §12가 *「단계 3~4는 앞 단계의 **실물을 보고** 써야 추측이 섞이지 않는다」*고 지시한다. 아래는 전부 T2·T8의 **실측 수치를 봐야 설계가 정해지는** 것들이다.

| 항목 | 스펙 | 무엇을 보고 정하나 |
| --- | --- | --- |
| Canvas 2D 렌더러 | §7.5 | **엣지 수.** 300 이하면 SVG 하나로 충분해 이 작업 자체가 불필요하다 |
| 렌더러 자동 선택 · Three 승격 | §7.7 | 위와 같음. Canvas가 없으면 승격 로직도 없다 |
| 렌즈 3종 (전체·토픽별·클러스터별) | §7.6 | 클러스터 탐지(Louvain)는 **엣지 밀도**에 따라 결과가 쓸모 있는지가 갈린다 |
| 좌측 토픽·태그 사이드바 필터 | §7.8 | ⚠️ **D-2가 「태그는 사이드바 필터로만 쓴다」고 정했는데 이 계획서는 그 사이드바를 만들지 않는다.** T11의 노드 패널이 태그를 나열하는 것이 전부다. 고유 태그 64개 중 **10개는 1회만 등장**하므로 필터로서 쓸모가 있는지는 그래프 실물을 보고 정한다 |
| 검색 결과에 아틀라스 노드 섹션 | §8.4 | T4의 한글 분절 실측치 |
| `claim`·`procedure` 노드 (LLM 원자노트) | §7.9 · 단계 5 | 1차 데이터의 실물 |
| 히어로 재설계 | §6 | 이 계획서 §「이월된 것」의 실측 4건 |
| `/work` · `/about` · `product-lead*` 스텁 | §4 | 선행 계획서 T11~T13 그대로 |

**후속 계획서를 쓰기 전에 이 계획서의 「실측 기록」 절과 T8 Step 5의 출력을 먼저 읽어라.**

