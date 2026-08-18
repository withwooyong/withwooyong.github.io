// 발행본 수가 문서 여러 곳에 흩어져 있고 아무도 세지 않는 문제를 막는다.
//
// 배경 — 2026-08-18 인수인계 §11
//   README 세 곳에 발행본 수가 적혀 있는데 세 곳 다 128편에서 멈춰 있었다. 그 사이 실제로는
//   149편이었다. 배치마다 손으로 고쳐야 했고, 손으로 고치는 것은 잊는다.
//
// ⚠️ 이 검사기의 실패 경로 — "못 찾음"이 "일치함"으로 보이는 것
//   README 구조가 바뀌면 정규식이 아무것도 못 찾고, 불일치 0건으로 조용히 통과한다.
//   그래서 **자리마다 찾았는지를 먼저 검사한다.** 못 찾으면 그 자체가 실패다.
//   이 리포는 이미 같은 부류로 한 번 당했다 — 금칙어 목록에 한글 표기가 없어 거짓 0이
//   CHANGELOG에 사실로 기록됐다.
//
// 사용법:
//   node scripts/check-counts.mjs             검사한다 (불일치 시 종료 코드 1)
//   node scripts/check-counts.mjs --self-test 검사기가 실제로 잡는지 증명한다
//   node scripts/check-counts.mjs --print     실제 수치만 출력한다 (문서 고칠 때)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const BLOG = join(ROOT, "content", "blog");
const README = join(ROOT, "README.md");
const CHANGELOG = join(ROOT, "CHANGELOG.md");
const CATEGORIES_TS = join(BLOG, "categories.ts");

