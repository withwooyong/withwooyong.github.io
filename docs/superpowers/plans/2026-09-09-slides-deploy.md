# 발표본 Pages 배포 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 발표본 넷을 `withwooyong.github.io/slides/<slug>/` 에 배포하고, 그 배포가 조용히 깨지지 않도록 검사기 하나를 새로 세운다.

**Architecture:** `slidev-poc/decks.json` 을 목록의 진실원으로 두고 `build-slides.mjs` 가 그것을 읽어 `out/slides/` 로 빌드한다. `check-slides.mjs` 가 산출물 실존을 판정하며, 판정 로직은 파일시스템과 분리된 순수 함수라 자기 검사와 뮤테이션이 닿는다. 기존 검사기 둘(`check-baseline` · `check-forbidden`)의 범위를 발표본에 맞게 넓히거나 좁힌다.

**Tech Stack:** Node 20 (CI) · Slidev 52 · GitHub Actions · Next.js 14 정적 export

**Spec:** [`2026-09-09-slides-deploy-design.md`](../specs/2026-09-09-slides-deploy-design.md)

## Global Constraints

- 커밋 메시지는 한글로 쓴다. `main` 으로의 push 와 merge 는 명시적 승인을 받는다.
- 브랜치는 `feat/deploy-slides` 이며 기점은 `9b1c23d` 다. 루트 워크트리에서 작업한다.
- 긴 문서는 heredoc 이 아니라 `Write` 로 쓴다. 히어독은 백슬래시를 한 겹 먹는다.
- 검사기의 판정 로직은 `main` 이 아니라 **순수 함수**로 뽑는다. 흩어져 있으면 통째로 지워도 케이스가 전부 통과한다.
- 새 뮤턴트 id 는 `SL1` ~ `SL4` · `B8` · `F9` 다. 기존과 겹치지 않음을 확인했다.
- 새 `.md` 는 `git add` 뒤에 검사기를 돌린다. 색인에 없으면 스캔에서 조용히 빠진다.
- `npm ci` 를 리포 루트에서 돌리지 않는다. 다른 세션이 같은 `node_modules` 를 쓴다.

## 착수 전 기준선

작업 전에 세어 둔 값이다. **이어받지 말고 각 Task 의 검증에서 다시 세라.**

| 항목 | 착수 시점 | 목표 |
| --- | ---: | ---: |
| 검사기 종 수 | 12 | 13 |
| 뮤테이션이 돌리는 검사 | 12 | 13 |
| 뮤턴트 수 | 112 | 118 |
| `check-baseline` 자기 검사 | 16 | 19 |
| `check-forbidden` 자기 검사 | 63 | 65 |
| CI build 스텝 (정의) | 28 | 32 |
| `docs` 문서 수 | 76 | 77 (이 계획서) |

---

### Task 1: 발표본 목록과 산출물 검사기

**Files:**
- Create: `slidev-poc/decks.json`
- Create: `scripts/check-slides.mjs`
- Modify: `package.json` (scripts 에 두 줄)
- Modify: `scripts/mutate.mjs` (MUTANTS 에 넷 · CHECKS 에 한 줄)

**Interfaces:**
- Produces: `decideSlides(decks, present)` 순수 함수. `decks` 는 `[{slug, source}]`, `present` 는 `null` 또는 `{[slug]: {index: boolean, assets: number}}`. 반환은 `{code, missingIndex, emptyAssets}` 이며 `code` 는 0 · 1 · 2 중 하나다.
- Produces: `npm run check-slides` 와 `npm run check-slides:verify`
- Task 2 가 `decks.json` 의 같은 스키마를 읽는다.

- [ ] **Step 1: 발표본 목록을 만든다**

`slidev-poc/decks.json`:

```json
[
  { "slug": "patterns", "source": "slides-patterns.md" },
  { "slug": "team-ops", "source": "slides-team-ops.md" },
  { "slug": "governance", "source": "slides-governance.md" },
  { "slug": "search", "source": "slides-search.md" }
]
```

- [ ] **Step 2: 판정기를 쓴다**

`scripts/check-slides.mjs` 를 만든다. 판정은 순수 함수 `decideSlides` 안에만 있고, 파일시스템은 `collect()` 가 읽는다. 둘을 나누는 이유는 자기 검사가 산출물 없이도 돌아야 하기 때문이다.

