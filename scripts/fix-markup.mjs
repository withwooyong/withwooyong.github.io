#!/usr/bin/env node
// 렌더되지 않는 강조를 교정한다 — 조사를 강조 **안으로** 옮긴다.
//
//   ✗ **「무엇을 요구할 수 있는가」**를 정한다
//   ✅ **「무엇을 요구할 수 있는가」를** 정한다
//
// 🔴 **판정을 다시 구현하지 않는다.** `check-markup.mjs` 의 함수를 그대로 가져다 쓴다.
// 판정이 둘로 갈리면 「검사기는 잡는데 교정기는 못 고치는」 자리가 생기고, 그 자리는
// 어느 쪽 자기 검사에도 걸리지 않는다.
//
// 🔴 **닫는 별표 뒤의 한글을 통째로 옮기지 않는다.** 옮겨도 되는 것은 조사뿐이다.
// 「**「가」**한국은」에서 한글 덩어리를 통째로 옮기면 「**「가」한국은**」이 되어 강조가
// 낱말을 삼킨다. 그래서 뒤따르는 것이 **알려진 조사일 때만** 자동으로 옮기고, 아니면
// 손볼 자리로 남겨 보고한다 — 기계가 조사의 경계를 정확히 안다는 전제를 두지 않는다.
//
// 사용법:
//   node fix-markup.mjs --self-test              교정기가 실제로 고치는지 증명한다
//   node fix-markup.mjs --category <슬러그>       한 카테고리를 고친다
//   node fix-markup.mjs --category <슬러그> --dry 고치지 않고 무엇이 바뀔지만 보인다

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { findUnrenderedEmphasis, stripFrontmatter } from "./check-markup.mjs";

// 한국어 조사. 긴 것부터 놓아야 「에서」가 「에」로 잘리지 않는다.
//
// ⚠️ 이 목록은 **완전하지 않으며 완전할 필요도 없다.** 여기 없는 것은 자동으로 고치지
// 않고 손볼 자리로 보고될 뿐이라, 빠짐은 오교정이 아니라 수작업으로 나타난다.
// 늘리는 것은 안전하지만, **낱말이기도 한 것**(예: 「도」·「만」은 명사로도 쓰인다)을
// 넣을 때는 앞이 강조의 닫는 자리라는 맥락이 있으므로 조사로 읽어도 무방한지 보라.
const PARTICLES = [
  "으로써", "으로서", "이라고", "이라는", "에게서", "라고는",
  "으로", "라고", "라는", "에서", "에게", "한테", "부터", "까지", "처럼", "보다",
  "이나", "이란", "이든", "마저", "조차", "이야", "밖에",
  // 서술격 조사. 문장을 강조로 끝맺고 「…이다.」로 받는 것이 이 리포의 상용구라 실제로 많다.
  // 「다음」·「다르다」처럼 「다」로 시작하는 낱말은 뒤가 한글이라 아래 방어가 걸러 낸다.
  "이다", "다",
  "은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "로", "도", "만", "야", "란",
];

/**
 * 한 줄을 교정한다.
 *
 * @param {string} line 원본 줄
 * @param {number[]} columns 이 줄에서 렌더되지 않은 별표들의 1-based 열 (오름차순)
 * @returns {{line:string, fixed:number, skipped:{column:number, reason:string}[]}}
 */
export function fixLine(line, columns) {
  const skipped = [];
  let fixed = 0;
  let out = line;

  // 🔴 **닫는 쪽만 고친다.** 검사기는 화면에 보이는 별표를 전부 짚으므로 짝의 여는
  // 별표까지 넘어온다. 여는 별표 뒤에는 조사가 올 리 없어 「조사가 아니다」로 보고되는데,
  // 그것은 손볼 자리가 아니라 **잡음**이다 — 실측으로 이 잡음이 손볼 자리를 12곳에서
  // 165곳으로 부풀려 진짜 12곳을 묻었다.
  const targets = [];
  for (let i = 1; i < columns.length; i += 2) targets.push(columns[i]);
  // 짝이 맞지 않으면 마지막 하나가 남는다. 조용히 버리지 않고 보고한다.
  if (columns.length % 2) skipped.push({ column: columns[columns.length - 1], reason: "짝이 없는 별표다" });

  // 뒤에서부터 고친다.
  //
  // ⚠️ **지금은 이 방향이 결과를 바꾸지 않는다.** 조사를 강조 안으로 옮기는 교정은
  // 글자를 더하지도 빼지도 않아(실측 23자 → 23자 · 47B → 47B) 뒤쪽 열이 밀리지 않는다.
  // 뮤테이션이 이것을 증명했다 — 앞에서부터 도는 뮤턴트가 **생존했다.**
  // 방향을 유지하는 것은 길이를 바꾸는 교정이 더해질 때를 위한 것이며, 그때가 오면
  // 이 자리를 지키는 케이스도 함께 와야 한다. 지금 이 줄은 **아무것도 지키지 않는다.**
  for (let i = targets.length - 1; i >= 0; i--) {
    const at = targets[i] - 1;
    if (out.slice(at, at + 2) !== "**") {
      skipped.push({ column: targets[i], reason: "그 자리에 별표가 없다" });
      continue;
    }
    const after = out.slice(at + 2);
    const particle = PARTICLES.find((p) => after.startsWith(p));
    if (!particle) {
      skipped.push({ column: targets[i], reason: "뒤따르는 것이 알려진 조사가 아니다" });
      continue;
    }
    // 조사 다음이 또 한글이면 조사가 아니라 낱말의 앞부분일 수 있다.
    // 「**「가」**만족스럽다」의 「만」이 그렇다 — 옮기면 낱말이 쪼개진다.
    if (/^[가-힣]/.test(after.slice(particle.length))) {
      skipped.push({ column: targets[i], reason: `「${particle}」 뒤가 한글이라 조사인지 알 수 없다` });
      continue;
    }
    out = out.slice(0, at) + particle + "**" + after.slice(particle.length);
    fixed++;
  }

  return { line: out, fixed, skipped: skipped.reverse() };
}