/** content/blog 를 세어 실제 수치를 낸다. 이것이 유일한 정본이다. */
export function countActual(blogDir = BLOG, categoriesTs = CATEGORIES_TS) {
  const perCategory = {};
  for (const entry of readdirSync(blogDir)) {
    const p = join(blogDir, entry);
    if (!statSync(p).isDirectory()) continue;
    const n = readdirSync(p).filter((f) => f.endsWith(".md")).length;
    if (n > 0) perCategory[entry] = n;
  }
  const total = Object.values(perCategory).reduce((a, b) => a + b, 0);

  // categories.ts 의 등록 개수 — slug 필드를 센다
  const ts = readFileSync(categoriesTs, "utf8");
  const registered = (ts.match(/^\s*slug:\s*"/gm) || []).length;

  return { total, published: Object.keys(perCategory).length, registered, perCategory };
}

/**
 * README 안에서 수치가 적힌 자리를 뽑는다.
 * 각 자리는 "찾았는가"와 "값이 맞는가"를 따로 보고한다 — 둘을 합치면 못 찾은 것이 통과한다.
 */
export function readClaims(readmeText, changelogText = null) {
  const claims = [];

  // ① 요약표:  | 블로그 발행본 | **149편 / 6개 카테고리** |
  {
    const m = readmeText.match(/블로그 발행본\s*\|\s*\*\*(\d+)편\s*\/\s*(\d+)개 카테고리\*\*/);
    claims.push({
      id: "요약표",
      found: !!m,
      hint: "| 블로그 발행본 | **N편 / C개 카테고리** |",
      values: m ? { total: +m[1], published: +m[2] } : null,
    });
  }

  // ② 디렉터리 트리:  ├── content/blog/   # 발행본 149편 + ...
  {
    const m = readmeText.match(/content\/blog\/[^\n]*?발행본\s*(\d+)편/);
    claims.push({
      id: "디렉터리 트리",
      found: !!m,
      hint: "content/blog/  # 발행본 N편",
      values: m ? { total: +m[1] } : null,
    });
  }

  // ③ 카테고리 내역:  **12개 등록 · 6개 발행** (`ai-agent` 51 · ...)
  {
    const head = readmeText.match(/\*\*(\d+)개 등록\s*·\s*(\d+)개 발행\*\*\s*\(([^)]*)\)/);
    let perCategory = null;
    if (head) {
      perCategory = {};
      // `slug` 51  형태를 전부 뽑는다. 하나라도 못 뽑으면 아래 비교에서 드러난다
      for (const mm of head[3].matchAll(/`([a-z-]+)`\s*(\d+)/g)) perCategory[mm[1]] = +mm[2];
    }
    claims.push({
      id: "카테고리 내역",
      found: !!head,
      hint: "**R개 등록 · C개 발행** (`slug` N · ...)",
      values: head ? { registered: +head[1], published: +head[2], perCategory } : null,
    });
  }

  // ④ CHANGELOG 최신 발행 기록:  ## 2026-08-18 — ... **5편**(총 149편), ...
  //
  // 배치 3개(01·02·04)가 CHANGELOG에 통째로 기록되지 않은 적이 있다(인수인계 §11).
  // 발행 커밋과 CHANGELOG 커밋을 묶는 절차가 없어서였고, 절차는 잊히므로 검사기로 옮긴다.
  //
  // 왜 "처음 나오는" 것을 보나 — 발행이 없었던 세션은 「총 N편」을 쓰지 않는다.
  // 그래서 파일 맨 위에서 처음 만나는 「총 N편」은 언제나 **마지막 발행 기록**이고,
  // 발행이 없었다면 편수도 안 변했으니 여전히 일치해야 한다.
  if (changelogText !== null) {
    const m = changelogText.match(/총\s*(\d+)\s*편/);
    claims.push({
      id: "CHANGELOG 최신 발행",
      found: !!m,
      hint: "## <날짜> — ... **N편**(총 M편), ...  ← 배치를 기록하지 않았나?",
      values: m ? { total: +m[1] } : null,
    });
  }

  return claims;
}

/** 주장과 실제를 대조해 불일치 목록을 낸다. 못 찾은 자리도 불일치로 센다. */
export function compare(actual, claims) {
  const problems = [];

  for (const c of claims) {
    if (!c.found) {
      problems.push(`[${c.id}] README에서 찾지 못했다 — 형식이 바뀌었나? 기대 형태: ${c.hint}`);
      continue;
    }
    const v = c.values;
    if (v.total !== undefined && v.total !== actual.total) {
      problems.push(`[${c.id}] 발행본 ${v.total}편이라 적혀 있는데 실제는 ${actual.total}편이다`);
    }
    if (v.published !== undefined && v.published !== actual.published) {
      problems.push(`[${c.id}] 발행 카테고리 ${v.published}개라 적혀 있는데 실제는 ${actual.published}개다`);
    }
    if (v.registered !== undefined && v.registered !== actual.registered) {
      problems.push(`[${c.id}] 등록 카테고리 ${v.registered}개라 적혀 있는데 categories.ts 는 ${actual.registered}개다`);
    }
    if (v.perCategory) {
      const claimed = v.perCategory;
      for (const [slug, n] of Object.entries(actual.perCategory)) {
        if (claimed[slug] === undefined) problems.push(`[${c.id}] \`${slug}\`(${n}편)가 내역에 빠져 있다`);
        else if (claimed[slug] !== n) problems.push(`[${c.id}] \`${slug}\` ${claimed[slug]}편이라 적혀 있는데 실제는 ${n}편이다`);
      }
      for (const slug of Object.keys(claimed)) {
        if (actual.perCategory[slug] === undefined) {
          problems.push(`[${c.id}] \`${slug}\`가 내역에 있는데 발행본이 하나도 없다`);
        }
      }
    }
  }

  return problems;
}

// ─────────────────────────────────────────────────────────────
// 자기 검사 — 이 검사기가 실제로 잡는지 증명한다.
// 「불일치 0건」을 믿기 전에 돌려라. 증명 없는 0은 거짓 음성과 구분되지 않는다.
// ─────────────────────────────────────────────────────────────
function selfTest() {
  const actual = { total: 149, published: 6, registered: 12, perCategory: { "ai-agent": 51, rag: 25 } };
  const good = [
    "| 블로그 발행본 | **149편 / 6개 카테고리** |",
    "├── content/blog/           # 발행본 149편 + categories.ts",
    "| 카테고리 | **12개 등록 · 6개 발행** (`ai-agent` 51 · `rag` 25) |",
  ].join("\n");

  const cases = [
    {
      name: "정확한 README 는 통과한다",
      text: good,
      expect: (p) => p.length === 0,
    },
    {
      name: "요약표의 편수가 틀리면 잡는다",
      text: good.replace("**149편 / 6개", "**128편 / 6개"),
      expect: (p) => p.some((x) => x.startsWith("[요약표]") && x.includes("128편")),
    },
    {
      name: "트리의 편수가 틀리면 잡는다",
      text: good.replace("발행본 149편 +", "발행본 128편 +"),
      expect: (p) => p.some((x) => x.startsWith("[디렉터리 트리]")),
    },
    {
      name: "카테고리별 편수가 틀리면 잡는다",
      text: good.replace("`ai-agent` 51", "`ai-agent` 30"),
      expect: (p) => p.some((x) => x.includes("ai-agent") && x.includes("30편")),
    },
    {
      name: "카테고리가 내역에서 빠지면 잡는다",
      text: good.replace(" · `rag` 25", ""),
      expect: (p) => p.some((x) => x.includes("rag") && x.includes("빠져")),
    },
    {
      name: "등록 카테고리 수가 틀리면 잡는다",
      text: good.replace("**12개 등록", "**11개 등록"),
      expect: (p) => p.some((x) => x.includes("categories.ts")),
    },
    // 🔴 이 세 건이 이 검사기의 존재 이유다 — 자리가 사라지면 조용히 통과하면 안 된다
    {
      name: "요약표 자리가 통째로 사라지면 실패한다",
      text: good.split("\n").slice(1).join("\n"),
      expect: (p) => p.some((x) => x.startsWith("[요약표]") && x.includes("찾지 못했다")),
    },
    {
      name: "트리 자리가 사라지면 실패한다",
      text: [good.split("\n")[0], good.split("\n")[2]].join("\n"),
      expect: (p) => p.some((x) => x.startsWith("[디렉터리 트리]") && x.includes("찾지 못했다")),
    },
    {
      name: "카테고리 내역 자리가 사라지면 실패한다",
      text: good.split("\n").slice(0, 2).join("\n"),
      expect: (p) => p.some((x) => x.startsWith("[카테고리 내역]") && x.includes("찾지 못했다")),
    },
    {
      name: "빈 문서는 세 자리 모두 실패한다",
      text: "",
      expect: (p) => p.filter((x) => x.includes("찾지 못했다")).length === 3,
    },
    // CHANGELOG 자리 — 배치를 기록하지 않고 넘어가는 것을 잡는다
    {
      name: "CHANGELOG 총편수가 맞으면 통과한다",
      text: good,
      changelog: "## 2026-08-18 — `x` **5편**(총 149편), 어쩌고",
      expect: (p) => p.length === 0,
    },
    {
      name: "CHANGELOG 총편수가 낡으면 잡는다 (배치 미기록)",
      text: good,
      changelog: "## 2026-08-18 — `x` **4편**(총 128편), 어쩌고",
      expect: (p) => p.some((x) => x.startsWith("[CHANGELOG 최신 발행]") && x.includes("128편")),
    },
    {
      name: "CHANGELOG에 총편수 표기가 아예 없으면 잡는다",
      text: good,
      changelog: "## 2026-08-18 — 발행 없는 세션",
      expect: (p) => p.some((x) => x.startsWith("[CHANGELOG 최신 발행]") && x.includes("찾지 못했다")),
    },
    {
      name: "CHANGELOG 위쪽의 최신 값을 본다 (아래 낡은 값에 속지 않는다)",
      text: good,
      changelog: ["## 2026-08-19 — **1편**(총 149편)", "## 2026-08-18 — **4편**(총 128편)"].join("\n"),
      expect: (p) => p.length === 0,
    },
  ];

  let pass = 0;
  const fails = [];
  for (const c of cases) {
    let ok = false;
    try {
      ok = c.expect(compare(actual, readClaims(c.text, c.changelog ?? null)));
    } catch (e) {
      c.name += ` (예외: ${e.message})`;
    }
    if (ok) pass += 1;
    else fails.push(c.name);
  }

  console.log(`발행본 수 검사기 자기 검사: ${pass}/${cases.length}`);
  for (const f of fails) console.log(`  ✗ ${f}`);
  return fails.length === 0 ? 0 : 1;
}

// ─────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (arg === "--self-test") process.exit(selfTest());

const actual = countActual();

if (arg === "--print") {
  const parts = Object.entries(actual.perCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `\`${s}\` ${n}`)
    .join(" · ");
  console.log(`발행본 ${actual.total}편 / ${actual.published}개 카테고리 발행 / ${actual.registered}개 등록`);
  console.log(parts);
  process.exit(0);
}

const claims = readClaims(readFileSync(README, "utf8"), readFileSync(CHANGELOG, "utf8"));
const problems = compare(actual, claims);

if (problems.length === 0) {
  console.log(`✅ 발행본 수 일치 — ${actual.total}편 / ${actual.published}개 카테고리 (검사한 자리 ${claims.length}곳)`);
  process.exit(0);
}

console.error(`🔴 발행본 수 불일치 ${problems.length}건 — 실제는 ${actual.total}편 / ${actual.published}개 카테고리`);
for (const p of problems) console.error(`  ${p}`);
console.error("\n실제 수치를 보려면: npm run check-counts:print");
process.exit(1);