```js
#!/usr/bin/env node
// 발표본 산출물이 out/slides/ 에 실제로 들어갔는지 판정한다.
//
// 🔴 이 검사기가 없으면 복사가 통째로 빠져도 CI 는 초록이 난다. slidev build 의 성공은
//    「빌드가 됐다」만 말할 뿐 「배포될 자리에 있다」를 말하지 않는다.
//
// 판정(decideSlides)과 수집(collect)을 나눈다. 판정이 순수 함수라야 산출물 없이 자기 검사가
// 돌고, 뮤테이션이 그 자리를 되살릴 수 있다.
import fs from "node:fs";
import path from "node:path";

const DECKS = path.join("slidev-poc", "decks.json");
const OUT_SLIDES = path.join("out", "slides");

/**
 * @param {{slug: string, source: string}[]} decks 발표본 목록
 * @param {null | Record<string, {index: boolean, assets: number}>} present
 *        out/slides 아래에서 관측한 것. 디렉터리 자체가 없으면 null 이다.
 * @returns {{code: 0|1|2, reason: string, missingIndex: string[], emptyAssets: string[]}}
 *
 * ⚠️ 종료 코드 2 를 내는 두 자리에 `reason` 을 붙인다. 반환문이 글자까지 같으면
 *    뮤테이션이 그 자리를 지목하지 못하고, 케이스도 둘을 구분하지 못한다.
 */
function decideSlides(decks, present) {
  // 대상이 없는 것을 「위반 없음」으로 세지 않는다. 0개 통과는 통과가 아니다.
  if (!Array.isArray(decks) || decks.length === 0) {
    return { code: 2, reason: "empty-list", missingIndex: [], emptyAssets: [] };
  }
  // 빌드를 안 돌린 것과 위반을 구분한다.
  if (present === null) {
    return { code: 2, reason: "no-output", missingIndex: [], emptyAssets: [] };
  }

  const missingIndex = [];
  const emptyAssets = [];
  for (const deck of decks) {
    const seen = present[deck.slug];
    if (!seen || !seen.index) {
      missingIndex.push(deck.slug);
      continue;
    }
    if (seen.assets === 0) emptyAssets.push(deck.slug);
  }

  const code = missingIndex.length + emptyAssets.length > 0 ? 1 : 0;
  return { code, reason: code === 0 ? "ok" : "missing", missingIndex, emptyAssets };
}

function collect(decks) {
  let ok = false;
  try { ok = fs.statSync(OUT_SLIDES).isDirectory(); } catch { ok = false; }
  if (!ok) return null;

  const present = {};
  for (const deck of decks) {
    const dir = path.join(OUT_SLIDES, deck.slug);
    let index = false;
    try { index = fs.statSync(path.join(dir, "index.html")).isFile(); } catch { index = false; }

    let assets = 0;
    try {
      assets = fs.readdirSync(path.join(dir, "assets")).length;
    } catch { assets = 0; }

    present[deck.slug] = { index, assets };
  }
  return present;
}

function selfTest() {
  const D = [{ slug: "a", source: "a.md" }, { slug: "b", source: "b.md" }];
  const full = { a: { index: true, assets: 3 }, b: { index: true, assets: 5 } };

  const cases = [
    {
      name: "① 넷이 다 있으면 0건이다",
      run: () => decideSlides(D, full).code === 0,
    },
    {
      name: "② index.html 이 없으면 위반이다",
      run: () => {
        const r = decideSlides(D, { ...full, b: { index: false, assets: 5 } });
        return r.code === 1 && r.missingIndex.includes("b");
      },
    },
    {
      name: "③ 🔴 index.html 은 있고 assets 가 비면 위반이다 — 빈 껍데기가 배포된다",
      run: () => {
        const r = decideSlides(D, { ...full, a: { index: true, assets: 0 } });
        return r.code === 1 && r.emptyAssets.includes("a");
      },
    },
    {
      name: "④ 목록에 있는데 산출물에 아예 없으면 위반이다",
      run: () => {
        const r = decideSlides(D, { a: { index: true, assets: 3 } });
        return r.code === 1 && r.missingIndex.includes("b");
      },
    },
    {
      name: "⑤ 🔴 out/slides 가 없으면 종료 코드 2 — 안 만든 것을 「깨끗함」으로 세지 않는다",
      run: () => {
        const r = decideSlides(D, null);
        return r.code === 2 && r.reason === "no-output";
      },
    },
    {
      name: "⑥ 🔴 목록이 비면 종료 코드 2 — 0개 통과를 통과로 세지 않는다",
      run: () => {
        const r = decideSlides([], full);
        return r.code === 2 && r.reason === "empty-list";
      },
    },
    {
      name: "⑦ 위반이 둘이면 둘 다 센다 — 하나를 고치고 초록을 보는 일이 없다",
      run: () => {
        const r = decideSlides(D, { a: { index: false, assets: 0 }, b: { index: true, assets: 0 } });
        return r.missingIndex.length === 1 && r.emptyAssets.length === 1;
      },
    },
    {
      name: "⑧ 🔴 decks.json 이 실제로 넷을 담고 있다 — 대조할 것이 있는지 먼저 센다",
      run: () => {
        const real = JSON.parse(fs.readFileSync(DECKS, "utf8"));
        return real.length === 4 && real.every((d) => d.slug && d.source);
      },
    },
    {
      name: "⑨ 🔴 decks.json 이 가리키는 소스가 전부 디스크에 있다",
      run: () => {
        const real = JSON.parse(fs.readFileSync(DECKS, "utf8"));
        return real.every((d) => fs.existsSync(path.join("slidev-poc", d.source)));
      },
    },
  ];

  let pass = 0;
  for (const c of cases) {
    let ok = false;
    try { ok = c.run() === true; } catch { ok = false; }
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.name}`);
    if (ok) pass += 1;
  }
  console.log(`\n발표본 검사기 자기 검사: ${pass}/${cases.length}`);
  if (pass === cases.length) console.log("검사기가 작동한다. 본 스캔의 0 은 결론이다.");
  return pass === cases.length ? 0 : 1;
}

