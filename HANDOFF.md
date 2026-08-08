# 인수인계 (HANDOFF)

**갱신일**: 2026-08-08
**브랜치**: `main` (origin과 동기, 배포 완료 `629ea9c`)
**작업트리**: 이 문서와 `CHANGELOG.md`·요구사항 §15·설계서 갱신분만 미커밋 / stash 없음

---

## 1. 이번 세션에서 한 일

**`ai-agent` 카테고리 51편을 발행했다.** 원본 16편 878KB를 15개 시리즈로 나눴고, 블로그가 31편에서 **82편**이 됐다.

```
https://withwooyong.github.io/blog/
  ├─ AI 에이전트         51편   ← 이번 세션
  ├─ RAG · 검색증강생성  25편
  └─ 검색 엔지니어링      6편

sitemap 142 URL · 시리즈 22개 · 도식 261개
```

### `ai-agent` 구성

| 층위 | 시리즈 | 편수 |
| --- | --- | ---: |
| 기초 | `agent-fundamentals` · `crewai-autogen` · `langchain-fundamentals` | 7 |
| 실행 모델 | `langgraph-core` · `self-correcting-rag` · `multi-agent-patterns` | 10 |
| 제품 클론 | `perplexity-clone` · `chatgpt-clone` · `report-automation` · `coding-agent` | 9 |
| 담론 2025 | `agent-architecture-2025` · `llm-app-trends` | 8 |
| 담론 2026 | `agent-harness` · `loop-engineering` | 12 |
| 문답 | `ai-agent-qna` | 4 |
| 지도 | (독립편) | 1 |

**설계 51편 = 발행 51편, 도식 158 = 158.** 절별 대조로 확인했다.

---

## 2. 다음 세션이 이어받을 것

### 최우선: 2차 나머지 9개 카테고리 (102편)

```
143편 중  발행 완료 32편(원본 기준) · 발행 제외 9편 · 남음 102편
```

**시작 전에 반드시 읽을 것**: [`docs/superpowers/specs/2026-08-07-tech-blog-requirements.md`](docs/superpowers/specs/2026-08-07-tech-blog-requirements.md)

| 절 | 내용 |
| --- | --- |
| **§13** | 2차 확정 사양 — 카테고리 12개, 태그 81종, 발행 제외 9편 |
| **§14** | `rag` 실행에서 확정된 규칙 |
| **§15** | **`ai-agent` 실행에서 확정된 규칙 — 이번에 추가했다. 여기가 가장 중요하다** |

그리고 [`docs/superpowers/plans/2026-08-08-ai-agent-category-split-design.md`](docs/superpowers/plans/2026-08-08-ai-agent-category-split-design.md)를 **템플릿으로 쓸 것.** 절별 KB 실측 → 교차 중복 → 검산 기준값 → 금지선 → 배치 계획 순서가 그대로 재사용된다.

### 다음 카테고리 권고: `agentic-coding` (12편)

| 이유 | |
| --- | --- |
| 1 | **가장 작다.** 12편이라 `ai-agent`(16편 → 51편)의 절반 이하 규모 |
| 2 | **주제가 인접**해 §15 규칙이 그대로 통한다. `ai-agent`가 이미 `claude-code` 태그를 1회 썼다 |
| 3 | `tags.ts` 주석 불일치(아래 §3-6)를 **그 카테고리에서 자연히 정리**하게 된다 |

그다음은 `ai-transformation`(18편, order 10). 카테고리 정렬상 첫 화면이라 품질 부담이 크므로 규칙이 더 다듬어진 뒤가 낫다.

### 진행 방식 — `ai-agent`에서 검증된 절차

```
1단계  분할 설계만 하고 보고 → 승인          ← 설계가 틀리면 51편을 다시 만든다
       조사는 축별로 병렬, 변환은 배치 내 순차
2단계  배치로 나눠 변환, 배치마다 커밋·보고
3단계  구현 미참여 에이전트가 독립 검증
4단계  지적 반영 → 푸시
```

