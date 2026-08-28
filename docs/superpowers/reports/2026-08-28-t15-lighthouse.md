# T15 — Lighthouse CI, 경고로만

> 2026-08-28 · 브랜치 `feat/redesign-stage2` · 종료 정책 = **푸시까지**
> 정본 계획서: [`plans/2026-08-25-redesign-phase-1-2.md` §Task 15](../plans/2026-08-25-redesign-phase-1-2.md)
> 선행 경위: [`t14-orphans.md` §R58·§R60](2026-08-28-t14-orphans.md) — 문자열 grep 검사와 공허하게 참인 단언

이 태스크의 산출물은 **경고 하나뿐이다.** 배포를 막는 것이 없다.
그래서 이 문서의 요점은 라이트하우스가 아니라 **「아무것도 막지 않는 잡을 어떻게 검증하는가」**다.

```mermaid
flowchart TB
    subgraph 딱딱["딱딱한 게이트 — deploy.yml"]
        DEP["Content invariants<br/>(vitest 430)"] --> CFG["설정이 말이 되는가<br/>tests/ci/lighthouse-workflow.test.ts"]
    end
    subgraph 무른["무른 경고 — lighthouse.yml"]
        LH["lhci autorun<br/>continue-on-error: true"] --> NUM["수치는 warn<br/>배포를 막지 않는다"]
    end
    CFG -.->|"URL 실재 · 단언 전부 warn<br/>· 빌드 순서 · 버전 고정"| LH
```

**분리가 핵심이다.** 「경고로만 돈다」는 설계 결정은 **수치**에 대한 것이지 **설정**에 대한 것이 아니다.
수치는 무르게 두고, 설정이 말이 되는지는 배포 게이트 안에서 딱딱하게 막는다.

---

## 만진 것

| 파일 | 무엇 |
| --- | --- |
| `lighthouserc.json` **신규** | 측정 대상 5 URL · 단언 4종 **전부 `warn`** · `staticDistDir: ./out` |
| `.github/workflows/lighthouse.yml` **신규** | `pull_request` + `workflow_dispatch`. `deploy.yml` 을 건드리지 않는다 |
| `tests/ci/lighthouse-workflow.test.ts` **신규** | 단언 **19개**. 위 두 파일이 T15 의 주장을 지키는지 검사 |
| `.gitignore` | `/.lighthouseci/` 추가 |

`deploy.yml` 은 **한 글자도 바뀌지 않았다.** T14 가 붙인 E2E 게이트와
`tests/ci/deploy-workflow.test.ts` 의 단언 5개가 그대로다.

---

## 계획서에서 벗어난 것 4가지

계획서는 T13 → T14 에서 이미 한 번 화석으로 판명됐다([`t13-stubs.md` §R49](2026-08-28-t13-stubs.md)).
이번에도 **읽지 말고 다시 쟀다.**

| # | 계획서 | 실제 | 왜 |
| --- | --- | --- | --- |
| 1 | `upload.target: "temporary-public-storage"` | `filesystem` + Actions 아티팩트 | **공개 저장소에 리포트를 올린다.** 이 브랜치의 `/work`·`/about` 은 아직 `main` 에 없다 — 배포 전 화면을 외부에 먼저 공개하게 된다 |
| 2 | URL 4개 | **5개** (블로그 글 1편 추가) | 사용자 선택(핵심 5개 내외). 블로그 글 페이지는 220개인데 계획서 4개에 **한 편도 없었다** — 가장 무거운 라우트가 측정 밖이었다 |
| 3 | `actions/checkout@v4` · `setup-node@v4` | **`@v6`** | `deploy.yml` 과 맞췄다. 이 워크플로는 PR 에서만 돌아 로컬 실증이 불가능하므로 **실제 CI 에서 돌아 본 적 있는 버전**이 유일한 근거다 |
| 4 | (없음) | `tests/ci/lighthouse-workflow.test.ts` | 아래 §R62 |

---

## 검증

| 항목 | 명령 | 결과 |
| --- | --- | --- |
| 타입 | `npx tsc --noEmit` | 종료 0 |
| lint | `npm run lint` | 종료 0 · 경고 0 |
| 단위 | `npm test` | **430 통과** (T14 411 + 신규 19) |
| E2E | `npm run e2e` | **238/238 · skip 0** (첫 줄 확인 — 가드 거부 아님) |
| 검사 유효성 | 뮤테이션 15종 | **15/15 사멸** (1차 10/11 → §R62 · 신규 4종은 §R65) |
| 실물 수치 | 로컬 Lighthouse 5 라우트 | 아래 표 |

### 계획서 Step 3 — 실측 수치