// ── main ──────────────────────────────────────────────────────────
if (process.argv.includes("--self-test")) process.exit(selfTest());

let decks;
try {
  decks = JSON.parse(fs.readFileSync(DECKS, "utf8"));
} catch {
  console.error(`\n❌ ${DECKS} 를 읽지 못했다. 발표본 목록이 없으면 검사할 기준이 없다.\n`);
  process.exit(2);
}

const result = decideSlides(decks, collect(decks));

if (result.code === 2) {
  console.error("\n❌ out/slides 가 없거나 발표본 목록이 비었다.");
  console.error("   `npm run build` 뒤 `npm run build-slides` 를 돌려라.");
  console.error("   ⚠️ 대상이 없는 채로 「0건」을 반환하면 그것이 곧 거짓 음성이다.\n");
  process.exit(2);
}

if (result.code === 1) {
  console.error(`\n❌ 발표본 산출물이 빠졌다\n`);
  for (const s of result.missingIndex) console.error(`   index.html 없음  ${s}`);
  for (const s of result.emptyAssets) console.error(`   assets 비어 있음  ${s}`);
  console.error("");
  process.exit(1);
}

console.log(`✅ 발표본 ${decks.length}개가 out/slides 에 있다 — ${decks.map((d) => d.slug).join(" · ")}`);
```

- [ ] **Step 3: 자기 검사가 실패하는 것을 먼저 본다**

판정기를 만들기 전에 돌리면 파일이 없어 죽는다. 그것이 이 단계의 기대값이다. 이미 Step 2 에서 파일을 만들었다면, 아래로 **일부러 깨뜨려** 케이스가 헛돌지 않는지 확인한다.

`decideSlides` 의 `if (present === null)` 줄을 잠시 `if (false)` 로 바꾸고 돌린다.

Run: `node scripts/check-slides.mjs --self-test`
Expected: `⑤` 가 FAIL 로 나오고 `8/9`

확인했으면 되돌린다. **통과만 보고는 케이스가 무언가를 지키는지 알 수 없다.**

- [ ] **Step 4: 자기 검사를 통과시킨다**

Run: `node scripts/check-slides.mjs --self-test`
Expected: `발표본 검사기 자기 검사: 9/9` 와 `검사기가 작동한다`

- [ ] **Step 5: package.json 에 스크립트를 더한다**

`"check-mermaid:docs"` 줄 아래에 둔다.

```json
    "check-slides": "node scripts/check-slides.mjs",
    "check-slides:verify": "node scripts/check-slides.mjs --self-test",
```

- [ ] **Step 6: 뮤턴트 넷을 등록한다**

`scripts/mutate.mjs` 의 `MUTANTS` 배열 끝(`B7` 다음, 닫는 `];` 앞)에 넣는다.

```js
  // check-slides — 산출물이 빠진 것을 못 보는 쪽으로 되살린다.
  {
    id: "SL1",
    file: "scripts/check-slides.mjs",
    desc: "index.html 이 없어도 위반으로 세지 않는다 — 발표본이 통째로 빠져도 통과한다",
    from: "      missingIndex.push(deck.slug);",
    to: "      void deck.slug;",
  },
  {
    id: "SL2",
    file: "scripts/check-slides.mjs",
    desc: "🔴 assets 가 비어도 통과한다 — 빈 껍데기가 배포된다",
    from: "    if (seen.assets === 0) emptyAssets.push(deck.slug);",
    to: "    if (seen.assets === -1) emptyAssets.push(deck.slug);",
  },
  {
    id: "SL3",
    file: "scripts/check-slides.mjs",
    desc: "🔴 out/slides 가 없는 것을 통과로 센다 — 빌드를 안 돌린 것이 초록이 된다",
    from: 'return { code: 2, reason: "no-output", missingIndex: [], emptyAssets: [] };',
    to: 'return { code: 0, reason: "no-output", missingIndex: [], emptyAssets: [] };',
  },
  {
    id: "SL4",
    file: "scripts/check-slides.mjs",
    desc: "🔴 빈 목록을 통과로 센다 — 아무것도 세지 않은 것이 「위반 없음」이 된다",
    from: "  if (!Array.isArray(decks) || decks.length === 0) {",
    to: "  if (!Array.isArray(decks) || decks.length === -1) {",
  },
```

- [ ] **Step 7: CHECKS 에 등록한다**

`scripts/mutate.mjs` 의 `CHECKS` 배열에서 `check-baseline` 줄 다음에 넣는다. **등록하지 않으면 뮤턴트 넷이 전부 생존한다.**

```js
  ["check-slides", "npm run --silent check-slides:verify"],
