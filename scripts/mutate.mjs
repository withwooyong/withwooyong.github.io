#!/usr/bin/env node
/**
 * 뮤테이션 — 검사기에 알려진 결함을 하나씩 되살려 **자기 검사가 실제로 잡는지** 본다.
 *
 * 왜 필요한가: 자기 검사의 통과는 「케이스가 있다」만 말할 뿐 「그 케이스가 무언가를
 * 지킨다」는 말하지 않는다. 실제로 `source-overlap` 은 임계값을 20 에서 200 으로 바꿔
 * 실제 스캔이 52자 축자 복사를 0건으로 보고하는 동안에도 **28/28 을 그대로 냈고**,
 * `dup-scan` 은 공용 정규화를 통째로 무력화해도 **7/7 을 냈다**. 통과만 보고는
 * 케이스가 헛도는지 알 수 없다 — 살아남은 뮤턴트가 그 자리를 아무도 지키지 않는다는 증거다.
 *
 *   node scripts/mutate.mjs              뮤턴트를 하나씩 넣고 자기 검사를 돌린다
 *   node scripts/mutate.mjs --self-test  이 러너 자체가 작동하는지 증명한다
 *
 * 종료 코드: 생존이 하나라도 있거나 치환에 실패하면 1.
 *
 * ⚠️ 뮤턴트의 `from` 은 **실제 코드 조각**이다. 코드를 고치면 여기서 「치환 실패」가 뜨는데,
 *    그것은 러너의 고장이 아니라 **그 자리를 다시 볼 때가 됐다는 신호**다. 조용히 넘어가지
 *    않도록 치환 실패도 종료 코드 1 로 다룬다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const REPO = process.cwd();

const MUTANTS = [
  {
    id: "N1",
    file: "scripts/lib/normalize.mjs",
    desc: "마크다운 기호 제거를 없앤다",
    from: '.replace(/[|*_`#>~]/g, "")',
    to: '.replace(/(?:)/g, "")',
  },
  {
    id: "N2",
    file: "scripts/lib/normalize.mjs",
    desc: "링크를 제목으로 접는 단계를 없앤다",
    from: '.replace(/\\[([^\\]]*)\\]\\([^)]*\\)/g, "$1")',
    to: '.replace(/(?:)/g, "")',
  },
  {
    id: "N3",
    file: "scripts/lib/normalize.mjs",
    desc: "공백 제거를 없앤다",
    from: '.replace(/\\s+/g, "")',
    to: '.replace(/(?:)/g, "")',
  },
  {
    id: "S1",
    file: "scripts/source-overlap.mjs",
    desc: "임계값을 바꾼다 (자기 검사가 상수와 끊겨 있으면 통과한다)",
    from: "const MIN_DEFAULT = 20;",
    to: "const MIN_DEFAULT = 200;",
  },
  {
    id: "S2",
    file: "scripts/source-overlap.mjs",
    desc: "모든 펜스를 도식으로 보낸다 (```text 로 감싸면 대조가 사라진다)",
    from: "    if (isDiagramFence(info, inner)) {",
    to: "    if (true) {",
  },
  {
    id: "S3",
    file: "scripts/source-overlap.mjs",
    desc: "펜스 info 판정을 없앤다 (지시자가 앞선 mermaid 를 산문으로 흘린다)",
    from: "  return DIAGRAM_FENCE_INFO.test(info.trim()) || BARE_DIAGRAM.test(inner.trim());",
    to: "  return BARE_DIAGRAM.test(inner.trim());",
  },
  {
    id: "S4",
    file: "scripts/source-overlap.mjs",
    desc: "--min 검증을 없앤다 (NaN 이 조용한 0 을 만든다)",
    from: "  if (!Number.isInteger(n) || n < 1) return null;",
    to: "  if (false) return null;",
  },
  {
    id: "L1",
    file: "scripts/dup-scan.mjs",
    desc: "linkTitles 를 빈 배열로 만든다",
    from: "if (t.length > 0) out.push(t);",
    to: "if (false) out.push(t);",
  },
  {
    id: "L2",
    file: "scripts/dup-scan.mjs",
    desc: "isLink 분류를 항상 참으로 (모든 일치가 링크가 된다)",
    from: "isLink: links.some((t) => t.includes(matched)),",
    to: "isLink: true,",
  },
  {
    id: "L3",
    file: "scripts/dup-scan.mjs",
    desc: "기호만 남는 줄 걸러내기를 없앤다",
    from: "if (norm.length > 0 && HAS_WORD.test(norm))",
    to: "if (norm.length > 0)",
  },
  {
    id: "C1",
    file: "scripts/check-forbidden.mjs",
    desc: "HARD 목록에서 낱말 하나를 지운다",
    from: '  "히츠",\n',
    to: "",
  },
  {
    id: "C2",
    file: "scripts/check-forbidden.mjs",
    desc: "한글에도 단어 경계를 요구한다",
    from: "function isAsciiWord(w) {\n  for (const c of w) if (c.charCodeAt(0) > 127) return false;\n  return true;\n}",
    to: "function isAsciiWord(w) {\n  return true;\n}",
  },
  {
    id: "C3",
    file: "scripts/check-forbidden.mjs",
    desc: "밑줄을 단어 문자로 친다 (Ted_yanadoo.png 를 놓친다)",
    from: '  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9");',
    to: '  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_";',
  },
  {
    id: "C4",
    file: "scripts/check-forbidden.mjs",
    desc: "SOFT 목록을 스캔에서 뺀다",
    from: "const SOFT = [\n  ",
    to: "const SOFT = [];\nconst SOFT_UNUSED = [\n  ",
  },
  {
    id: "P1",
    file: "scripts/compose.mjs",
    desc: "규약 줄이 언제나 「실측 일치」를 낸다 (어긋남을 숨긴다)",
    from: "  if (computed === actualBytes) {",
    to: "  if (true) {",
  },
  {
    id: "P2",
    file: "scripts/compose.mjs",
    desc: "합계에서 펜스 안쪽 바이트를 빠뜨린다",
    from: "    const b = B(line);\n    cur.total += b;",
    to: "    const b = B(line);\n    if (!fence) cur.total += b;",
  },
  {
    id: "M1",
    file: "scripts/check-markup.mjs",
    desc: "원문 슬라이스 대신 노드 값을 본다 (이스케이프한 별표가 위반으로 뒤집힌다)",
    from: "      const raw = markdown.slice(from, node.position.end.offset);",
    to: "      const raw = node.value;",
  },
  {
    id: "M2",
    file: "scripts/check-markup.mjs",
    desc: "코드 블록까지 순회에 넣는다 (산출물 grep 이 409회로 부풀었던 그 실패다)",
    from: '    if (node.type === "text" && node.position?.start?.offset !== undefined) {',
    to: '    if ((node.type === "text" || node.type === "code" || node.type === "inlineCode") && node.position?.start?.offset !== undefined) {',
  },
  {
    id: "M3",
    file: "scripts/check-markup.mjs",
    desc: "노드마다 첫 위반에서 멈춘다 (한 줄에 둘이면 하나를 놓친다)",
    from: 'for (let i = raw.indexOf("**"); i >= 0; i = raw.indexOf("**", i + 2)) {',
    to: 'for (let i = raw.indexOf("**"); i >= 0; i = -1) {',
  },
  {
    id: "M4",
    file: "scripts/check-markup.mjs",
    desc: "GFM 확장을 뺀다 (취소선이 여는 별표를 삼키는 유형을 통째로 놓친다)",
    from: "    extensions: [gfm()],",
    to: "    extensions: [],",
  },
  {
    id: "M5",
    file: "scripts/check-markup.mjs",
    desc: "프론트매터를 빈 줄로 바꾸지 않고 지운다 (줄 번호가 그만큼 어긋난다)",
    from: '    (matched) => "\\n".repeat(matched.split("\\n").length - 1),',
    to: '    () => "",',
  },
  {
    id: "M6",
    file: "scripts/check-markup.mjs",
    desc: "일부 누락 가드를 뺀다 (54개를 넘겼는데 50개만 보고 0건을 내던 그 실패다)",
    from: "  if (rejected.length) {",
    to: "  if (false) {",
  },
  {
    id: "M7",
    file: "scripts/check-markup.mjs",
    desc: "수집에서 core.quotePath 를 끄는 것을 되돌린다 (한글 경로가 따옴표에 감싸여 빠진다)",
    from: '    ["-c", "core.quotePath=false", "ls-files", "--", "*.md"],',
    to: '    ["ls-files", "--", "*.md"],',
  },
  {
    id: "M8",
    file: "scripts/check-markup.mjs",
    desc: "넘어온 경로의 존재를 보지 않는다 (없는 파일에서 ENOENT 스택으로 죽는다)",
    from: '    if (!path.endsWith(".md") || !existsSync(path)) {',
    to: '    if (!path.endsWith(".md")) {',
  },
  {
    id: "CL1",
    file: "scripts/check-links.mjs",
    desc: "발행본의 상대 .md 를 통과시킨다 (사이트에 .md 경로가 없어 반드시 404 가 된다)",
    from: '      return { code: "R2", why: "발행본의 .md 링크는 정적 export 에서 404 다 (/blog/…/…/ 로 써라)" };',
    to: "      return null;",
  },
  {
    id: "CL2",
    file: "scripts/check-links.mjs",
    desc: "앵커를 벗기지 않는다 (편은 있고 앵커만 붙은 29건이 거짓 양성으로 올라온다)",
    from: '  const [rawPath] = url.split("#");',
    to: "  const rawPath = url;",
  },
  {
    id: "CL3",
    file: "scripts/check-links.mjs",
    desc: "참조식 링크의 정의 노드를 뽑지 않는다 ([가][ref] 형식이 통째로 빠진다)",
    from: '    if ((node.type === "link" || node.type === "definition") && node.url) {',
    to: '    if (node.type === "link" && node.url) {',
  },
  {
    id: "CL4",
    file: "scripts/check-links.mjs",
    desc: "끝 슬래시를 지우지 않는다 (/blog/rag/a/ 가 전부 없는 편으로 뒤집힌다)",
    from: '      const key = rawPath.replace(/^\\/blog\\//, "").replace(/\\/$/, "");',
    to: '      const key = rawPath.replace(/^\\/blog\\//, "");',
  },
  {
    id: "CL5",
    file: "scripts/check-links.mjs",
    desc: "카테고리 목록 링크를 편으로만 판정한다 (/blog/rag/ 가 위반이 된다)",
    from: "      if (ctx.hasSlug(key) || ctx.hasCategory(key)) return null;",
    to: "      if (ctx.hasSlug(key)) return null;",
  },
  {
    id: "CL6",
    file: "scripts/check-links.mjs",
    desc: "일부 누락 가드를 뺀다 (넘긴 것 중 일부만 보고 0곳을 보고한다)",
    from: "  if (rejected.length) {",
    to: "  if (false) {",
  },
  {
    id: "CL7",
    file: "scripts/check-links.mjs",
    desc: "수집에서 core.quotePath 를 끄는 것을 되돌린다 (한글 경로가 따옴표에 감싸여 빠진다)",
    from: '  return execFileSync("git", ["-c", "core.quotePath=false", "ls-files", "--", "*.md"], { encoding: "utf8" })',
    to: '  return execFileSync("git", ["ls-files", "--", "*.md"], { encoding: "utf8" })',
  },
  {
    id: "F1",
    file: "scripts/fix-markup.mjs",
    desc: "조사 목록을 짧은 것부터 본다 (「에서」가 「에」로 잘려 낱말이 쪼개진다)",
    from: "  const particle = PARTICLES.find((p) => after.startsWith(p));",
    to: "  const particle = [...PARTICLES].sort((a, b) => a.length - b.length).find((p) => after.startsWith(p));",
  },
  {
    id: "F3",
    file: "scripts/fix-markup.mjs",
    desc: "조사인지 보지 않고 뒤의 한글을 통째로 옮긴다 (강조가 낱말을 삼킨다)",
    from: '    const particle = PARTICLES.find((p) => after.startsWith(p));\n    if (!particle) {',
    to: '    const particle = (after.match(/^[가-힣]+/) || [null])[0];\n    if (!particle) {',
  },
  {
    id: "F4",
    file: "scripts/fix-markup.mjs",
    desc: "조사 뒤가 한글인지 보지 않는다 (「만족스럽다」의 「만」을 조사로 읽는다)",
    from: '    if (/^[가-힣]/.test(after.slice(particle.length))) {',
    to: "    if (false) {",
  },
  {
    id: "F5",
    file: "scripts/fix-markup.mjs",
    desc: "여는 별표까지 교정 대상에 넣는다 (손볼 자리가 12곳에서 165곳으로 부푼다)",
    from: "  for (let i = 1; i < columns.length; i += 2) targets.push(columns[i]);",
    to: "  for (let i = 0; i < columns.length; i += 1) targets.push(columns[i]);",
  },
  {
    id: "F6",
    file: "scripts/fix-markup.mjs",
    desc: "짝이 없는 별표를 조용히 버린다",
    from: '  if (columns.length % 2) skipped.push({ column: columns[columns.length - 1], reason: "짝이 없는 별표다" });',
    to: "",
  },
  {
    id: "F7",
    file: "scripts/fix-markup.mjs",
    desc: "서술격 조사와 그 활용형을 목록에서 뺀다 (실측 143건 가운데 44건이 여기다)",
    from: '  "이었다", "이지만", "인데", "이며", "이라", "이고", "였고", "였다", "이다", "인", "다",\n',
    to: "",
  },
  {
    id: "F8",
    file: "scripts/fix-markup.mjs",
    desc: "인용격 조사를 목록에서 뺀다 (인용을 강조로 감싸는 자리를 못 고친다)",
    from: '  "고", "라",\n',
    to: "",
  },
  {
    id: "CM1",
    file: "scripts/check-mermaid.mjs",
    desc: "DOM 전역 설치를 되돌린다 (실측 649개 중 621개가 파서에 닿지 못했던 상태다)",
    from: '  define("window", win);',
    to: "",
  },
  {
    id: "CM2",
    file: "scripts/check-mermaid.mjs",
    desc: "환경 오류 목록을 비운다 (DOM 붕괴가 문법 위반으로 둔갑해 649곳이 거짓 양성이 된다)",
    from: 'const ENVIRONMENT_ERRORS = new Set(["TypeError", "ReferenceError"]);',
    to: "const ENVIRONMENT_ERRORS = new Set([]);",
  },
  {
    id: "CM3",
    file: "scripts/check-mermaid.mjs",
    desc: "모든 오류를 환경 탓으로 돌린다 (진짜 문법 위반이 전부 사라진다)",
    from: '  return ENVIRONMENT_ERRORS.has(name) ? "environment" : "syntax";',
    to: '  return "environment";',
  },
  {
    id: "CM4",
    file: "scripts/check-mermaid.mjs",
    desc: "언어 표기를 보지 않는다 (```js 블록까지 mermaid 로 파싱해 없는 위반을 만든다)",
    from: '    .filter((node) => (node.lang ?? "").trim().toLowerCase() === "mermaid")',
    to: "    .filter(() => true)",
  },
  {
    id: "CM5",
    file: "scripts/check-mermaid.mjs",
    desc: "카나리 실패를 무시한다 (죽은 파서로 돌린 위반 0 이 결론으로 나간다)",
    from: "  if (canary) return { code: 2,",
    to: "  if (false) return { code: 2,",
  },
  {
    id: "CM6",
    file: "scripts/check-mermaid.mjs",
    desc: "판정 미도달을 무시한다 (못 본 도식이 있어도 위반 0 을 초록으로 낸다)",
    from: "  if (unreachable > 0) return { code: 2,",
    to: "  if (false) return { code: 2,",
  },
  {
    id: "CM7",
    file: "scripts/check-mermaid.mjs",
    desc: "일부 누락 가드를 뺀다 (넘긴 것 중 일부만 보고 0곳을 보고한다)",
    from: "  if (rejected > 0) return { code: 2,",
    to: "  if (false) return { code: 2,",
  },
  {
    id: "CM8",
    file: "scripts/check-mermaid.mjs",
    desc: "대상 0개 가드를 뺀다 (대상 없음이 위반 없음으로 읽힌다)",
    from: "  if (scanned === 0) return { code: 2,",
    to: "  if (false) return { code: 2,",
  },
  {
    id: "CM9",
    file: "scripts/check-mermaid.mjs",
    desc: "위반이 있어도 0 으로 끝낸다 (검사기가 아무것도 막지 않는다)",
    from: "  if (violations > 0) return { code: 1,",
    to: "  if (false) return { code: 1,",
  },
  {
    id: "CM10",
    file: "scripts/check-mermaid.mjs",
    desc: "수집에서 core.quotePath 를 끄는 것을 되돌린다 (한글 경로가 따옴표에 감싸여 빠진다)",
    from: '  return execFileSync("git", ["-c", "core.quotePath=false", "ls-files", "--", "*.md"], { encoding: "utf8" })',
    to: '  return execFileSync("git", ["ls-files", "--", "*.md"], { encoding: "utf8" })',
  },
  {
    id: "CM11",
    file: "scripts/check-mermaid.mjs",
    desc: "engines 범위를 무조건 허용한다 (CI 의 Node 에서 못 도는 판이 로컬에서 통과한다)",
    from: '      if (op === ">=" || op === ">") return major >= declared;',
    to: "      return true;",
  },
  {
    id: "CM12",
    file: "scripts/check-mermaid.mjs",
    desc: "CI 의 Node 버전을 읽지 못한다 (대조할 기준이 사라져 검사가 헛돈다)",
    from: "  return match ? Number(match[1]) : null;",
    to: "  return null;",
  },
];

const CHECKS = [
  ["source-overlap", "npm run --silent source-overlap:verify"],
  ["dup-scan", "npm run --silent dup-scan:verify"],
  ["check-forbidden", "npm run --silent check-forbidden:verify"],
  ["compose", "npm run --silent compose:verify"],
  ["check-markup", "npm run --silent check-markup:verify"],
  ["fix-markup", "npm run --silent fix-markup:verify"],
  ["check-links", "npm run --silent check-links:verify"],
  ["check-mermaid", "npm run --silent check-mermaid:verify"],
];

function run(cmd) {
  try {
    execSync(cmd, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
}

/**
 * 뮤턴트 하나를 넣고 검사기들을 돌린 뒤 **반드시** 원본을 되돌린다.
 *
 * 🔴 `finally` 가 핵심이다. 되돌리지 못하면 검사기가 망가진 채로 남고, 다음 사람은
 *    자기 작업이 깨뜨렸다고 생각한다. 되돌림은 성공 경로의 마지막 줄이 아니라
 *    **예외를 통과하는 자리**에 둔다.
 */
