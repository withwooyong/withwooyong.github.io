# 사이트 재설계 단계 1~2 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 디자인 토큰 체계와 사이트 셸을 세우고(단계 1), 메인 5섹션·`/work`·`/about`을 만들어 첫 화면을 완성한다(단계 2).

**Architecture:** 무채색 9단계 + Signal 액센트를 CSS 커스텀 프로퍼티로 정의하고, **기존 shadcn 토큰을 그 램프의 별칭으로** 만든다. 값이 한 곳에만 있으므로 두 체계가 어긋날 수 없다. 테마 전환은 램프 한 벌만 바꾸면 끝난다. 화면은 Pages Router 위의 정적 컴포넌트로 쌓고, 서버 기능은 0개를 유지한다.

**Tech Stack:** Next.js 14 (Pages Router) · TypeScript · Tailwind CSS 3 · shadcn/ui · vitest (node 환경) · Playwright (단계 2에서 신규)

**Spec:** [`docs/superpowers/specs/2026-08-25-redesign-and-atlas.md`](../specs/2026-08-25-redesign-and-atlas.md) — 3판

**Mockups:** [`docs/superpowers/mockups/`](../mockups/) — `design-tokens.html`(§5) · `hero-motion.html`(§6). 브라우저로 파일을 직접 열면 동작한다. **T3·T9 작업 중에는 열어 두고 본다.**

---

## Global Constraints

스펙과 리포 규칙에서 그대로 옮긴 것이다. **모든 태스크의 요구사항에 이 절이 암묵적으로 포함된다.**

| # | 제약 | 정확한 값 |
| --- | --- | --- |
| GC-1 | App Router 금지 | `app/` 디렉터리 규약을 도입하지 않는다. Pages Router만 |
| GC-2 | 정적 export | `output: "export"`. API 라우트·ISR·서버 액션·`next/image` 로더 전부 빌드를 깨뜨린다 |
| GC-3 | 경로 별칭 | 상대경로 대신 `@/components/...`, `@/lib/...`. 상대경로도 빌드는 통과하므로 리뷰에서 잡아야 한다 |
| GC-4 | `tsconfig.json` 동결 | `target`을 바꾸면 전체가 재방출되어 「기존 페이지 불변」이 깨진다. 타입 오류는 **호출부에서** 고친다 |
| GC-5 | 한글 본문 | 새 컴포넌트에 `break-keep`. `dark:` 변형은 **토큰으로 표현되지 않은 색에만** — 아래 참조 |
| GC-6 | 커밋 | 메시지는 **한글**. `git push`는 사용자가 명시적으로 요청할 때만 |
| GC-7 | 모션 | 전 구간 `prefers-reduced-motion: reduce` 대응. 없으면 리뷰에서 반려 |
| GC-8 | `lang="ko"` | `pages/_document.tsx`의 `<Html lang="ko">`를 **바꾸지 않는다.** Pagefind 한글 분절의 전제다(스펙 §8.2) |
| GC-9 | 액센트 면적 | 액센트는 첫 화면 픽셀의 **5% 이하**. 넓은 면적 배경·본문 텍스트에 쓰지 않는다 |
| GC-10 | 두 번째 액센트 금지 | 액센트 색은 **하나뿐이다.** 추가하는 순간 「이 색 = 클릭 가능」 규칙이 죽는다 |

#### GC-5의 `dark:`는 언제 필요한가 — 리뷰어가 위양성을 내지 않도록

`CLAUDE.md`의 「모든 신규 컴포넌트에 `dark:` 변형」은 **토큰 체계가 생기기 전에 쓰인 규칙**이다. T3 이후로는 그대로 적용하면 안 된다.

| 색을 어떻게 썼나 | `dark:` 필요한가 | 이유 |
| --- | :---: | --- |
| `bg-n1` · `text-n9` · `text-signal` (토큰) | **아니오** | `--n*`가 `.dark`에서 재정의되므로 **이미 테마 인식**이다. `dark:`를 더하면 값이 두 벌이 되어 §5.3 안 B가 없애려던 문제가 되돌아온다 |
| `bg-slate-800` · `text-blue-600` (하드코딩) | **예** | 테마를 모른다. GC-5가 그대로 유효하다 |
| `bg-card` · `text-muted-foreground` (shadcn) | 아니오 | 토큰의 별칭이다 |

⇒ **신규 컴포넌트가 토큰만 쓰면 `dark:`가 하나도 없는 것이 정답이다.** 리뷰어는 이걸 누락으로 보지 않는다. 반대로 신규 코드에 `slate-*` 같은 하드코딩 팔레트가 들어왔다면 그것 자체가 지적 대상이다 — 토큰을 쓰라는 뜻이다.

### 문구 규칙 (T11·T12에서 반드시 지킬 것)

이력 문구를 다시 쓸 때 깨지기 쉬운 규칙들이다. 과거 세션에서 사용자가 직접 교정한 이력이 있다.

| 항목 | 정확한 표기 |
| --- | --- |
| 회사 라벨 (한글) | `(주)야나두 a kakao company (구 카카오키즈)` |
| 회사 라벨 (영문) | `Yanadoo Co., Ltd. (a kakao company, formerly Kakao Kids)` |
| 직책 | **`커머스개발실장`** — 「개발실장」이 아니다 |
| 서비스·제품명 | `야나두 AI 서비스`, `야나두 앱` 등은 **그대로 둔다** |
| **금지 표현** | TVING CMS 경력에 **「처음」** 구축한/만든 — 과장 표현 회귀 금지 |
| 유지 표현 | **「원조 구축」** 은 의도적으로 유지된 표현이다. 지우지 않는다 |

### 히어로 문구 (T9에서 그대로 쓴다 — 스펙 §6)

```text
eyebrow  20Y BACKEND · PLATFORM LEADER

  ①  20년간 만든 것은 서비스가 아니라 조직이었다.
  ②  30명이 함께 굴린 교육·커머스 플랫폼. 두 번 다시 세운 검색.
  ③  그 판단은 글 156편으로 남아 있다.
```

---

## 스펙과 다른 점 — 계획 단계에서 발견한 충돌 1건

**스펙 §5.2는 액센트 토큰 이름을 `--accent`로 적었다. 그대로 쓰면 안 된다.**

`--accent`/`--accent-foreground`는 **shadcn이 이미 쓰고 있는 이름**이고, 용도가 완전히 다르다.

| 사용처 | 지금 의미 |
| --- | --- |
| `components/ui/button.tsx:17` (`outline` 변형) | `hover:bg-accent` — 은은한 **호버 배경** |
| `components/ui/button.tsx:20` (`ghost` 변형) | `hover:bg-accent` — 같음 |
| `components/ui/dialog.tsx:44` | `data-[state=open]:bg-accent` — 닫기 버튼 호버 |

`--accent: #fbbf24`로 덮으면 **outline·ghost 버튼의 호버 배경이 전부 앰버가 된다.** 테마 토글 버튼이 `variant="outline"`이라 헤더에서 바로 보인다. 이건 GC-9(액센트 5% 이하)와 「넓은 면적의 배경 금지」(스펙 §5.2)를 스스로 위반하는 결과다.

⇒ **신규 액센트 토큰의 이름을 `--signal`로 한다.** `--signal` · `--signal-ink` · `--signal-soft`. 값은 스펙 §5.2 그대로이고 이름만 바꾼다. shadcn의 `--accent`는 램프의 `--n3`(구분면) 별칭으로 남긴다.

> 이 결정을 스펙 §5.2에 역반영할지는 T4 완료 후 사용자에게 확인한다. **계획서와 스펙이 갈라진 채로 두지 않는다.**

---

## File Structure

### 새로 만드는 파일

| 파일 | 책임 | 태스크 |
| --- | --- | --- |
| `data/experience.ts` | 경력 이력 데이터 (현재 `pages/index.tsx`에 JSX로 박혀 있음) | T1 |
| `data/projects.ts` | 프로젝트 카드 데이터 (같음) | T1 |
| `lib/design/contrast.ts` | WCAG 상대휘도·명도대비 계산. 순수 함수만 | T2 |
| `tests/design/tokens.test.ts` | 토큰 램프가 AA를 만족하는지 검사 | T2 |
| `components/site-header.tsx` | 전역 헤더 — 내비·테마 토글 | T7 |
| `components/site-footer.tsx` | 전역 푸터 | T7 |
| `components/site-shell.tsx` | 헤더 + `<main>` + 푸터 래퍼 | T7 |
| `playwright.config.ts` | E2E 설정. 정적 산출물을 서빙해 검사 | T8 |
| `e2e/smoke.spec.ts` | 셸·테마·라우트 스모크 | T8 |
| `components/hero-atlas.tsx` | 히어로 SVG 서브그래프 (20~30노드) | T9 |
| `lib/use-scroll-progress.ts` | 스크롤 진행도 `p ∈ [0,1]` 훅 | T9 |
| `components/hero.tsx` | 히어로 — 배경 + 문구 3문장 | T9 |
| `components/home/section-*.tsx` | 메인 5섹션 (5개 파일) | T10 |
| `pages/work/index.tsx` | `/work` — `product-lead*` 4갈래 통합 | T11 |
| `pages/about/index.tsx` | `/about` — 경력 전문·학력·기술 | T12 |
| `public/product-lead*/index.html` | 스텁 3개 | T13 |
| `e2e/redirects.spec.ts` | 스텁 9 URL이 전부 살아 있는지 | T13 |

### 크게 바꾸는 파일

| 파일 | 무엇이 바뀌나 | 태스크 |
| --- | --- | --- |
| `styles/globals.css` | 최상단에 램프·Signal·타이포 토큰 블록 추가, shadcn 토큰을 별칭으로 교체 | T3·T4·T5 |
| `tailwind.config.js` | `hsl(var(--x))` → `var(--x)`, 램프·Signal·`fontSize` 추가, **죽은 `primary` 숫자 스케일 제거** | T4·T5 |
| `pages/_document.tsx` | Pretendard 링크 + **FOUC 차단 인라인 스크립트** | T5·T6 |
| `components/theme-toggle.tsx` | 기본값을 다크로. 초기값을 DOM에서 읽는다 | T6 |
| `pages/index.tsx` | **687줄 전면 재작성** → 셸 + 5섹션 조립 | T10 |
| `pages/product-lead-wiki/[slug].tsx` · `index.tsx` | 본문을 스텁으로 교체 (6 URL을 파일 2개로) | T13 |

### 지우는 파일

| 태스크 | 파일 | 왜 그 태스크인가 |
| --- | --- | --- |
| **T13** | `pages/product-lead/index.tsx` · `pages/product-lead-v2/index.tsx` · `pages/product-lead-loadmap/index.tsx` | `public/`의 스텁과 **경로를 다툰다.** 살려 두면 스텁이 산출물에 안 나온다 |
| **T14** | `lib/wiki.ts` · `components/wiki-shell.tsx` · `components/roadmap-domain.tsx` · `data/product-lead-domains.ts` · `data/product-lead-roadmap.ts` | 위 라우트만 부르던 자산. 호출자 0건을 증명한 뒤 한꺼번에 |

---

## 실행 순서와 그 이유

```text
T1  콘텐츠 추출        ← 기준선(check-baseline)이 오라클로 살아 있는 마지막 시점
────────────────────── 단계 1 ──────────────────────
T2  대비 검사기 (red)
T3  램프 · Signal 토큰 (green)
T4  shadcn 접합 안 B
T5  타이포 · Pretendard
T6  다크 기본 · FOUC 차단
T7  셸 (헤더 · 푸터)
────────────────────── 단계 2 ──────────────────────
T8  Playwright 도입
T9  히어로 B
T10 메인 5섹션 (index.tsx 재작성)
T11 /work
T12 /about
T13 product-lead* 스텁 9 URL
T14 고아 자산 삭제 + 기준선 1회 갱신 ← 여기서만 --update
T15 Lighthouse CI (경고)
```

**T1이 왜 맨 앞인가.** `check-baseline`은 비블로그 HTML 14개의 해시를 고정한다. T3에서 토큰이 바뀌면 컴파일된 CSS 파일명 해시가 바뀌고, 그게 HTML의 `<link href>`에 박혀 있어 **T3 이후로는 기준선이 오라클 노릇을 못 한다.**

T1은 순수 리팩터링이다 — JSX에 박힌 문자열을 `data/`로 옮길 뿐 렌더 결과가 같아야 한다. 그걸 증명할 수단이 기준선인데, **기준선이 유효한 창은 T3 이전뿐**이다. 순서를 바꾸면 「글자가 하나 빠졌는지」를 눈으로 확인하는 수밖에 없다.

---

# 단계 0 — 준비

### Task 1: `pages/index.tsx`의 인라인 콘텐츠를 `data/`로 추출

**Files:**
- Create: `data/experience.ts`
- Create: `data/projects.ts`
- Modify: `pages/index.tsx:246-483` (experience 섹션과 projects 섹션)