```

- [ ] **Step 8: 뮤턴트 넷이 실제로 잡히는지 본다**

Run: `node scripts/mutate.mjs 2>&1 | grep -E "SL[1-4]|생존|합계"`
Expected: `SL1` ~ `SL4` 가 모두 잡히고 생존 0

`SL` 넷 중 하나라도 생존하면 그 케이스가 헛도는 것이다. 케이스를 고치고 다시 돌린다.

- [ ] **Step 9: id 겹침을 확인한다**

Run: `grep -ao 'id: "[A-Z]*[0-9]*"' scripts/mutate.mjs | sort | uniq -d`
Expected: 출력 없음

- [ ] **Step 10: 커밋**

```bash
git add slidev-poc/decks.json scripts/check-slides.mjs package.json scripts/mutate.mjs
git commit -m "검사기: 발표본 산출물을 판정하는 check-slides 를 세운다"
```

---

### Task 2: 발표본 빌더

**Files:**
- Create: `scripts/build-slides.mjs`
- Modify: `package.json` (scripts 에 한 줄)

**Interfaces:**
- Consumes: Task 1 의 `slidev-poc/decks.json` 과 `npm run check-slides`
- Produces: `npm run build-slides` 가 `out/slides/<slug>/` 를 만든다.

- [ ] **Step 1: 빌더를 쓴다**

`scripts/build-slides.mjs`:

```js
#!/usr/bin/env node
// decks.json 을 읽어 발표본을 out/slides/<slug>/ 로 빌드한다.
//
// 목록을 워크플로에 박지 않고 파일 하나에 두는 이유는, 다섯째 발표본을 만들 때
// 빌드에서 조용히 빠지는 것을 막기 위해서다. 같은 목록을 check-slides 가 읽으므로
// 목록에 더하고 빌드에 안 더하는 실수도 드러난다.
//
// slidev 의 --out 은 slidev-poc 을 기준으로 삼으므로 절대 경로를 넘긴다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const POC = path.join(REPO, "slidev-poc");
const DECKS = path.join(POC, "decks.json");

let decks;
try {
  decks = JSON.parse(fs.readFileSync(DECKS, "utf8"));
} catch {
  console.error(`\n❌ ${DECKS} 를 읽지 못했다.\n`);
  process.exit(2);
}

if (!Array.isArray(decks) || decks.length === 0) {
  console.error("\n❌ 발표본 목록이 비었다. 빌드할 것이 없다.\n");
  process.exit(2);
}

// out/ 이 없으면 next build 를 안 돌린 것이다. 슬라이드만 있는 out/ 을 만들지 않는다 —
// 그대로 배포되면 본체가 통째로 사라진다.
if (!fs.existsSync(path.join(REPO, "out"))) {
  console.error("\n❌ out/ 이 없다. `npm run build` 를 먼저 돌려라.\n");
  process.exit(2);
}

for (const deck of decks) {
  const dest = path.join(REPO, "out", "slides", deck.slug);
  console.log(`\n▶ ${deck.source} → out/slides/${deck.slug}/`);
  execFileSync(
    "npx",
    ["slidev", "build", deck.source, "--base", `/slides/${deck.slug}/`, "--out", dest],
    { cwd: POC, stdio: "inherit", shell: process.platform === "win32" }
  );
}

console.log(`\n✅ 발표본 ${decks.length}개를 out/slides 에 빌드했다.`);
```

- [ ] **Step 2: package.json 에 스크립트를 더한다**

`"check-slides:verify"` 줄 아래에 둔다.

```json
    "build-slides": "node scripts/build-slides.mjs",
