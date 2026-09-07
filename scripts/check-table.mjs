#!/usr/bin/env node
// 표 행의 셀 수가 머리 행과 어긋난 자리를 잡는다.
//
// 왜 이 검사기가 필요한가: 기존 검사 열 종 가운데 **표의 구조를 보는 것이 하나도 없다.**
// 금칙어는 낱말을, 마크업은 강조를, 링크는 목적지를, 도식은 mermaid 문법을 볼 뿐이다.
// 그 사이로 셀 수가 어긋난 행이 발행본 2곳 · 리포 문서 2곳에 쌓였고, 검사 셋(마크업 ·
// 링크 · 도식)이 **전부 통과시켰다.**
//
// 기전은 **둘**이며, 실측에서는 첫째가 훨씬 흔했다 (넷 중 셋).
//
// ① 🔴 **코드 스팬은 GFM 표에서 세로줄을 보호하지 않는다.** 인라인 코드 안에 있어도
//    세로줄은 셀 구분자로 **먼저** 파싱된다. 백틱은 그 뒤에 해석되므로 늦는다.
//
//      ✗ | LCEL | `|`로 컴포넌트를 잇는다 |     ← 2열 표인데 행이 3칸이 된다
//      ✅ | LCEL | `\|`로 컴포넌트를 잇는다 |    ← 세로줄을 이스케이프한다
//
//    ⚠️ 이것을 「코드 스팬 안이니 이스케이프가 필요 없겠지」로 넘긴 기록이 이 리포에
//    남아 있다. 규칙을 아는 것과 파일에 그 규칙이 적용됐는지는 다른 문제다.
//
// ② 셀 하나를 빠뜨린다. 3열 표의 마지막 행만 2칸인 식이다. GFM 이 모자란 칸을 빈 칸으로
//    채워 주므로 화면이 깨지지 않고, 그래서 눈으로 훑을 때 넘어간다.
//
// 무엇이 화면에서 사라지는가가 둘 사이의 차이다.
//
//   | 어긋남 | GFM 이 하는 일 | 결과 |
//   | 초과   | 머리 열 수를 넘는 셀을 **버린다** | 쓴 내용이 화면에 없다 |
//   | 부족   | 모자란 칸을 빈 칸으로 채운다      | 배치가 밀린다 |
//
// ⇒ 🔴 **판정을 정규식으로 근사하지 않는다.** 세로줄을 세는 정규식은 코드 블록 안의 표
// 예시를 위반으로 올리고, 이스케이프된 세로줄을 셀 구분자로 센다. 판정은 페이지를 그리는
// 파서(`mdast-util-gfm`)가 한다 — `check-markup` · `check-links` · `check-mermaid` 와 같은 원칙이다.
//
// 사용법:
//   node check-table.mjs --self-test    검사기가 실제로 잡는지 증명한다 (본 스캔 전에 반드시)
//   node check-table.mjs                content/blog 전량을 스캔한다
//   node check-table.mjs --category rag 한 카테고리만 스캔한다
//   node check-table.mjs --docs         발행본 밖의 리포 문서 전량을 스캔한다
//   node check-table.mjs --files a.md   넘긴 경로만 스캔한다 (.md 가 아닌 것이 섞이면 종료 코드 2)

import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";

// 🔴 수집과 프론트매터 처리를 **다시 쓰지 않고 가져온다.** 훅과 CI 가 각자 파이프라인을
// 쓰면 같은 함정을 두 곳에서 되풀이한다는 것이 이 리포가 `core.quotePath` 로 이미 겪은
// 일이다. 끄는 자리는 하나여야 한다.
import { collectDocs, stripFrontmatter, resolveGivenFiles } from "./check-markup.mjs";

