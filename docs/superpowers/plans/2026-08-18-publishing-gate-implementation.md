# 발행 게이트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자동 판정이 가능한 발행 규칙을 전부 게이트(pre-commit + CI)로 옮겨, 결함이 발행 뒤가 아니라 커밋 시점에 잡히게 한다.

**Architecture:** 소스만 읽으면 되는 검사는 Vitest 테스트로(`tests/blog/content/`), 빌드 산출물이 필요한 검사는 스크립트로(`scripts/*.mjs`) 쓴다. 이 경계는 「빌드가 필요한가」라는 객관적 기준이라 판단이 흔들리지 않는다. 게이트는 2단이며 1단(pre-commit)은 강제가 아니라 기억 부담 제거가 목적이고, 우회는 2단(CI)이 받는다.

**Tech Stack:** Next.js 14 (Pages Router, `output: "export"`) · TypeScript · Vitest · Node ESM 스크립트 · GitHub Actions · Windows (Git Bash로 훅 실행)

**Spec:** `docs/superpowers/specs/2026-08-18-publishing-gate-redesign.md`

## Global Constraints

- **커밋 메시지는 한글로 쓴다.** (`GC-9`)
- **`git push`는 사용자가 명시적으로 요청하기 전까지 실행하지 않는다.** (`GC-10`)
- **원본 `C:\Users\aeby\vscode\yanadoo-exit\shared\knowledge\` 는 읽기 전용이다. 수정 금지.**
- **`next.config.js`의 `output: "export"` · `trailingSlash: true`를 변경하지 않는다.** (`GC-1` `GC-2`)
- **`tsconfig.json`을 수정하지 않는다.** 타입 오류는 호출부를 고쳐 해결한다. (`GC-13`)
- **`app/` 디렉터리 컨벤션을 도입하지 않는다.** Pages Router 유지. (`GC-3`)
- **종료 코드를 볼 명령은 단독 실행한다.** 파이프 뒤의 `$?`는 마지막 명령의 것이다. (도구 함정 49)
- **`npx tsc --noEmit`은 별도 검증이다.** Vitest는 esbuild로 타입을 지울 뿐 검사하지 않는다. (`GC-12`)
- **금칙어 목록의 정본은 `scripts/check-forbidden.mjs`다.** 문서에 복사하지 않는다. (`GC-11`)
- **태그는 `content/blog/tags.ts`의 통제 어휘 안에서만.** `MAX_TAGS=6`.
- **히어독으로 코드를 쓰면 이중 백슬래시가 한 겹 벗겨진다.** 정규식이 든 파일은 `Write`/`Edit` 도구로 쓴다. (도구 함정 53)
- **`grep`으로 한글·이모지를 셀 때는 `LC_ALL=C`를 붙인다.** 없으면 0건이 나온다.

---

## File Structure

| 파일 | 책임 | 신규 |
| --- | --- | :---: |
| `lib/blog/types.ts` | `PostFrontmatter` 타입 — 스키마의 정본 | |
| `lib/blog/frontmatter.ts` | frontmatter 검증. **스키마 외 키 차단을 여기에 넣는다** | |
| `tests/blog/frontmatter.test.ts` | 픽스처 단위 검증 | |
| `tests/blog/content/schema.test.ts` | **실제 발행본 전수** 스키마·분량 검사 | ✅ |
| `tests/blog/content/links.test.ts` | **실제 발행본 전수** 링크 무결성·고립 검사 | ✅ |
| `scripts/check-baseline.mjs` | `GC-6` — 비블로그 산출물 불변 (CI 전용) | ✅ |
| `scripts/baseline.json` | 기준선 해시. git 추적 대상 | ✅ |
| `.githooks/pre-commit` | 게이트 1단 | ✅ |
| `.github/workflows/deploy.yml` | 게이트 2단 | |
| `docs/superpowers/PUBLISHING-CHECKLIST.md` | 사람 판단 규칙 1장 | ✅ |
| `docs/superpowers/reports/2026-08-18-rule-triage.md` | 규칙 전수 분류표 | ✅ |

**순서가 규칙이다.** Task 2(`role` 플래그)가 Task 4(링크 검사)보다 앞선다 — 지도편을 구분하지 못하면 링크 검사가 오탐을 낸다. Task 4의 고립 해소가 게이트 활성화(Task 6·7)보다 앞선다 — 기준선이 실패 상태면 모든 커밋이 막힌다.

---

## Task 1: 스키마 외 프론트매터 키 차단

`source:` 109편이 살아남은 근본 원인이다. `validateFrontmatter`는 **알 수 없는 키를 아예 보지 않는다** — 스키마에 없는 키를 넣어도 조용히 무시된다.

**Files:**
- Modify: `lib/blog/frontmatter.ts`
- Test: `tests/blog/frontmatter.test.ts`

**Interfaces:**
- Consumes: `PostFrontmatter` (`lib/blog/types.ts`)
- Produces: `validateFrontmatter(data: unknown, file: string): PostFrontmatter` — 시그니처 불변. 스키마 외 키가 있으면 던진다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/blog/frontmatter.test.ts` 의 `describe("validateFrontmatter", ...)` 블록 안, 마지막 `it` 뒤에 추가한다. 파일 상단의 `valid` 픽스처를 재사용한다.

```typescript
  it("스키마에 없는 키가 있으면 던진다", () => {
    expect(() => validateFrontmatter({ ...valid, source: "원본 문서명" }, "a.md")).toThrow(
      /스키마에 없는 키/,
    );
  });

  it("스키마 외 키 오류에 위반한 키 이름이 전부 들어간다", () => {
    expect(() => validateFrontmatter({ ...valid, source: "x", legacy: 1 }, "a.md")).toThrow(
      /source, legacy/,
    );
  });

  it("선택 필드는 스키마 외 키로 잡지 않는다", () => {
    const withOptional = { ...valid, updated: "2026-08-18", series: "s", seriesOrder: 1 };
    expect(validateFrontmatter(withOptional, "a.md")).toMatchObject({ series: "s", seriesOrder: 1 });
  });
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run tests/blog/frontmatter.test.ts`
Expected: FAIL — 앞의 두 개가 「did not throw」로 실패한다. 세 번째는 통과한다(회귀 방지용이다).

- [ ] **Step 3: 최소 구현**

`lib/blog/frontmatter.ts` 상단 `const TAG_SLUG = ...` 아래에 추가한다.