```

- [ ] **Step 3: out/ 없이 돌려 가드가 작동하는지 본다**

Run: `npm run build-slides`
Expected: 종료 코드 2 와 `out/ 이 없다` (아직 빌드하지 않았다면). 이미 `out/` 이 있으면 이 단계는 건너뛰고 Step 4 로 간다.

- [ ] **Step 4: 본체를 빌드한다**

Run: `npm run build`
Expected: 성공. `out/` 이 생긴다.

- [ ] **Step 5: 발표본을 빌드한다**

Run: `npm run build-slides`
Expected: 넷 모두 성공. 실측 근사는 56초다.

- [ ] **Step 6: 검사기로 판정한다**

Run: `npm run check-slides`
Expected: `✅ 발표본 4개가 out/slides 에 있다 — patterns · team-ops · governance · search`

- [ ] **Step 7: 검사기가 실제로 잡는지 대조군을 세운다**

**통과만 보고는 검사기가 무언가를 보는지 알 수 없다.** 하나를 지우고 잡히는지 확인한다.

```bash
mv out/slides/search/index.html out/slides/search/index.html.bak
npm run check-slides; echo "종료 코드=$?"
mv out/slides/search/index.html.bak out/slides/search/index.html
npm run check-slides; echo "복구 뒤 종료 코드=$?"
```

Expected: 첫 번째가 종료 코드 1 과 `index.html 없음  search`, 복구 뒤가 0

- [ ] **Step 8: 커밋**

```bash
git add scripts/build-slides.mjs package.json
git commit -m "빌드: decks.json 을 읽어 발표본을 out/slides 로 빌드한다"
```

---

### Task 3: `check-baseline` 이 발표본을 제외한다

**Files:**
- Modify: `scripts/check-baseline.mjs` (`isTarget` 과 `selfTest` 의 `cases`)
- Modify: `scripts/mutate.mjs` (MUTANTS 에 하나)

**Interfaces:**
- Consumes: Task 2 가 만든 `out/slides/`
- Produces: `isTarget(rel)` 이 `slides/` 로 시작하는 경로에 `false` 를 돌려준다.

- [ ] **Step 1: 고치기 전에 실패를 확인한다**

Task 2 로 `out/slides/` 가 이미 있는 상태에서 돌린다.

Run: `npm run check-baseline`
Expected: **종료 코드 1** 과 `추가  slides/patterns/index.html` 을 비롯한 8줄

이것이 이 Task 가 존재하는 이유다. 실패를 보지 않고 고치면 무엇을 고쳤는지 알 수 없다.

- [ ] **Step 2: `isTarget` 을 고친다**

`scripts/check-baseline.mjs` 의 `isTarget` 을 이렇게 바꾼다.

```js
/**
 * 블로그 산출물은 이 검사의 대상이 아니다 — 글을 더하면 당연히 바뀐다.
 * 발표본도 같은 이유로 뺀다. 슬라이드를 고치면 산출물이 바뀌는 것이 정상이며,
 * 청크 파일명 해시가 매 빌드 갈리므로 불변을 요구할 자리가 아니다.
 *
 * ⚠️ 슬래시까지 포함해 비교한다. `startsWith("slides")` 로 적으면 `slidesheet.html`
 *    같은 이름이 함께 빠지는데, 그것은 위반을 놓치는 쪽의 실수라 통과만 보고는 드러나지 않는다.
 */
function isTarget(rel) {
  const norm = rel.split(path.sep).join("/");
  return norm.endsWith(".html") && !norm.startsWith("blog/") && !norm.startsWith("slides/");
}
```

- [ ] **Step 3: 자기 검사 케이스 셋을 더한다**

`selfTest()` 의 `cases` 배열 끝(`⑯` 다음)에 넣는다.

```js
    // ── 발표본 제외 ────────────────────────────────────────────────────────
    {
      name: "⑰ slides/ 아래는 대상이 아니다",
      run: () => !isTarget("slides/patterns/index.html"),
    },
    {
      name: "⑱ 🔴 이름이 비슷할 뿐인 것은 빠지지 않는다 — 제외가 넓어지면 검사가 못 보는 영역이 는다",
      run: () => isTarget("slidesheet.html") && isTarget("slides-archive.html"),
    },
    {
      name: "⑲ 제외가 기존 대상을 삼키지 않았다",
      run: () => isTarget("index.html") && isTarget("notion/index.html"),
    },
```

- [ ] **Step 4: 자기 검사를 돌린다**

Run: `npm run check-baseline:verify`
Expected: `GC-6 자기 검사 — 19/19 통과`

- [ ] **Step 5: 본 검사를 돌린다**

Run: `npm run check-baseline`
Expected: `✅ GC-6 — 비블로그 산출물 15개 불변`

**15개여야 한다.** 수가 늘었으면 제외가 안 먹은 것이고, 줄었으면 너무 넓게 뺀 것이다.

- [ ] **Step 6: 뮤턴트를 등록한다**

`MUTANTS` 의 `B7` 다음, `SL1` 앞에 넣는다.

```js
  {
    id: "B8",
    file: "scripts/check-baseline.mjs",
    desc: "🔴 발표본 제외를 슬래시 없이 적는다 — slidesheet.html 처럼 이름이 겹치는 것까지 빠진다",
    from: '!norm.startsWith("slides/")',
    to: '!norm.startsWith("slides")',
  },
```

- [ ] **Step 7: 뮤턴트가 잡히는지 본다**

Run: `node scripts/mutate.mjs 2>&1 | grep -E "B8|생존"`
Expected: `B8` 이 잡히고 생존 0. 잡는 것은 케이스 ⑱ 이다.

- [ ] **Step 8: 커밋**

```bash
git add scripts/check-baseline.mjs scripts/mutate.mjs
git commit -m "검사기: GC-6 가 발표본 산출물을 대상에서 뺀다"
```

---

### Task 4: `check-forbidden` 이 발표본 소스를 본다

**Files:**
- Modify: `scripts/check-forbidden.mjs` (대상 수집부와 `selfTest`)
- Modify: `scripts/mutate.mjs` (MUTANTS 에 하나)

**Interfaces:**
- Produces: `sourceTargets(cwd)` 순수 함수가 `content/blog` 와 발표본 소스를 합친 목록을 돌려준다.

- [ ] **Step 1: 수집을 함수로 뽑는다**

`scripts/check-forbidden.mjs` 의 `walk` 정의 아래에 넣는다. **`main` 안에 인라인으로 두지 마라.** 흩어져 있으면 통째로 지워도 케이스가 전부 통과한다.

```js
/**
 * 소스 스캔의 대상을 모은다.
 *
 * 발표본은 content/blog 밖에 있어 지금까지 아무도 보지 않았다. 실측으로 금칙어 18종이
 * 0건이었으나, 그것은 지키는 사람이 있었다는 뜻이 아니라 아직 들어가지 않았다는 뜻이다.
 * 발행되는 자리이므로 같은 정책이 적용되는 같은 대상이다.
 */