로컬(Windows · 모바일 에뮬레이션 기본값 · `serve out`) 1회 측정.
**CI(ubuntu · `numberOfRuns: 3`) 값과 다르다.** 비교 기준이 아니라 **자릿수 감각**으로만 쓴다.

| 라우트 | Performance | Accessibility | LCP | CLS |
| --- | --- | --- | --- | --- |
| `/` | 82 | 100 | 3864ms ⚠️ | 0.001 |
| `/work/` | 94 | 100 | 2878ms ⚠️ | 0.000 |
| `/about/` | 99 | 100 | 2108ms | 0.013 |
| `/blog/` | 87 | 100 | 3398ms ⚠️ | 0.025 |
| `/blog/agentic-coding/deploy-checklist-debugging/` | 68 ⚠️ | 96 | 3019ms ⚠️ | 0.227 ⚠️ |

예산: Performance ≥ 80 · Accessibility ≥ 95 · LCP ≤ 2500ms · CLS ≤ 0.100.

**이 표가 `warn` 을 정당화한다.** `error` 였다면 5개 중 **4개가 LCP 에서 즉시 빨갛다.**
「매번 배포가 막히면 게이트를 꺼 버린다」는 계획서의 문장은 가정이 아니라 이 표다.

⚠️ Accessibility 는 5개 전부 96~100 이다. T10~T12 가 접근성을 별도 리뷰 축으로 돌린 것의
**독립 증거**다 — 그 축이 없었다면 이 수치를 지금 처음 봤을 것이다.

### CI 실측 (PR #2 첫 실행 · ubuntu · `numberOfRuns: 3`)

`Checking assertions against 5 URL(s), 15 total run(s)` — 실제로 5×3 회를 수집했다.
경고가 뜬 것은 **2개 라우트뿐**이다.

| 라우트 | 단언 | 판정값 | 3회 원값 |
| --- | --- | --- | --- |
| `/work/` | LCP ≤ 2500 | **2717ms** ⚠️ | 5710 · 5687 · **2717** |
| 블로그 글 | Performance ≥ 0.8 | **0.70** ⚠️ | **0.70** · 0.48 · 0.49 |
| 블로그 글 | LCP ≤ 2500 | **2891ms** ⚠️ | **2891** · 8043 · 7641 |
| `/` · `/about/` · `/blog/` | — | 경고 없음 | — |

🔴 **판정값이 3회의 중앙값이 아니라 「가장 좋은 회차」다.** 위 표의 굵은 값이 전부 최선값이다 —
LCP 는 최소, Performance 는 최대. LHCI 의 기본 집계가 **낙관적(optimistic)** 이기 때문이다.

그래서 이 표는 두 가지를 동시에 말한다.

| 읽는 법 | 뜻 |
| --- | --- |
| 경고가 **뜬** 2개 | 3회 중 **가장 좋은 회차에서도** 예산을 넘겼다 — 확실한 초과다 |
| 경고가 **안 뜬** 3개 | **통과했다는 증거가 아니다.** 최선의 회차만 통과했을 수 있다 |

로컬에서 `/` 가 3864ms 였는데 CI 에서 경고가 없는 것이 그 경우다 — 3회 중 하나가 2500 이하였다.
편차도 크다(`/work/` 는 2717~5710 으로 2배). **러너 변동이 예산 폭보다 크므로,
이 경고를 회귀 탐지에 쓰려면 `aggregationMethod` 를 median 으로 바꾸고 `numberOfRuns` 를 올려야 한다.**
지금은 그러지 않았다 — 값이 몇 번 쌓이기 전에 임계를 손대면 무엇을 조정한 것인지 알 수 없다.

---

## R62 — 🔴 YAML 파서까지 내려가도 **`run:` 블록 안의 셸 주석은 못 본다**

T14 의 §R58 은 문자열 grep 대신 **YAML 파싱**으로 검사하라는 교훈이었다.
그것을 그대로 따랐는데도 뮤턴트 하나가 **생존했다.**

```
생존 ❌   lhci autorun 을 주석으로
```

뮤턴트는 `run:` 블록의 `lhci autorun` 을 `# lhci autorun` 으로 바꾼 것이다.
YAML 파서에게 `run` 의 값은 **여러 줄짜리 문자열 하나**다. 셸 주석은 파서의 관심사가 아니므로
`step.run.includes("lhci autorun")` 은 **여전히 참**이다.

| 검사 층위 | 잡는 것 | 놓치는 것 |
| --- | --- | --- |
| 문자열 grep (T14 이전) | — | 주석 처리된 **스텝** |
| YAML 파싱 (T14 §R58) | 주석 처리된 스텝 | 주석 처리된 **명령 줄** |
| **셸 주석 제거 (여기)** | 둘 다 | (미확인) |