```typescript
/**
 * PostFrontmatter가 허용하는 키 전부. 여기 없는 키는 던진다.
 *
 * 이 검사가 없던 동안 폐지된 `source:` 가 109편에 남아 있었고, 스키마에 없는 키라
 * 아무 검사에도 걸리지 않았다. 조용히 무시하는 것은 실수를 감추는 것이다.
 * 스키마를 늘릴 때는 lib/blog/types.ts의 PostFrontmatter와 이 집합을 함께 고친다.
 */
const KNOWN_KEYS = new Set([
  "title",
  "description",
  "category",
  "tags",
  "date",
  "updated",
  "series",
  "seriesOrder",
  "featured",
  "draft",
  "role",
]);
```

그리고 `const d = data as Record<string, unknown>;` 바로 다음 줄에 삽입한다.

```typescript
  // 위반한 키를 전부 담아 던진다 — 어느 키가 문제인지 알 수 없으면 찾을 수 없다.
  const unknownKeys = Object.keys(d).filter((k) => !KNOWN_KEYS.has(k));
  if (unknownKeys.length > 0) {
    fail(
      `스키마에 없는 키입니다: ${unknownKeys.join(", ")}. ` +
        `스키마는 lib/blog/types.ts의 PostFrontmatter를 보세요`,
    );
  }
```

⚠️ `role`을 미리 넣어 둔다. Task 2에서 타입에 추가하며, 그 전까지는 아무 글도 쓰지 않으므로 무해하다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run tests/blog/frontmatter.test.ts`
Expected: PASS — 전부 통과

- [ ] **Step 5: 기존 발행본 124편이 여전히 통과하는지 확인한다**

Run: `npx vitest run tests/blog`
Expected: PASS. 실측(2026-08-18) 결과 발행본에 쓰인 키는 스키마 10개뿐이라 **회귀가 없어야 한다.** 실패하면 새 키가 유입된 것이므로 그 키를 스키마에 넣을지 걷을지 판단한다.

- [ ] **Step 6: 커밋**

```bash
git add lib/blog/frontmatter.ts tests/blog/frontmatter.test.ts
git commit -m "feat(blog): 스키마에 없는 프론트매터 키를 차단한다" -m "source 109편이 살아남은 원인은 validateFrontmatter가 알 수 없는 키를 보지 않은 것이었다. 조용히 무시하면 실수가 발행 뒤에 발견된다."
```

---

## Task 2: 지도편 `role` 플래그

링크 검사가 지도편을 고립으로 오판하지 않게 한다. 지도편은 밖으로 쏘는 것이 목적이라 inbound 0이 정상이다.

**Files:**
- Modify: `lib/blog/types.ts`
- Modify: `lib/blog/frontmatter.ts`
- Modify: 발행본 4편 (아래 목록)
- Test: `tests/blog/frontmatter.test.ts`

**Interfaces:**
- Produces: `PostFrontmatter.role?: "map"` — Task 4의 링크 검사가 이 값으로 지도편을 판정한다.

**`role: "map"`을 부여할 4편** (실측 2026-08-18, inbound 0):

| 파일 | 근거 |
| --- | --- |
| `content/blog/agentic-coding/topic-map-reading-paths.md` | 지도편 |
| `content/blog/ai-transformation/ai-transformation-knowledge-map.md` | 지도편 |
| `content/blog/rag/rag-knowledge-map.md` | 지도편 |
| `content/blog/search-engineering/search-system-overview.md` | **outbound 5 · inbound 0.** 카테고리 전체를 가리키는 사실상의 지도편이다 |

⚠️ 네 번째는 HANDOFF §8이 「search-engineering 지도편 ❌」로 적어 둔 것과 어긋나 보이지만, 실측은 이 편이 이미 지도편 역할을 하고 있음을 보인다. **새 지도편을 쓰는 것이 아니라 실재하는 역할에 표시를 붙이는 것이다.**

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/blog/frontmatter.test.ts` 에 추가한다.

```typescript
  it("role은 map만 허용한다", () => {
    expect(() => validateFrontmatter({ ...valid, role: "index" }, "a.md")).toThrow(/role/);
  });

  it("role: map을 통과시킨다", () => {
    expect(validateFrontmatter({ ...valid, role: "map" }, "a.md")).toMatchObject({ role: "map" });
  });

  it("role이 없으면 키를 만들지 않는다", () => {
    expect(validateFrontmatter(valid, "a.md")).not.toHaveProperty("role");
  });
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run tests/blog/frontmatter.test.ts`
Expected: FAIL — 「role: map을 통과시킨다」가 `role`이 반환값에 없어 실패한다.

- [ ] **Step 3: 타입을 넓힌다**

`lib/blog/types.ts` 의 `PostFrontmatter` 에서 `seriesOrder?: number;` 다음 줄에 추가한다.

```typescript
  /**
   * 편의 역할. 지도편은 카테고리 전체를 가리키는 것이 목적이라 들어오는 링크가 없어도 정상이다.
   * 링크 검사(tests/blog/content/links.test.ts)가 이 값으로 고립 판정에서 제외한다.
   */
  role?: "map";
```

- [ ] **Step 4: 검증을 넣는다**

`lib/blog/frontmatter.ts` 의 `const series = d.series === undefined ? undefined : str("series");` 바로 위에 삽입한다.

```typescript
  const role = d.role === undefined ? undefined : str("role");
  if (role !== undefined && role !== "map") {
    fail(`role은 "map"만 쓸 수 있습니다 (받은 값: ${role})`);
  }
```

같은 파일의 `return { ... }` 안, `...(updated !== undefined && { updated }),` 다음 줄에 추가한다.

```typescript
    ...(role !== undefined && { role: role as "map" }),
```

- [ ] **Step 5: 통과를 확인한다**

Run: `npx vitest run tests/blog/frontmatter.test.ts`
Expected: PASS

- [ ] **Step 6: 발행본 4편에 플래그를 넣는다**

각 파일의 frontmatter에서 `draft:` 줄 **다음**에 `role: "map"` 을 추가한다. 4편 전부 동일하다.

```yaml
draft: false
role: "map"
```

- [ ] **Step 7: 타입 검사와 전체 테스트를 단독 실행한다**

Run: `npx tsc --noEmit`
Expected: 종료 코드 0

Run: `npx vitest run tests/blog`
Expected: PASS

- [ ] **Step 8: 커밋**

```bash
git add lib/blog/types.ts lib/blog/frontmatter.ts tests/blog/frontmatter.test.ts content/blog
git commit -m "feat(blog): 지도편에 role 플래그를 세운다" -m "지도편은 밖으로 쏘는 것이 목적이라 inbound 0이 정상이다. 슬러그 문자열로 판정하면 취약하므로 프론트매터에 명시한다. search-system-overview는 outbound 5 inbound 0으로 이미 지도편 역할을 하고 있어 함께 표시했다."
```

---

## Task 3: 발행본 전수 스키마·분량 검사

`frontmatter.test.ts`는 픽스처를 검사한다. 이것은 **실제 `content/blog` 전수**를 검사한다.

