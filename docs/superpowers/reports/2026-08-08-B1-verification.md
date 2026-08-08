# B1 검증 보고서 — `agentic-coding` 편1~5

**작성일**: 2026-08-08
**검증 대상**: `docs/superpowers/reports/2026-08-08-B1-conversion-report.md`
**검증자**: 구현에 참여하지 않은 별도 에이전트. 전 항목 직접 실행.

> 형식: 항목별로 ① 보고서 주장 ② 실행 명령 ③ 실제 출력 요약 ④ 판정.
> **불일치는 굵게 표시.**

---

## 1. 빌드 체인

| 항목 | 명령 | 종료코드 | 결과 |
| --- | --- | --- | --- |
| 타입체크 | `npx tsc --noEmit` | 0 | 통과 |
| 테스트 | `npm test` | 0 | Test Files 3 passed (3) · Tests 36 passed (36) — 보고서 §7-2 주장과 일치 |
| 빌드 | `npm run build` | 0 | `✓ Compiled successfully` · `✓ Generating static pages (157/157)` |

**sitemap**: `[sitemap] 148개 URL 생성`. 보고서 주장(142→148, +6, 발행본 5 + 카테고리 페이지 1)과 **일치**.

## 2. 편별 실측 KB

```
builtin-tools-attack-surface.md     24412 B  24.4 KB
claude-code-autonomy-tiers.md       20498 B  20.5 KB
claude-md-enforcement.md            20494 B  20.5 KB
reversibility-before-permission.md  15479 B  15.5 KB
settings-permissions-deny.md        20434 B  20.4 KB
합계                                101317 B 101.3 KB
```

보고서 §1 표(편1 15.5·편2 20.5·편3 24.4·편4 20.4·편5 20.5·계 101.3KB)와 **완전히 일치**.

## 3. 도식(mermaid) 수 — 펜스 추적

```
builtin-tools-attack-surface.md      mermaid=5
claude-code-autonomy-tiers.md        mermaid=5
claude-md-enforcement.md             mermaid=4
reversibility-before-permission.md   mermaid=2
settings-permissions-deny.md         mermaid=3
합계 19
```

편별 대응(설계값): 편1 2 · 편2(claude-code-autonomy-tiers) 5 · 편3(builtin-tools-attack-surface) 5 · 편4(settings-permissions-deny) 3 · 편5(claude-md-enforcement) 4 — 보고서 §2 표와 **완전 일치**.

원본 `02` mermaid 수(같은 awk 펜스 추적): **17개**. 보고서 주장("`02`의 원본 mermaid 17개가 전부 살아남았다", 편2~5 합 5+5+3+4=17)과 **일치**.

## 4. 표(table) 수 — 펜스 추적

편별(발행본): builtin-tools-attack-surface 15 · claude-code-autonomy-tiers 13 · claude-md-enforcement 14 · reversibility-before-permission 7 · settings-permissions-deny 10. 편2~5 합 = 15+13+14+10 = **52**.
원본 `02` 전체 표(펜스 추적): **52**.

절 위치 대조로 "−3" 근거 확인: 표 #50·#51은 `## 13. 면접 활용 포인트` 절 내부(2개), 표 #52는 `## 14. 인용 시 주의` 절 내부(1개) — 52 − 3 = 49.

보고서 §2-1 주장("발행 대상 49, 편2~5 발행본 표 실측 52, 차 +3")과 **완전 일치**.

## 5. 내부 링크 전건 실재 확인

`grep -o` 로 추출한 링크 대상(agentic-coding 5편 + ai-agent 1편)을 파일 시스템에 대조 — **MISSING 0건**. 6개 대상 파일 전부 `test -f`로 개별 재확인, 전부 EXISTS.

보고서 §7-3 주장("깨진 링크 0")과 **일치**.

### 5-1. §7-3 편간 링크 수 세부 대조

| 방향 | 보고서 주장 | 실측(`grep -o` 카운트) | 판정 |
| --- | ---: | ---: | --- |
| 편2(claude-code-autonomy-tiers) → 편4(settings-permissions-deny) | 3 | 3 | 일치 |
| 편4(settings-permissions-deny) → 편5(claude-md-enforcement) | 3 | 3 | 일치 |
| 편5(claude-md-enforcement) → 편3(builtin-tools-attack-surface, 역방향) | 1 | 1 | 일치 |
| 외부 `harness-five-primitives` (편1·편5) | 2건 | 편1 1 + 편5 1 = 2 | 일치 |

