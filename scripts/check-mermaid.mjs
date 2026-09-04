#!/usr/bin/env node
// Mermaid 도식이 실제로 그려지는지 검사한다.
//
// 왜 필요한가: 검사기 일곱이 낱말·겹침·분량·개수·마크업·링크를 보지만 **도식이 그려지는지는
// 아무도 보지 않는다.** 이 리포에는 Mermaid 블록이 649개 있고, 문법이 하나만 어긋나도
// GitHub 과 블로그 화면에는 도식 대신 빨간 오류 상자가 뜬다. 마크업 검사기가 별표를
// 보지 못했던 것과 같은 종류의 사각지대다.
//
// 🔴 **판정은 정규식이 아니라 mermaid 자신이 한다.** 화면을 그리는 파서가 판정해야
// 「그려지는가」에 답할 수 있다. 정규식으로는 라벨 안의 괄호 하나를 잡으려다 코드 블록
// 안의 예시 도식을 위반으로 올리게 된다 — 링크 검사기에서 실제로 겪은 실수다.
//
// 🔴 **이 검사기의 진짜 위험은 위반을 놓치는 것이 아니라 거짓 0 이다.**
//
//    mermaid 는 브라우저용이라 Node 에는 없는 DOM 을 쓴다. DOM 없이 `parse()` 를 부르면
//    파싱에 닿기도 전에 `DOMPurify.addHook is not a function` 으로 죽는데, 이것을
//    「위반 없음」으로 세면 검사기는 초록을 낸다. 실측으로 **649개 중 621개**가 그렇게
//    빠졌고 화면에는 「문법 오류 0」이 찍혔다. 96%를 보지 않은 0 이었다.
//
//    그래서 오류를 둘로 가른다.
//
//      문법 오류 (파서가 낸 것)      →  위반         →  종료 코드 1
//      그 밖의 오류 (환경이 깨진 것) →  판정 미도달  →  종료 코드 2
//
//    그리고 수집한 블록 수와 **판정에 도달한 블록 수**를 나란히 출력해 대조한다.
//    둘이 어긋나면 0 은 결론이 아니다.
//
//    분류는 2차 방어다. 1차는 본 스캔 앞에 두는 **카나리**로, 반드시 그려져야 할 도식
//    하나를 먼저 파싱해 본다. 그것이 실패하면 스캔을 시작하지 않는다.
//
// 규칙:
//
//   R1  ```mermaid 블록은 mermaid 파서를 통과해야 한다
//
// 규칙이 하나뿐인 이유는 판정을 파서에 위임했기 때문이다. 무엇이 그려지고 무엇이 깨지는지는
// 이 파일이 정하지 않는다 — mermaid 버전을 올리면 판정도 함께 따라간다.
//
// 사용법:
//   node check-mermaid.mjs --self-test   검사기가 실제로 잡는지 증명한다 (본 스캔 전에 반드시)
//   node check-mermaid.mjs               content/blog 전량을 스캔한다
//   node check-mermaid.mjs --docs        발행본 밖의 리포 문서 전량을 스캔한다
//   node check-mermaid.mjs --files a.md  넘긴 경로만 스캔한다 (.md 가 아니거나 없으면 종료 코드 2)

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";

const BLOG_ROOT = "content/blog/";

// ---------------------------------------------------------------------------
// 파서 준비
// ---------------------------------------------------------------------------

// mermaid 가 로드되는 시점에 DOMPurify 가 `window` 를 잡는다. 그래서 전역을 세우는 일이
// **import 보다 먼저**여야 한다 — 순서가 뒤바뀌면 위에 적은 621건이 그대로 재현된다.
const DOM_GLOBALS = [
  "document",
  "navigator",
  "Element",
  "HTMLElement",
  "SVGElement",
  "Node",
  "DOMParser",
  "NodeFilter",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
];

export async function installDom() {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
  const win = dom.window;

  // Node 24 는 `globalThis.navigator` 를 getter 로만 노출한다. 단순 대입은
  // 「has only a getter」로 죽으므로 defineProperty 로 덮어쓴다.
  const define = (name, value) => {
    if (value === undefined) return;
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  };

  define("window", win);
  for (const name of DOM_GLOBALS) define(name, win[name]);
  return win;
}