/**
 * 셀 수가 머리 행과 어긋난 표 행을 찾는다.
 *
 * 계약: 반환 항목 하나가 **어긋난 행 하나**에 대응한다. 셀 하나가 아니라 행 하나인 이유는,
 * 고치는 단위가 행이기 때문이다 — 한 행에서 세로줄 둘이 새면 칸이 둘 늘지만 고칠 자리는
 * 그 행 하나다.
 *
 * 머리 행은 대조 대상에서 뺀다. 자기 자신과 비교하면 언제나 같아 아무것도 지키지 않는다.
 *
 * ⚠️ **구분 행(`| --- |`)이 머리 행과 열 수가 다르면 GFM 은 표로 인식하지 않는다.** 그런
 * 덩어리는 문단이 되어 이 순회에 `table` 노드로 들어오지 않으므로, 파서를 통과한 표는
 * 머리 열 수와 구분 행 열 수가 이미 같다.
 *
 * @param {string} markdown 프론트매터를 같은 수의 빈 줄로 바꾼 본문
 * @returns {{line:number, expected:number, actual:number, kind:"초과"|"부족"}[]}
 */
export function findMisalignedRows(markdown) {
  const tree = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const hits = [];

  // 코드 블록(`code`)과 인라인 코드(`inlineCode`)는 표 노드를 자식으로 갖지 않는다.
  // 코드 블록 안에 적은 표 **예시**가 위반으로 올라오지 않는 이유가 이것이며, 제외하는
  // 코드를 따로 쓰지 않는다 — 정규식으로 셌다면 그 예시들이 전부 위반이 됐을 것이다.
  (function walk(node) {
    if (node.type === "table") {
      const head = node.children[0]?.children.length ?? 0;
      for (const row of node.children.slice(1)) {
        const actual = row.children.length;
        if (actual !== head) {
          hits.push({
            line: row.position.start.line,
            expected: head,
            actual,
            kind: actual > head ? "초과" : "부족",
          });
        }
      }
    }
    for (const child of node.children ?? []) walk(child);
  })(tree);

  return hits;
}

// ---------------------------------------------------------------------------
// 자기 검사
//
// 기대값의 출처는 이 파일이 아니라 **실제 파서**다. 각 케이스는 파서를 직접 돌려
// 확인한 것이다.
//
// ⚠️ 케이스의 md 문자열에는 세로줄이 리터럴로 들어간다. 이 검사기는 `.md` 만 스캔하고
// `scripts/` 를 보지 않으므로 자기 자신에 매칭되지 않는다 — 스캔 대상을 넓히려거든 이
// 전제를 먼저 깨라.
// ---------------------------------------------------------------------------