들어오는 링크 0인 편이 있는지 직접 대조 — 5편 전부 최소 1편 이상에서 참조됨. "들어오는 링크 0인 편 없음" **일치**.

## 6. 금칙어·민감정보 재검사

```
PS> Select-String ... -Pattern "면접|커닝페이퍼|암기용|화이트보드|이력서|강의|수강|Part [0-9]|CH0[0-9]"
(0건)
PS> Select-String ... -Pattern "히츠|야나두|TVING|티빙|BTV|허우용|채용|teddylee|teddynote|argus|FASTCAMPUS|실장"
(0건)
```

보고서 §7-1 주장(둘 다 0건)과 **일치**.

### 6-1. 추가 조사 — "강사"(보고서 검사 패턴에 없는 인접어)

보고서의 금칙어 정규식에 `강사`가 없어 별도로 확인했다. 원본 `02` L1213에 `강사가 운영한다고 소개한 개인 시스템`이라는 문구가 있으나, 발행본 5편 전체에서 `강사` 매치 **0건**, 해당 수치(`54개`·`4,829`) 잔존도 **0건**. 실제 유출은 없다 — 다만 §7 항목 참고.

## 7. frontmatter 정합성 (5편 전수)

| 검사 | 결과 |
| --- | --- |
| `category: "agentic-coding"` | 5편 전부 일치 |
| `source: "AI 에이전트 실무 과정"` | 5편 전부 일치 |
| `series`/`seriesOrder` | claude-code-autonomy-tiers(1) → builtin-tools-attack-surface(2) → settings-permissions-deny(3) → claude-md-enforcement(4), series="claude-code-tools"로 연속. `reversibility-before-permission`은 series 필드 없음(독립편) |
| `tags:` 어휘 실재 | 사용된 11개 태그(`claude-code`·`knowledge-management`·`troubleshooting`·`engineering-leadership`·`mcp`·`ai-automation`·`context-engineering`·`security`·`ai-governance`·`observability`·`org-design`) 전부 `content/blog/tags.ts`의 `blogTags` 배열(STACK/ENGINEERING/AI/PRODUCT/SEARCH/MISC)에 실재. 빌드 통과가 이를 간접 재확인 |

보고서 §8 태그 패싯 표(편1 C1B1D2 · 편2 C2A1D1 · 편3 C2B2 · 편4 C2B2 · 편5 C2D2, 같은 패싯 최대 2 위반 0)와 **완전 일치**.

`claude-code` 태그 사용 파일 수: `content/blog` 전체에서 grep — **7개**(agentic-coding 5편 + ai-agent 2편: `code-execution-sandbox-limits`, `harness-five-primitives`). 보고서 "2편 → 7편" 주장과 **일치**.

## 8. §4-3 ㉢ 귀속 구분 3건 — 원문 대조

인용문 실재 및 라인 번호를 전부 대조했다.

| 항목 | 보고서 주장 위치 | 실측 위치 | 판정 |
| --- | --- | --- | --- |
| ㉢-1 | 편3 L63 | L63 | 일치 |
| ㉢-2 (편3) | 편3 L366 | L366 | 일치 |
| ㉢-2 (편5, 로드맵 언급) | 편5 L279 | L279 | 일치 |
| ㉢-2 (편5, 4단계 재인용) | 편5 L321 | L321 | 일치 |
| ㉢-3 | 편4 L119 | L119 | 일치 |

인용 조건 각주 위치도 전수 대조: 편1 L202~205, 편2 L304~307, 편3 L365~367, 편4 L393~395, 편5 L319~321 — **전부 라인 단위로 일치**. 상단 시점 고지 인용블록(편1 L17, 편2~5 각 L19)도 **전부 일치**.

## 9. §6-1 `settings.local.json` 중복 처리

편4(`settings-permissions-deny.md`)에서 §8-9 표 행(L248 `settings.local.json`을 커밋)과 별도 거버넌스 인용블록(L252 `> **권한·거버넌스 안티패턴 — settings.local.json을 Git에 커밋**`)이 **둘 다 실재**. 보고서 주장과 **일치**.

## 10. §7-4 `02 §12-2` 6행 배분