/**
 * mermaid 를 불러 파싱 함수 하나로 감싼다.
 *
 * 파싱 함수를 **주입 가능한 값**으로 돌려주는 이유는 자기 검사 때문이다. 오류를 문법과
 * 환경으로 가르는 분류 규칙은 실제 mermaid 없이도 검사할 수 있어야 한다 — 진짜 DOM 붕괴를
 * 일부러 일으켜 케이스를 만드는 것은 재현이 어렵고, 재현이 어려운 케이스는 조용히 헛돈다.
 */
export async function loadMermaid() {
  await installDom();
  const mod = await import("mermaid");
  const mermaid = mod.default ?? mod;
  return (source) => mermaid.parse(source);
}

// ---------------------------------------------------------------------------
// 판정
// ---------------------------------------------------------------------------

// DOM 이 없을 때 mermaid 가 내는 것은 파서 오류가 아니라 이 둘이다. 「없는 것을 부른다」는
// 실패의 모양이고, 문법 오류는 mermaid 가 스스로 만들어 던지는 일반 Error 다.
const ENVIRONMENT_ERRORS = new Set(["TypeError", "ReferenceError"]);

/**
 * 오류를 문법과 환경으로 가른다.
 *
 * 🔴 환경 쪽을 **열거**하고 나머지를 문법으로 두는 방향이다. 반대로 두면 — 문법 오류의
 * 모양을 열거하고 나머지를 환경으로 두면 — mermaid 가 새로운 오류 형태를 도입한 날
 * 진짜 위반이 「환경 문제」로 분류되어 조용히 사라진다. 위반을 놓치는 쪽보다 검사기가
 * 시끄럽게 죽는 쪽이 낫다.
 */
export function classifyError(err) {
  const name = err?.constructor?.name ?? "";
  return ENVIRONMENT_ERRORS.has(name) ? "environment" : "syntax";
}

function condense(message) {
  return String(message ?? "").replace(/\s+/g, " ").trim();
}

/**
 * 도식 하나를 판정한다. **mermaid 를 직접 부르지 않는다.**
 *
 * 파싱 함수를 인자로 받는다 — check-links 의 `judgeLink(url, ctx)` 와 같은 이유다.
 *
 * @returns {Promise<null|{kind:"syntax"|"environment", why:string}>} 문제가 없으면 null
 */
export async function judgeDiagram(source, parse) {
  try {
    await parse(source);
    return null;
  } catch (err) {
    return { kind: classifyError(err), why: condense(err?.message) };
  }
}

// ---------------------------------------------------------------------------
// 추출
// ---------------------------------------------------------------------------

function collectCodeNodes(node, out) {
  if (node.type === "code") out.push(node);
  for (const child of node.children ?? []) collectCodeNodes(child, out);
}

/**
 * ```mermaid 블록을 뽑는다. **파서가 뽑는다.**
 *
 * 4중 백틱 안에 예시로 인쇄된 ```mermaid 는 바깥 코드 블록의 **텍스트**이지 코드 노드가
 * 아니므로 저절로 빠진다. 정규식으로 세면 그것들이 전부 위반으로 올라온다.
 */
export function extractDiagrams(markdown) {
  const tree = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const nodes = [];
  collectCodeNodes(tree, nodes);
  return nodes
    .filter((node) => (node.lang ?? "").trim().toLowerCase() === "mermaid")
    .map((node) => ({ source: node.value, line: node.position?.start?.line ?? 0 }));
}

// ---------------------------------------------------------------------------
// 카나리
// ---------------------------------------------------------------------------

// 반드시 그려져야 하는 도식이다. 이것이 통과하지 못하면 파서가 살아 있지 않은 것이고,
// 그 상태의 스캔 결과는 0 이든 아니든 의미가 없다.
export const CANARY = "flowchart TD\n  A[정상 노드] --> B[다른 노드]";

export async function checkParserAlive(parse) {
  return judgeDiagram(CANARY, parse);
}

// ---------------------------------------------------------------------------
// 종료 코드
// ---------------------------------------------------------------------------

/**
 * 스캔 결과를 종료 코드로 바꾼다. **집계만 받는다.**
 *
 * 🔴 이 함수를 따로 뽑은 이유는 뮤테이션이다. 가드가 `main` 안에 흩어져 있으면 자기
 * 검사는 그것을 볼 수 없고, 가드를 통째로 지워도 케이스가 전부 통과한다 — 「케이스가
 * 있다」와 「케이스가 무언가를 지킨다」가 갈리는 자리다.
 *
 * 순서가 규칙이다. **못 본 것이 있으면 본 것의 결과를 말하지 않는다.** 위반 0 은
 * 전량을 판정한 뒤에만 결론이 된다.
 */