// ---------------------------------------------------------------------------
// 자기 검사
//
// 🔴 기대값을 손으로 적지 않는다. 고친 결과를 **검사기에 다시 통과시켜** 위반이 0 이
// 되는지로 판정한다. 손으로 적은 기대 문자열은 교정이 실제로 렌더되는지를 증명하지
// 못한다 — 오타 하나가 그대로 「정답」이 된다.
// ---------------------------------------------------------------------------

const CASES = [
  { name: "① 조사 「를」을 강조 안으로 옮긴다", md: "**「무엇을」**를 정한다", fixes: 1 },
  { name: "② 조사 「을」도 같다", md: "**“인용”**을 본다", fixes: 1 },
  { name: "③ 두 글자 조사 「에서」를 통째로 옮긴다", md: "**「거기」**에서 온다", fixes: 1 },
  { name: "④ 세 글자 조사 「이라고」도 같다", md: "**「그것」**이라고 부른다", fixes: 1 },
  { name: "⑤ 긴 조사를 먼저 본다 — 「에서」가 「에」로 잘리지 않는다",
    md: "**「거기」**에서 온다", fixes: 1, expect: "**「거기」에서** 온다" },
  { name: "⑥ 🔴 낱말을 삼키지 않는다 — 조사가 아니면 손대지 않는다",
    md: "**「가」**한국은 다르다", fixes: 0 },
  { name: "⑦ 🔴 조사 뒤가 한글이면 손대지 않는다 — 낱말의 앞부분일 수 있다",
    md: "**「가」**만족스럽다", fixes: 0 },
  { name: "⑧ 한 줄에 둘이면 둘 다 고친다 — 뒤에서부터라 열이 밀리지 않는다",
    md: "**「가」**를 하고 **「나」**를 한다", fixes: 2 },
  { name: "⑨ 고칠 수 없는 것과 고칠 수 있는 것이 한 줄에 섞여도 된다",
    md: "**「가」**한국은 **「나」**를 본다", fixes: 1 },
  { name: "⑩ 서술격 조사 「이다」를 옮긴다 — 문장을 강조로 끝맺는 이 리포의 상용구다",
    md: "고르는 것은 **「무엇인가」**이다.", fixes: 1, expect: "고르는 것은 **「무엇인가」이다**." },
  { name: "⑪ 서술격 조사 「다」도 같다",
    md: "묻는 것은 **「누가 내는가」**다.", fixes: 1, expect: "묻는 것은 **「누가 내는가」다**." },
  { name: "⑫ 🔴 「다」로 시작하는 낱말은 삼키지 않는다 — 「다음」·「다르다」",
    md: "**「가」**다음 단계로", fixes: 0 },
  { name: "⑬ 🔴 여는 별표는 손볼 자리가 아니다 — 짝의 반대편이라 고칠 것이 없다",
    md: "**「가」**한국은 다르다", fixes: 0, skipped: 1 },
  { name: "⑭ 짝이 맞으면 여는 쪽은 보고에서 빠진다 — 고친 자리는 남기지 않는다",
    md: "**「가」**를 본다", fixes: 1, skipped: 0 },
  { name: "⑮ 🔴 별표가 홀수면 짝이 없는 것을 보고한다 — 조용히 넘기지 않는다",
    md: "**「가」**를 보고 ** 하나 더", fixes: 1, skipped: 1 },
];

