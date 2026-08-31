// 지도편의 용어 개수와 용어절 바이트를 집계한다.
//
// 왜 자기 증명이 붙었나: 이 집계의 앞 판(자기 증명 없음)이 11편 중 5편에서 용어 수를
// 부풀렸다. 표가 여러 개인 절에서 **표마다 헤더 행을 데이터로 셌기** 때문이다.
// 헤더를 「용어」·「낱말」로 시작하는 행으로 걸렀는데, 헤더가 「항목」인 표는 그물을 빠져나갔다.
// 그 값이 그대로 설계서 상수로 들어갔다.
// ⇒ 헤더는 낱말로 알아보는 것이 아니라 **구분선 바로 앞 행**으로 알아본다.
//
// 사용법:
//   node map-terms.mjs --self-test   집계기가 실제로 세는지 증명한다 (본 집계 전에 반드시)
//   node map-terms.mjs               content/blog 의 지도편 전량을 집계한다

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// 용어절의 제목은 글마다 다르다. 「용어 정리」로만 찾으면 「통합 용어집」을 쓴 편이
// 조용히 빠지고, 빠진 것은 「용어절 없음」과 구분되지 않는다.
const TERM_HEADING = /^##\s+.*(용어|어휘)/;
const IS_SEP = (l) => /^\|[\s:|-]+\|?\s*$/.test(l);
const IS_ROW = (l) => /^\|/.test(l);

/** 절 안의 표에서 데이터 행만 센다. 구분선 바로 앞 행이 헤더다. */
function countRows(lines) {
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!IS_ROW(lines[i])) continue;
    if (IS_SEP(lines[i])) continue;
    // 다음 행이 구분선이면 이 행은 헤더다
    if (i + 1 < lines.length && IS_SEP(lines[i + 1])) continue;
    // 구분선을 아직 만나지 않은 표 밖의 `|` 행은 세지 않는다
    let sawSep = false;
    for (let j = i - 1; j >= 0 && IS_ROW(lines[j]); j--) if (IS_SEP(lines[j])) { sawSep = true; break; }
    if (sawSep) n++;
  }
  return n;
}

/** 용어절을 잘라 낸다. 없으면 null 이 아니라 「없음」을 명시해 돌려준다. */
function termSection(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => TERM_HEADING.test(l));
  if (start < 0) return { found: false, lines: [], bytes: 0, rows: 0 };
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { end = i; break; }
  }
  const body = lines.slice(start + 1, end); // 제목 행은 뺀다
  return { found: true, lines: body, bytes: Buffer.byteLength(body.join("\n"), "utf8"), rows: countRows(body) };
}

function selfTest() {
  const cases = [
    {
      name: "① 헤더 행을 데이터로 세지 않는다",
      md: "## 용어 정리\n\n| 용어 | 뜻 |\n| --- | --- |\n| A | a |\n| B | b |\n",
      rows: 2,
    },
    {
      name: "② 헤더가 「항목」이어도 세지 않는다 (앞 판이 여기서 틀렸다)",
      md: "## 용어 정리\n\n| 항목 | 값 |\n| --- | --- |\n| A | a |\n",
      rows: 1,
    },
    {
      name: "③ 표가 여럿이면 헤더도 여럿이다 — 표 개수만큼 부풀지 않는다",
      md: "## 용어 정리\n\n### 가\n\n| 용어 | 뜻 |\n| --- | --- |\n| A | a |\n\n### 나\n\n| 항목 | 값 |\n| --- | --- |\n| B | b |\n| C | c |\n",
      rows: 3,
    },
    {
      name: "④ 구분선을 세지 않는다",
      md: "## 용어 정리\n\n| 용어 | 뜻 |\n| :--- | ---: |\n| A | a |\n",
      rows: 1,
    },
    {
      name: "⑤ 제목이 「통합 용어집」이어도 찾는다",
      md: "## 통합 용어집\n\n| 용어 | 뜻 |\n| --- | --- |\n| A | a |\n",
      rows: 1,
      found: true,
    },
    {
      name: "⑥ 용어절이 없으면 「없음」으로 보고한다 (0 과 구분한다)",
      md: "## 들어가며\n\n본문뿐이다.\n",
      rows: 0,
      found: false,
    },
    {
      name: "⑦ 다음 `## ` 에서 절을 끊는다 — 뒤 절의 표를 끌어오지 않는다",
      md: "## 용어 정리\n\n| 용어 | 뜻 |\n| --- | --- |\n| A | a |\n\n## 다른 절\n\n| 용어 | 뜻 |\n| --- | --- |\n| X | x |\n| Y | y |\n",
      rows: 1,
    },
  ];
  let pass = 0;
  for (const c of cases) {
    const r = termSection(c.md);
    const ok = r.rows === c.rows && (c.found === undefined || r.found === c.found);
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.name}${ok ? "" : `  (기대 ${c.rows} · 실제 ${r.rows})`}`);
    if (ok) pass++;
  }
  console.log(`\n집계기 자기 검사: ${pass}/${cases.length}`);
  if (pass !== cases.length) process.exit(1);
  console.log("집계기가 작동한다. 본 집계의 수치는 결론이다.\n");
}

if (process.argv.includes("--self-test")) { selfTest(); process.exit(0); }

const ROOT = join(process.cwd(), "content", "blog");
const rows = [];
for (const c of readdirSync(ROOT)) {
  const d = join(ROOT, c);
  if (!statSync(d).isDirectory()) continue;
  for (const f of readdirSync(d)) {
    if (!f.endsWith(".md")) continue;
    const text = readFileSync(join(d, f), "utf8");
    if (!/^role:\s*["']?map["']?\s*$/m.test(text)) continue;
    const s = termSection(text);
    rows.push({ id: `${c}/${f.replace(/\.md$/, "")}`, ...s });
  }
}
rows.sort((a, b) => a.rows - b.rows);
console.log(`지도편 ${rows.length}편 (role: map)\n`);
console.log("편".padEnd(52) + "용어".padStart(5) + "용어절B".padStart(9) + "용어당B".padStart(9));
for (const r of rows) {
  const per = r.rows ? (r.bytes / r.rows).toFixed(1) : "—";
  console.log(r.id.padEnd(52) + String(r.found ? r.rows : "없음").padStart(5) + String(r.bytes).padStart(9) + String(per).padStart(9));
}
const withTerms = rows.filter((r) => r.found && r.rows > 0);
const big = withTerms.filter((r) => r.rows >= 23).map((r) => r.bytes);
console.log(`\n용어절 있는 편 ${withTerms.length} · 없는 편 ${rows.length - withTerms.length}`);
if (big.length) {
  const mean = big.reduce((a, b) => a + b, 0) / big.length;
  const lo = Math.min(...big), hi = Math.max(...big);
  console.log(`23개 이상 ${big.length}편 — 범위 ${lo.toLocaleString()} ~ ${hi.toLocaleString()} · 평균 ${Math.round(mean).toLocaleString()} · 폭이 평균의 ${((hi - lo) / mean * 100).toFixed(0)}%`);
}