const CASES = [
  { name: "① 열 수가 맞는 표는 위반이 아니다",
    md: "| 가 | 나 | 다 |\n| --- | --- | --- |\n| 1 | 2 | 3 |\n", count: 0 },
  { name: "② 🔴 코드 스팬 안의 세로줄이 셀을 가른다 — 실측 넷 중 셋이 이 기전이다",
    md: "| 가 | 나 |\n| --- | --- |\n| LCEL | `|`로 잇는다 |\n", count: 1, kind: "초과" },
  { name: "③ 세로줄을 이스케이프하면 위반이 아니다 — ②의 교정형",
    md: "| 가 | 나 |\n| --- | --- |\n| LCEL | `\\|`로 잇는다 |\n", count: 0 },
  { name: "④ 셀이 모자란 행도 위반이다 — GFM 이 빈 칸으로 채워 화면이 깨지지 않는다",
    md: "| 가 | 나 | 다 |\n| --- | --- | --- |\n| 1 | 2 |\n", count: 1, kind: "부족" },
  { name: "⑤ 코드 블록 안의 표 예시는 위반이 아니다 — 정규식이었다면 전부 걸렸을 자리다",
    md: "```\n| 가 | 나 |\n| --- | --- |\n| 1 | 2 | 3 |\n```\n", count: 0 },
  { name: "⑥ 머리 행은 대조 대상이 아니다 — 자기 자신과 비교하면 아무것도 지키지 않는다",
    md: "| 가 | 나 |\n| --- | --- |\n", count: 0 },
  { name: "⑦ 표가 없는 문서는 위반이 없다",
    md: "그냥 문단이다. 세로줄 | 이 하나 있어도 표가 아니다.\n", count: 0 },
  { name: "⑧ 한 표에 어긋난 행이 둘이면 둘 다 센다",
    md: "| 가 | 나 |\n| --- | --- |\n| 1 | 2 | 3 |\n| 4 |\n", count: 2 },
  { name: "⑨ 표가 둘이면 각각 자기 머리와 대조한다 — 앞 표의 열 수를 물려받지 않는다",
    md: "| 가 | 나 | 다 |\n| --- | --- | --- |\n| 1 | 2 | 3 |\n\n문단\n\n| 라 | 마 |\n| --- | --- |\n| 4 | 5 |\n",
    count: 0 },
  { name: "⑩ 초과와 부족을 구분해 보고한다 — 화면에서 사라지는 쪽이 어느 것인지 갈린다",
    md: "| 가 | 나 |\n| --- | --- |\n| 1 | 2 | 3 |\n| 4 |\n", count: 2, kinds: ["초과", "부족"] },
  { name: "⑪ 줄 번호가 맞는다 — 위반 앞의 문단과 빈 줄을 센다",
    md: "머리말\n\n| 가 | 나 |\n| --- | --- |\n| 1 | 2 | 3 |\n", count: 1, firstLine: 5 },
  { name: "⑫ 🔴 줄 번호가 **파일 기준**이다 — 프론트매터를 지우면 그만큼 어긋난다",
    md: "---\ntitle: 가\ncategory: 나\n---\n\n| 가 | 나 |\n| --- | --- |\n| 1 | 2 | 3 |\n",
    strip: true, count: 1, firstLine: 8 },
  { name: "⑬ 구분 행의 열 수가 머리와 다르면 GFM 이 표로 보지 않는다 — 위반이 아니다",
    md: "| 가 | 나 | 다 |\n| --- | --- |\n| 1 | 2 |\n", count: 0 },
  { name: "⑭ 셀 안의 강조나 링크는 열 수에 영향을 주지 않는다",
    md: "| 가 | 나 |\n| --- | --- |\n| **굵게** | [링크](/a/) |\n", count: 0 },
  { name: "⑮ 초과가 둘이면 칸 수가 아니라 **행 수**로 센다 — 고치는 단위가 행이다",
    md: "| 가 | 나 |\n| --- | --- |\n| 1 | `|`와 `|` |\n", count: 1, actual: 4 },
];

/**
 * 대상 수집을 **자식 프로세스로 실제로 돌려** 종료 코드를 본다.
 *
 * 🔴 순수 함수만 검사하면 게이트를 검사한 것이 아니다. 판정 함수가 어긋난 행을 옳게
 * 찾아도 `main` 이 그것을 종료 코드로 옮기지 않으면 검사기는 여전히 조용히 통과한다.
 *
 * 검사 대상은 리터럴이 아니라 **런타임에 만든 임시 파일**이다. 이름을 소스에 적으면
 * 그 문자열이 존재하게 되어 케이스가 자기 자신에 걸린다.
 */