export function decideExit({ canary, rejected, scanned, unreachable, violations }) {
  if (canary) return { code: 2, why: `파서가 살아 있지 않다 (${canary.kind}). 이 상태의 0 은 결론이 아니다.` };
  if (rejected > 0) return { code: 2, why: `넘어온 경로 ${rejected}개가 스캔에서 빠졌다. 일부만 검사한 결과는 0건이 아니다.` };
  if (scanned === 0) return { code: 2, why: "스캔 대상이 0개다. 0건이 아니라 대상 없음이다." };
  if (unreachable > 0) return { code: 2, why: `도식 ${unreachable}개가 판정에 도달하지 못했다. 나머지 결과는 전량이 아니다.` };
  if (violations > 0) return { code: 1, why: `깨지는 도식이 ${violations}곳 있다.` };
  return { code: 0, why: "깨지는 도식이 없다." };
}

// ---------------------------------------------------------------------------
// 자기 검사
// ---------------------------------------------------------------------------

// 실제 mermaid 파서로 판정하는 케이스. 기대 거동은 전부 실측으로 확인했다.
const PARSER_CASES = [
  ["① 정상 flowchart 는 통과한다", "flowchart TD\n  A[좋은 노드] --> B[다른 노드]", null],
  ["② 라벨 안의 괄호는 위반이다", "flowchart TD\n  A[함수(인자)] --> B", "syntax"],
  ["③ 화살표가 겹치면 위반이다", "flowchart TD\n  A --> --> B", "syntax"],
  ["④ sequenceDiagram 은 통과한다", "sequenceDiagram\n  A->>B: 요청\n  B-->>A: 응답", null],
  ["⑤ stateDiagram-v2 는 통과한다", "stateDiagram-v2\n  [*] --> 대기\n  대기 --> 완료", null],
  ["⑥ 알 수 없는 도식 종류는 위반이다", "flowchartt TD\n  A --> B", "syntax"],
];

// 분류 규칙만 보는 케이스. 파싱 함수를 가짜로 주입해 오류의 **종류**에 따라 갈리는지 본다.
function throwing(err) {
  return () => {
    throw err;
  };
}

const CLASSIFY_CASES = [
  ["⑦ 🔴 DOM 이 없어 나는 TypeError 는 위반이 아니라 판정 미도달이다", new TypeError("DOMPurify.addHook is not a function"), "environment"],
  ["⑧ 🔴 전역이 없어 나는 ReferenceError 도 판정 미도달이다", new ReferenceError("window is not defined"), "environment"],
  ["⑨ 파서가 낸 일반 Error 는 위반이다", new Error("Parse error on line 2"), "syntax"],
];

const FOUR = "`".repeat(4);
const THREE = "`".repeat(3);

// 추출 케이스. 펜스를 소스에 리터럴로 적으면 이 파일 자신이 검사 대상이 될 때 걸리므로
// 런타임에 조합한다 — 「없는 것을 리터럴로 적으면 그 순간 존재하게 된다」와 같은 이유다.
const EXTRACT_CASES = [
  [
    "⑩ mermaid 블록을 뽑는다",
    `${THREE}mermaid\nflowchart TD\n  A --> B\n${THREE}\n`,
    1,
  ],
  [
    "⑪ 🔴 4중 백틱 안에 인쇄된 예시는 뽑지 않는다",
    `${FOUR}markdown\n${THREE}mermaid\nflowchart TD\n  A --> B\n${THREE}\n${FOUR}\n`,
    0,
  ],
  [
    "⑫ 다른 언어의 블록은 뽑지 않는다",
    `${THREE}js\nflowchart TD\n${THREE}\n`,
    0,
  ],
  [
    "⑬ 대문자로 적은 언어 표기도 뽑는다",
    `${THREE}Mermaid\nflowchart TD\n  A --> B\n${THREE}\n`,
    1,
  ],
];

// 종료 코드 케이스. 앞의 넷은 전부 「못 본 것이 있다」이며 위반 0 이어도 2 로 죽어야 한다.
const CLEAN = { canary: null, rejected: 0, scanned: 10, unreachable: 0, violations: 0 };