function sourceTargets(cwd) {
  const files = walk(join(cwd, "content", "blog"));
  const poc = join(cwd, "slidev-poc");
  for (const name of readdirSync(poc, { withFileTypes: true })) {
    if (name.isFile() && /^slides.*\.md$/.test(name.name)) files.push(join(poc, name.name));
  }
  const pages = join(poc, "pages");
  try {
    for (const name of readdirSync(pages, { withFileTypes: true })) {
      if (name.isFile() && name.name.endsWith(".md")) files.push(join(pages, name.name));
    }
  } catch { /* pages/ 가 없는 것은 위반이 아니다 */ }
  return files;
}
```

- [ ] **Step 2: `main` 이 그 함수를 쓰게 한다**

`else files = walk(join(process.cwd(), "content", "blog"));` 를 이렇게 바꾼다.

```js
else files = sourceTargets(process.cwd());
```

- [ ] **Step 3: 자기 검사 케이스 둘을 더한다**

`selfTest()` 의 `cases` 배열은 `{name, text, expect}` 형식이라 수집을 보지 못한다. 케이스 배열을 순회한 **뒤에** 아래 둘을 따로 돌린다. `selfTest` 의 반환 직전에 넣고, 통과 수와 전체 수에 함께 더한다.

```js
  // ── 수집 대상 ─────────────────────────────────────────────────────────
  // 🔴 필터를 통과한 집합으로 그 필터를 검사할 수 없다. 대조할 것이 실제로 있는지를 먼저 센다.
  const collected = sourceTargets(process.cwd()).map((f) => relative(process.cwd(), f).split(String.fromCharCode(92)).join("/"));
  const slideSources = collected.filter((p) => p.startsWith("slidev-poc/"));
  const extra = [
    {
      name: "🔴 발표본 소스가 수집 대상에 있다 — 실제로 13개다",
      ok: slideSources.length === 13,
    },
    {
      name: "🔴 발표본을 더해도 content/blog 가 빠지지 않았다",
      ok: collected.some((p) => p.startsWith("content/blog/")),
    },
  ];
  for (const e of extra) {
    console.log(`  ${e.ok ? "✅" : "❌"} ${e.name}`);
    e.ok ? pass++ : fail++;
  }