function targetSelfTest() {
  const dir = mkdtempSync(join(tmpdir(), "check-table-"));
  const clean = join(dir, "clean.md");
  const broken = join(dir, "broken.md");
  const notMarkdown = join(dir, "clean.txt");
  writeFileSync(clean, "| 가 | 나 |\n| --- | --- |\n| 1 | 2 |\n", "utf8");
  writeFileSync(broken, "| 가 | 나 |\n| --- | --- |\n| 1 | 2 | 3 |\n", "utf8");
  writeFileSync(notMarkdown, "마크다운이 아니다.\n", "utf8");

  const runRaw = (args) => {
    try {
      execFileSync(process.execPath, [process.argv[1], ...args], { stdio: "pipe" });
      return 0;
    } catch (e) {
      return e.status;
    }
  };
  const run = (args) => runRaw(["--files", ...args]);

  const cases = [
    { name: "⓵ 열 수가 맞는 .md 하나면 통과한다 — 거부 게이트가 거짓 양성을 내지 않는다",
      args: [clean], want: 0 },
    { name: "⓶ 🔴 어긋난 행이 있으면 종료 코드 1 — 판정이 종료 코드에 닿는다",
      args: [broken], want: 1 },
    { name: "⓷ 🔴 .md 가 아닌 경로가 섞이면 종료 코드 2 — 조용한 누락을 막는다",
      args: [clean, notMarkdown], want: 2 },
    { name: "⓸ 넘어온 경로가 전부 .md 가 아니면 종료 코드 2 — 대상 없음과 같은 취급",
      args: [notMarkdown], want: 2 },
    { name: "⓹ 🔴 없는 .md 를 넘기면 종료 코드 2 — ENOENT 스택으로 죽지 않는다",
      args: [clean, join(dir, "없는파일.md")], want: 2 },
  ];

  // ⓺ 는 `--files` 가 아니라 `--category` 로 들어간다. 위 다섯은 거부 게이트만 보므로
  // 「대상이 하나도 없다」는 다른 경로를 지키지 못한다 — 카테고리 이름의 오타 하나가
  // 위반 0 으로 보이는 자리이며, 그것이 이 리포가 말하는 거짓 0 의 원형이다.
  //
  // 이름은 리터럴로 적지 않고 런타임에 조합한다. 소스에 적으면 그 순간 존재하게 된다.
  cases.push({
    name: "⓺ 🔴 없는 카테고리를 주면 종료 코드 2 — 대상 없음은 0건이 아니다",
    raw: ["--category", ["없는", "카테고리", Date.now()].join("-")],
    want: 2,
  });

  // ⓻ 은 종료 코드가 아니라 **수집 결과**를 본다. 위 여섯은 게이트가 작동하는지만 보므로,
  // 수집이 애초에 어긋난 경로를 내놓는 것은 잡지 못한다.
  const docs = collectDocs();
  const notMd = docs.filter((p) => !p.endsWith(".md"));
  cases.push({
    name: "⓻ 🔴 수집한 문서가 하나 이상이고 전부 .md 로 끝난다",
    manual: docs.length > 0 && notMd.length === 0,
    detail: `  (수집 ${docs.length}개 중 .md 로 끝나지 않는 것 ${notMd.length}개)`,
  });

  let pass = 0;
  for (const c of cases) {
    if (c.manual !== undefined) {
      console.log(`  ${c.manual ? "PASS" : "FAIL"}  ${c.name}${c.manual ? "" : c.detail}`);
      if (c.manual) pass++;
      continue;
    }
    const got = c.raw ? runRaw(c.raw) : run(c.args);
    const ok = got === c.want;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.name}${ok ? "" : `  (기대 ${c.want} · 실제 ${got})`}`);
    if (ok) pass++;
  }

  rmSync(dir, { recursive: true, force: true });
  return { pass, total: cases.length };
}

function selfTest() {
  let pass = 0;
  for (const c of CASES) {
    const hits = findMisalignedRows(c.strip ? stripFrontmatter(c.md) : c.md);
    let ok = hits.length === c.count;
    let detail = ok ? "" : `  (기대 ${c.count}건 · 실제 ${hits.length}건)`;

    if (ok && c.kind !== undefined && hits[0]?.kind !== c.kind) {
      ok = false;
      detail = `  (종류 기대 ${c.kind} · 실제 ${hits[0]?.kind})`;
    }
    if (ok && c.kinds !== undefined) {
      const got = hits.map((h) => h.kind);
      if (got.join(",") !== c.kinds.join(",")) {
        ok = false;
        detail = `  (종류 기대 ${c.kinds.join(",")} · 실제 ${got.join(",")})`;
      }
    }
    if (ok && c.firstLine !== undefined && hits[0]?.line !== c.firstLine) {
      ok = false;
      detail = `  (줄 기대 ${c.firstLine} · 실제 ${hits[0]?.line})`;
    }
    if (ok && c.actual !== undefined && hits[0]?.actual !== c.actual) {
      ok = false;
      detail = `  (칸 수 기대 ${c.actual} · 실제 ${hits[0]?.actual})`;
    }

    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.name}${detail}`);
    if (ok) pass++;
  }
  const t = targetSelfTest();
  pass += t.pass;
  const total = CASES.length + t.total;

  console.log(`\n표 검사기 자기 검사: ${pass}/${total}`);
  if (pass !== total) process.exit(1);
  console.log("검사기가 작동한다. 본 스캔의 0 은 결론이다.\n");
}

// ---------------------------------------------------------------------------
// 본 스캔
// ---------------------------------------------------------------------------