**Interfaces:**
- Produces: `experiences: Experience[]`, `projects: Project[]` — T10·T11·T12가 소비한다
- Consumes: 없음

**왜 지금인가:** 위 「실행 순서와 그 이유」 참조. 이 태스크는 **렌더 결과가 바이트 단위로 같아야** 하고, 그걸 증명할 수 있는 마지막 시점이다.

- [ ] **Step 1: 기준선이 지금 통과하는지부터 확인한다**

작업 전 상태가 이미 깨져 있으면 이 태스크의 오라클이 무의미하다.

```bash
npm run build
npm run check-baseline
```

Expected: `check-baseline`이 **종료 코드 0**, 14개 불변. 실패하면 여기서 멈추고 원인을 먼저 찾는다.

⚠️ 두 명령을 **각각 따로** 실행한다. 파이프로 이으면 `$?`가 마지막 명령의 것이 되어 실패가 가려진다.

- [ ] **Step 2: 타입과 데이터 파일을 만든다**

`pages/index.tsx:246-386`의 경력 카드 4개를 그대로 옮긴다. **문자열은 한 글자도 바꾸지 않는다** — 오탈자로 보여도 고치지 않는다. 고치면 기준선이 깨지고, 그러면 「추출이 맞았는지」와 「고친 게 맞는지」가 섞인다.

```ts
// data/experience.ts
export type ExperienceItem = {
  /** 직책. 「커머스개발실장」처럼 정식 표기를 그대로 옮긴다 */
  role: string;
  /** 회사 라벨 — Global Constraints 문구 규칙을 따른다 */
  company: string;
  /** 예: "2022.02 - 2026.07" */
  period: string;
  /** 예: "4년 6개월" */
  duration: string;
  /** 카드 본문 한 문단 */
  summary: string;
  /** 불릿 목록 */
  highlights: string[];
};

export const experiences: ExperienceItem[] = [
  {
    role: "커머스개발실장",
    company: "(주)야나두 a kakao company (구 카카오키즈)",
    period: "2022.02 - 2026.07",
    duration: "4년 6개월",
    summary:
      "기획, UI/UX, 프론트, 백엔드, 앱, 데브옵스 포지션의 인력(20~30명)으로 야나두 전반적인 서비스 개발 총괄",
    highlights: [
      "다양한 챗봇 형태의 AI 기술 서비스 개발 및 런칭",
      // ← pages/index.tsx:265-300 의 <li> 를 순서 그대로 옮긴다
    ],
  },
  // ← 나머지 경력 카드 3개도 같은 방식으로
];
```

```ts
// data/projects.ts
export type ProjectItem = {
  title: string;
  description: string;
  /** 카드 상단 그라디언트 클래스 — 예: "from-yellow-400 to-orange-500" */
  gradient: string;
  /** 배경 로고 경로. 없으면 생략 */
  logo?: string;
  /** 카드 위에 얹는 라벨 — 예: "야나두" */
  label: string;
  tags: string[];
};

export const projects: ProjectItem[] = [
  {
    title: "야나두 AI 서비스",
    description: "교육&커머스 도메인의 AI 챗봇 서비스 개발",
    gradient: "from-yellow-400 to-orange-500",
    logo: "/images/yanadoo-logo.png",
    label: "야나두",
    tags: ["커머스", "AI", "챗봇", "교육", "B2B"],
  },
  // ← pages/index.tsx:387-483 의 카드들을 순서 그대로
];
```

- [ ] **Step 3: `pages/index.tsx`가 배열을 순회하도록 바꾼다**

마크업은 **손대지 않는다.** 하드코딩된 값 자리에 변수만 넣는다.

```tsx
import { experiences } from "@/data/experience";
import { projects } from "@/data/projects";

// ...experience 섹션 안
<div className="space-y-8">
  {experiences.map((exp) => (
    <Card key={`${exp.company}-${exp.period}`} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">{exp.role}</CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-400 font-medium">
              {exp.company}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary">{exp.period}</Badge>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{exp.duration}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{exp.summary}</p>
        <ul className="space-y-2 text-slate-600 dark:text-slate-300">
          {exp.highlights.map((h) => (
            <li key={h} className="flex items-start">
              <span className="text-blue-500 dark:text-blue-400 mr-2">•</span>
              {h}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  ))}
</div>
```

- [ ] **Step 4: 렌더 결과가 바이트 단위로 같은지 확인한다**

```bash
npx tsc --noEmit
npm run build
npm run check-baseline
```

Expected: 셋 다 **종료 코드 0**. `check-baseline`이 「14개 불변」을 보고해야 한다.

**실패하면 데이터를 잘못 옮긴 것이다.** 기준선을 갱신해서 통과시키지 마라 — 그게 정확히 이 검사가 막으려는 행동이다. 차이가 난 HTML을 열어 어느 문자열이 달라졌는지 찾는다.

- [ ] **Step 5: 커밋**

```bash
git add data/experience.ts data/projects.ts pages/index.tsx
git commit -m "refactor: 경력·프로젝트 콘텐츠를 index.tsx 에서 data/ 로 추출

재설계로 index.tsx 를 전면 재작성하면 JSX 에 박힌 이력 문구가 소실된다.
먼저 데이터로 빼 둔다. 마크업은 손대지 않았고 check-baseline 14개 불변으로
렌더 결과가 동일함을 확인했다 — 기준선을 오라클로 쓸 수 있는 마지막 시점이다."
```

---

# 단계 1 — 디자인 토큰 · 셸 · 테마

**완료 판정 (스펙 §12):** `/blog` 156편이 새 토큰에서 정상 렌더 — 기존 화면 회귀 없음.
`check-baseline` 실패는 **예상된 것으로 기록**하고 갱신하지 않는다(스펙 §11.1).

### Task 2: 대비 검사기 — 먼저 실패시킨다

**Files:**
- Create: `lib/design/contrast.ts`
- Create: `tests/design/tokens.test.ts`

**Interfaces:**
- Produces: `relativeLuminance(hex: string): number`, `contrastRatio(a: string, b: string): number`
- Consumes: 없음

**이 태스크의 값:** 스펙 3판이 정정한 4건 중 하나가 **다크 `n6`가 AA 미달(4.14:1)** 이었다. 사람이 한 번 계산해서 고치면 다음에 또 뚫린다. **검사기로 만들면 다시는 안 뚫린다.** 리포의 원칙 그대로다 — 발행 규칙은 산문이 아니라 검사기에 산다.

- [ ] **Step 1: 대비 계산 함수를 쓴다**

```ts
// lib/design/contrast.ts

/** sRGB 성분(0~255)을 선형 광도로 변환한다. WCAG 2.x 정의. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** `#rrggbb` 를 [r, g, b] 정수 배열로. 3자리 축약형도 받는다. */
export function parseHex(hex: string): [number, number, number] {
  const h = hex.trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`hex 색이 아니다: ${hex}`);
  }
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG 상대 휘도. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 명도 대비. 항상 1 이상이며 순서에 무관하다. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`vitest.config.ts`가 `environment: "node"`, `include: ["tests/**/*.test.ts"]`이므로 **jsdom 없이 그대로 돈다.** 설정을 건드리지 않는다.

```ts
// tests/design/tokens.test.ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, relativeLuminance } from "@/lib/design/contrast";

const CSS = fs.readFileSync(path.join(process.cwd(), "styles", "globals.css"), "utf8");

/**
 * 주어진 셀렉터의 모든 블록에서 커스텀 프로퍼티를 모은다.
 *
 * globals.css 에는 `:root` 와 `.dark` 블록이 **여러 벌** 있다(shadcn 토큰, flow 다이어그램 토큰).
 * 문서 순서대로 훑어 뒤에 나온 값이 이기게 한다 — CSS 캐스케이드와 같은 규칙이다.
 *
 * `.dark ::-webkit-scrollbar-track {` 처럼 셀렉터가 이어지는 경우는
 * 여는 중괄호가 바로 뒤에 오지 않으므로 걸리지 않는다.
 */
function collectVars(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  const opener = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{`, "g");
  let match: RegExpExecArray | null;

  while ((match = opener.exec(CSS)) !== null) {
    let depth = 1;
    let i = match.index + match[0].length;
    const start = i;
    while (i < CSS.length && depth > 0) {
      if (CSS[i] === "{") depth += 1;
      else if (CSS[i] === "}") depth -= 1;
      i += 1;
    }
    const body = CSS.slice(start, i - 1);
    for (const decl of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      out[decl[1]] = decl[2].trim();
    }
  }
  return out;
}

const LIGHT = collectVars(":root");
const DARK = { ...LIGHT, ...collectVars(".dark") };

/** 텍스트로 쓰이는 무채색 단계. n5(비활성)는 WCAG 대비 요건 제외 대상이라 뺀다. */
const TEXT_STEPS = ["n6", "n7", "n8", "n9"] as const;
const AA = 4.5;

describe("검사기 자체 증명 — 알려진 미달 값을 잡아내는가", () => {
  // 스펙 2판의 다크 n6 값. 이 검사기가 실제로 잡아냈던 결함이다.
  it("2판 #71717a 는 다크 배경에서 AA 미달로 판정된다", () => {
    expect(contrastRatio("#71717a", "#08080a")).toBeLessThan(AA);
  });

  it("3판 #7e7e86 은 다크 배경과 카드 위 모두에서 통과한다", () => {
    expect(contrastRatio("#7e7e86", "#08080a")).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio("#7e7e86", "#0b0b0d")).toBeGreaterThanOrEqual(AA);
  });

  it("동일 색의 대비는 1이고 흑백 대비는 21이다", () => {
    expect(contrastRatio("#808080", "#808080")).toBeCloseTo(1, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 4);
  });
});