고친 방법은 파싱을 한 층 더 내리는 것이다 — `run` 을 줄로 쪼개고 `#` 이후를 잘라낸 뒤 검사한다.

```ts
function activeRunLines(step: WorkflowStep): string[] {
  if (typeof step.run !== "string") return [];
  return step.run
    .split("\n")
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean);
}
```

**교훈은 「셸 주석도 지워라」가 아니다.** 그건 이번에 걸린 층일 뿐이다.
진짜 교훈은 **검사기가 대상을 어느 층위에서 읽는지와, 실제로 그 대상을 실행하는 주체가
어느 층위에서 읽는지가 다르면 그 틈이 곧 거짓 초록**이라는 것이다.
GitHub Actions 는 YAML 을 파싱한 **뒤 `run` 을 셸에 넘긴다.** 검사기가 첫 단계에서 멈추면
두 번째 단계의 변경을 보지 못한다.

⚠️ 리뷰로는 이걸 못 봤을 것이다. 코드는 T14 의 교훈을 정확히 따른 것처럼 보인다.
**뮤테이션만이 「따른 것처럼 보이는 것」과 「실제로 잡는 것」을 구분했다.**

---

## R63 — 아무것도 막지 않는 잡은 **자기 자신이 망가진 것도 못 알린다**

`lighthouse.yml` 의 lhci 스텝은 `continue-on-error: true` 다. 그리고 `lighthouserc.json` 의
단언은 전부 `warn` 이다. 그 둘을 곱하면 이 잡은 **다음 상황에서 전부 초록이다.**

| 망가진 방식 | 잡의 색 |
| --- | --- |
| 측정 URL 이 전부 404 (글이 삭제·개명됨) | 🟢 초록 — LHCI 가 404 페이지의 **아주 좋은 점수**를 보고한다 |
| `lhci autorun` 이 실행되지 않음 | 🟢 초록 |
| 수집 0건 | 🟢 초록 |
| 단언이 0개 | 🟢 초록 |
| 누군가 `warn` 을 `error` 로 바꿈 | 🟢 초록 (그리고 PR 이 상시 빨개진다) |

`continue-on-error` 를 떼는 것은 답이 아니다 — 그러면 경고가 게이트가 되어 설계 결정이 뒤집힌다.
답은 **검사 대상을 옮기는 것**이다. 수치는 무르게 두고, **설정을 딱딱한 게이트 안에서** 본다.

`tests/ci/lighthouse-workflow.test.ts` 는 `deploy.yml` 의 `Content invariants` 단계에서 돈다.
즉 라이트하우스 설정이 망가지면 **라이트하우스 잡이 아니라 배포가 막힌다.**

특히 「측정 URL 이 실재하는가」는 `out/` 이 아니라 **소스**를 본다.
이 스위트는 `Build` 보다 **먼저** 돌기 때문이다 — `out/` 실재를 검사하면 CI 에서 늘 실패하고,
그러면 이 검사를 꺼 버리게 된다. CLAUDE.md 의 「지켜지지 않을 규칙은 규칙 전체를 죽인다」와 같은 계열이다.

---

## R64 — `lhci autorun` 이 이 환경(Windows)에서 죽는다. CI 는 무관하다

```
Runtime error encountered: EPERM, Permission denied:
  \\?\C:\Users\...\AppData\Local\Temp\lighthouse.13667800
    at Launcher.destroyTmp (chrome-launcher.js:367:9)
```

첫 URL 첫 회차에서 죽는다. 원인은 라이트하우스가 아니라 **chrome-launcher 의 임시 폴더 정리**이고,
스택이 보여주듯 **감사가 끝난 뒤** `kill()` → `destroyTmp()` 에서 난다.

| 봐야 할 것 | 실제 |
| --- | --- |
| 종료 코드 | 1 |
| 감사 완료 여부 | **완료됨** — 로그에 `Generating results...` 가 있다 |

그래서 수치를 얻는 방법은 **종료 코드가 아니라 파일 존재로 판정하는 것**이다.
`lighthouse --output-path=<파일>` 로 URL 마다 따로 돌리면 리포트가 남는다(위 표가 그 결과다).