**Files:**
- Create: `tests/blog/content/schema.test.ts`

**Interfaces:**
- Consumes: `readPosts(root?: string): Post[]` (`lib/blog/loader.ts`) — 인자를 생략하면 `content/blog`를 읽는다. `draft: true`는 제외된다.
- Produces: 없음 (검사 전용)

- [ ] **Step 1: 테스트를 쓴다**

```typescript
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readPosts } from "@/lib/blog/loader";

/**
 * 실제 발행본 전수 검사.
 *
 * frontmatter.test.ts 가 픽스처로 규칙 자체를 검사한다면, 여기서는 그 규칙이
 * content/blog 에 실제로 지켜지고 있는지를 본다. 규칙이 맞아도 적용이 안 됐으면
 * 발행본은 깨진 채로 나간다 — source 109편이 그랬다.
 */
const CONTENT = path.join(process.cwd(), "content", "blog");

/** 분량 하한. 이보다 작으면 인접 편과 병합을 검토한다(금지선 11). 상한은 검사하지 않는다 — 금지선 13. */
const MIN_BYTES = 13_300;

describe("발행본 전수 스키마", () => {
  it("전 편이 frontmatter 검증을 통과한다", () => {
    // readPosts 는 위반을 만나면 파일명과 함께 던진다. 던지지 않는 것이 통과다.
    expect(() => readPosts()).not.toThrow();
  });

  it("한 편 이상을 읽는다", () => {
    // 경로가 틀려 0편을 읽고도 「전부 통과」로 보이는 거짓 음성을 막는다.
    expect(readPosts().length).toBeGreaterThan(0);
  });

  it("디렉터리명과 category 필드가 일치한다", () => {
    for (const post of readPosts()) {
      expect(post.category, `${post.categorySlug}/${post.slug}`).toBe(post.categorySlug);
    }
  });
});

describe("발행본 분량", () => {
  it("하한 미달 편을 보고한다 (SOFT — 실패시키지 않는다)", () => {
    const small: string[] = [];

    for (const categorySlug of fs.readdirSync(CONTENT)) {
      const dir = path.join(CONTENT, categorySlug);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const fileName of fs.readdirSync(dir)) {
        if (!fileName.endsWith(".md")) continue;
        const bytes = Buffer.byteLength(fs.readFileSync(path.join(dir, fileName), "utf8"), "utf8");
        if (bytes < MIN_BYTES) small.push(`${categorySlug}/${fileName} (${bytes} B)`);
      }
    }

    // 판정하지 않고 알린다. 병합 여부는 내용을 읽어야 정해지므로 기계가 결정할 수 없다.
    if (small.length > 0) {
      console.warn(`[SOFT] 분량 하한 ${MIN_BYTES} B 미만 ${small.length}편:\n  ${small.join("\n  ")}`);
    }
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: 실행한다**

Run: `npx vitest run tests/blog/content/schema.test.ts`
Expected: PASS. `[SOFT]` 경고에 하한 미달 편이 나열된다. **그 목록과 편수를 기록해 둔다** — 설계서 §3-3의 「4편」은 `du -k` 값이라 과대 계상돼 있으므로, 여기서 나온 실제 바이트 기준 편수가 진짜 기준선이다.

- [ ] **Step 3: 거짓 음성을 막는 장치가 작동하는지 확인한다**

「한 편 이상을 읽는다」가 실제로 무언가를 잡는지 본다. 임시로 `readPosts()` 를 `readPosts("nonexistent")` 로 바꿔 실행한다.

Run: `npx vitest run tests/blog/content/schema.test.ts`
Expected: FAIL — 「한 편 이상을 읽는다」가 0 > 0 으로 실패한다. **확인 후 즉시 되돌린다.**

이 단계가 이 리포의 「증명 먼저, 스캔 나중」이다. 0편을 읽고 「전부 통과」를 내는 검사기가 가장 위험하다.

- [ ] **Step 4: 커밋**

```bash
git add tests/blog/content/schema.test.ts
git commit -m "test(blog): 발행본 전수 스키마·분량 검사를 세운다" -m "규칙이 맞아도 적용이 안 됐으면 발행본은 깨진 채로 나간다. 0편을 읽고 통과로 보이는 거짓 음성을 막는 검사를 함께 넣었다."
```

---

## Task 4: 링크 무결성 검사 + 고립 2편 해소

TDD로 한다 — 테스트를 먼저 쓰고, 실패를 보고, 콘텐츠를 고쳐 통과시킨다.

**Files:**
- Create: `tests/blog/content/links.test.ts`
- Modify: `content/blog/search-engineering/search-system-overview.md`
- Modify: `content/blog/search-engineering/korean-text-search.md`

**Interfaces:**
- Consumes: `readPosts()` · `Post.role` (Task 2)
- Produces: 없음 (검사 전용)

**실측 기준선 (2026-08-18):** 내부 링크 1,305건 · 죽은 링크 0 · `trailingSlash` 미준수 0 · inbound 0이 5편.

- [ ] **Step 1: 테스트를 쓴다**

```typescript
import { describe, expect, it } from "vitest";
import { readPosts } from "@/lib/blog/loader";
import type { Post } from "@/lib/blog/types";

/**
 * 링크 지형 검사.
 *
 * 「링크는 참조가 아니라 약속이다」(금지선 45). 대상이 사라지면 약속이 깨지고,
 * 들어오는 링크가 없는 편은 발행돼 있어도 아무도 도달하지 못한다 —
 * search-engineering 6편이 카테고리째 고립됐던 것이 그 경우다.
 */