**조사와 변환의 전략이 정반대다.** 조사는 맹점을 깨려고 나누고(6기 병렬), 변환은 톤을 지키려고 합친다(배치당 1기 순차). 이번에 조사자 6기가 각자 브리프 밖 위험을 하나씩 찾아냈다.

---

## 3. 미해결 과제

| # | 항목 | 상태 |
| --- | --- | --- |
| 1 | **mermaid 노드 라벨 우측 1~9px 클리핑** | `foreignObject` 폭이 텍스트보다 좁다. 1차·2차 발행본과 프로덕션에서 동일 재현되므로 특정 카테고리 결함이 아니다. **전역 렌더링 이슈로 별건 처리 필요** |
| 2 | **FR-1.4 스크롤스파이 미구현** | "목차를 자동 생성하고 **스크롤에 따라 현재 위치를 표시**한다" 중 후자가 없다. 기존 위키(`wiki-shell.tsx`)에도 없어 신규 후퇴는 아니다 |
| 3 | **메인 페이지 LCP 6.6초** | Lighthouse 성능 77점. 히어로 진입 애니메이션(`hero-fade-up`)이 하이드레이션에 의존해 텍스트가 그때까지 `opacity:0`이다. **블로그 도입 이전에도 77점**이었다 |
| 4 | **싱글톤 태그 재측정** | §13-3 목표는 "2차 신규 싱글톤 0"이었다. **2차 전체를 마친 뒤 재측정**할 것 |
| 5 | **`cto_learning_roadmap` Q1·Q3** | 발행 가능 판정을 받았으나 아직 변환하지 않았다. Q1(재무지표 10개 × 개발조직 관점)은 거의 그대로 발행 가능 |
| 6 | **`tags.ts` 주석 불일치** | [`content/blog/tags.ts`](content/blog/tags.ts) L30 주석이 `agentic-coding`을 카테고리 슬러그 중복 예외로 적어 뒀으나 **그 태그가 어휘 배열 어디에도 없다.** 해당 카테고리 착수 시 정리 |

---

## 4. README/문서 갱신 필요 (이번 세션에서 고치지 않음)

### 4-1. README에 블로그가 여전히 언급되지 않는다

직전 세션에서도 이월했고 그대로다. README는 2026-05-02 이후 손대지 않았는데 그 사이 **133커밋**이 쌓였고, 블로그가 **82편**까지 늘었다.

| 낡은 부분 | 왜 낡았나 | 확인할 진실원 |
| --- | --- | --- |
| 프로젝트 구조 트리 | `content/`·`scripts/`·`tests/` 없음 | 실제 디렉터리 |
| 기술 스택 | Vitest·react-markdown·mermaid 없음 | [`package.json`](package.json) |
| 기능 설명 | 블로그 82편·3카테고리가 통째로 없음 | [`pages/blog/`](pages/blog/), [`content/blog/`](content/blog/) |

**고치지 않은 이유**: 기능 설명·아키텍처 서술은 여러 소스를 교차 대조해야 정확한데, 핸드오프는 세션 끝이라 컨텍스트가 가장 얕다. 그 상태에서 손대면 "그럴듯하지만 틀린 README"가 커밋된다.

### 4-2. ⚠️ 환경변수 검사 신호는 **오탐이다. 고치지 마라**

수집 스크립트가 이렇게 경고한다.

```
[HIGH] ENV_KEYS_IN_CODE_BUT_NOT_IN_README
  LANGCHAIN_PROJECT · LANGCHAIN_TRACING_V2 · OPENAI_API_KEY
  TAVILY_API_KEY · UPSTAGE_API_KEY
```

**전부 `content/blog/**/*.md`의 코드 예제 안에 있는 것**이다. 이 사이트가 쓰는 환경변수가 아니라 RAG·에이전트를 설명하는 **블로그 글 본문의 예시 코드**다. 이번에 `TAVILY_API_KEY`가 새로 잡혔고, 카테고리가 늘수록 더 많은 키가 잡힐 것이다.