function selfTest() {
  let pass = 0;
  for (const c of CASES) {
    // 검사기가 짚은 자리 중 **닫는 쪽**만 교정 대상이다. 여는 별표는 짝의 반대편이라
    // 뒤에 조사가 오지 않으므로 자연히 걸러진다.
    const columns = findUnrenderedEmphasis(c.md).map((h) => h.column);
    const result = fixLine(c.md, columns);

    let ok = result.fixed === c.fixes;
    let detail = ok ? "" : `  (고침 기대 ${c.fixes} · 실제 ${result.fixed})`;

    // 🔴 진짜 판정: 다 고쳤다면 검사기가 0 을 내야 한다.
    if (ok && c.fixes > 0 && result.skipped.length === 0) {
      const left = findUnrenderedEmphasis(result.line).length;
      if (left !== 0) { ok = false; detail = `  (고친 뒤에도 위반 ${left}건 남았다: ${result.line})`; }
    }
    if (ok && c.expect !== undefined && result.line !== c.expect) {
      ok = false;
      detail = `  (결과 기대 ${JSON.stringify(c.expect)} · 실제 ${JSON.stringify(result.line)})`;
    }
    // 손대지 않기로 한 것은 정말로 그대로여야 한다.
    if (ok && c.fixes === 0 && c.skipped === undefined && result.line !== c.md) {
      ok = false;
      detail = `  (손대지 않아야 하는데 바뀌었다: ${JSON.stringify(result.line)})`;
    }
    if (ok && c.skipped !== undefined && result.skipped.length !== c.skipped) {
      ok = false;
      detail = `  (손볼 자리 기대 ${c.skipped} · 실제 ${result.skipped.length}: ${result.skipped.map((s) => s.reason).join(" / ")})`;
    }

    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.name}${detail}`);
    if (ok) pass++;
  }
  console.log(`\n마크업 교정기 자기 검사: ${pass}/${CASES.length}`);
  if (pass !== CASES.length) process.exit(1);
  console.log("교정기가 작동한다. 고친 결과는 검사기가 다시 판정했다.\n");
}

// ---------------------------------------------------------------------------
// 본 실행
// ---------------------------------------------------------------------------

function fixFile(path, { dry }) {
  const original = readFileSync(path, "utf8");
  const hits = findUnrenderedEmphasis(stripFrontmatter(original));
  if (!hits.length) return null;

  const byLine = new Map();
  for (const hit of hits) {
    if (!byLine.has(hit.line)) byLine.set(hit.line, []);
    byLine.get(hit.line).push(hit.column);
  }

  const lines = original.split("\n");
  let fixed = 0;
  const skipped = [];
  for (const [line, columns] of byLine) {
    const result = fixLine(lines[line - 1], columns.sort((a, b) => a - b));
    lines[line - 1] = result.line;
    fixed += result.fixed;
    for (const s of result.skipped) skipped.push({ line, ...s });
  }

  // 🔴 줄바꿈을 바꾸지 않는다. `split("\n")` + `join("\n")` 은 CR 을 줄 안에 남긴 채
  // 되돌려 놓으므로 CRLF 파일도 원래대로 복원된다 — 이 리포는 CRLF 와 LF 가 섞여 있다.
  const updated = lines.join("\n");
  if (!dry && updated !== original) writeFileSync(path, updated, "utf8");
  return { fixed, skipped, changed: updated !== original };
}

function main() {
  if (process.argv.includes("--self-test")) { selfTest(); return; }

  const dry = process.argv.includes("--dry");
  const idx = process.argv.indexOf("--category");
  const category = idx >= 0 ? process.argv[idx + 1] : null;
  if (!category) {
    console.error("🔴 --category 를 지정하라. 전량 일괄 교정은 두지 않는다 — 검토 없이 184편을 바꾸는 명령은 있어선 안 된다.");
    process.exit(2);
  }

  const dir = join(process.cwd(), "content", "blog", category);
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`🔴 카테고리 '${category}' 가 없다. 0건이 아니라 대상 없음이다.`);
    process.exit(2);
  }

  let files = 0, totalFixed = 0;
  const allSkipped = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const result = fixFile(join(dir, file), { dry });
    if (!result) continue;
    files++;
    totalFixed += result.fixed;
    console.log(`  ${result.fixed}곳 고침  ${category}/${file}${result.skipped.length ? `  (남김 ${result.skipped.length})` : ""}`);
    for (const s of result.skipped) allSkipped.push(`${category}/${file}:${s.line}  ${s.reason}`);
  }

  console.log(`\n${dry ? "[시험] " : ""}파일 ${files}개 · ${totalFixed}곳 고침 · 손볼 자리 ${allSkipped.length}곳`);
  if (allSkipped.length) {
    console.log("\n🔴 손으로 봐야 하는 자리 — 조사가 아니거나 조사인지 판정할 수 없다:");
    for (const s of allSkipped) console.log(`  ${s}`);
  }
  if (!dry) console.log("\n다음: npm run check-markup -- --category " + category);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