function scan({ category = null, files = null } = {}) {
  const root = join(process.cwd(), "content", "blog");
  let targets = [];
  let rejected = [];

  if (files) {
    ({ targets, rejected } = resolveGivenFiles(files));
  } else {
    for (const dir of readdirSync(root)) {
      const abs = join(root, dir);
      if (!statSync(abs).isDirectory()) continue;
      if (category && dir !== category) continue;
      for (const file of readdirSync(abs)) {
        if (!file.endsWith(".md")) continue;
        targets.push({ id: `${dir}/${file.replace(/\.md$/, "")}`, path: join(abs, file) });
      }
    }
  }

  const rows = [];
  let tables = 0;
  for (const target of targets) {
    const text = stripFrontmatter(readFileSync(target.path, "utf8"));
    tables += countTables(text);
    const hits = findMisalignedRows(text);
    if (hits.length) rows.push({ id: target.id, hits });
  }
  return { rows, scanned: targets.length, tables, rejected };
}

/**
 * 판정에 **도달한** 표의 수를 센다.
 *
 * 🔴 위반 0건이 「깨끗하다」인지 「표를 하나도 못 봤다」인지 가르는 유일한 수치다.
 * `check-mermaid` 가 파서 없이 649개 중 621개를 건너뛰고 초록을 낸 전례가 있다.
 */
export function countTables(markdown) {
  const tree = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  let n = 0;
  (function walk(node) {
    if (node.type === "table") n += 1;
    for (const child of node.children ?? []) walk(child);
  })(tree);
  return n;
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    process.exit(0);
  }

  const categoryIdx = process.argv.indexOf("--category");
  const category = categoryIdx >= 0 ? process.argv[categoryIdx + 1] : null;
  const filesIdx = process.argv.indexOf("--files");
  let files = filesIdx >= 0 ? process.argv.slice(filesIdx + 1).filter((a) => !a.startsWith("--")) : null;

  if (process.argv.includes("--docs")) files = collectDocs();

  const { rows, scanned, tables, rejected } = scan({ category, files });

  // 🔴 **일부 누락도 대상 없음과 같은 취급이다.** 받은 것 중 일부를 조용히 버리면
  // 부른 쪽은 전량을 검사했다고 믿는다 — 거짓 0 의 가장 다루기 어려운 형태다.
  if (rejected.length) {
    console.error(`🔴 넘어온 경로 ${rejected.length}개가 스캔에서 빠졌다 (.md 가 아니거나 파일이 없다). 일부만 검사한 결과는 0건이 아니다.`);
    for (const path of rejected.slice(0, 5)) console.error(`   ${path}`);
    if (rejected.length > 5) console.error(`   … 외 ${rejected.length - 5}개`);
    console.error("경로가 따옴표로 감싸여 있다면 `git -c core.quotePath=false ls-files` 로 뽑아라.");
    process.exit(2);
  }

  // 🔴 대상이 없으면 「0건」이 아니라 「모름」이다.
  if (scanned === 0) {
    const why = files ? " — 넘어온 경로에 .md 가 없다" : category ? ` — 카테고리 '${category}' 가 없다` : "";
    console.error(`🔴 스캔 대상이 0개다${why}. 0건이 아니라 대상 없음이다.`);
    process.exit(2);
  }

  let total = 0;
  for (const row of rows) {
    console.log(`\n${row.id}  (${row.hits.length}곳)`);
    for (const hit of row.hits) {
      total++;
      console.log(`  ${String(hit.line).padStart(4)}  머리 ${hit.expected}칸 대 이 행 ${hit.actual}칸 (${hit.kind})`);
    }
  }

  console.log(`\n스캔 ${scanned}개 파일 · 표 ${tables}개 · 어긋난 행 ${total}개`);
  if (total > 0) {
    console.log("\n교정: 셀 안의 세로줄을 `\\|` 로 이스케이프하거나, 빠진 셀을 채운다.");
    console.log("      🔴 `sed` 로 넣지 마라 — 백슬래시가 벗겨져 같은 자리가 다시 깨진다 (TOOL-TRAPS 48).");
    process.exit(1);
  }
  console.log("표의 열 수가 어긋난 행이 없다.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