/** 본문의 /blog/<category>/<slug>/ 링크를 뽑는다. 앵커(#)와 질의(?)는 떼어 낸다. */
function outboundKeys(post: Post): string[] {
  const keys: string[] = [];
  for (const m of post.body.matchAll(/\]\(\/blog\/([^)#?]+?)\/?\)/g)) {
    const target = m[1].replace(/\/$/, "");
    // <category>/<slug> 두 조각이 아닌 것은 카테고리 인덱스 링크다. 편 대 편 관계가 아니다.
    if (target.split("/").length === 2) keys.push(target);
  }
  return keys;
}

const posts = readPosts();
const key = (p: Post) => `${p.categorySlug}/${p.slug}`;
const published = new Set(posts.map(key));

describe("링크 무결성", () => {
  it("발행본을 읽었다", () => {
    // 0편이면 아래 검사가 전부 공허참이 된다.
    expect(posts.length).toBeGreaterThan(0);
  });

  it("내부 링크의 대상이 전부 실재한다", () => {
    const dead: string[] = [];
    for (const post of posts) {
      for (const target of outboundKeys(post)) {
        if (!published.has(target)) dead.push(`${key(post)} -> ${target}`);
      }
    }
    expect(dead, `죽은 링크 ${dead.length}건`).toEqual([]);
  });

  it("내부 링크가 슬래시로 끝난다", () => {
    // trailingSlash: true 이므로 슬래시가 없으면 리다이렉트가 한 번 더 돈다.
    const bad: string[] = [];
    for (const post of posts) {
      for (const m of post.body.matchAll(/\]\((\/blog\/[^)#?]*)\)/g)) {
        if (!m[1].endsWith("/")) bad.push(`${key(post)}: ${m[1]}`);
      }
    }
    expect(bad, `슬래시 누락 ${bad.length}건`).toEqual([]);
  });
});

describe("링크 고립", () => {
  it("들어오는 링크가 없는 편이 없다 (지도편 제외)", () => {
    const inbound = new Map<string, number>(posts.map((p) => [key(p), 0]));

    for (const post of posts) {
      // 같은 편을 여러 번 가리켜도 관계는 하나다.
      for (const target of new Set(outboundKeys(post))) {
        if (target === key(post)) continue;
        if (inbound.has(target)) inbound.set(target, inbound.get(target)! + 1);
      }
    }

    // 지도편은 카테고리 전체를 가리키는 것이 목적이라 inbound 0이 정상이다.
    const maps = new Set(posts.filter((p) => p.role === "map").map(key));
    const isolated = [...inbound].filter(([k, n]) => n === 0 && !maps.has(k)).map(([k]) => k);

    expect(isolated, `고립 ${isolated.length}편`).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run tests/blog/content/links.test.ts`
Expected: FAIL — 「들어오는 링크가 없는 편이 없다」가 `["search-engineering/search-engineering-qna"]` 로 실패한다.

⚠️ 다른 검사(죽은 링크·슬래시)는 통과해야 한다. 실패하면 정규식이 잘못된 것이니 먼저 고친다. 실측상 둘 다 0건이다.

- [ ] **Step 3: 고립 편에 들어오는 링크를 만든다 — 지도편에서**

선례를 따른다. 다른 카테고리에서 Q&A 편은 **지도편**과 **본편 말미** 양쪽에서 링크받는다
(`rag-knowledge-map` → `rag-qna-*`, `rag-pipeline-generation` → `rag-qna-fundamentals`).

`content/blog/search-engineering/search-system-overview.md` 본문에서 다른 편들을 열거하는 문단을 찾아, 그 뒤에 한 문장을 덧붙인다. 이 편은 이미 5편을 가리키고 있으므로 자리가 있다.

```markdown
각 편에서 반복해 부딪히는 판단은 문답으로도 모아 두었다 — [검색 엔지니어링 Q&A](/blog/search-engineering/search-engineering-qna/)(색인 설계·한국어 분석기·운영 지표).
```

⚠️ 괄호 안의 주제 요약은 **`search-engineering-qna.md`를 실제로 열어 H2 제목을 확인하고 그에 맞게 고쳐 쓴다.** 확인하지 않은 요약을 쓰면 원본이 하지 않은 주장이 된다(금지선 15).

- [ ] **Step 4: 본편에서도 한 곳 연결한다**

`content/blog/search-engineering/korean-text-search.md` 말미(마무리 문단 뒤)에 한 문장을 덧붙인다. 이 편은 inbound 6으로 가장 많이 참조되는 편이라 도달 경로가 넓다.

```markdown
한국어 분석기 설정에서 반복해 나오는 판단들은 [검색 엔지니어링 Q&A](/blog/search-engineering/search-engineering-qna/)에도 문답 형태로 정리해 두었다.
```

⚠️ 이 문장도 Q&A 편에 실제로 한국어 분석기 관련 문답이 있는지 확인하고 쓴다. 없으면 있는 주제로 바꾼다.

- [ ] **Step 5: 통과를 확인한다**

Run: `npx vitest run tests/blog/content/links.test.ts`
Expected: PASS — 고립 0편

- [ ] **Step 6: 검사기가 실제로 잡는지 증명한다**

`maps` 를 구하는 줄을 임시로 `const maps = new Set<string>();` 로 바꿔 실행한다.

Run: `npx vitest run tests/blog/content/links.test.ts`
Expected: FAIL — 지도편 4편이 고립으로 잡힌다. **확인 후 즉시 되돌린다.**

이것으로 「고립 0건」이 진짜 0건이지 검사가 아무것도 안 본 결과가 아님을 증명한다.

- [ ] **Step 7: 금칙어 검사를 돌린다 (콘텐츠를 고쳤으므로)**

Run: `npm run check-forbidden:verify`
Expected: self-test 전건 통과

Run: `npm run check-forbidden`
Expected: HARD 0건

- [ ] **Step 8: 커밋**

```bash
git add tests/blog/content/links.test.ts content/blog/search-engineering
git commit -m "test(blog): 링크 무결성·고립 검사를 세우고 마지막 고립 편을 해소한다" -m "search-engineering-qna 가 inbound 0이었다. 지도편과 본편 양쪽에서 연결했다 — 다른 카테고리 Q&A 편의 선례를 따랐다." -m "지도편을 제외하지 않으면 4편이 오탐으로 잡힌다는 것을 확인한 뒤 제외 로직을 넣었다."
```

---

## Task 5: `GC-6` 산출물 불변 검사기

비블로그 페이지(`index.html`·`en/`·`product-lead*`)의 빌드 산출물이 바뀌지 않았음을 확인한다.

**Files:**
- Create: `scripts/check-baseline.mjs`
- Create: `scripts/baseline.json`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `npm run check-baseline` (검사, 종료 코드 1로 실패) · `npm run check-baseline:update` (기준선 갱신)

⚠️ **Next.js `buildId`는 빌드마다 바뀌고 HTML에 박힌다** (실측: `"buildId":"zTGe8YnqY3tdVAQ_KMhk7"`). 원시 해시를 대조하면 매번 실패하므로 **buildId를 마스킹한 뒤 해시한다.** 대상은 비블로그 HTML 14개다.

- [ ] **Step 1: 스크립트를 쓴다**

⚠️ 정규식이 들어가므로 **히어독이 아니라 `Write` 도구로 쓴다** (도구 함정 53 — 히어독은 이중 백슬래시를 한 겹 벗긴다).

```javascript
// scripts/check-baseline.mjs
//
// GC-6 — 블로그가 아닌 페이지의 빌드 산출물이 바뀌지 않았음을 확인한다.
//
// 사용법:
//   node scripts/check-baseline.mjs            검사한다. 차이가 있으면 종료 코드 1
//   node scripts/check-baseline.mjs --update   기준선을 갱신한다 (사람이 판단한 뒤에만)
//
// ⚠️ 기준선 갱신을 자동화하면 이 검사는 아무것도 막지 못한다. --update 는 사람만 실행한다.
//
// buildId 처리: Next.js 는 빌드마다 새 buildId 를 만들고 그것이 HTML 에 박힌다.
// 그대로 해시하면 내용이 같아도 매번 다르므로, buildId 를 고정 문자열로 치환한 뒤 해시한다.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT = "out";
const BASELINE = path.join("scripts", "baseline.json");

/** 블로그 산출물은 이 검사의 대상이 아니다 — 글을 더하면 당연히 바뀐다. */
function isTarget(rel) {
  const norm = rel.split(path.sep).join("/");
  return norm.endsWith(".html") && !norm.startsWith("blog/");
}

function walk(dir, base, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_next") continue; // 청크는 블로그 추가로도 바뀐다
      walk(full, base, acc);
    } else {
      const rel = path.relative(base, full);
      if (isTarget(rel)) acc.push(rel.split(path.sep).join("/"));
    }
  }
  return acc;
}

function hashOf(file) {
  let text = fs.readFileSync(file, "utf8");
  const m = text.match(/"buildId":"([^"]+)"/);
  if (m) text = text.split(m[1]).join("<BUILD_ID>");
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function collect() {
  if (!fs.existsSync(OUT)) {
    console.error("\n❌ out/ 이 없다. 먼저 `npm run build` 를 돌려라.");
    console.error("   안 만든 것을 「바뀐 것이 없음」으로 세지 않는다.");
    process.exit(2);
  }
  const files = walk(OUT, OUT, []).sort();
  const map = {};
  for (const rel of files) map[rel] = hashOf(path.join(OUT, rel));
  return map;
}

const current = collect();
const update = process.argv.includes("--update");

if (update) {
  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + "\n", "utf8");
  console.log(`✅ 기준선 갱신 — ${Object.keys(current).length}개 파일`);
  console.log(`   ${BASELINE} 를 커밋해야 CI가 같은 기준으로 본다.`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error(`\n❌ ${BASELINE} 이 없다. 먼저 --update 로 기준선을 만들어라.`);
  process.exit(2);
}

const base = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
const changed = [];
const added = [];
const removed = [];

for (const [rel, h] of Object.entries(current)) {
  if (!(rel in base)) added.push(rel);
  else if (base[rel] !== h) changed.push(rel);
}
for (const rel of Object.keys(base)) if (!(rel in current)) removed.push(rel);

const total = changed.length + added.length + removed.length;

if (total === 0) {
  console.log(`✅ GC-6 — 비블로그 산출물 ${Object.keys(current).length}개 불변`);
  process.exit(0);
}

console.error(`\n❌ GC-6 위반 — 비블로그 산출물이 바뀌었다 (${total}건)\n`);
for (const rel of changed) console.error(`   변경  ${rel}`);
for (const rel of added) console.error(`   추가  ${rel}`);
for (const rel of removed) console.error(`   삭제  ${rel}`);
console.error(`\n의도한 변경이면 \`npm run check-baseline:update\` 로 기준선을 갱신하고 커밋하라.`);
process.exit(1);
```

- [ ] **Step 2: npm 스크립트를 등록한다**

`package.json` 의 `scripts` 에 두 줄을 추가한다.

```json
    "check-baseline": "node scripts/check-baseline.mjs",
    "check-baseline:update": "node scripts/check-baseline.mjs --update",
```

- [ ] **Step 3: 기준선이 없을 때 실패하는지 확인한다**

Run: `npm run check-baseline`
Expected: 종료 코드 2, 「baseline.json 이 없다」

- [ ] **Step 4: 빌드하고 기준선을 만든다**

Run: `npm run build`
Expected: 성공

Run: `npm run check-baseline:update`
Expected: 「기준선 갱신 — 14개 파일」 (실측 기준 비블로그 HTML 14개)

- [ ] **Step 5: 다시 빌드해도 통과하는지 확인한다 — buildId 마스킹 검증**

Run: `npm run build`

Run: `npm run check-baseline`
Expected: ✅ 불변. **여기서 실패하면 buildId 마스킹이 작동하지 않는 것이다.** 실패한 파일을 열어 어떤 값이 달라졌는지 확인하고 마스킹 대상을 넓힌다.

- [ ] **Step 6: 검사기가 실제로 잡는지 증명한다**

Run: `node -e "const f='out/index.html';const s=require('fs').readFileSync(f,'utf8');require('fs').writeFileSync(f,s+'<!-- probe -->')"`

Run: `npm run check-baseline`
Expected: FAIL — 「변경  index.html」

Run: `npm run build`
Expected: 산출물이 원상 복구된다

Run: `npm run check-baseline`
Expected: ✅ 불변

- [ ] **Step 7: 커밋**

```bash
git add scripts/check-baseline.mjs scripts/baseline.json package.json
git commit -m "feat(scripts): GC-6 산출물 불변 검사기를 세운다" -m "buildId가 빌드마다 바뀌어 HTML에 박히므로 마스킹한 뒤 해시한다. 기준선 갱신은 사람만 한다 — 자동 갱신하면 검사가 아무것도 막지 못한다." -m "index.html에 주석을 넣어 실제로 잡는 것을 확인했다."
```

---

## Task 6: pre-commit 훅 — 게이트 1단

**Files:**
- Create: `.githooks/pre-commit`
- Modify: `package.json` (`prepare`)

**Interfaces:**
- Produces: `content/blog/**` 가 스테이지에 있으면 소스 검사를 실행하고 실패 시 커밋을 막는다.

husky를 쓰지 않는다. `core.hooksPath` + `prepare` 스크립트로 **의존성 0**으로 같은 자동성을 얻는다.

- [ ] **Step 1: 훅을 쓴다**

```sh
#!/bin/sh
# 게이트 1단 — 소스 검사.
#
# content/blog 변경이 없으면 즉시 통과한다. 코드만 고치는 커밋을 콘텐츠 검사로 막지 않는다.
# 빌드가 필요한 검사(--built · check-baseline)는 여기 두지 않는다 — 커밋이 수십 초 걸리면
# --no-verify 로 우회하게 되고, 그러면 훅이 있으나 마나다. 그것들은 CI가 받는다.

if ! git diff --cached --name-only | grep -q '^content/blog/'; then
  exit 0
fi

echo "[gate] content/blog 변경 감지 — 소스 검사를 실행한다"

echo "[gate] 1/3 금칙어 검사기 자기 증명"
node scripts/check-forbidden.mjs --self-test || exit 1

echo "[gate] 2/3 콘텐츠 불변식"
npx vitest run tests/blog || exit 1

echo "[gate] 3/3 금칙어 스캔"
node scripts/check-forbidden.mjs || exit 1

echo "[gate] 통과"
```

⚠️ **순서가 규칙이다.** 자기 증명이 스캔보다 앞선다 — 증명 없는 0건은 거짓 음성과 구분되지 않는다.

- [ ] **Step 2: 실행 권한을 준다**

Run: `git update-index --chmod=+x .githooks/pre-commit`

Windows에서도 이 비트가 git에 기록돼야 다른 환경에서 동작한다.

- [ ] **Step 3: `prepare` 스크립트를 등록한다**

`package.json` 의 `scripts` 에 추가한다.

```json
    "prepare": "git config core.hooksPath .githooks",
```

- [ ] **Step 4: 지금 세션에 적용한다**

Run: `git config core.hooksPath .githooks`

Run: `git config core.hooksPath`
Expected: `.githooks`

- [ ] **Step 5: 훅이 콘텐츠 커밋에서 도는지 확인한다**

Run: `node -e "require('fs').appendFileSync('content/blog/rag/rag-knowledge-map.md','\n')"`

Run: `git add content/blog/rag/rag-knowledge-map.md`

Run: `git commit -m "test: 훅 동작 확인"`
Expected: `[gate]` 3줄이 출력되고 커밋이 성립한다

Run: `git reset --soft HEAD~1 && git restore --staged content/blog/rag/rag-knowledge-map.md && git checkout -- content/blog/rag/rag-knowledge-map.md`
Expected: 원상 복구

- [ ] **Step 6: 훅이 실제로 막는지 증명한다**

Run: `node -e "const f='content/blog/rag/rag-knowledge-map.md';const s=require('fs').readFileSync(f,'utf8');require('fs').writeFileSync(f,s.replace(/^draft: false$/m,'draft: false\nbogus: 1'))"`

Run: `git add content/blog/rag/rag-knowledge-map.md`

Run: `git commit -m "test: 훅이 막는지 확인"`
Expected: **FAIL** — 「스키마에 없는 키입니다: bogus」로 커밋이 막힌다

Run: `git restore --staged content/blog/rag/rag-knowledge-map.md && git checkout -- content/blog/rag/rag-knowledge-map.md`
Expected: 원상 복구

⚠️ 이 단계를 건너뛰지 마라. **막지 못하는 훅은 통과 표시만 내는 장식이다.**

- [ ] **Step 7: 코드만 고치는 커밋은 통과하는지 확인한다**

`.githooks/pre-commit` 과 `package.json` 만 스테이지에 있는 상태에서 커밋한다.

- [ ] **Step 8: 커밋**

```bash
git add .githooks/pre-commit package.json
git commit -m "feat(gate): pre-commit 훅으로 소스 검사를 강제한다" -m "husky 없이 core.hooksPath와 prepare 스크립트로 같은 자동성을 얻는다 — 의존성이 늘지 않는다." -m "content/blog 변경이 없으면 즉시 통과한다. 빌드가 필요한 검사는 넣지 않았다 — 커밋이 느려지면 --no-verify로 우회하게 된다." -m "bogus 키를 넣어 실제로 커밋이 막히는 것을 확인했다."
```

---

## Task 7: CI 8단계 — 게이트 2단

현재 `deploy.yml` 은 `lint` → `build` 뿐이다. `npm test` 도 `check-forbidden` 도 돌지 않는다.

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: `build` 잡의 단계를 교체한다**

`- name: Lint` 부터 `- name: Build` 까지를 아래로 바꾼다. `Checkout`·`Setup Node`·`Install dependencies`·`Upload artifact` 는 그대로 둔다.

```yaml
      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      # ⚠️ 증명이 스캔보다 먼저다. 증명 없는 0건은 거짓 음성과 구분되지 않는다.
      - name: Prove forbidden-word scanner
        run: npm run check-forbidden:verify

      - name: Content invariants
        run: npm test

      - name: Scan source for forbidden words
        run: npm run check-forbidden

      - name: Build
        run: npm run build

      # 소스가 깨끗한 것은 산출물이 깨끗하다는 증거가 아니다 —
      # 템플릿이 og:image와 제목을 주입한다. Ted_yanadoo.png가 366곳에 있던 것이 그 경우다.
      - name: Scan built output
        run: npm run check-forbidden:built

      - name: GC-6 baseline
        run: npm run check-baseline
```

- [ ] **Step 2: 로컬에서 같은 순서를 전부 돌려 본다**

CI를 고치기 전에 로컬에서 통과하는지 본다. **종료 코드를 볼 명령은 단독 실행한다.**

Run: `npm run lint`
Run: `npx tsc --noEmit`
Run: `npm run check-forbidden:verify`
Run: `npm test`
Run: `npm run check-forbidden`
Run: `npm run build`
Run: `npm run check-forbidden:built`
Run: `npm run check-baseline`

Expected: 8개 전부 종료 코드 0

- [ ] **Step 3: 커밋**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: 배포 전 콘텐츠 검사 6단계를 추가한다" -m "지금까지 CI는 lint와 build만 돌았다. 테스트도 금칙어 검사도 돌지 않아 자동 게이트가 사실상 0이었다." -m "증명 먼저 스캔 나중을 단계 순서로 고정했다 — 사람이 순서를 기억할 일이 없어진다."
```

⚠️ **푸시하지 않는다.** CI 실동작 확인은 사용자가 푸시를 요청할 때 이루어진다.

---

## Task 8: 규칙 전수 분류 + 문서 압축

코드가 아니라 문서 작업이다. 앞 태스크와 의존이 없어 병행 가능하다.

**Files:**
- Create: `docs/superpowers/reports/2026-08-18-rule-triage.md`
- Create: `docs/superpowers/PUBLISHING-CHECKLIST.md`
- Modify: `docs/superpowers/plans/2026-08-07-tech-blog-phase1.md` (`GC-*`)
- Modify: `docs/superpowers/specs/2026-08-07-tech-blog-requirements.md` (`CR-*`)
- Modify: `docs/superpowers/plans/2026-08-08-agentic-coding-category-split-design.md` §11 (금지선 1~20)
- Modify: `docs/superpowers/plans/2026-08-14-ai-transformation-category-split-design.md` §11 (금지선 21~34)
- Modify: `CLAUDE.md`

- [ ] **Step 1: 금지선 원문을 한자리에 모은다**

작업 파일은 리포 밖 스크래치패드에 둔다 — 구현자가 도는 동안 작업트리를 오염시키지 않는다.

```bash
SP="$TEMP/rule-triage"   # 리포 밖. 세션 스크래치패드가 있으면 그쪽을 쓴다
mkdir -p "$SP"
{
  echo "## 금지선 1~20"
  sed -n '1997,2020p' docs/superpowers/plans/2026-08-08-agentic-coding-category-split-design.md
  echo
  echo "## 금지선 21~34"
  awk '/^## 11\./,/^## 12\./' docs/superpowers/plans/2026-08-14-ai-transformation-category-split-design.md
  echo
  echo "## 금지선 35~43"
  git show 6186437:HANDOFF.md
  echo
  echo "## 금지선 44~52"
  git show 964c8f3:HANDOFF.md
  echo
  echo "## 금지선 53~58"
  git show a785c61:HANDOFF.md
} > "$SP/rules-raw.md"
wc -l "$SP/rules-raw.md"
```

⚠️ 35~58은 HANDOFF 전문에서 해당 §만 골라 읽는다. 제목만 보고 판정하지 마라 — **표본 판정이 설계서 §3-1의 추정치를 만들었고, 그 추정치를 확정으로 바꾸는 것이 이 태스크다.**

- [ ] **Step 2: 분류표를 쓴다**

`docs/superpowers/reports/2026-08-18-rule-triage.md` 를 만든다. 규칙 하나가 한 행이다.

```markdown
# 규칙 전수 분류 (2026-08-18)

> 대상: 금지선 1~58 · `GC-1~13` · `CR-*` 33개
> 판정 기준은 `docs/superpowers/specs/2026-08-18-publishing-gate-redesign.md` §3

## 판정 기준

| 판정 | 뜻 | 조치 |
| --- | --- | --- |
| **사장** | 특정 배치에만 유효했고 그 배치가 끝났다 | 취소선 + 사유. **삭제하지 않는다** |
| **자동** | 기계가 판정한다 | 검사기로. 문서에는 「검사기가 정본」 한 줄 |
| **사람** | 패턴은 보이나 기계가 판정 못 한다 | 발행 체크리스트 |
| **환경** | 규칙이 아니라 도구가 실패하는 방식 | `CLAUDE.md` |

## 금지선

| # | 요지 | 판정 | 근거 |
| ---: | --- | :---: | --- |
| 1 | 인상으로 도식·표를 지우지 마라. 항목 수를 세라 | 사람 | |
| 2 | `08 §3-4` tools 열 `"기본"` 25행 제거 | **사장** | B6에서 실행 완료 |
| 8 | `06`과 `08 §4~§8·§10`은 이번 범위가 아니다 | **사장** | 커밋 `6a56f4a`가 그 파일을 발행했다 |
| … | | | |
```

**사장 판정에는 반드시 근거를 적는다.** 「원본이 소진됐다」를 실측으로 확인한다 —
그 규칙이 가리키는 파일이 이미 발행본이 됐는지 `git log --diff-filter=A -- content/blog` 로 대조한다.

- [ ] **Step 3: 분류 결과를 수치로 보고한다**

분류표 상단에 넣는다.

```markdown
| 판정 | 금지선 | GC | CR | 합계 |
| --- | ---: | ---: | ---: | ---: |
| 사장 | ? | ? | ? | ? |
| 자동 | ? | ? | ? | ? |
| 사람 | ? | ? | ? | ? |
| 환경 | ? | ? | ? | ? |
```

설계서 §3-1의 추정(사장 약 17개)과 **실제 값을 대조해 차이를 적는다.** 추정이 틀렸으면 그것도 기록이다.

- [ ] **Step 4: 발행 체크리스트를 만든다**

`docs/superpowers/PUBLISHING-CHECKLIST.md` — **사람 판단 규칙만.** 자동 규칙은 넣지 않는다(검사기가 본다). 설계서 §3-5의 7개 축을 뼈대로 하되, Step 2의 실제 분류 결과를 따른다.

문서 첫머리에 이렇게 적는다.

```markdown
> 이 문서는 **기계가 판정할 수 없는 규칙만** 담는다.
> 스키마·금칙어·링크·분량·산출물은 게이트가 본다 — 여기 옮겨 적지 마라.
> 규칙을 문서에 복사하면 갈라진다(금지선 54).
```

- [ ] **Step 5: 사장 규칙에 취소선을 친다**

각 설계서의 §11에서 사장 판정된 행에 취소선과 사유를 넣는다. **삭제하지 않는다** — 다른 문서가 번호로 참조한다(금지선 55).

```markdown
| ~~8~~ | ~~`06`과 `08 §4~§8·§10`은 이번 범위가 아니다~~ | **2026-08-18 사장** — 커밋 `6a56f4a`가 해당 파일을 편9로 발행했다 |
```

- [ ] **Step 6: 자동화된 규칙을 한 줄로 압축한다**

`GC-*`·`CR-*` 중 「자동」 판정을 받은 항목의 본문을 걷고 검사기를 가리킨다.

```markdown
| CR-1.7 | 저장소 밖 문서를 가리키는 링크 | **`tests/blog/content/links.test.ts` 가 정본.** 문서에 복사하지 마라 |
```

- [ ] **Step 7: 도구 함정을 `CLAUDE.md` 로 옮긴다**

설계서 §3-6의 49·51~56을 `CLAUDE.md` 에 「도구 함정」 절로 옮기고, 게이트 사용법을 함께 적는다.

```markdown
## 게이트

`content/blog` 를 고치면 pre-commit 훅이 소스 검사를 돌린다(`.githooks/pre-commit`).
빌드가 필요한 검사는 CI가 돌린다. 훅 설정은 `npm install` 시 `prepare` 가 자동으로 한다 —
수동으로 하려면 `git config core.hooksPath .githooks`.
```

- [ ] **Step 8: 커밋**

```bash
git add docs/ CLAUDE.md
git commit -m "docs: 규칙 106개를 전수 분류하고 사장된 것을 걷는다" -m "금지선에는 배치 스코프 지시와 영구 원칙이 섞여 있었다. 앞의 것은 그 배치가 끝나면 죽는데 목록에서 빠지지 않아 매 세션 읽혔다." -m "사장 규칙은 삭제하지 않고 취소선과 사유를 남긴다 — 다른 문서가 번호로 참조한다(금지선 55)."
```

---

## Task 9: `java-backend` 첫 배치 발행 — 게이트 실효성 검증

게이트를 만들고 발행으로 넘어가지 않으면 이 작업은 순손실이다. 설계서 §2·§8-7.

**Files:**
- Create: `content/blog/backend-engineering/*.md` (편수는 Step 3에서 정한다)
- Modify: `content/blog/backend-engineering` 로 들어오는 링크 (기존 카테고리에서)

**원본 (읽기 전용):** `C:\Users\aeby\vscode\yanadoo-exit\shared\knowledge\java-backend\`

| 파일 | 주제 |
| --- | --- |
| `01-DB-기초-모델링-SQL-트랜잭션.md` | DB 기초·모델링·트랜잭션 |
| `02-DB-확장-파티셔닝-복제-분산시스템.md` | 파티셔닝·복제·분산 |
| `03-Redis-캐시-성능개선.md` | 캐시 |
| `04-WebSocket-실시간채팅-인증-확장.md` | 실시간·인증 |
| `05-Spring-Batch-대량데이터처리.md` | 배치 |
| `06-CI-CD-GitHub-Actions-Jenkins.md` | CI/CD |
| `07-멀티모듈-Kafka-알림센터.md` | 멀티모듈·Kafka |
| `08-스프링부트-인증-쿠버네티스.md` | 인증·k8s |
| `09-DDD-헥사고날-Kafka-주문결제.md` | DDD·헥사고날 |
| `10-면접-커닝페이퍼.md` | ⚠️ Q&A 편으로 (`CR-2.*`) |
| `README.md` | 지도편 소재 |

⚠️ **`backend-engineering` 카테고리는 `content/blog/categories.ts` 에 이미 정의돼 있고 비어 있다.** 새로 만들지 마라.

- [ ] **Step 1: 태그 어휘를 확인한다**

`tags.ts` 는 TypeScript라 `require` 로 읽히지 않는다. 파일을 직접 본다.

Run: `cat content/blog/tags.ts`

원본 주제(spring·jpa·redis·kafka·kubernetes·ddd 등)에 해당하는 태그가 통제 어휘에 있는지 본다. **없는 태그를 쓰면 `validateFrontmatter` 가 던져 빌드가 막힌다.** 어휘를 늘려야 하면 `content/blog/tags.ts` 를 고치고 그 커밋을 따로 낸다 — 어휘 확장은 발행과 별개의 결정이다.

- [ ] **Step 2: 원본을 읽고 분할 설계서를 쓴다**

`docs/superpowers/plans/2026-08-18-backend-engineering-category-split-design.md`

기존 설계서(`2026-08-14-ai-transformation-…`)의 구조를 따른다: 분할표 · 배치 계획 · 축 정의. **금지선은 승계하지 않는다** — Task 8의 발행 체크리스트를 가리킨다.

⚠️ **배치 스코프 지시는 이 설계서에만 적는다.** 영구 규칙 목록에 넣지 않는다(설계서 §3-7).

- [ ] **Step 3: 분할 단위를 정한다**

`CR-4.1a` — H2 경계를 지키되 목표 15~25 KB에 닿을 때까지 인접 H2를 묶는다. 하한 13.3 KB 미만이면 인접 편과 병합한다(금지선 11). **상한을 이유로 내용을 빼지 마라**(금지선 13).

- [ ] **Step 4: 첫 1편을 발행하고 게이트를 통과시킨다**

한 편만 먼저 만들어 게이트가 실제로 도는지 본다.

Run: `git add content/blog/backend-engineering && git commit -m "feat(blog): backend-engineering 편1"`
Expected: `[gate]` 3줄이 돌고 통과하거나, 위반이 있으면 **커밋이 막힌다**

⚠️ **막혔다면 그것이 이 작업의 성과다.** 무엇이 잡혔는지 기록해 두었다가 완료 보고에 넣는다.

- [ ] **Step 5: 나머지를 발행한다**

편별로 커밋한다. 게이트가 편마다 돈다.

- [ ] **Step 6: 카테고리 고립을 막는다**

새 카테고리는 링크가 없으면 통째로 고립된다 — `search-engineering` 이 그랬다. Task 4의 링크 검사가 이것을 잡는다.

Run: `npx vitest run tests/blog/content/links.test.ts`
Expected: PASS. 실패하면 기존 카테고리(주로 `high-traffic` 주제와 인접한 편)에서 들어오는 링크를 만든다.

- [ ] **Step 7: 전체 게이트를 돌린다**

Run: `npm run check-forbidden:verify`
Run: `npm run check-forbidden`
Run: `npm test`
Run: `npx tsc --noEmit`
Run: `npm run build`
Run: `npm run check-forbidden:built`
Run: `npm run check-baseline`

Expected: 전부 종료 코드 0.

⚠️ `check-baseline` 이 실패하면 **비블로그 페이지가 바뀐 것이다.** 블로그 글 추가로 `index.html` 이 바뀐다면 그 페이지가 글 목록을 싣고 있다는 뜻이므로, 의도한 것인지 판단한 뒤 `check-baseline:update` 로 갱신한다.

- [ ] **Step 8: 완료 보고**

| 항목 | 값 |
| --- | --- |
| 발행 편수 | ? |
| 게이트가 잡은 위반 | ? (무엇을, 몇 건) |
| 소요 | ? |
| 편당 소요 | ? — **08-07~08-08의 44.5편/일과 대조한다** |

**게이트가 아무것도 잡지 않았다면 그것도 보고한다.** 검사기가 무엇을 잡는지 모르면 0건이 참인지 알 수 없다.

- [ ] **Step 9: CHANGELOG·README 갱신 후 커밋**

```bash
git add CHANGELOG.md README.md docs/
git commit -m "docs: backend-engineering 배치 발행 기록"
```

---

## Self-Review 결과

**스펙 커버리지** — 설계서의 각 요구가 어느 태스크에 대응하는지:

| 설계서 | 태스크 |
| --- | --- |
| §3-3 링크 무결성·고립 | 4 |
| §3-3 스키마 외 키 (`source` 재유입) | 1 |
| §3-3 분량 하한 SOFT | 3 |
| §3-3 `GC-6` | 5 |
| §3-4 전칭 패턴 **미구현** | — (설계서가 기각. 의도적 누락) |
| §3-1 사장 규칙 폐기 | 8 |
| §3-5 발행 체크리스트 | 8 |
| §3-6 도구 함정 이사 | 8 |
| §3-7 배치 지시 분리 원칙 | 8 Step 4 · 9 Step 2 |
| §4-1 pre-commit | 6 |
| §4-2 CI 8단계 | 7 |
| §5-2 지도편 `role` | 2 |
| §7-1 첫 배치 `java-backend` | 9 |

**누락 없음.** §3-4는 설계서가 명시적으로 기각한 항목이라 태스크가 없는 것이 옳다.

**타입 일관성** — `role?: "map"` 이 Task 2에서 `types.ts`에 정의되고, Task 1의 `KNOWN_KEYS`에 미리 포함되며, Task 4의 `p.role === "map"` 에서 소비된다. `readPosts()` 시그니처는 전 태스크에서 동일하다.

**순서 의존** — 2 → 4 (role이 있어야 고립 검사가 오탐을 안 낸다) · 4 → 6 (기준선이 통과 상태여야 훅을 켤 수 있다) · 5 → 7 (baseline.json이 있어야 CI가 돈다) · 1·3·5·8은 서로 독립이다.