편5(`claude-md-enforcement.md`) L285~289에서 행1·2·3·4·6 문구(CLAUDE.md 하나에 몰아넣기 / 여러 파일 복사 / 분류체계 없이 양산 / Never-Do 수동 작성 / enforcement 없이 문서로만)가 **정확한 순서로 실재**. 행5(`settings.local.json` 커밋)만 편4 L252로 분리된 것도 §9에서 확인. 보고서 §7-4 주장과 **일치**.

---

## 발견된 불일치 (2건)

### ⚠️ 불일치 1 — §4-1 `01` 파일 `강의` 행수: 보고서 17행 vs 실측 18행

```bash
$ grep -c '강의' 01-환경설정과-CLI-기초.md
18
```

`grep -n`으로 전체 나열한 결과 L3, L5, L77, L109, L123, L129, L191, L212, L250, L258, L285, L302, L411, L490, L554, L560, L561, L567 — **18줄**.

보고서는 "B1 범위에 드는 것은 6행(L302·L490·L554·L560·L561·L567), 나머지 11행은 드롭 절"이라고 적어 6+11=17을 주장하지만, 드롭 절에 있는 행을 실제로 세면 L3,L5,L77,L109,L123,L129,L191,L212,L250,L258,L285,L411 = **12행**이다. 6+12=**18**이 맞다.

**영향 평가**: B1 범위(6행)의 처리 자체는 보고서·발행본 대조로 이미 정확함을 확인했다(§8). 이 오차는 드롭 절 행수 집계 실수이며 **발행 결과물에는 영향 없음** — 드롭 절은 어차피 전량 미발행이다.

### ⚠️ 불일치 2 — §4-2 `02` 갈래별 분류표의 L1213 인용 오류

보고서 §4-2 표는 "조건 이관으로 흡수" 갈래에 L1207·L1213 두 행을 지목한다. 그러나 원문 L1213을 직접 확인하면:

```
1213:| 규칙 파일 54개·4,829줄·30+ 에이전트 시스템 | 강사가 운영한다고 소개한 개인 시스템 | ...
```

이 행에는 `강의`가 아니라 **`강사`**가 나온다(`grep -n '강의'` 매치 목록에 L1213은 없음). 반대로 L647(`| 모드 (강의 표기) | 정책 성격 | ...`)은 실제로 `강의`를 포함하지만 보고서의 19행 분류표 어디에도 등장하지 않는다.

```
$ grep -n '강의' 02-ClaudeCode-핵심도구와-명령어.md
... 647:| 모드 (강의 표기) | 정책 성격 | 적합한 환경 |   ← 분류표 누락
... (L1213 없음, 대신 강사가 등장)
```

**우연히 총량(19)은 맞다** — L1213(오분류) ↔ L647(누락)이 서로 상쇄돼 개수가 맞아떨어진 것으로 보인다.

**영향 평가**: 발행본 대조 결과 둘 다 정상 처리됐다.
- L647 원문 `모드 (강의 표기)` → 편4(`settings-permissions-deny.md`) L123 `모드 (원 자료 표기)`로 정상 치환.
- L1213 원문(`강사가 운영한다고 소개한 개인 시스템`, `54개`·`4,829줄`)은 발행본 5편 전체에서 **grep 0건** — 정상 드롭.

즉 **실제 변환 결과물에는 문제가 없으나, 보고서 §4-2 표의 라인 인용 자체에는 오류가 있다.**

---

## 미실행 항목

없음. 브리프의 7개 항목 전부 직접 실행해 확인했다.

## 결론

**대체로 일치, 단 2건의 경미한 보고서 기술 오류 발견 — 실질 결함 아님.**

빌드/테스트/타입체크, 편별 KB, 도식 수, 표 수, 내부 링크, 편간 링크 수, 금칙어·민감정보, frontmatter(카테고리·시리즈·소스·태그), ㉢ 3건과 인용 조건 각주 위치, `settings.local.json` 중복 처리, `02 §12-2` 6행 배분까지 — **보고서의 핵심 수치·위치 주장은 전수 재현되어 일치했다.**

다만 §4-1의 "`01` 17행" 주장은 실측 18행이 맞고, §4-2의 "`02` 19행 분류표"는 L1213(실제로는 `강사`)을 잘못 포함하고 L647(`강의` 실재)을 누락한 채 우연히 총합이 맞아떨어졌다. 두 오차 모두 **발행본 자체의 품질에는 영향을 주지 않았음**을 직접 확인했다(드롭 절은 전량 미발행, L647·L1213 둘 다 발행본에서 정상 처리됨을 grep으로 재확인).