const EXIT_CASES = [
  ["⑮ 🔴 파서가 죽어 있으면 위반 0 이어도 종료 코드 2 다", { ...CLEAN, canary: { kind: "environment", why: "" } }, 2],
  ["⑯ 🔴 판정에 도달하지 못한 도식이 있으면 종료 코드 2 다", { ...CLEAN, unreachable: 3 }, 2],
  ["⑰ 🔴 넘긴 경로 일부가 빠지면 종료 코드 2 다", { ...CLEAN, rejected: 1 }, 2],
  ["⑱ 🔴 대상이 0개면 종료 코드 2 다 — 0건이 아니라 대상 없음이다", { ...CLEAN, scanned: 0 }, 2],
  ["⑲ 위반이 있으면 종료 코드 1 이다", { ...CLEAN, violations: 4 }, 1],
  ["⑳ 전량을 판정했고 위반이 없으면 종료 코드 0 이다", CLEAN, 0],
];

export async function selfTest() {
  const results = [];
  const parse = await loadMermaid();

  // 🔴 카나리를 자기 검사의 첫 항목으로 둔다. 아래 케이스들이 전부 통과해도 파서가
  // 살아 있지 않으면 본 스캔은 0 을 낸다.
  const canary = await checkParserAlive(parse);
  results.push([canary === null, `⓪ 🔴 파서가 살아 있다 — flowchart 가 판정에 도달한다${canary ? ` (${canary.kind}: ${canary.why.slice(0, 60)})` : ""}`]);

  for (const [label, source, expected] of PARSER_CASES) {
    const verdict = await judgeDiagram(source, parse);
    const actual = verdict?.kind ?? null;
    results.push([actual === expected, label]);
  }

  for (const [label, err, expected] of CLASSIFY_CASES) {
    const verdict = await judgeDiagram("무엇이든", throwing(err));
    results.push([verdict?.kind === expected, label]);
  }

  for (const [label, markdown, expected] of EXTRACT_CASES) {
    results.push([extractDiagrams(markdown).length === expected, label]);
  }

  for (const [label, summary, expected] of EXIT_CASES) {
    results.push([decideExit(summary).code === expected, label]);
  }

  // 수집이 어긋난 경로를 만들어 내는 것은 위 케이스들이 잡지 못한다. core.quotePath 가
  // 한글 경로를 따옴표로 감싸면 `.md` 로 끝나지 않게 되어 대상에서 조용히 빠진다.
  //
  // 🔴 「전부 .md 다」만 보면 이 케이스는 헛돈다. quotePath 가 켜지면 한글 경로는 있지도
  // 않은 이름이 되어 `existsSync` 에서 걸러지고, **남은 것은 전부 .md 로 끝나기 때문이다.**
  // 그래서 대조할 비-ASCII 경로가 실제로 있는지를 먼저 센다 — 없으면 지키는 것이 없다.
  const docs = collectDocs();
  const notAscii = docs.filter((path) => /[^\x20-\x7E]/.test(path));
  const notMd = docs.filter((path) => !path.endsWith(".md"));
  const collectOk = notAscii.length > 0 && notMd.length === 0;
  results.push([
    collectOk,
    `㉑ 🔴 수집한 경로 ${docs.length}개가 전부 .md 로 끝난다 — core.quotePath 가 한글 경로를 감싸지 않는다${
      collectOk
        ? ` (비-ASCII ${notAscii.length}개로 대조했다)`
        : notAscii.length === 0
          ? "  (비-ASCII 경로가 없어 대조할 것이 없다)"
          : `  (비-ASCII ${notAscii.length}개 중 어긋난 것 ${notMd.length}개)`
    }`,
  ]);

  let pass = 0;
  for (const [ok, label] of results) {
    if (ok) pass++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  }
  console.log(`\n자기 검사 ${pass}/${results.length}`);
  if (pass !== results.length) process.exit(1);
}

// ---------------------------------------------------------------------------
// 본 스캔
// ---------------------------------------------------------------------------