⚠️ ~~CI 는 ubuntu 이므로 이 문제는 나지 않는다. 하지만 그것을 실증할 수단이 지금 없다.~~
**확인됐다(PR #2)** — ubuntu 러너에서 15회 수집이 전부 정상 종료했다. 이 함정은 로컬 전용이다.

---

## R65 — 🔴 리포트 15개를 쓰고 0개를 올렸다. **두 스텝 모두 초록이었다**

PR #2 를 열자마자 나온 결함이다. 위 §미확인 표에 *「`actions/upload-artifact@v7` 동작 —
리포에 선례가 없는 버전이다」* 로 적어 둔 항목이 **실제로 터졌다.**

```
Lighthouse CI            Dumping 15 reports to disk at .../.lighthouseci...
Lighthouse CI            Done writing reports to disk.
Upload Lighthouse report ##[warning]No files were found with the provided path: .lighthouseci/.
                         No artifacts will be uploaded.
```

원인은 라이트하우스가 아니다. **`upload-artifact` 는 v4.4 부터 숨김 파일을 기본 제외한다.**

```
include-hidden-files: false     ← 기본값. 로그에 찍혀 있었다
path: .lighthouseci/            ← 점으로 시작 = 숨김
```

`lhci` 의 관례적 출력 경로가 하필 점으로 시작한다. 한 줄(`include-hidden-files: true`)로 고쳤다.

**여기서 값어치 있는 것은 수정이 아니라 실패의 모양이다.**

| 스텝 | 결과 | 실제로 한 일 |
| --- | --- | --- |
| Lighthouse CI | ✅ 초록 | 리포트 15개를 디스크에 씀 |
| Upload Lighthouse report | ✅ 초록 | **0개 업로드** — `if-no-files-found: warn` 이라 경고로만 |

두 스텝이 각자 자기 일을 했다고 보고했고, **아무도 둘 사이가 끊긴 것을 보지 않았다.**
이 리포가 반복해 데인 「없다와 읽을 수 없었다가 같은 출력으로 나온다」의 또 한 형태다 —
이번엔 **「썼다」와 「전달됐다」가 둘 다 초록으로 나온다.**

`if-no-files-found: error` 로 바꾸면 잡이 빨개지지만, 그러면 이 워크플로가 게이트가 되어
설계 결정(§R63)이 뒤집힌다. 그래서 여기서도 **검사를 딱딱한 쪽으로 옮겼다** —
`tests/ci/lighthouse-workflow.test.ts` 에 단언 3개를 더했다.

| 단언 | 잡는 것 |
| --- | --- |
| 업로드 경로 == `rc` 의 `outputDir` | 두 파일이 다른 곳을 가리키는 것 |
| 숨김 경로면 `include-hidden-files: true` | 이번 결함 그대로 |
| 업로드 스텝 존재 | 스텝을 통째로 지우는 것 |

뮤테이션 **15/15 사멸**(신규 4종 포함).

⚠️ **리뷰로는 못 잡았을 것이다.** `path: .lighthouseci/` 는 어느 각도에서 봐도 맞는 경로다.
잡은 것은 **실행**이다 — 그래서 「PR 이 첫 실행」이라는 미확인 항목을 표에 적어 둔 것이
실제로 값을 했다. 적어 두지 않았다면 이 로그를 읽지 않았을 것이다.

---

## 미확인으로 남는 것 — 4건 중 **3건이 PR #2 에서 닫혔다**

| 무엇 | 상태 |
| --- | --- |
| ~~`lighthouse.yml` 이 CI 에서 실제로 도는지~~ | ✅ **닫힘.** `Checking assertions against 5 URL(s), 15 total run(s)` |
| ~~ubuntu 에서의 실제 수치~~ | ✅ **닫힘.** 위 §CI 실측 — 경고 2개 라우트, 낙관적 집계 |
| ~~`actions/upload-artifact@v7` 동작~~ | 🔴 **닫혔고, 결함이었다** — §R65 |
| `workflow_dispatch` 수동 실행 | ❌ **여전히 미확인.** 워크플로 파일이 **기본 브랜치에 있어야** Actions UI 에 뜬다. 머지 후에야 확인된다 |

### 새로 드러난 미확인

| 무엇 | 왜 |
| --- | --- |
| ~~`include-hidden-files: true` 가 실제로 15개를 올리는지~~ | ✅ **닫힘** — 아래 §R66 |
| **`deploy.yml` 이 PR 에서 돌지 않는다** | 트리거가 `push: [main]` 뿐이다(`pull_request` 0건). 즉 lint · tsc · vitest · 금칙어 · 발행본 수 · **T14 가 승격시킨 E2E 게이트**가 **PR 단계에서 하나도 돌지 않는다.** 머지 후 `main` 에서 처음 돌고, 빨개지면 배포는 막히지만 **커밋은 이미 `main` 에 있다** — 「배포 전 차단」이 아니라 「배포 실패 후 복구」다 |

⚠️ 두 번째 항목은 T15 가 만든 것이 아니라 **원래 그랬던 것**이고, T14 가 E2E 를 승격시키면서
값이 올라간 자리다. 고치려면 `deploy.yml` 에 `pull_request` 트리거를 더해야 하는데,
그것은 T14·T15 가 지킨 「`deploy.yml` 을 건드리지 마라」와 충돌한다 — **사용자 판단 대상이다.**

---

## R66 — 수정을 「받아서 세어」 확인했다. 그러다 **예산의 실효성이 드러났다**

§R65 를 고친 뒤 재실행(`66ab14b`)에서 **스텝 색깔을 보지 않고 아티팩트를 내려받아 셌다.**
「스텝이 초록」은 §R65 가 보여줬듯 증거가 아니기 때문이다.

| 확인 단계 | 결과 |
| --- | --- |
| 아티팩트가 존재하는가 | ✅ `lighthouse-report` · **18,809,391 bytes** |
| 안에 리포트가 있는가 | ✅ **62 파일** — `lhr-*.{html,json}` 15쌍 + `localhost-*.report.{html,json}` 15쌍 + `manifest.json` + `assertion-results.json` |
| **어느 라우트가 몇 번** 돌았는가 | ✅ 파일명으로 확인 — `index_html` ×3 · `work` ×3 · `about` ×3 · `blog_index` ×3 · 블로그 글 ×3 |

마지막 줄이 요점이다. 로그의 `15 total run(s)` 는 **합계**만 말한다.
파일명은 **어느 라우트가 빠졌는지**를 말한다 — 한 라우트가 5번 돌고 다른 라우트가 0번 돌아도
합계는 15다. CLAUDE.md 의 「화면은 열어서 그려진 요소를 세라」와 같은 계열이다.

### 🔴 그러다 예상하지 못한 것이 나왔다 — 같은 페이지인데 경고가 3 → 4 로 늘었다

이번 커밋이 바꾼 것은 **워크플로 · 검사기 · 문서뿐**이다. 페이지는 한 바이트도 다르지 않다.

| 실행 | 경고 | 무엇이 달랐나 |
| --- | --- | --- |
| `d938c4a` (1차) | **3건** | LCP ×2 · Performance ×1 |
| `66ab14b` (2차) | **4건** | 위 3건 + **블로그 글 CLS 0.209** |

`assertion-results.json` 이 4건 전부 `level: "warn"` 임을 확인해 준다 — `error` 0건.
설계 결정이 실행에서도 지켜졌다는 **독립 증거**다.

그러나 **CLS 경고는 코드가 아니라 러너가 만들었다.** 위 §CI 실측에서 「러너 변동이 예산 폭보다 크다」고
적은 것이 두 실행 사이에서 그대로 재현된 것이다.

⚠️ **이 워크플로를 회귀 탐지에 쓰면 안 된다는 뜻이다.** 지금 상태로는
「경고가 늘었다」가 **코드가 나빠졌다는 신호가 되지 못한다.** 쓸 수 있는 것은 두 가지뿐이다.

| 쓸 수 있는 것 | 쓸 수 없는 것 |
| --- | --- |
| **자릿수** — 68점대와 95점대의 차이 | 3 → 4 같은 **건수 변화** |
| 낙관적 집계에서도 넘긴 **확실한 초과** | 경고가 사라진 것을 「개선」으로 읽기 |

고치려면 `aggregationMethod` 를 median 으로 바꾸고 `numberOfRuns` 를 올려야 한다.
**지금 하지 않는다** — 값이 몇 번 쌓이기 전에 임계를 손대면 무엇을 조정한 것인지 알 수 없다.
이 문단이 그 판단의 근거로 남는다.

---

## 다음 태스크에 넘기는 것

원계획 `2026-08-25-redesign-phase-1-2.md` 의 **T9~T15 가 전부 끝났다.**
남은 판단은 사용자에게 있다 — *"만들려고 했던 작업을 끝까지 마무리 지어보고 내가 다시 판단할께."*

| # | 무엇 | 상태 |
| --- | --- | --- |
| 1 | `main` 대상 PR — 위 §미확인 4건이 전부 여기서 닫힌다 | 사용자 판단 |
| 2 | `e2e/global-setup.ts` 의 `SOURCES` 에 `package-lock.json`·`tsconfig.json` 추가 | HANDOFF §2-3 부터 대기 중 |
| 3 | `deploy.yml` 의 `check-baseline` 주석 해제 | HANDOFF §2-3 부터 대기 중 |
| 4 | `/atlas` 재설계 — 엣지 1,053 중 156 만 그린다 | 실물을 보고 판단 |