describe("무채색 램프가 정의돼 있다", () => {
  for (const theme of [
    { name: "라이트", vars: LIGHT },
    { name: "다크", vars: DARK },
  ]) {
    it(`${theme.name}: n0~n9 열 단계가 전부 hex 로 있다`, () => {
      for (let i = 0; i <= 9; i += 1) {
        const value = theme.vars[`n${i}`];
        expect(value, `--n${i} 가 없다`).toBeDefined();
        expect(value, `--n${i} 가 hex 가 아니다: ${value}`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  }
});

describe("텍스트 계열이 AA(4.5:1)를 만족한다", () => {
  for (const theme of [
    { name: "라이트", vars: LIGHT },
    { name: "다크", vars: DARK },
  ]) {
    for (const step of TEXT_STEPS) {
      it(`${theme.name}: ${step} 이 배경 n0 위에서 AA 를 넘는다`, () => {
        const ratio = contrastRatio(theme.vars[step], theme.vars.n0);
        expect(ratio, `${step} vs n0 = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
      });

      it(`${theme.name}: ${step} 이 카드 n1 위에서 AA 를 넘는다`, () => {
        // 배경만 보고 색을 고르면 카드 안에서 미달이 된다. #78787f 가 정확히 그랬다.
        const ratio = contrastRatio(theme.vars[step], theme.vars.n1);
        expect(ratio, `${step} vs n1 = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
      });
    }
  }
});

describe("Signal 액센트가 양쪽 테마에서 AA 를 만족한다", () => {
  for (const theme of [
    { name: "라이트", vars: LIGHT },
    { name: "다크", vars: DARK },
  ]) {
    it(`${theme.name}: signal 이 배경 위에서 읽힌다`, () => {
      const ratio = contrastRatio(theme.vars.signal, theme.vars.n0);
      expect(ratio, `signal vs n0 = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    });

    it(`${theme.name}: signal-ink 가 signal 배경 위에서 읽힌다 (CTA 버튼)`, () => {
      const ratio = contrastRatio(theme.vars["signal-ink"], theme.vars.signal);
      expect(ratio, `signal-ink vs signal = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    });
  }
});

describe("다크 램프의 텍스트 계열은 단조 증가한다", () => {
  it("n5 < n6 < n7 < n8 < n9 순으로 밝아진다", () => {
    const steps = ["n5", "n6", "n7", "n8", "n9"] as const;
    const lums = steps.map((s) => relativeLuminance(DARK[s]));
    for (let i = 1; i < lums.length; i += 1) {
      expect(lums[i], `${steps[i]} 가 ${steps[i - 1]} 보다 어둡다`).toBeGreaterThan(lums[i - 1]);
    }
  });
});
```

- [ ] **Step 3: 테스트를 돌려 실패를 확인한다**

```bash
npx vitest run tests/design/tokens.test.ts
```

Expected: **자체 증명 3건은 통과**, 램프·Signal 관련은 전부 실패한다. 실패 메시지는 `--n0 가 없다` 계열이어야 한다.

⚠️ **자체 증명이 실패하면 계산 함수가 틀린 것이다.** 램프를 만들기 전에 그것부터 고친다. 증명 없는 통과는 거짓 음성과 구분되지 않는다.

- [ ] **Step 4: 커밋 (빨간 상태로)**

```bash
git add lib/design/contrast.ts tests/design/tokens.test.ts
git commit -m "test: 토큰 대비 검사기 추가 — 램프가 없어 실패하는 상태

설계서 3판이 정정한 다크 n6 AA 미달(4.14:1)을 사람이 아니라 기계가 잡게 한다.
2판의 #71717a 를 자체 증명 케이스로 박아 두어, 검사기가 실제로 잡아내는지를
먼저 증명한 뒤 램프를 만든다."
```

---

### Task 3: 무채색 9단계 + Signal 토큰

**Files:**
- Modify: `styles/globals.css:5-10` (`@layer base` 최상단)
- Test: `tests/design/tokens.test.ts` (T2에서 만든 것)

**Interfaces:**
- Consumes: T2의 `tests/design/tokens.test.ts`
- Produces: CSS 변수 `--n0`~`--n9`, `--signal`, `--signal-ink`, `--signal-soft` — T4~T15 전부가 소비한다

- [ ] **Step 1: 램프 블록을 `@layer base` 최상단에 넣는다**

기존 shadcn `:root` 블록 **위에** 둔다. 다음 태스크에서 shadcn 토큰이 이 값을 참조하게 되므로 순서가 중요하다.

```css
@layer base {
  /* ── 재설계 토큰 · 무채색 9단계 (설계서 §5.1) ────────────────────────
   *
   * 다크가 기본이고 라이트는 반전이 아니다. n5~n9(텍스트)는 대체로 반전이지만
   * n0~n4(면)는 양쪽 모두 「카드가 배경보다 밝다」를 지켜야 해서 구조가 다르다.
   *
   * 면 계열(n0~n4)은 대비가 1.4:1 안에 몰려 있다. 의도된 것이다 —
   * 층은 밝기 차가 아니라 n4 테두리와 여백이 만든다. 카드 경계가 안 보이면
   * 배경색을 올리지 말고 테두리를 먼저 의심한다.
   *
   * 값을 바꾸면 tests/design/tokens.test.ts 가 잡는다.
   */
  :root {
    --n0: #f7f7f8; /* 페이지 배경 */
    --n1: #ffffff; /* 카드 배경 — 배경보다 밝다 */
    --n2: #ffffff; /* 헤더 · 바 */
    --n3: #f0f0f2; /* 구분면 */
    --n4: #e0e0e4; /* 테두리 */
    --n5: #a1a1aa; /* 비활성 — WCAG 대비 요건 제외 대상 */
    --n6: #71717a; /* 보조 텍스트 · 라벨 */
    --n7: #52525b; /* 본문 */
    --n8: #3f3f46; /* 강조 본문 */
    --n9: #18181b; /* 제목 */

    /* Signal Amber (설계서 §5.2).
     * 이름이 --accent 가 아닌 이유: shadcn 이 --accent 를 호버 배경으로 쓰고 있다.
     * 덮으면 outline·ghost 버튼 호버가 전부 앰버가 된다. */
    --signal: #a16207; /* amber-700 — 라이트에서 4.60:1, AA 하한에 붙어 있다 */
    --signal-ink: #ffffff;
    --signal-soft: rgba(161, 98, 7, 0.12);
  }

  .dark {
    --n0: #08080a;
    --n1: #0b0b0d;
    --n2: #121216;
    --n3: #1c1c21;
    --n4: #2a2a31;
    --n5: #52525b;
    --n6: #7e7e86; /* 2판의 #71717a 는 4.14:1 로 AA 미달이었다 */
    --n7: #a1a1aa;
    --n8: #d4d4d8;
    --n9: #fafafa;

    --signal: #fbbf24;
    --signal-ink: #08080a;
    --signal-soft: rgba(251, 191, 36, 0.15);
  }
```

- [ ] **Step 2: 테스트가 통과하는지 확인한다**

```bash
npx vitest run tests/design/tokens.test.ts
```

Expected: **전부 PASS.** 자체 증명 3건 + 램프 정의 2건 + 텍스트 대비 16건 + Signal 4건 + 단조성 1건.

- [ ] **Step 3: 액센트 면적 규칙을 문서가 아니라 주석으로 남긴다**

`styles/globals.css`의 Signal 블록 바로 아래에 붙인다. GC-9·GC-10은 기계가 못 잡으므로 **쓰는 자리에 적어 둔다.**

```css
  /* Signal 사용 규칙 (설계서 §5.2) — 기계가 못 잡는다. 리뷰에서 본다.
   *   허용: 링크 · 섹션 번호 · 지표 숫자 · CTA 버튼 배경 · 그래프 노드 · 활성 상태
   *   금지: 넓은 면적의 배경 · 본문 텍스트 · 두 번째 액센트 색 추가
   *   면적: 첫 화면 픽셀의 5% 이하
   */
```

- [ ] **Step 4: 커밋**

```bash
git add styles/globals.css
git commit -m "feat(design): 무채색 9단계 + Signal 액센트 토큰 추가

설계서 §5.1·§5.2. 액센트 토큰 이름은 --accent 가 아니라 --signal 로 했다.
shadcn 이 --accent 를 outline·ghost 버튼의 호버 배경으로 쓰고 있어,
덮으면 첫 화면에서 앰버 면적이 5% 규칙을 스스로 위반한다.

다크 n6 는 #71717a(4.14:1) 대신 #7e7e86(4.97:1)을 쓴다.
tests/design/tokens.test.ts 전부 통과."
```

---

### Task 4: shadcn 접합 — 안 B (별칭화)

**Files:**
- Modify: `styles/globals.css` (기존 shadcn `:root` · `.dark` 블록)
- Modify: `tailwind.config.js:16-72` (`colors`)

**Interfaces:**
- Consumes: T3의 `--n0`~`--n9`
- Produces: Tailwind 유틸리티 `bg-n0`~`bg-n9`, `text-signal`, `bg-signal`, `bg-signal-soft` 등

**스펙 §5.3의 안 B를 이 형태로 구현한다:** 값을 두 벌 두지 않고 **shadcn 토큰을 램프의 별칭으로 만든다.** 그러면 테마 전환이 램프 한 곳에서만 일어나고, `.dark`에 shadcn 토큰을 다시 적을 필요가 없다.

- [ ] **Step 1: shadcn 토큰을 별칭으로 교체한다**

⚠️ **T3 이후 `globals.css`에는 `:root` 블록이 둘이다** — 위쪽이 신규 램프(`--n0`~`--n9`), 아래쪽이 기존 shadcn(`--background` 등). **갈아끼울 대상은 `--background`를 담은 아래쪽이다.** 램프 블록을 건드리면 `tests/design/tokens.test.ts`가 즉시 빨개지므로 사고는 감지되지만, 애초에 헷갈리지 않는 편이 낫다.

그 블록의 `:root` 20줄과 `.dark` 20줄을 아래로 **통째로 갈아끼운다.**

```css
  /* ── shadcn 토큰 — 위 램프의 별칭이다 (설계서 §5.3 안 B) ───────────
   *
   * 값을 두 벌 두지 않는다. --n* 가 .dark 에서 재정의되므로 별칭은 저절로 따라온다.
   * 그래서 이 블록은 :root 한 벌뿐이고, .dark 에는 램프에 없는 것만 적는다.
   *
   * ⚠️ --accent 는 Signal 이 아니다. shadcn 에서 outline·ghost 버튼의
   *    호버 배경으로 쓰인다(components/ui/button.tsx:17,20).
   */
  :root {
    --background: var(--n0);
    --foreground: var(--n9);
    --card: var(--n1);
    --card-foreground: var(--n9);
    --popover: var(--n1);
    --popover-foreground: var(--n9);
    --primary: var(--n9);
    --primary-foreground: var(--n0);
    --secondary: var(--n3);
    --secondary-foreground: var(--n9);
    --muted: var(--n3);
    --muted-foreground: var(--n6);
    --accent: var(--n3);
    --accent-foreground: var(--n9);
    --destructive: #dc2626;
    --destructive-foreground: #fafafa;
    --border: var(--n4);
    --input: var(--n4);
    --ring: var(--n6);
    --radius: 0.5rem;
  }

  .dark {
    /* 램프에 없는 것만. 나머지는 --n* 재정의로 따라온다. */
    --destructive: #7f1d1d;
    --destructive-foreground: #fafafa;
  }
```

- [ ] **Step 2: Tailwind 매핑을 `var()`로 바꾸고 죽은 스케일을 지운다**

`primary.50`~`primary.900`(sky 계열 hex)은 **사용처가 0건**이다. 남겨 두면 다음 사람이 「이게 브랜드 색인가」로 헷갈린다.

```js
      colors: {
        // 무채색 9단계 — 새 화면은 이걸 쓴다
        n0: "var(--n0)",
        n1: "var(--n1)",
        n2: "var(--n2)",
        n3: "var(--n3)",
        n4: "var(--n4)",
        n5: "var(--n5)",
        n6: "var(--n6)",
        n7: "var(--n7)",
        n8: "var(--n8)",
        n9: "var(--n9)",

        // Signal Amber — 액센트는 이것 하나뿐이다
        signal: {
          DEFAULT: "var(--signal)",
          ink: "var(--signal-ink)",
          soft: "var(--signal-soft)",
        },

        // shadcn 토큰 — 위 램프의 별칭. hsl() 래핑을 벗겼다
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
```

- [ ] **Step 3: 죽은 스케일이 정말 안 쓰이는지 확인한다**

지우기 전에 증명한다. 지운 뒤에 찾으면 늦다.

```bash
grep -rE '(bg|text|border|from|to|via|ring|fill|stroke)-primary-[0-9]{2,3}' pages/ components/ data/
```

Expected: **출력 없음, 종료 코드 1**(grep은 못 찾으면 1을 낸다). 출력이 있으면 그 자리를 먼저 고친다.

- [ ] **Step 4: `/blog` 156편이 안 깨졌는지 확인한다 — 단계 1의 완료 판정**

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run test
```

Expected: 넷 다 종료 코드 0. `build`는 sitemap 232 URL을 보고해야 한다.

**그리고 눈으로 본다.** 검사기가 못 잡는 부분이다.

```bash
npm run dev
```

| 확인 | 경로 | 봐야 할 것 |
| --- | --- | --- |
| 목록 | `/blog/` | 카드 배경이 페이지 배경과 구분되는가 (`n1` vs `n0` + `n4` 테두리) |
| 상세 | `/blog/agentic-coding/agentic-coding-qna-agent-design/` | 본문 가독, 코드블록, Mermaid 도식 |
| 태그 | `/blog/tags/` | Badge(shadcn) 색이 죽지 않았는가 |
| 버튼 | 아무 페이지의 테마 토글 | **호버 배경이 앰버가 아닌 회색인가** ← `--accent` 충돌 회귀 검사 |
| 양쪽 테마 | 위 넷 전부 | 라이트·다크 모두 |

- [ ] **Step 5: `check-baseline` 실패를 기록한다 (갱신하지 않는다)**

```bash
npm run check-baseline
```

Expected: **종료 코드 1.** CSS 파일명 해시가 HTML에 박혀 있어 비블로그 14개가 전부 바뀐다.

⚠️ **여기서 `check-baseline:update`를 실행하지 마라.** 갱신은 단계 2 끝에 사람이 1회만 한다(스펙 §11.1). 단계마다 갱신하면 습관이 되고, 그러면 이 검사는 죽는다.

실패 사실을 커밋 메시지에 남긴다.

- [ ] **Step 6: 커밋**

```bash
git add styles/globals.css tailwind.config.js
git commit -m "refactor(design): shadcn 토큰을 램프 별칭으로 전환 (설계서 §5.3 안 B)

tailwind 의 hsl(var(--x)) 래핑을 var(--x) 로 바꾸고, shadcn 토큰은 값을
따로 두지 않고 --n* 의 별칭으로 만들었다. --n* 가 .dark 에서 재정의되므로
별칭은 저절로 따라오고, .dark 의 shadcn 블록은 destructive 둘만 남는다.

사용처 0건이던 primary 50~900 숫자 스케일(sky 계열)을 제거했다.

check-baseline 은 실패한다 — CSS 파일명 해시가 HTML 에 박혀 비블로그 14개가
전부 바뀐다. 예상된 실패이고 기준선 갱신은 단계 2 끝에 1회만 한다(§11.1)."
```

---

### Task 5: 타이포 토큰 + Pretendard

**Files:**
- Modify: `styles/globals.css` (램프 블록 아래)
- Modify: `tailwind.config.js` (`fontSize`, `fontFamily`)
- Modify: `pages/_document.tsx`

**Interfaces:**
- Consumes: T3의 램프
- Produces: `text-hero`, `text-section`, `text-card`, `text-body`, `text-label` 유틸리티

- [ ] **Step 1: Pretendard CDN 주소가 살아 있는지 먼저 확인한다**

버전을 문서에서 베끼지 말고 실제로 받아 본다.

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css
```

Expected: `200`. 다른 코드가 나오면 `https://github.com/orioncactus/pretendard/releases`에서 최신 태그를 확인해 주소의 버전만 바꾼다. **버전을 `@latest`로 두지 않는다** — 정적 사이트의 빌드 재현성이 깨진다.

- [ ] **Step 2: 타이포 토큰을 추가한다**

```css
  /* ── 타이포 (설계서 §5.4) ───────────────────────────────────────── */
  :root {
    --fs-hero: clamp(2.25rem, 6vw, 4.5rem);
    --fs-section: clamp(1.5rem, 3vw, 2.25rem);
    --fs-card: 1.125rem;
    --fs-body: 1rem;
    --fs-label: 0.75rem;
  }
```

지표 숫자가 카운트업할 때 폭이 흔들리지 않게 하는 유틸리티를 `@layer utilities`에 넣는다.

```css
@layer utilities {
  /* 지표 숫자 — 자릿수가 바뀌어도 폭이 고정된다 */
  .tabular {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
  }
}
```

- [ ] **Step 3: Tailwind에 등록한다**

```js
      fontSize: {
        hero: ["var(--fs-hero)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        section: ["var(--fs-section)", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        card: ["var(--fs-card)", { lineHeight: "1.35" }],
        body: ["var(--fs-body)", { lineHeight: "1.75" }],
        label: ["var(--fs-label)", { lineHeight: "1.2", letterSpacing: "0.08em" }],
      },
      fontFamily: {
        // 한글은 Pretendard, 영문·숫자는 Inter 가 먼저 잡는다
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
```

- [ ] **Step 4: `_document.tsx`에 폰트를 건다**

`<Html lang="ko">`를 **건드리지 않는다**(GC-8).

```tsx
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap" rel="stylesheet" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </Head>
```

- [ ] **Step 5: 확인한다**

```bash
npx tsc --noEmit
npm run build
```

Expected: 둘 다 종료 코드 0.

```bash
npm run dev
```

| 확인 | 방법 |
| --- | --- |
| 한글 글꼴이 Pretendard인가 | 개발자도구에서 본문 요소의 Computed → `font-family` |
| 지표 숫자 폭 고정 | `<span className="tabular">156</span>`과 `111`을 나란히 두고 폭 비교 |
| `Nanum Pen Script` 회귀 없음 | 현재 히어로의 `hero-hello` 손글씨가 그대로인가 |

- [ ] **Step 6: 커밋**

```bash
git add styles/globals.css tailwind.config.js pages/_document.tsx
git commit -m "feat(design): 타이포 토큰 5종 + Pretendard 도입

설계서 §5.4. fs-hero 는 clamp() 로 반응한다.
지표 숫자용 .tabular 유틸리티를 추가해 카운트업 시 폭이 흔들리지 않게 했다.
Pretendard 는 버전을 고정한다 — @latest 는 빌드 재현성을 깬다."
```

---

### Task 6: 다크 기본 + FOUC 차단

**Files:**
- Modify: `pages/_document.tsx`
- Modify: `components/theme-toggle.tsx`

**Interfaces:**
- Consumes: T3의 램프(`.dark` 블록)
- Produces: 첫 페인트 전에 `<html class="dark">`가 확정된다

**왜 이게 별도 태스크인가:** 지금 테마는 `useEffect`에서 적용된다. 즉 **첫 페인트는 항상 라이트**다. 라이트 기본일 때는 티가 안 났지만, 스펙이 다크 기본으로 바꾸는 순간 **모든 방문자가 흰 화면 번쩍임을 본다.** 첫인상이 목표인 설계에서 이건 기능 결함이다.

- [ ] **Step 1: `_document.tsx`에 차단 스크립트를 넣는다**

`<body>` 안 `<Main />` **앞**에 둔다. 파서가 여기서 멈추고 실행하므로 첫 페인트 전에 클래스가 확정된다.

```tsx
/**
 * 첫 페인트 전에 테마 클래스를 확정한다.
 *
 * useEffect 로 하면 라이트로 한 번 그린 뒤 다크로 바뀌어 흰 화면이 번쩍인다.
 * 다크가 기본이라 이 번쩍임이 모든 방문자에게 보인다.
 *
 * 저장값이 없으면 다크다 — prefers-color-scheme 을 보지 않는다(설계서 §5.5).
 * localStorage 접근이 막힌 환경(사생활 보호 모드 등)에서도 다크로 떨어진다.
 */
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('portfolio-theme');document.documentElement.classList.toggle('dark',s!=='light');}catch(e){document.documentElement.classList.add('dark');}})();`;
```

```tsx
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Main />
        <NextScript />
      </body>
```

- [ ] **Step 2: 토글이 DOM을 단일 진실 공급원으로 삼게 한다**

기본값 로직을 두 곳에 두면 어긋난다. 스크립트가 이미 정했으니 **토글은 읽기만 한다.**

```tsx
  useEffect(() => {
    setMounted(true);
    // 기본값 판단은 _document.tsx 의 THEME_SCRIPT 가 이미 끝냈다.
    // 여기서 다시 계산하면 두 곳의 규칙이 어긋난다. DOM 을 읽는다.
    setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);
```

`useState`의 초기값도 `"dark"`로 바꾼다 — 마운트 전 비활성 버튼이 그리는 아이콘이 어긋나지 않게.

```tsx
  const [mode, setMode] = useState<"light" | "dark">("dark");
```

마운트 전 폴백 버튼의 아이콘도 다크 기준으로 맞춘다.

```tsx
  if (!mounted) {
    return (
      <Button type="button" variant="outline" size="icon" className="shrink-0" disabled aria-label="테마 전환">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }
```

- [ ] **Step 3: 확인한다**

```bash
npm run build
npx serve out -l 3000
```

| 확인 | 방법 | 기대 |
| --- | --- | --- |
| 번쩍임 없음 | `localStorage.clear()` 후 하드 리로드 | 흰 화면이 한 프레임도 안 보인다 |
| 다크 기본 | 같은 상태에서 | 다크로 뜬다 |
| 저장값 우선 | 라이트로 토글 후 리로드 | 라이트 유지 |
| 저장소 차단 | 시크릿 창 + 사이트 데이터 차단 | 예외 없이 다크로 뜬다 |

⚠️ 번쩍임은 `npm run dev`에서는 잘 안 보인다. **반드시 빌드 산출물로 확인한다.**

- [ ] **Step 4: 커밋**

```bash
git add pages/_document.tsx components/theme-toggle.tsx
git commit -m "feat(theme): 다크 기본 + 첫 페인트 전 테마 확정

지금까지 테마는 useEffect 에서 적용돼 첫 페인트가 항상 라이트였다.
라이트 기본일 땐 티가 안 났지만 다크 기본으로 바뀌면 모든 방문자가
흰 화면 번쩍임을 본다. _document 의 차단 스크립트로 첫 페인트 전에 확정한다.

기본값 규칙을 두 곳에 두지 않기 위해 토글은 DOM 클래스를 읽기만 한다."
```

---

### Task 7: 셸 — 헤더 · 푸터

**Files:**
- Create: `components/site-header.tsx`
- Create: `components/site-footer.tsx`
- Create: `components/site-shell.tsx`

**Interfaces:**
- Consumes: T3 램프, T5 타이포, `components/theme-toggle.tsx`
- Produces: `<SiteShell>{children}</SiteShell>` — T10·T11·T12가 감싸는 데 쓴다

**설계 근거:** 스펙 §4 「헤더 내비게이션」. **미완성 라우트는 링크를 렌더하지 않는다** — 비활성 표시도 하지 않는다. 죽은 링크가 있는 사이트로 읽힌다.

- [ ] **Step 1: 헤더를 만든다**

```tsx
// components/site-header.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

/**
 * 내비 항목.
 *
 * ⚠️ 미완성 라우트는 여기에 넣지 않는다. 비활성으로 두지도 않는다 —
 *    죽은 링크가 있는 사이트로 읽힌다(설계서 §4).
 *
 *    /atlas  → 단계 4에서 추가한다. 발행(단계 3) 시점의 헤더에는 없다.
 *    ⌘K 검색 → 단계 3에서 우측에 추가한다.
 */
const NAV: NavItem[] = [
  { href: "/work/", label: "Work" },
  { href: "/blog/", label: "Blog" },
  { href: "/about/", label: "About" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // 히어로 구간에서는 투명, 벗어나면 n2 배경 + n4 하단 경계
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-interactive",
        scrolled ? "bg-n2 border-b border-n4" : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-card font-semibold text-n9 break-keep">
          허우용 <span className="text-n6 font-normal">Ted</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="주요 메뉴">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-body text-n7 hover:text-n9 transition-interactive break-keep"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/en/"
            className="hidden sm:inline text-label uppercase tracking-widest text-n6 hover:text-n9 transition-interactive"
          >
            EN
          </Link>
          <ThemeToggle />
          <button
            type="button"
            className="md:hidden text-body text-n7 px-2"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "닫기" : "메뉴"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" className="md:hidden border-t border-n4 bg-n2" aria-label="모바일 메뉴">
          <ul className="mx-auto max-w-6xl px-4 py-4 space-y-3 sm:px-6">
            {[...NAV, { href: "/en/", label: "EN" }].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block text-body text-n7 hover:text-n9 break-keep"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
```

- [ ] **Step 2: 푸터와 셸을 만든다**

```tsx
// components/site-footer.tsx
import Link from "next/link";
import { NOTION_RESUME_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-n4 bg-n2">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-body text-n6 break-keep">허우용 · Ted — 백엔드 · 플랫폼 리더</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="푸터 메뉴">
          <Link href="/blog/" className="text-body text-n6 hover:text-n9 transition-interactive">
            Blog
          </Link>
          <a
            href={NOTION_RESUME_URL}
            className="text-body text-n6 hover:text-n9 transition-interactive"
            target="_blank"
            rel="noopener noreferrer"
          >
            이력서
          </a>
          <a
            href="mailto:withwooyong@gmail.com"
            className="text-body text-n6 hover:text-n9 transition-interactive"
          >
            withwooyong@gmail.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
```

```tsx
// components/site-shell.tsx
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-n0 text-n7">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-signal focus:text-signal-ink focus:px-4 focus:py-2 focus:rounded"
      >
        본문으로 건너뛰기
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 3: 확인한다**

셸은 아직 아무 페이지에도 안 붙어 있다. 임시로 `/en`에 붙여 보는 대신 **T10에서 붙일 때 확인한다.** 지금은 타입과 빌드만 본다.

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: 셋 다 종료 코드 0. `SiteShell`이 미사용이라 트리셰이킹으로 산출물에 안 들어가는 게 정상이다.

- [ ] **Step 4: 커밋**

```bash
git add components/site-header.tsx components/site-footer.tsx components/site-shell.tsx
git commit -m "feat(shell): 전역 헤더·푸터·셸 추가

설계서 §4 헤더 내비게이션 명세. Work·Blog·About 셋만 넣었다 —
/atlas 는 단계 4, ⌘K 검색은 단계 3에 생기므로 그때 추가한다.
미완성 라우트를 비활성으로 노출하지 않는 것이 규칙이다."
```

> **단계 1 완료.** 이 시점에서 `/blog` 156편이 새 토큰에서 정상 렌더되고 기존 화면 회귀가 없어야 한다. `check-baseline`은 실패 상태로 둔다.

---

# 단계 2 — 메인 5섹션 · 히어로 B · `/work` · `/about`

**완료 판정 (스펙 §12):** 첫 화면 완성 · `product-lead*` 9 URL 스텁화 · 고아 자산 5종 삭제 · **끝에서 기준선 1회 갱신** · Lighthouse 측정 가능.

### Task 8: Playwright 도입 + 스모크

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`
- Modify: `package.json` (`devDependencies`, `scripts`)
- Modify: `.gitignore`

**Interfaces:**
- Produces: `npm run e2e` — T9·T13이 여기에 테스트를 더한다

**왜 지금인가:** 스펙 §11이 Playwright를 단계 2~4의 게이트로 잡았다. 히어로 스크롤 연출(T9)은 **단위 테스트로 검증할 수 없다** — 스크롤이라는 브라우저 동작이 필요하다. 화면을 만들기 전에 검증 수단을 세운다.

- [ ] **Step 1: 의존성을 추가한다**

정적 export는 `next start`로 못 띄운다. 산출물을 서빙할 정적 서버가 필요하다.

```bash
npm install -D @playwright/test serve
npx playwright install --with-deps chromium
```

- [ ] **Step 2: 설정을 쓴다**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

/**
 * 정적 산출물(out/)을 그대로 서빙해 검사한다.
 *
 * next start 는 output: "export" 에서 동작하지 않는다. dev 서버로 검사하면
 * 실제 배포물과 다른 것을 보게 되므로, 빌드 산출물을 서빙한다.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "npx serve out -l 4173 --no-clipboard",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

```json
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui"
```

```text
# .gitignore 에 추가
/test-results/
/playwright-report/
/blob-report/
```

- [ ] **Step 3: 실패하는 스모크를 쓴다**

지금은 `/work`·`/about`이 없으므로 **실패하는 게 맞다.**

```ts
// e2e/smoke.spec.ts
import { expect, test } from "@playwright/test";

test.describe("셸", () => {
  test("헤더 내비가 Work · Blog · About 셋을 노출한다", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "주요 메뉴" });
    await expect(nav.getByRole("link", { name: "Work" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Blog" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "About" })).toBeVisible();
  });

  test("미완성 라우트는 내비에 없다", async ({ page }) => {
    await page.goto("/");
    // /atlas 는 단계 4, 검색은 단계 3. 지금 보이면 죽은 링크다.
    await expect(page.getByRole("link", { name: "Atlas" })).toHaveCount(0);
  });

  test("본문 건너뛰기 링크가 포커스에서 드러난다", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "본문으로 건너뛰기" })).toBeFocused();
  });
});

test.describe("테마", () => {
  test("저장값이 없으면 다크로 뜬다", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("토글하면 라이트가 되고 리로드해도 유지된다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "라이트 모드로 전환" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});

test.describe("라우트", () => {
  for (const path of ["/", "/work/", "/about/", "/blog/", "/en/"]) {
    test(`${path} 가 200 으로 응답한다`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `${path} 응답 코드`).toBe(200);
    });
  }

  /**
   * canonical 이 자기 자신을 가리키는지.
   *
   * SiteHead 의 path 는 선택 인자이고 기본값이 "/" 다. 안 넘겨도 빌드와 tsc 가
   * 통과하므로 사람이 못 잡는다 — 결과는 「이 페이지는 홈의 사본」이라는 신호다.
   */
  for (const path of ["/work/", "/about/", "/blog/"]) {
    test(`${path} 의 canonical 이 자기 자신을 가리킨다`, async ({ page }) => {
      await page.goto(path);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical, `${path} 의 canonical`).toContain(path);
    });
  }
});
```

- [ ] **Step 4: 돌려서 실패를 확인한다**

```bash
npm run build
npm run e2e
```

Expected: `/work/`·`/about/`이 **404로 실패**하고, 헤더 관련 테스트도 실패한다(셸이 아직 어느 페이지에도 안 붙어 있다). **이 실패가 T10~T12의 목표다.**

- [ ] **Step 5: 커밋**

```bash
git add playwright.config.ts e2e/smoke.spec.ts package.json package-lock.json .gitignore
git commit -m "test(e2e): Playwright 도입 — 셸·테마·라우트 스모크

설계서 §11 의 Playwright 게이트. 히어로 스크롤 연출은 단위 테스트로 검증할
수 없어 화면을 만들기 전에 검증 수단을 먼저 세운다.

next start 는 output: export 에서 동작하지 않으므로 out/ 을 serve 로 띄운다.
dev 서버로 검사하면 실제 배포물이 아닌 것을 보게 된다.

/work · /about 이 없어 실패하는 상태다 — T10~T12 의 목표다."
```

---

### Task 9: 히어로 B — 아틀라스 점등

**Files:**
- Create: `lib/use-scroll-progress.ts`
- Create: `components/hero-atlas.tsx`
- Create: `components/hero.tsx`
- Create: `e2e/hero.spec.ts`

**Interfaces:**
- Consumes: T3 램프, T5 타이포
- Produces: `<Hero />` — T10이 `pages/index.tsx`에서 쓴다

**제약 (스펙 §6):**
- **SVG 서브그래프 20~30노드로 고정.** three.js를 첫 화면에 올리지 않는다 (600KB급이 LCP를 무너뜨린다)
- `prefers-reduced-motion: reduce`이면 **최종 상태를 즉시 표시**한다 — 문구 ③ + 점등 완료
- 목업 `docs/superpowers/mockups/hero-motion.html`의 안 B를 열어 두고 속도감을 맞춘다

- [ ] **Step 1: 스크롤 진행도 훅을 쓴다**

```ts
// lib/use-scroll-progress.ts
import { useEffect, useRef, useState } from "react";

/**
 * 대상 요소를 지나는 스크롤 진행도 p ∈ [0,1] 을 돌려준다.
 *
 * 히어로의 배경 점등과 문구 교체를 이 값 하나로 구동한다(설계서 §6).
 * 두 레이어가 같은 값을 보므로 서로 어긋날 수 없다.
 *
 * reduced-motion 이면 항상 1 을 돌려준다 — 최종 상태 즉시 표시.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setProgress(1);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // 요소 상단이 뷰포트 상단에 닿은 순간 0, 요소가 다 빠져나가면 1
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) {
        setProgress(1);
        return;
      }
      const p = Math.min(1, Math.max(0, -rect.top / travel));
      setProgress(p);
    };

    const onScroll = () => {
      // 스크롤마다 레이아웃을 읽으면 프레임이 떨어진다. rAF 로 한 프레임에 한 번만
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return { ref, progress };
}
```

- [ ] **Step 2: 배경 서브그래프를 만든다**

노드 좌표는 고정 배열이다. 무작위로 만들면 빌드마다 달라져 스냅샷이 흔들린다.

```tsx
// components/hero-atlas.tsx

/** 히어로 배경 서브그래프. 24노드 고정 — three.js 를 첫 화면에 올리지 않는다(설계서 §6). */
const NODES: { x: number; y: number; r: number }[] = [
  { x: 12, y: 22, r: 3.2 }, { x: 24, y: 14, r: 2.4 }, { x: 33, y: 30, r: 4.0 },
  { x: 18, y: 44, r: 2.6 }, { x: 42, y: 20, r: 2.8 }, { x: 52, y: 34, r: 3.6 },
  { x: 61, y: 18, r: 2.4 }, { x: 70, y: 30, r: 3.0 }, { x: 82, y: 22, r: 2.6 },
  { x: 88, y: 40, r: 3.4 }, { x: 74, y: 48, r: 2.4 }, { x: 60, y: 52, r: 4.2 },
  { x: 46, y: 60, r: 2.8 }, { x: 30, y: 58, r: 3.0 }, { x: 16, y: 66, r: 2.4 },
  { x: 38, y: 76, r: 3.2 }, { x: 54, y: 80, r: 2.6 }, { x: 68, y: 70, r: 2.8 },
  { x: 84, y: 62, r: 2.4 }, { x: 92, y: 76, r: 3.0 }, { x: 26, y: 86, r: 2.6 },
  { x: 48, y: 92, r: 2.4 }, { x: 72, y: 88, r: 3.2 }, { x: 90, y: 12, r: 2.4 },
];

/** 엣지는 노드 인덱스 쌍. 점등 순서는 배열 순서를 따른다. */
const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
  [9, 10], [10, 11], [11, 5], [11, 12], [12, 13], [13, 3], [13, 14], [12, 15],
  [15, 16], [16, 17], [17, 10], [17, 18], [18, 19], [15, 20], [16, 21], [21, 22],
  [22, 19], [8, 23],
];

/** 0..1 구간에서 i/total 지점을 지났는지의 정도. 순차 점등에 쓴다. */
function stagger(p: number, i: number, total: number): number {
  const step = 1 / total;
  return Math.min(1, Math.max(0, (p - i * step * 0.6) / step));
}

export function HeroAtlas({ progress }: { progress: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="var(--n4)" strokeWidth="0.18" fill="none">
        {EDGES.map(([a, b], i) => (
          <line
            key={`${a}-${b}`}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            // 엣지는 노드보다 늦게 따라온다
            opacity={0.06 + 0.5 * stagger(progress, i, EDGES.length) * 0.9}
          />
        ))}
      </g>
      <g>
        {NODES.map((n, i) => {
          const t = stagger(progress, i, NODES.length);
          return (
            <circle
              key={`${n.x}-${n.y}`}
              cx={n.x}
              cy={n.y}
              r={n.r * (1 + 0.35 * t)}
              fill={t > 0.6 ? "var(--signal)" : "var(--n5)"}
              opacity={0.08 + 0.72 * t}
            />
          );
        })}
      </g>
    </svg>
  );
}
```

- [ ] **Step 3: 히어로를 조립한다**

문구는 Global Constraints의 3문장을 **그대로** 쓴다.

```tsx
// components/hero.tsx
import { HeroAtlas } from "@/components/hero-atlas";
import { useScrollProgress } from "@/lib/use-scroll-progress";
import { cn } from "@/lib/utils";

const EYEBROW = "20Y BACKEND · PLATFORM LEADER";

const LINES = [
  "20년간 만든 것은 서비스가 아니라 조직이었다.",
  "30명이 함께 굴린 교육·커머스 플랫폼. 두 번 다시 세운 검색.",
  "그 판단은 글 156편으로 남아 있다.",
];

const METRICS = [
  { value: "20년", label: "백엔드 · 플랫폼" },
  { value: "30명", label: "함께 굴린 조직" },
  { value: "156편", label: "남긴 글" },
];

export function Hero() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();

  // 문구 3문장을 구간별로 교체한다. p 하나로 배경과 함께 구동된다(설계서 §6).
  const active = Math.min(LINES.length - 1, Math.floor(progress * LINES.length));

  return (
    <div ref={ref} className="relative h-[300vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <HeroAtlas progress={progress} />

        <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-label uppercase tracking-widest text-signal">{EYEBROW}</p>

          <div className="mt-6 min-h-[9rem] sm:min-h-[11rem]">
            {LINES.map((line, i) => (
              <h1
                key={line}
                className={cn(
                  "text-hero font-bold text-n9 break-keep transition-interactive",
                  i === active ? "opacity-100" : "absolute opacity-0 pointer-events-none",
                )}
                aria-hidden={i !== active}
              >
                {line}
              </h1>
            ))}
          </div>

          <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6">
            {METRICS.map((m) => (
              <div key={m.label}>
                <dt className="sr-only">{m.label}</dt>
                <dd className="tabular text-section font-bold text-signal">{m.value}</dd>
                <p className="text-label uppercase tracking-widest text-n6 break-keep">{m.label}</p>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
```

⚠️ `min-h`를 둔 이유는 **문구 길이가 달라 높이가 튀면 CLS가 발생**하기 때문이다. Lighthouse 예산(T15)이 이걸 잡는다.

- [ ] **Step 4: E2E를 쓴다**

```ts
// e2e/hero.spec.ts
import { expect, test } from "@playwright/test";

test.describe("히어로", () => {
  test("첫 화면에 문구 ①과 지표 3개가 보인다", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "20년간 만든 것은 서비스가 아니라 조직이었다." })).toBeVisible();
    await expect(page.getByText("20년", { exact: true })).toBeVisible();
    await expect(page.getByText("30명", { exact: true })).toBeVisible();
    await expect(page.getByText("156편", { exact: true })).toBeVisible();
  });

  test("스크롤하면 문구가 ③으로 바뀐다", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.28));
    await expect(page.getByRole("heading", { name: "그 판단은 글 156편으로 남아 있다." })).toBeVisible();
  });

  test("three.js 를 첫 로드에 받지 않는다", async ({ page }) => {
    const heavy: string[] = [];
    page.on("request", (req) => {
      if (/three|3d/i.test(req.url())) heavy.push(req.url());
    });
    await page.goto("/", { waitUntil: "networkidle" });
    expect(heavy, `첫 로드에 3D 번들이 섞였다: ${heavy.join(", ")}`).toHaveLength(0);
  });
});

test.describe("히어로 — reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("스크롤 없이 최종 상태를 즉시 보여준다", async ({ page }) => {
    await page.goto("/");
    // 설계서 §6: reduce 면 문구 ③ + 점등 완료를 즉시
    await expect(page.getByRole("heading", { name: "그 판단은 글 156편으로 남아 있다." })).toBeVisible();
  });
});
```

- [ ] **Step 5: 돌린다**

T10에서 `pages/index.tsx`에 붙기 전까지는 실패한다. **T10 직후에 이 명령을 다시 돌린다.**

```bash
npx tsc --noEmit
npm run build
npm run e2e -- e2e/hero.spec.ts
```

- [ ] **Step 6: 커밋**

```bash
git add lib/use-scroll-progress.ts components/hero-atlas.tsx components/hero.tsx e2e/hero.spec.ts
git commit -m "feat(hero): 안 B 아틀라스 점등 히어로

설계서 §6. 스크롤 진행도 p 하나로 배경 점등과 문구 교체를 함께 구동한다 —
두 레이어가 같은 값을 보므로 어긋날 수 없다.

배경은 SVG 24노드 고정이다. three.js 를 첫 화면에 올리면 600KB 급이
LCP 를 무너뜨린다. E2E 로 첫 로드에 3D 번들이 없음을 확인한다.

reduced-motion 이면 훅이 p=1 을 돌려 최종 상태를 즉시 표시한다."
```

---

### Task 10: 메인 5섹션 — `pages/index.tsx` 재작성

**Files:**
- Create: `components/home/section-selected-work.tsx`
- Create: `components/home/section-how-i-lead.tsx`
- Create: `components/home/section-now.tsx`
- Create: `components/home/section-atlas.tsx`
- Create: `components/home/section-connect.tsx`
- Modify: `pages/index.tsx` (687줄 → 조립 코드)

**Interfaces:**
- Consumes: T1 `experiences`·`projects`, T7 `SiteShell`, T9 `Hero`
- Produces: `/` 완성

**섹션 정의 (스펙 §4):**

| # | 섹션 | 담는 것 | 근거 링크 |
| --- | --- | --- | --- |
| 01 | Selected Work | 야나두 · TVING · SKB 대표 성과, 수치 중심 | → `/work` |
| 02 | How I Lead | 리더십 원칙 3~4개, 각 1문장 | → 단계 4에 `/atlas/[id]`. **지금은 링크 없음** |
| 03 | Now | 2026년 현재 (집필 · AI 전환 · 구직) | → `/blog` 최신 |
| 04 | Atlas | 그래프 미리보기 + 토픽별 노드 수 | → 단계 4. **지금은 섹션 자체를 렌더하지 않는다** |
| 05 | Connect | 연락 · 이력서 · 소셜 | — |

⚠️ **04 Atlas 섹션은 단계 2에서 만들지 않는다.** `/atlas`가 없는데 미리보기를 그리면 죽은 링크가 된다 — 헤더에서 Atlas를 뺀 것과 같은 이유다(스펙 §4). 파일은 만들되 `pages/index.tsx`에서 렌더하지 않고, 단계 4에서 켠다.

- [ ] **Step 1: 섹션 껍데기 규약을 정한다**

다섯 섹션이 같은 골격을 쓴다. 여백은 뷰포트 높이급(스펙 §5.5).

```tsx
// components/home/section-selected-work.tsx
import Link from "next/link";
import { experiences } from "@/data/experience";

export function SectionSelectedWork() {
  // 메인에는 대표 3개만. 전체는 /work 에 있다.
  const featured = experiences.slice(0, 3);

  return (
    <section id="selected-work" className="border-t border-n4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">01 — Selected Work</p>
        <h2 className="mt-4 text-section font-bold text-n9 break-keep">
          20년간 만든 것은 서비스가 아니라 조직이었다
        </h2>

        <ul className="mt-12 space-y-12">
          {featured.map((exp) => (
            <li key={`${exp.company}-${exp.period}`} className="border-l-2 border-n4 pl-6">
              <p className="text-label uppercase tracking-widest text-n6 tabular">{exp.period}</p>
              <h3 className="mt-2 text-card font-semibold text-n9 break-keep">{exp.role}</h3>
              <p className="text-body text-n6 break-keep">{exp.company}</p>
              <p className="mt-3 text-body text-n7 break-keep">{exp.summary}</p>
            </li>
          ))}
        </ul>

        <Link
          href="/work/"
          className="mt-12 inline-block text-body text-signal hover:underline break-keep"
        >
          전체 이력과 시스템 다이어그램 보기 →
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 나머지 네 섹션을 같은 골격으로 만든다**

`02 How I Lead` — 원칙 3~4개, 각 1문장. 단계 4에서 각 항목이 `/atlas/[id]`로 이어진다.

```tsx
// components/home/section-how-i-lead.tsx

/**
 * 리더십 원칙. 각 1문장이다.
 *
 * atlasId 는 단계 4에서 /atlas/[id] 링크가 된다. 지금은 링크를 그리지 않는다 —
 * /atlas 가 없는 상태에서 링크를 그리면 죽은 링크다(설계서 §4).
 */
const PRINCIPLES: { atlasId: string; title: string; body: string }[] = [
  {
    atlasId: "org-before-service",
    title: "조직이 먼저다",
    body: "서비스는 조직 구조를 그대로 닮는다. 구조를 못 바꾸면 서비스도 못 바꾼다.",
  },
  {
    atlasId: "measure-before-argue",
    title: "논쟁 전에 측정한다",
    body: "추측으로 합의한 결정은 추측으로 뒤집힌다. 숫자가 있으면 논쟁이 짧아진다.",
  },
  {
    atlasId: "rules-live-in-checkers",
    title: "규칙은 문서가 아니라 검사기에 둔다",
    body: "지켜지지 않을 규칙은 규칙 전체를 죽인다. 기계가 막을 수 있으면 기계가 막는다.",
  },
];

export function SectionHowILead() {
  return (
    <section id="how-i-lead" className="border-t border-n4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">02 — How I Lead</p>
        <dl className="mt-12 grid gap-10 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.atlasId}>
              <dt className="text-card font-semibold text-n9 break-keep">{p.title}</dt>
              <dd className="mt-2 text-body text-n7 break-keep">{p.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
```

`03 Now` · `05 Connect`도 같은 골격으로 만든다. `03`은 `/blog/` 최신으로, `05`는 `lib/site.ts`의 `NOTION_RESUME_URL`과 메일 주소로 잇는다. `04`는 파일만 만들고 렌더하지 않는다.

- [ ] **Step 3: `pages/index.tsx`를 조립 코드로 갈아엎는다**

687줄이 아래로 줄어든다. **콘텐츠는 T1에서 `data/`로 빼 뒀으므로 소실되지 않는다.**

```tsx
import { Hero } from "@/components/hero";
import { SectionConnect } from "@/components/home/section-connect";
import { SectionHowILead } from "@/components/home/section-how-i-lead";
import { SectionNow } from "@/components/home/section-now";
import { SectionSelectedWork } from "@/components/home/section-selected-work";
import { SiteHead } from "@/components/site-head";
import { SiteShell } from "@/components/site-shell";

export default function Home() {
  return (
    <>
      <SiteHead
        title="허우용 · Ted — 백엔드 · 플랫폼 리더"
        description="20년간 만든 것은 서비스가 아니라 조직이었다. 교육·커머스 플랫폼과 검색을 두 번 세운 기록, 그리고 글 156편."
        path="/"
      />
      <SiteShell>
        <Hero />
        <SectionSelectedWork />
        <SectionHowILead />
        <SectionNow />
        {/* 04 Atlas — /atlas 가 생기는 단계 4에서 켠다. 지금 그리면 죽은 링크다 */}
        <SectionConnect />
      </SiteShell>
    </>
  );
}
```

⚠️ **`path`를 반드시 넘긴다.** `SiteHead`의 `path` 기본값은 `"/"`이고, 그 값으로 `<link rel="canonical">`과 `og:url`이 만들어진다. 안 넘기면 `/work`·`/about`이 **자기 자신이 아니라 홈을 정본으로 가리킨다** — 검색엔진에 「이 페이지는 홈의 사본」이라고 말하는 셈이다.

시그니처는 `components/site-head.tsx:4-12`에 있다.

```ts
type SiteHeadProps = {
  title: string;
  description: string;
  path?: string;          // 기본 "/" — 반드시 넘긴다
  ogImagePath?: string;   // 기본 "/images/Ted_profile.png"
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
};
```

- [ ] **Step 4: 확인한다**

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run e2e
```

Expected: `tsc`·`lint`·`build` 종료 코드 0. E2E는 `/work/`·`/about/` 404만 남고 **셸·테마·히어로 테스트는 전부 통과**해야 한다.

- [ ] **Step 5: 커밋**

```bash
git add pages/index.tsx components/home/
git commit -m "feat(home): 메인 5섹션 — index.tsx 687줄 전면 재작성

설계서 §4. 히어로 + 01 Selected Work · 02 How I Lead · 03 Now · 05 Connect.

04 Atlas 섹션은 파일만 만들고 렌더하지 않는다. /atlas 가 단계 4에 생기므로
지금 미리보기를 그리면 죽은 링크가 된다 — 헤더에서 Atlas 를 뺀 것과 같은 이유다.

콘텐츠는 T1 에서 data/ 로 빼 둬서 재작성으로 소실되지 않았다."
```

---

### Task 11: `/work` — `product-lead*` 4갈래 통합

**Files:**
- Create: `pages/work/index.tsx`
- Test: `e2e/smoke.spec.ts` (T8에서 만든 `/work/` 200 검사)

**Interfaces:**
- Consumes: T1 `experiences`·`projects`, `data/diagrams/**`, `components/system-diagram-card.tsx`, T7 `SiteShell`
- Produces: `/work/` — T13 스텁 4개가 여기를 가리킨다

**통합 대상:** `pages/product-lead/index.tsx`(317) · `-v2`(317) · `-loadmap`(565) · `-wiki`(88 + `[slug]`). **네 갈래에서 가장 최신 확정본은 `-v2`다** — 사용자가 확인·확정하고 v2 링크로 전달을 마쳤다.

⚠️ **문구를 새로 쓰지 않는다.** Global Constraints의 「문구 규칙」이 여기에 걸린다. `-v2`의 문구를 옮기되 「처음」 표현을 넣지 않고, 「원조 구축」은 그대로 둔다.

- [ ] **Step 1: 네 파일에서 남길 것을 골라 적는다**

작업 전에 `docs/superpowers/plans/2026-08-25-work-merge-notes.md`에 표로 남긴다. 코드를 옮기기 전에 무엇을 버리는지 적어야 나중에 「왜 빠졌지」를 다시 묻지 않는다.

```bash
sed -n '1,80p' pages/product-lead-v2/index.tsx
sed -n '1,60p' pages/product-lead-loadmap/index.tsx
```

| 출처 | 남길 것 | 버릴 것 |
| --- | --- | --- |
| `-v2` | 포지셔닝 문구 · 역량 매핑 표 · NCMS 발주 PM 서사 | 자체 히어로·내비 (셸이 대체) |
| `-loadmap` | 도메인별 로드맵 요약 | `roadmap-domain.tsx` 인터랙션 (T14에서 삭제) |
| `-wiki` | 없음 — 내부 문서다 | 전부 |
| `index.tsx`(구) | `data/diagrams/**` 시스템 다이어그램 | — |

- [ ] **Step 2: `/work`를 만든다**

```tsx
// pages/work/index.tsx
import { SiteHead } from "@/components/site-head";
import { SiteShell } from "@/components/site-shell";
import { SystemDiagramCard } from "@/components/system-diagram-card";
import { diagramGroups } from "@/data/portfolio";
import { experiences } from "@/data/experience";
import { projects } from "@/data/projects";

export default function Work() {
  return (
    <>
      <SiteHead
        title="Work — 허우용 · Ted"
        description="야나두 · TVING · SKB 에서의 프로덕트 리더십과 시스템 구조. 로드맵에서 출시, 그리고 지표까지."
        path="/work/"
      />
      <SiteShell>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <p className="text-label uppercase tracking-widest text-signal">Work</p>
          <h1 className="mt-4 text-hero font-bold text-n9 break-keep">
            로드맵에서 출시까지, 그리고 그 뒤의 지표까지
          </h1>

          <section className="mt-20" aria-labelledby="work-experience">
            <h2 id="work-experience" className="text-section font-bold text-n9 break-keep">
              경력
            </h2>
            <ul className="mt-10 space-y-12">
              {experiences.map((exp) => (
                <li key={`${exp.company}-${exp.period}`} className="border-l-2 border-n4 pl-6">
                  <p className="text-label uppercase tracking-widest text-n6 tabular">
                    {exp.period} · {exp.duration}
                  </p>
                  <h3 className="mt-2 text-card font-semibold text-n9 break-keep">{exp.role}</h3>
                  <p className="text-body text-n6 break-keep">{exp.company}</p>
                  <p className="mt-3 text-body text-n7 break-keep">{exp.summary}</p>
                  <ul className="mt-4 space-y-2">
                    {exp.highlights.map((h) => (
                      <li key={h} className="flex gap-2 text-body text-n7 break-keep">
                        <span className="text-signal" aria-hidden="true">•</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-24" aria-labelledby="work-projects">
            <h2 id="work-projects" className="text-section font-bold text-n9 break-keep">
              프로젝트
            </h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-2">
              {projects.map((p) => (
                <li key={p.title} className="rounded-lg border border-n4 bg-n1 p-6">
                  <h3 className="text-card font-semibold text-n9 break-keep">{p.title}</h3>
                  <p className="mt-2 text-body text-n7 break-keep">{p.description}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <li key={t} className="rounded bg-n3 px-2 py-1 text-label text-n7">
                        {t}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-24" aria-labelledby="work-systems">
            <h2 id="work-systems" className="text-section font-bold text-n9 break-keep">
              시스템 구조
            </h2>
            <div className="mt-10 space-y-16">
              {diagramGroups.map((group) => (
                <div key={group.id}>
                  <h3 className="text-card font-semibold text-n9 break-keep">
                    {group.company}{" "}
                    <span className="text-n6 font-normal tabular">{group.period}</span>
                  </h3>
                  <div className="mt-6 space-y-8">
                    {group.items.map((item) => (
                      <SystemDiagramCard key={item.specId} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </SiteShell>
    </>
  );
}
```

⚠️ **`SystemDiagramCard`는 그룹이 아니라 항목 하나를 받는다** — `components/system-diagram-card.tsx:13`이 `({ item }: { item: DiagramItem })`이다. 그룹을 통째로 넘기면 타입 오류가 난다. 그룹 머리글은 호출부에서 그리고, 카드는 `group.items`를 순회해 넘긴다(위 코드가 그 형태다).

`data/portfolio.ts:31-36`의 `DiagramGroup`은 `{ id, company, period, items }`이고, `DiagramItem`은 `specId`를 가진다 — 그것이 카드의 key다.

- [ ] **Step 3: 확인한다**

```bash
npx tsc --noEmit
npm run build
npm run e2e -- e2e/smoke.spec.ts
```

Expected: `/work/` 200 통과. `/about/`만 남아 실패한다.

- [ ] **Step 4: 문구 규칙을 눈으로 검사한다** — 기계가 못 잡는다

```bash
grep -n '처음' pages/work/index.tsx data/experience.ts data/projects.ts
grep -n '개발실장' pages/work/index.tsx data/experience.ts
```

| 확인 | 기대 |
| --- | --- |
| 「처음」 표현 | TVING CMS 문맥에 **없어야 한다** |
| 직책 | `커머스개발실장` — 「개발실장」 단독이면 고친다 |
| 회사 라벨 | `(주)야나두 a kakao company (구 카카오키즈)` 전체 표기 |
| 「원조 구축」 | 있으면 **그대로 둔다** |

- [ ] **Step 5: 커밋**

```bash
git add pages/work/index.tsx docs/superpowers/plans/2026-08-25-work-merge-notes.md
git commit -m "feat(work): product-lead 4갈래를 /work 하나로 통합

설계서 §4. -v2 가 사용자 확정본이라 문구의 기준으로 삼았다.
경력·프로젝트는 data/ 에서, 시스템 구조는 data/diagrams 에서 온다.

문구 규칙 확인: 「처음」 표현 없음, 직책은 커머스개발실장,
회사 라벨 전체 표기, 「원조 구축」 유지."
```

---

### Task 12: `/about`

**Files:**
- Create: `pages/about/index.tsx`

**Interfaces:**
- Consumes: T1 `experiences`, `data/portfolio.ts`의 `skillCategories`·`thesisSummaryNarration`, T7 `SiteShell`
- Produces: `/about/` — 헤더 내비의 About이 여기로 온다

**담는 것 (스펙 §4):** 경력 전문 · 학력 · 기술. `/work`가 「무엇을 했나」라면 `/about`은 「누구인가」다. 경력 전문은 `/work`와 겹치므로 **여기서는 요약만 두고 `/work`로 보낸다.**

- [ ] **Step 1: 만든다**

```tsx
// pages/about/index.tsx
import Link from "next/link";
import { SiteHead } from "@/components/site-head";
import { SiteShell } from "@/components/site-shell";
import { skillCategories, thesisSummaryNarration } from "@/data/portfolio";

export default function About() {
  return (
    <>
      <SiteHead
        title="About — 허우용 · Ted"
        description="백엔드에서 시작해 플랫폼과 조직으로. 20년의 경로와 학력, 그리고 지금 쓰는 기술."
        path="/about/"
      />
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <p className="text-label uppercase tracking-widest text-signal">About</p>
          <h1 className="mt-4 text-hero font-bold text-n9 break-keep">허우용 · Ted</h1>

          <section className="mt-16" aria-labelledby="about-summary">
            <h2 id="about-summary" className="text-section font-bold text-n9 break-keep">
              지금까지
            </h2>
            <p className="mt-6 text-body text-n7 break-keep">
              백엔드 개발자로 시작해 플랫폼과 조직을 맡았다. 교육·커머스 플랫폼을 30명 규모의
              조직으로 굴렸고, 검색은 두 번 다시 세웠다. 지금은 그 판단들을 글로 남기고 있다.
            </p>
            <Link href="/work/" className="mt-6 inline-block text-body text-signal hover:underline break-keep">
              경력 전문 보기 →
            </Link>
          </section>

          <section className="mt-16" aria-labelledby="about-skills">
            <h2 id="about-skills" className="text-section font-bold text-n9 break-keep">
              기술
            </h2>
            <dl className="mt-8 space-y-8">
              {skillCategories.map((c) => (
                <div key={c.title}>
                  <dt className="text-card font-semibold text-n9 break-keep">{c.title}</dt>
                  <dd className="mt-2 text-body text-n7 break-keep">{c.body}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-16" aria-labelledby="about-education">
            <h2 id="about-education" className="text-section font-bold text-n9 break-keep">
              학력
            </h2>
            <p className="mt-6 text-body text-n7 break-keep">{thesisSummaryNarration}</p>
          </section>
        </div>
      </SiteShell>
    </>
  );
}
```

⚠️ `skillCategories`·`thesisSummaryNarration`의 실제 타입을 확인한다. `data/portfolio.ts:199-210`에 정의돼 있다.

- [ ] **Step 2: 확인한다**

```bash
npx tsc --noEmit
npm run build
npm run e2e
```

Expected: **E2E 전부 통과.** T8에서 실패하던 `/work/`·`/about/` 404가 여기서 사라진다.

- [ ] **Step 3: 커밋**

```bash
git add pages/about/index.tsx
git commit -m "feat(about): /about 신규 — 경력 요약·기술·학력

설계서 §4. 경력 전문은 /work 와 겹치므로 요약만 두고 링크로 보낸다.
헤더 내비의 About 이 여기로 온다 — 2판까지 이 도달 경로가 없었다."
```

---

### Task 13: `product-lead*` 스텁 — 9 URL을 파일 4개로

**Files:**
- Create: `public/product-lead/index.html`
- Create: `public/product-lead-v2/index.html`
- Create: `public/product-lead-loadmap/index.html`
- **Delete: `pages/product-lead/index.tsx` · `pages/product-lead-v2/index.tsx` · `pages/product-lead-loadmap/index.tsx`**
- Modify: `pages/product-lead-wiki/index.tsx` (본문을 스텁으로)
- Modify: `pages/product-lead-wiki/[slug].tsx` (본문을 스텁으로)
- Create: `e2e/redirects.spec.ts`

⚠️ **삭제가 이 태스크에 들어 있는 이유:** `public/product-lead/index.html`과 `pages/product-lead/index.tsx`는 **같은 경로를 다툰다.** 라우트가 살아 있으면 스텁이 산출물에 나오지 않아 이 태스크의 E2E 3건이 통과할 수 없다. 스텁과 그것이 대체하는 라우트는 **한 커밋**에 있어야 무엇이 무엇을 대신하는지가 diff 하나로 읽힌다.

**wiki 라우트는 지우지 않는다** — `[slug].tsx`가 6 URL을 한 파일로 덮기 때문이다. 본문만 갈아끼운다.

**Interfaces:**
- Consumes: T11의 `/work/`
- Produces: 사라지는 9 URL 전부가 `/work/`로 향한다

**왜 9개인가 (스펙 §4):** `sitemap` `EXCLUDE`가 wiki·loadmap을 이미 제외해 **색인된 것은 `/product-lead/`와 `/product-lead-v2/` 둘뿐**이다. SEO만 보면 2개면 된다. 그럼에도 9개를 덮는 이유는 비용이다 — `[slug].tsx` 본문만 갈아끼우면 6 URL이 파일 하나로 덮인다.

- [ ] **Step 1: 정적 스텁 3개를 만든다**

세 파일의 내용은 `content`의 경로만 다르고 나머지는 같다. **「Task N과 동일」이라고 쓰지 않고 각각 전문을 적는다** — 읽는 사람이 순서대로 읽지 않을 수 있다.

`public/product-lead/index.html`:

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>이 페이지는 /work 로 옮겨졌습니다</title>
    <link rel="canonical" href="https://withwooyong.github.io/work/" />
    <meta name="robots" content="noindex, follow" />
    <meta http-equiv="refresh" content="0; url=/work/" />
  </head>
  <body>
    <p>이 페이지는 <a href="/work/">/work/</a> 로 옮겨졌습니다.</p>
  </body>
</html>
```

`public/product-lead-v2/index.html` — 위와 동일하되 파일 위치만 다르다. 내용은 그대로 복사한다.

`public/product-lead-loadmap/index.html` — 마찬가지로 동일 내용.

- [ ] **Step 2: wiki 라우트 본문을 스텁으로 갈아끼운다**

라우트를 지우지 않는 이유는 `[slug].tsx`가 **6 URL을 한 파일로 덮기 때문**이다. `lib/wiki.ts` 의존을 여기서 끊는다 — T14에서 그 파일을 지울 수 있게 된다.

```tsx
// pages/product-lead-wiki/[slug].tsx
import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";

/**
 * 제거된 라우트의 스텁.
 *
 * 이 파일이 6 URL(index + 하위 5)을 덮는다. 라우트를 지우면 그 6개가 404 가
 * 되므로, 본문만 스텁으로 갈아끼우고 라우트는 남긴다(설계서 §4).
 *
 * slug 목록은 lib/wiki.ts 에서 가져오지 않는다 — 그 파일은 T14 에서 지운다.
 */
const SLUGS = ["hub", "cms", "payment", "admin", "governance"] as const;

export const getStaticPaths: GetStaticPaths = () => ({
  paths: SLUGS.map((slug) => ({ params: { slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = () => ({ props: {} });

export default function WikiStub() {
  return (
    <>
      <Head>
        <title>이 페이지는 /work 로 옮겨졌습니다</title>
        <link rel="canonical" href="https://withwooyong.github.io/work/" />
        <meta name="robots" content="noindex, follow" />
        <meta httpEquiv="refresh" content="0; url=/work/" />
      </Head>
      <p>
        이 페이지는 <Link href="/work/">/work/</Link> 로 옮겨졌습니다.
      </p>
    </>
  );
}
```

`pages/product-lead-wiki/index.tsx`도 같은 형태로 갈아끼운다(`getStaticPaths` 없이).

- [ ] **Step 3: 9 URL이 전부 사는지 검사한다**

```ts
// e2e/redirects.spec.ts
import { expect, test } from "@playwright/test";

/** 제거된 라우트. 하나도 404 가 되면 안 된다(설계서 §4). */
const RETIRED = [
  "/product-lead/",
  "/product-lead-v2/",
  "/product-lead-loadmap/",
  "/product-lead-wiki/",
  "/product-lead-wiki/hub/",
  "/product-lead-wiki/cms/",
  "/product-lead-wiki/payment/",
  "/product-lead-wiki/admin/",
  "/product-lead-wiki/governance/",
];

test.describe("제거된 라우트 스텁", () => {
  for (const path of RETIRED) {
    test(`${path} 가 /work 로 보낸다`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `${path} 응답 코드`).toBe(200);
      await page.waitForURL("**/work/");
      await expect(page).toHaveURL(/\/work\/$/);
    });
  }

  test("스텁 9개가 sitemap 에 들어가지 않는다", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const path of RETIRED) {
      expect(xml, `${path} 가 sitemap 에 있다`).not.toContain(`${path}</loc>`);
    }
  });
});
```

- [ ] **Step 4: 대체된 라우트 3개를 지운다**

스텁과 같은 커밋에 들어간다. 지우지 않으면 `public/`의 스텁이 산출물에 나오지 않는다.

```bash
git rm -r pages/product-lead pages/product-lead-v2 pages/product-lead-loadmap
```

- [ ] **Step 5: 돌린다**

```bash
npx tsc --noEmit
npm run build
npm run e2e -- e2e/redirects.spec.ts
```

Expected: 10건 전부 통과. `out/product-lead/index.html`이 `public/`의 스텁이어야 한다.

```bash
grep -l 'url=/work/' out/product-lead/index.html out/product-lead-v2/index.html out/product-lead-loadmap/index.html
```

Expected: 세 경로 전부 출력된다. 안 나오면 라우트가 아직 이기고 있는 것이다.

⚠️ `pages/product-lead-loadmap`을 지우면 `components/roadmap-domain.tsx`와 `data/product-lead-*.ts`가 고아가 되지만 **여기서는 지우지 않는다.** T14가 호출자 0건을 증명한 뒤 한꺼번에 지운다. `tsc`는 미사용 파일을 오류로 보지 않으므로 이 상태로 통과한다.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "feat(routes): 제거되는 product-lead 9 URL 에 스텁

설계서 §4. sitemap EXCLUDE 때문에 색인된 것은 /product-lead/ 와 -v2 둘뿐이라
SEO 만 보면 스텁 2개면 된다. 그래도 9개를 덮는 이유는 비용이다 —
[slug].tsx 본문만 갈아끼우면 6 URL 이 파일 하나로 덮인다.

wiki 라우트는 지우지 않고 본문만 스텁으로 바꿨다. 지우면 6 URL 이 404 가 된다.
slug 목록을 파일 안에 박아 lib/wiki.ts 의존을 끊었다 — T14 에서 지울 수 있게.

product-lead · -v2 · -loadmap 라우트는 같은 커밋에서 지운다. public/ 의 스텁과
경로를 다퉈서, 살려 두면 스텁이 산출물에 나오지 않는다."
```

---

### Task 14: 고아 자산 삭제 + 기준선 1회 갱신

**Files:**
- Delete: `lib/wiki.ts` · `components/wiki-shell.tsx` · `components/roadmap-domain.tsx`
- Delete: `data/product-lead-domains.ts` · `data/product-lead-roadmap.ts`
- Modify: `scripts/baseline.json` (`--update --force`로 1회)

> `pages/product-lead/` · `-v2/` · `-loadmap/`은 **T13에서 이미 지워졌다** — 스텁과 경로를 다투기 때문이다. 이 태스크는 그것들만 부르던 자산을 치운다.

**Interfaces:**
- Consumes: T13의 스텁
- Produces: 기준선이 다시 게이트로 동작한다

- [ ] **Step 1: 지우기 전에 호출자가 없는지 증명한다**

```bash
grep -rn 'lib/wiki\|wiki-shell\|roadmap-domain\|product-lead-domains\|product-lead-roadmap' pages/ components/ data/ lib/ tests/ e2e/
```

Expected: **출력 없음.** 있으면 그 자리를 먼저 정리한다.

⚠️ 이 grep은 **파이프 없이 단독으로** 실행한다.

- [ ] **Step 2: 지운다**

```bash
git rm lib/wiki.ts components/wiki-shell.tsx components/roadmap-domain.tsx
git rm data/product-lead-domains.ts data/product-lead-roadmap.ts
```

- [ ] **Step 3: 전부 돌린다**

```bash
npx tsc --noEmit
npm run lint
npm run test
npm run build
npm run e2e
```

Expected: 다섯 다 종료 코드 0. `redirects.spec.ts`가 `/product-lead/`에서 이제 `public/`의 스텁을 본다.

- [ ] **Step 4: 기준선 갱신 — 이번 배치에서 **딱 한 번**이다**

**누르기 전에 셋을 눈으로 본다** (스펙 §11.1).

```bash
npm run check-baseline
```

실패 출력에서 확인한다.

| 확인 | 기대값 |
| --- | --- |
| 사라진 항목 | `product-lead*` 9개가 **스텁으로 남아 있는지** — 목록에서 사라지면 안 된다 |
| 남은 항목 | `en/index.html` · `notion/index.html` · `404` 계열이 **그대로인지** |
| 새 항목 | `work/index.html` · `about/index.html`이 추가됐는지 |

⚠️ **`en`과 `notion`의 해시가 바뀌었다면 의도치 않은 회귀다.** 갱신하지 말고 원인을 먼저 찾는다. 셸을 안 붙였는데 바뀔 이유는 CSS 해시뿐이므로, CSS 외의 차이가 있으면 문제다.

셋 다 확인했으면 갱신한다.

```bash
npm run check-baseline:update -- --force
npm run check-baseline
```

Expected: 두 번째 명령이 **종료 코드 0**.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore: 고아 자산 5종 삭제 + 기준선 1회 갱신

T13 이 라우트를 스텁으로 대체했으므로 그것만 부르던 자산을 지운다 —
lib/wiki.ts · wiki-shell · roadmap-domain · product-lead-domains · -roadmap.
지우기 전에 grep 으로 호출자 0건을 확인했다.

기준선은 이번 배치에서 여기 한 번만 갱신한다(설계서 §11.1).
단계마다 갱신하면 --update 가 습관이 되고 이 검사는 죽는다.
갱신 전 확인: 스텁 9개 존재 · en/notion/404 불변 · work·about 신규."
```

---

### Task 15: Lighthouse CI — 경고로만

**Files:**
- Create: `.github/workflows/lighthouse.yml`
- Create: `lighthouserc.json`

**Interfaces:**
- Consumes: T10~T13의 라우트
- Produces: LCP·CLS 예산 경고

**왜 경고인가 (스펙 §11):** 히어로에 그래프가 있는 이상 예산 초과가 잦다. 매번 배포가 막히면 게이트를 꺼버리게 된다. **지켜지지 않을 규칙은 규칙 전체를 죽인다.**

- [ ] **Step 1: 설정을 쓴다**

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./out",
      "url": [
        "http://localhost/index.html",
        "http://localhost/work/index.html",
        "http://localhost/about/index.html",
        "http://localhost/blog/index.html"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.8 }],
        "categories:accessibility": ["warn", { "minScore": 0.95 }],
        "largest-contentful-paint": ["warn", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["warn", { "maxNumericValue": 0.1 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

⚠️ 모든 단언이 `warn`이다. `error`로 바꾸지 않는다.

- [ ] **Step 2: 워크플로를 쓴다**

**기존 `deploy.yml`을 건드리지 않는다.** 별도 워크플로로 둔다 — 배포 경로에 경고를 섞으면 배포가 시끄러워진다.

```yaml
name: Lighthouse

on:
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        # 예산 초과는 경고다. 배포를 막지 않는다(설계서 §11).
        continue-on-error: true
```

- [ ] **Step 3: 로컬에서 한 번 돌려 수치를 본다**

```bash
npm run build
npx @lhci/cli autorun
```

기록해 둔다 — 단계 3의 비교 기준이 된다.

| 라우트 | LCP | CLS | Performance |
| --- | --- | --- | --- |
| `/` | | | |
| `/work/` | | | |
| `/about/` | | | |
| `/blog/` | | | |

⚠️ `/`의 CLS가 0.1을 넘으면 **히어로 문구 영역의 `min-h`를 의심한다**(T9 Step 3). 문구 길이가 달라 높이가 튀는 것이 가장 흔한 원인이다.

- [ ] **Step 4: 커밋**

```bash
git add .github/workflows/lighthouse.yml lighthouserc.json
git commit -m "ci: Lighthouse 예산 — 경고로만

설계서 §11. 모든 단언이 warn 이다. 히어로에 그래프가 있는 이상 예산 초과가
잦을 텐데 매번 배포가 막히면 게이트를 꺼버리게 된다.

deploy.yml 은 건드리지 않고 PR 트리거의 별도 워크플로로 둔다."
```

---

## 단계 2 완료 확인

전부 **단독으로** 실행한다. 파이프로 이으면 종료 코드가 마지막 명령의 것이 된다.

```bash
npm run check-forbidden:verify
npm run check-forbidden
npx tsc --noEmit
npm run lint
npm run test
npm run build
npm run check-baseline
npm run check-counts:verify
npm run check-counts
npm run e2e
```

| 검사 | 기대 |
| --- | --- |
| `check-forbidden:verify` | 자체 증명 통과 (건수는 코드가 정한다) |
| `check-forbidden` | HARD 0 |
| `tsc --noEmit` | 0 |
| `lint` | 0 |
| `test` | 기존 스위트 + `tests/design/tokens.test.ts` 전부 통과 |
| `build` | 0. sitemap URL 수를 기록한다 |
| `check-baseline` | **0** — T14에서 갱신했으므로 이제 통과해야 한다 |
| `check-counts` | 일치 |
| `e2e` | smoke · hero · redirects 전부 통과 |

**그리고 눈으로 본다.**

| 확인 | 경로 | 기대 |
| --- | --- | --- |
| 다크 기본 · 번쩍임 없음 | `/` (저장소 비운 뒤) | 흰 화면이 한 프레임도 없다 |
| 히어로 연출 | `/` 스크롤 | 문구 ①→②→③, 노드 순차 점등 |
| reduced-motion | OS 설정 켜고 `/` | 최종 상태 즉시 |
| 액센트 면적 | `/` 첫 화면 | 앰버가 5% 이하 (GC-9) |
| 버튼 호버 | 아무 페이지 테마 토글 | **회색이다. 앰버가 아니다** |
| 블로그 회귀 | `/blog/` 및 상세 1편 | 단계 1 이전과 동일한 가독성 |
| 모바일 | 375px 폭 | 헤더 드로어, 히어로 문구 잘림 없음 |
| 라이트 토글 | 위 전부 | 양쪽 테마에서 확인 |

---

## Self-Review

**1. 스펙 커버리지**

| 스펙 절 | 태스크 | 비고 |
| --- | --- | --- |
| §4 라우트 변경표 | T11 T12 T13 | `/atlas`는 단계 4 |
| §4 헤더 내비게이션 | T7 | |
| §4 메인 섹션 | T10 | 04 Atlas는 단계 4로 미룸 |
| §5.1 무채색 9단계 | T3 | 대비는 T2가 강제 |
| §5.2 액센트 | T3 | **이름을 `--signal`로 바꿈** — 위 「스펙과 다른 점」 |
| §5.3 shadcn 접합 안 B | T4 | 별칭 형태로 구현 |
| §5.4 타이포 | T5 | |
| §5.5 테마·여백·모션 | T5 T6 T7 T9 | |
| §6 히어로 안 B | T9 | |
| §11 Playwright | T8 T9 T13 | |
| §11 Lighthouse | T15 | |
| §11.1 기준선 | T1 T4 T14 | |
| §12 단계 1 완료 판정 | T4 Step 4 | |
| §12 단계 2 완료 판정 | 단계 2 완료 확인 | |
| §15 액센트 재확인 | **미포함** | §15.1의 「1m 거리」·「5% 이하」는 사람이 화면을 보고 판단한다. 완료 확인 표에 넣었다 |

**커버되지 않는 스펙 절**: §7(아틀라스)·§8(검색)·§9.1 일부·§10·§13~§15는 단계 3~4 소관이다. 이 계획서는 단계 1~2만 다룬다.

**2. 플레이스홀더 점검**

T1의 `// ← pages/index.tsx:265-300 의 <li> 를 순서 그대로 옮긴다`는 플레이스홀더가 아니라 **출처 지정**이다. 옮길 내용이 리포에 있고 줄 번호로 특정된다. 문구를 여기 복제하면 오히려 두 벌이 되어 어긋난다.

T15 Step 3의 수치 표는 **빈 칸이 맞다** — 실행해서 채우는 기록이다.

**3. 타입 일관성**

| 이름 | 정의 | 사용 |
| --- | --- | --- |
| `ExperienceItem` · `experiences` | T1 | T10 T11 |
| `ProjectItem` · `projects` | T1 | T10 T11 |
| `contrastRatio` · `relativeLuminance` | T2 | T2 |
| `--n0`~`--n9` · `--signal*` | T3 | T4~T15 |
| `SiteShell` | T7 | T10 T11 T12 |
| `Hero` | T9 | T10 |
| `useScrollProgress` | T9 | T9 |

**계획 작성 중 잡은 오류 2건** — 실제 시그니처를 읽어 고쳤다. 실행자에게 확인을 미루지 않았다.

| 무엇이 틀렸었나 | 실제 | 영향 |
| --- | --- | --- |
| `SiteHead`에 `path`를 안 넘김 | `path` 기본값이 `"/"`이고 그 값으로 `canonical`·`og:url`이 만들어진다 | `/work`·`/about`이 **홈을 정본으로 가리킨다.** 검색엔진에 「홈의 사본」이라고 말하는 셈 |
| `SystemDiagramCard`에 그룹을 넘김 | `({ item }: { item: DiagramItem })` — 항목 하나를 받는다 | 타입 오류. 그룹 머리글은 호출부가 그리고 `group.items`를 순회해야 한다 |

첫 번째는 **빌드도 타입 검사도 통과한다.** `path`가 선택 인자라 안 넘겨도 컴파일된다. 그래서 T8의 스모크에 canonical 자기참조 검사를 넣었다 — 사람이 못 잡는 것은 기계가 막는다.

---

## 실행 방식

계획이 저장됐다. 실행 방식 두 가지:

1. **서브에이전트 주도 (권장)** — 태스크마다 새 서브에이전트를 띄우고 사이에서 리뷰한다. 구현자와 리뷰어가 갈라져 맹점이 깨진다
2. **인라인 실행** — 이 세션에서 배치로 실행하고 체크포인트에서 확인한다

**T4(shadcn 접합)와 T14(기준선 갱신)는 되돌리기 비싼 태스크다.** 어느 방식이든 이 둘 뒤에는 반드시 리뷰를 넣는다.