여기서 `.env.example`을 만들거나 README에 환경변수 표를 추가하면 **"이 포트폴리오 사이트가 OpenAI API를 사용한다"는 거짓 정보**가 된다. 정적 export 사이트라 런타임 환경변수가 없다.

이 사이트가 실제로 쓰는 환경변수는 [`lib/site.ts`](lib/site.ts)의 `NEXT_PUBLIC_SITE_URL` **하나**이며 README 47~51행에 이미 문서화돼 있다.

`[LOW] SCRIPTS_DIR_MISSING_IN_README: generate-sitemap.mjs`도 **오탐**이다. `next build` 후 자동 실행되는 훅이라 사람이 직접 부르지 않는다.

---

## 5. 알아둘 함정 — 다시 밟지 않도록

`ai-agent` 51편을 만들며 실제로 겪은 것이다. 규칙 형태는 [요구사항 §15](docs/superpowers/specs/2026-08-07-tech-blog-requirements.md)에 있다.

### 5-1. 중복 판정은 실행 단계에서 뒤집힌다 — 네 번 중 세 번

조사 → 설계서 → 브리프를 거치는 동안 **아무도 열과 행을 세지 않는다.** "같은 주제"라는 인상이 세 단계를 그대로 통과한다.

| 브리프 지시 | 세어 본 결과 |
| --- | --- |
| `03 §6` 제거 | 발행본 표에 **「LangChain 구성요소」 열 없음** → 유지가 옳았다 |
| `04 §7-6` 제거 | 9셀 중 발행본 실재 **3셀** → 유지가 옳았다 |
| `08 §3-1` 축소 | **1/3/5 절대 수치**가 발행본에 없음 → 한 축 더 남겼다 |

→ **변환 브리프에 "세어 보고 브리프를 어겨도 된다"를 명시하고, 앞 배치 사례를 표로 넣어라.** 규칙만 적으면 따르지 않고, 사례를 보면 센다.

### 5-2. 금칙어를 걷으면 다른 축의 정확성이 깨진다

| 충돌 | 무슨 일이 벌어졌나 |
| --- | --- |
| 금칙어 × **시점 조건** | 원본이 조건과 화법을 **한 문장에** 둔다. 조건을 살리라고 지시하면 화법이 통째로 따라온다. 한 배치에서 **8건** |
| 금칙어 × **근거 주체** | `강의 CH02 원문`을 피하려 `LangGraph 공식 설명`으로 바꿨는데 그 표는 **3사 비교표**다. CrewAI 칸이 LangGraph 문서에 근거할 수 없다 |

→ 금칙어가 지고 있던 정보가 **조건인지 출처인지 화법인지** 먼저 적는다. **주체를 갈아 끼우지 마라 — 지우는 쪽이 안전하다.**

### 5-3. 자동 검사가 못 잡는 3종

| 유형 | 예 |
| --- | --- |
| **화행 잔재** | `인용할 때는 … 수준으로 말하는 것이 안전하다` — **금칙어가 한 개도 없다** |
| **세어 쓴 수가 틀림** | `13개 축`(실제 12), `23문답`(실제 26), `50편`(실제 51) |
| **링크 주장 불일치** | `아홉 축으로 정리돼 있다`고 썼는데 대상에 없어도 링크 검사는 통과 |

셋 다 금칙어·빌드·링크 검사를 전건 통과한다. SC-12·13·14가 이걸 잡는다.

### 5-4. 검증자를 분리하지 못한 구간은 기록해 둔다

세션 한도로 **B6·B7(5편)을 컨트롤러가 쓰고 컨트롤러가 검증**했다. 나중에 독립 검증을 붙였고 **결함 6건**이 나왔다. 검증 브리프에 그 구간을 명시해야 시간이 거기로 몰린다 — "51편을 검증하라"는 균등하게 훑고 끝난다.

### 5-5. 미추적 디렉터리에서 두 배치가 겹치면 조용히 섞인다