```

이 함수는 통과와 실패를 `pass` 와 `fail` 두 변수로 센다. 마지막 줄이 `통과 ${pass} / 실패 ${fail}` 를 찍고 `return fail === 0 ? 0 : 1;` 로 끝나므로, 위 블록은 그 `console.log` **앞에** 넣어야 새 케이스가 집계에 들어간다.

- [ ] **Step 4: 13이 맞는지 먼저 센다**

Run: `ls slidev-poc/slides*.md slidev-poc/pages/*.md | wc -l`
Expected: `13`

**수가 다르면 케이스의 13을 고치지 말고 왜 다른지 본다.** 발표본이 늘었다면 그 수를 쓰고, 줄었다면 목록과 어긋난 것이다.

- [ ] **Step 5: 자기 검사를 돌린다**

Run: `npm run check-forbidden:verify`
Expected: `통과 65 / 실패 0`

- [ ] **Step 6: 본 스캔을 돌린다**

Run: `npm run check-forbidden`
Expected: HARD 0. 스캔 파일 수가 직전보다 13 늘어야 한다.

**직전 실행의 수와 대조하라.** 파일을 더했는데 수가 그대로면 그 0은 결론이 아니다.

- [ ] **Step 7: 대조군으로 증명한다**

발표본에 금칙어를 심어 실제로 잡히는지 본다.

`SCRATCH` 는 이 세션의 스크래치패드 절대 경로다. **리포 안에 부산물을 남기지 마라.**

```bash
cp slidev-poc/slides-patterns.md "$SCRATCH/patterns-backup.md"
printf '\n야나두 커머스개발실장\n' >> slidev-poc/slides-patterns.md
npm run check-forbidden; echo "대조군 종료 코드=$?"
cp "$SCRATCH/patterns-backup.md" slidev-poc/slides-patterns.md
npm run check-forbidden; echo "복구 뒤 종료 코드=$?"
git status --short slidev-poc/
```

Expected: 첫 번째가 종료 코드 1 이고 걸린 파일에 `slides-patterns.md` 가 나온다. 복구 뒤가 0 이고 `git status` 가 비어 있다.

마지막 줄을 넣는 이유는 복구가 실제로 됐는지 파일이 말하게 하기 위해서다. `cp` 의 성공은 내용이 같아졌다를 말하지 않는다.

- [ ] **Step 8: 뮤턴트를 등록한다**

`MUTANTS` 의 `F8` 다음에 넣는다.

```js
  {
    id: "F9",
    file: "scripts/check-forbidden.mjs",
    desc: "🔴 발표본 소스를 수집에서 뺀다 — 발행되는 자리가 다시 사각지대가 된다",
    from: 'if (name.isFile() && /^slides.*\\.md$/.test(name.name)) files.push(join(poc, name.name));',
    to: 'if (name.isFile() && /^NOT_A_SLIDE.*\\.md$/.test(name.name)) files.push(join(poc, name.name));',
  },
```

- [ ] **Step 9: 뮤턴트가 잡히는지 본다**

Run: `node scripts/mutate.mjs 2>&1 | grep -E "F9|생존"`
Expected: `F9` 가 잡히고 생존 0

- [ ] **Step 10: 커밋**

```bash
git add scripts/check-forbidden.mjs scripts/mutate.mjs
git commit -m "검사기: 발표본 소스를 금칙어 스캔 대상에 더한다"
```

---

### Task 5: 배포 설정

**Files:**
- Modify: `public/robots.txt`
- Modify: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: Task 1 의 `npm run check-slides`, Task 2 의 `npm run build-slides`

- [ ] **Step 1: robots.txt 에 색인 차단을 더한다**

`Disallow: /docs/` 아래에 넣는다.

```
# 발표본. 링크로는 열리되 검색 결과에는 뜨지 않게 한다.
# 본체 페이지에서 링크하지 않으므로 URL 을 아는 사람만 본다.
Disallow: /slides/
```

- [ ] **Step 2: 워크플로에 증명 스텝을 더한다**

`Prove baseline checker` 스텝 다음, `Build` 앞에 넣는다.

```yaml
      # 산출물이 빠져도 slidev build 는 성공한다. 「빌드가 됐다」와 「배포될 자리에 있다」는
      # 다른 말이므로 판정하는 검사기를 따로 둔다. 증명이 스캔보다 먼저다.
      - name: Prove slides checker
        run: npm run check-slides:verify
```

- [ ] **Step 3: 워크플로에 빌드와 검사 스텝을 더한다**

`Build` 스텝 다음, `Scan built output` 앞에 넣는다.

```yaml
      # 발표본은 out/ 이 생긴 뒤에 빌드한다 — out/slides/ 로 바로 쓰기 때문이다.
      # playwright-chromium 은 PDF 내보내기에만 필요하므로 --omit=dev 로 뺀다.
      # 실측으로 넷 모두 개발 의존성 없이 빌드된다.
      - name: Install slides dependencies
        run: npm ci --omit=dev
        working-directory: slidev-poc

      - name: Build slides into out/slides
        run: npm run build-slides

      # 🔴 여기서 실패하면 배포가 멈춘다. 그것이 의도한 동작이다 —
      # 본체만 올리면 /slides/ 가 404 인 채로 배포가 초록으로 끝난다.
      - name: Check slides output
        run: npm run check-slides
```

- [ ] **Step 4: 스텝 수를 센다**

Run: `grep -c "^      - name:" .github/workflows/deploy.yml`
Expected: `32` (build job 의 스텝 정의 수. deploy job 의 한 줄은 들여쓰기가 같으므로 결과에서 1을 뺀다)

정확히 세려면 `deploy:` 앞까지만 센다.

Run: `sed -n '1,/^  deploy:/p' .github/workflows/deploy.yml | grep -c "^      - name:"`
Expected: `32`

- [ ] **Step 5: 커밋**

```bash
git add public/robots.txt .github/workflows/deploy.yml
git commit -m "배포: 발표본을 out/slides 로 빌드하고 색인을 막는다"
```

---

### Task 6: 전량 검증과 문서 갱신

**Files:**
- Modify: `CLAUDE.md` · `README.md` · `HANDOFF.md` · `CHANGELOG.md`

- [ ] **Step 1: 뮤테이션 전량을 돌린다**

Run: `npm run mutate:verify && npm run mutate`
Expected: 생존 0. 치환 실패 0

⚠️ **치환 실패가 나오면 CR 을 먼저 세라.** 코드 변경으로 읽기 전에 확인한다.

Run: `tr -cd '\r' < scripts/check-slides.mjs | wc -c`
Expected: `0`

- [ ] **Step 2: 뮤턴트 수를 센다**

Run: `grep -ac 'id: "' scripts/mutate.mjs`
Expected: `118`

**이 수를 문서에 옮겨 적는다. 이어받지 마라.**

- [ ] **Step 3: 테스트 케이스 수를 러너에서 읽는다**

Run: `npx vitest run 2>&1 | tail -5`

요약 줄의 수를 읽는다. `it(` 를 grep 하지 마라. 실측으로 grep 이 179, 러너가 180 이었다.

- [ ] **Step 4: 검사기 전량을 돌린다**

```bash
npm run check-forbidden:verify && npm run check-forbidden
npm run check-markup:verify && npm run check-markup && npm run check-markup:docs
npm run check-links:verify && npm run check-links && npm run check-links:docs
npm run check-mermaid:verify && npm run check-mermaid && npm run check-mermaid:docs
npm run check-table:verify && npm run check-table && npm run check-table:docs
npm run check-counts:verify && npm run check-counts
npm run check-slides:verify && npm run check-slides
npm run check-baseline:verify && npm run check-baseline
```

각각 단독으로 돌린다. **파이프 뒤의 종료 코드는 마지막 명령의 것이다.**

- [ ] **Step 5: 브라우저로 실물을 확인한다**

`out/slides/patterns/index.html` 은 `--base /slides/patterns/` 로 빌드되어 파일 프로토콜로는 자산을 찾지 못한다. 정적 서버를 띄워서 연다.

```bash
npx --yes serve out -l 4321
```

브라우저로 `http://localhost:4321/slides/patterns/` 를 열고 **첫 장이 실제로 그려지는지** 본다. 넷을 모두 연다.

🔴 **산출물에 문자열이 있다는 것으로 렌더됐다를 증명하지 못한다.** 검사기 여덟이 전부 통과해도 화면이 비어 있을 수 있다.

- [ ] **Step 6: 문서의 수치를 고친다**

| 문서 | 무엇 |
| --- | --- |
| `CLAUDE.md` | 검사기 종 수 12 → 13 · 뮤테이션이 돌리는 검사 12 → 13 · 뮤턴트 112 → 실측값 · CI build 28 → 32 · 발행 전 검사 표에 `check-slides` 행 |
| `README.md` | 검사기 종 수 · 뮤턴트 수 · CI 스텝 수 |
| `HANDOFF.md` | 이번 세션이 한 일 · 「다음 세션의 작업」 표의 11번 행을 닫는다 |
| `CHANGELOG.md` | 이번 변경 |

배포 run `34336637777` 과 `34340890496` 이 아직 어느 문서에도 없다. 함께 적는다.

- [ ] **Step 7: 개수 검사를 돌린다**

Run: `npm run check-counts:verify && npm run check-counts`
Expected: 통과. 끝줄의 「검사한 자리 N곳」에서 자리 수를 읽는다.

- [ ] **Step 8: 문서 검사를 돌린다**

새 `.md` 를 스테이징한 뒤에 돌린다.

```bash
git add -A
npm run check-markup:docs && npm run check-links:docs && npm run check-mermaid:docs && npm run check-table:docs
```

스캔 파일 수가 직전(76)보다 늘었는지 확인한다.

- [ ] **Step 9: 커밋하고 PR 을 연다**

PR 본문은 heredoc 이 아니라 파일로 넘긴다. 긴 한글 본문은 히어독에서 통째로 실패한 적이 있다.

```bash
git add -A
git commit -m "문서: 발표본 배포의 실측과 검사기 수치를 기록에 채운다"
git push -u origin feat/deploy-slides
```

PR 본문을 `$SCRATCH/pr-body.md` 에 `Write` 로 쓴다. 담을 것은 다섯이다.

| 절 | 내용 |
| --- | --- |
| 무엇을 하나 | 발표본 넷을 `/slides/<slug>/` 에 배포한다. 색인은 막는다 |
| 왜 이 구조인가 | Pages 는 아티팩트가 하나이므로 본체 산출물과 한 부대에 실린다 |
| 검사기 | `check-slides` 를 새로 세웠다. 뮤턴트 여섯을 더해 전량 생존 0 |
| 실측 | 넷 빌드 시간 · 산출물 크기 · CI 설치 시간 · 자기 검사 수 |
| 문서 | 고친 다섯 자리와, 이번에 함께 실은 배포 run 둘 |

```bash
gh pr create --title "발표본 넷을 GitHub Pages 에 배포한다" --body-file "$SCRATCH/pr-body.md"
```

`main` 으로의 merge 는 **별도 승인**을 받는다.

- [ ] **Step 10: CI run 이 실제로 생성됐는지 본다**

Run: `gh run list --branch feat/deploy-slides --json databaseId,createdAt,status --jq 'sort_by(.createdAt) | reverse | .[0]'`

🔴 **충돌하는 PR 은 CI 가 빨간 것이 아니라 아예 돌지 않는다.** PR 화면만 보고 넘기지 마라. `gh run list` 의 기본 정렬도 믿지 말고 `createdAt` 으로 직접 정렬한다.

- [ ] **Step 11: CI 에서 슬라이드 설치와 빌드 시간을 실측한다**

로컬 근사는 68초였다. 캐시 없는 CI 의 첫 설치는 더 걸린다. 실측값을 `HANDOFF.md` 에 적는다.

- [ ] **Step 12: 원격 브랜치를 정리한다**

```bash
git push origin --delete fix/baseline-env-independent
```

merge 완료 상태이므로 지워도 된다.