function withMutation(mutant, fn) {
  const path = join(REPO, mutant.file);
  const original = readFileSync(path, "utf8");
  if (!original.includes(mutant.from)) return { status: "치환 실패" };
  try {
    writeFileSync(path, original.replace(mutant.from, mutant.to), "utf8");
    return { status: "실행", value: fn() };
  } finally {
    writeFileSync(path, original, "utf8");
  }
}

function applyAndCheck(mutant) {
  const r = withMutation(mutant, () => CHECKS.map(([name, cmd]) => ({ name, code: run(cmd) })));
  return r.status === "실행" ? { status: "실행", results: r.value } : r;
}

function selfTest() {
  const cases = [];
  const self = "scripts/mutate.mjs";
  const path = join(REPO, self);

  // ① 대상 문자열을 못 찾았는데 조용히 넘어가면, 뮤턴트가 들어가지 않은 채 「생존 0」이
  //    나와 거짓 초록이 된다. 이 러너의 가장 위험한 실패 경로다.
  //
  //    🔴 없는 문자열을 **소스에 리터럴로 적으면 그 순간 존재하게 된다.** 첫 판이 정확히
  //    그렇게 헛돌아 자기 검사가 FAIL 을 냈다. 런타임에 조합해 소스에 나타나지 않게 한다.
  const NEVER = ["절대로", "존재하지", "않는", "대상"].join(" ");
  cases.push(["① 없는 문자열을 노린 뮤턴트는 치환 실패로 보고된다",
    withMutation({ file: self, from: NEVER, to: "x" }, () => null).status === "치환 실패"]);

  // ② 뮤턴트가 **실제로 파일에 들어가는가.** 들어가지 않으면 「잡힘」도 「생존」도 거짓이다.
  // ③ 그리고 **되돌려지는가.** 되돌리지 못하면 검사기가 망가진 채 남고, 다음 사람은
  //    자기 작업이 깨뜨렸다고 생각한다.
  const MARK = "/* mutation-self-test */";
  const before = readFileSync(path, "utf8");
  let applied = false;
  withMutation({ file: self, from: "const REPO = process.cwd();", to: `const REPO = process.cwd();${MARK}` }, () => {
    applied = readFileSync(path, "utf8").includes(MARK);
  });
  cases.push(["② 뮤턴트가 실제로 파일에 적용된다", applied]);
  cases.push(["③ 검사 뒤 파일이 바이트까지 원본 그대로다", readFileSync(path, "utf8") === before]);

  let pass = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}`);
    if (ok) pass += 1;
  }
  console.log(`\n뮤테이션 러너 자기 검사: ${pass}/${cases.length}`);
  process.exit(pass === cases.length ? 0 : 1);
}

if (process.argv.includes("--self-test")) selfTest();

console.log("뮤테이션 — 결함을 되살렸을 때 자기 검사가 잡는가\n");

let caught = 0;
let alive = 0;
let missing = 0;
for (const m of MUTANTS) {
  const r = applyAndCheck(m);
  if (r.status === "치환 실패") {
    missing += 1;
    console.log(`  🔴치환실패  ${m.id}  ${m.desc}`);
    console.log(`             대상 문자열이 ${m.file} 에 없다 — 코드가 바뀌었다면 뮤턴트를 갱신하라`);
    continue;
  }
  const got = r.results.some((x) => x.code !== 0);
  got ? (caught += 1) : (alive += 1);
  console.log(`  ${got ? "잡힘  " : "생존🔴"}  ${m.id}  ${m.desc}`);
  console.log(`          ${r.results.map((x) => `${x.name}[${x.code === 0 ? "통과" : "FAIL"}]`).join("  ")}`);
}

console.log(`\n뮤턴트 ${MUTANTS.length}개 · 잡힘 ${caught} · 생존 ${alive} · 치환실패 ${missing}`);
if (alive > 0 || missing > 0) {
  console.log("🔴 생존한 뮤턴트가 있다. 그 자리는 어떤 케이스도 지키지 않는다.");
  process.exit(1);
}
console.log("모든 뮤턴트가 잡혔다. 자기 검사의 통과는 결론이다.");