git은 `?? content/blog/ai-agent/`를 **엔트리 하나**로 취급한다. 두 에이전트가 겹쳐 쓰는 중에 `git add`하면 반쯤 쓰인 파일이 통째로 딸려 들어가고 파일별로 나열되지 않아 눈으로도 안 걸린다. **배치는 반드시 커밋을 끝내고 다음을 띄운다.**

### 5-6. 지시해 놓고 직접 하지 마라

에이전트에게 링크 채우기를 지시해 두고 검증 중 발견해 내가 먼저 고쳤다. 이번엔 다른 줄이라 충돌이 없었지만, **같은 문장이었다면 하나가 조용히 덮였고 커밋 후에는 누구 판단인지 추적할 수 없다.**

---

## 6. 검증 명령

```powershell
cd C:\Users\aeby\vscode\withwooyong.github.io

npm test              # 36개 통과
npx tsc --noEmit      # 0
npm run build         # 0, [sitemap] 142개 URL

# 금칙어 — 기대 0건
Select-String -Path "content\blog\**\*.md" `
  -Pattern "면접|커닝페이퍼|암기용|화이트보드|이력서|강의|수강|Part [0-9]|CH0[0-9]"

# 민감정보 — 기대 0건
Select-String -Path "content\blog\**\*.md" `
  -Pattern "히츠|야나두|TVING|티빙|BTV|허우용|채용|teddylee|teddynote|argus|FASTCAMPUS|실장"

# 화행 잔재(SC-12) — 오탐 많음. 문맥 판정 필수
Select-String -Path "content\blog\**\*.md" `
  -Pattern "인용할 때|수준으로 말|것이 안전|실적이 아니|반박당|의심받|감점|말해야 |말하면 안"
```

> **알려진 오탐 3종**
> - `허우용` — `out/` 산출물 기준으로 스캔하면 nav·푸터·SEO 메타의 사이트 소유자 표기가 잡힌다. **원고(`content/`) 기준으로 스캔할 것**
> - `30초` — `도구 하나가 30초를 먹는 노드`처럼 실제 소요 시간을 뜻하는 서술이 있다
> - 화행 정규식 — `이렇게 구현하는 편이 안전하다`(구현 권고), `LLM이 답한다`(주어가 모델), `표준어 하나만 말하면 되는 구조`(비유)는 정상

### 링크·SC-10 검사 (bash)

```bash
# 내부 링크 전건 실재 확인
grep -ho '/blog/[a-z-]*/[a-z0-9-]*/' content/blog/*/*.md | sort -u | while read l; do
  cat=$(echo "$l" | cut -d/ -f3); slug=$(echo "$l" | cut -d/ -f4)
  [ -n "$slug" ] && [ ! -f "content/blog/$cat/$slug.md" ] && echo "MISSING: $l"
done

# SC-10 들어오는 링크가 0인 글
for f in content/blog/*/*.md; do
  s=$(basename "$f" .md)
  n=$(grep -rl "/$s/" content/blog/ --include=*.md | grep -v "/$s.md" | wc -l)
  [ "$n" -eq 0 ] && echo "들어오는 링크 0: $s"
done
```

---

## 7. 소스 위치

| | 경로 |
| --- | --- |
| 원본 (읽기 전용, **수정 금지**) | `C:\Users\aeby\vscode\yanadoo-exit\shared\knowledge\` |
| 발행본 | [`content/blog/<카테고리>/<slug>.md`](content/blog/) |
| 카테고리 정의 | [`content/blog/categories.ts`](content/blog/categories.ts) — 12개 등록, 3개 발행 |
| 태그 통제 어휘 | [`content/blog/tags.ts`](content/blog/tags.ts) — 81종. **이 목록 밖이면 빌드 실패** |
| 요구사항 | [`docs/superpowers/specs/2026-08-07-tech-blog-requirements.md`](docs/superpowers/specs/2026-08-07-tech-blog-requirements.md) — §13·§14·**§15** |
| 분할 설계 템플릿 | [`docs/superpowers/plans/2026-08-08-ai-agent-category-split-design.md`](docs/superpowers/plans/2026-08-08-ai-agent-category-split-design.md) |