function trackedMarkdown() {
  // core.quotePath 를 끄지 않으면 한글 경로가 따옴표에 감싸여 `.md` 로 끝나지 않게 되고,
  // 대상에서 조용히 빠진다. 실측으로 54개 중 4개가 그렇게 빠졌다 (TOOL-TRAPS 43번).
  return execFileSync("git", ["-c", "core.quotePath=false", "ls-files", "--", "*.md"], { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function collectBlog() {
  return trackedMarkdown().filter((p) => p.startsWith(BLOG_ROOT) && existsSync(p));
}

export function collectDocs() {
  const tracked = trackedMarkdown().filter((p) => !p.startsWith(BLOG_ROOT));
  const present = tracked.filter((p) => existsSync(p));
  const gone = tracked.length - present.length;
  if (gone > 0) {
    console.error(`⚠️ 추적 중이지만 작업 트리에 없는 문서 ${gone}개를 대상에서 뺐다 (지운 뒤 스테이징하지 않은 파일).`);
  }
  return present;
}

export function resolveGivenFiles(files) {
  const targets = [];
  const rejected = [];
  for (const path of files) {
    if (!path.endsWith(".md") || !existsSync(path)) {
      rejected.push(path);
      continue;
    }
    targets.push(path);
  }
  return { targets, rejected };
}

async function scan(files, parse) {
  const { targets, rejected } = resolveGivenFiles(files);

  const rows = [];
  let blocks = 0;
  let judged = 0;
  const unreachable = [];

  for (const path of targets) {
    const hits = [];
    for (const diagram of extractDiagrams(readFileSync(path, "utf8"))) {
      blocks++;
      const verdict = await judgeDiagram(diagram.source, parse);
      if (verdict === null) {
        judged++;
        continue;
      }
      if (verdict.kind === "environment") {
        unreachable.push({ path, line: diagram.line, why: verdict.why });
        continue;
      }
      judged++;
      hits.push({ line: diagram.line, why: verdict.why });
    }
    if (hits.length) rows.push({ id: path.replace(/\\/g, "/"), hits });
  }

  return { rows, blocks, judged, unreachable, scanned: targets.length, rejected };
}

async function main() {
  if (process.argv.includes("--self-test")) {
    await selfTest();
    process.exit(0);
  }

  const filesIdx = process.argv.indexOf("--files");
  let files = filesIdx >= 0 ? process.argv.slice(filesIdx + 1).filter((a) => !a.startsWith("--")) : null;
  if (process.argv.includes("--docs")) files = collectDocs();
  if (!files) files = collectBlog();

  const parse = await loadMermaid();

  // 🔴 스캔을 시작하기 전에 파서가 살아 있는지 본다. 죽은 파서로 649개를 돌면 위반 0 이
  // 나오는데, 그것은 「깨진 도식이 없다」가 아니라 「아무것도 보지 않았다」이다.
  const canary = await checkParserAlive(parse);

  // 카나리가 죽었어도 스캔은 돌린다. 무엇이 어떻게 실패하는지 보여 주는 편이 낫고,
  // 판정은 어차피 아래 `decideExit` 가 한다.
  const { rows, blocks, judged, unreachable, scanned, rejected } = canary
    ? { rows: [], blocks: 0, judged: 0, unreachable: [], scanned: 0, rejected: [] }
    : await scan(files, parse);

  let total = 0;
  for (const row of rows) {
    console.log(`\n${row.id}  (${row.hits.length}곳)`);
    for (const hit of row.hits) {
      total++;
      console.log(`  ${String(hit.line).padStart(4)}  ${hit.why.slice(0, 160)}`);
    }
  }

  const verdict = decideExit({
    canary,
    rejected: rejected.length,
    scanned,
    unreachable: unreachable.length,
    violations: total,
  });

  if (verdict.code === 0) {
    console.log(`\n스캔 ${scanned}개 파일 · 도식 ${blocks}개 · 판정 도달 ${judged}개 · 위반 0곳`);
    console.log(verdict.why);
    process.exit(0);
  }

  console.error(`\n🔴 ${verdict.why}`);
  if (canary) console.error(`   ${canary.why.slice(0, 200)}`);
  for (const path of rejected.slice(0, 5)) console.error(`   빠진 경로: ${path}`);
  if (rejected.length > 5) console.error(`   … 외 ${rejected.length - 5}개`);
  for (const item of unreachable.slice(0, 5)) console.error(`   미도달: ${item.path}:${item.line}  ${item.why.slice(0, 120)}`);
  if (unreachable.length > 5) console.error(`   … 외 ${unreachable.length - 5}개`);
  if (verdict.code === 1) {
    console.error(`   스캔 ${scanned}개 파일 · 도식 ${blocks}개 · 판정 도달 ${judged}개 · 위반 ${rows.length}개 파일 · ${total}곳`);
  }
  process.exit(verdict.code);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`🔴 검사기가 예외로 죽었다 — 결과 없음이지 0건이 아니다.\n   ${err?.stack ?? err}`);
    process.exit(2);
  });
}
