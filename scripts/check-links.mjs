#!/usr/bin/env node
// 깨진 링크를 잡는다.
//
// 왜 필요한가: 검사기 여섯이 낱말·겹침·분량·개수·마크업을 보지만 **링크가 어디로 가는지는
// 아무도 보지 않는다.** 실측으로 리포 문서에 42곳이 깨진 채 남아 있었고, 발견한 것은
// 검사기가 아니라 손으로 세어 본 일회성 스크립트였다.
//
// 🔴 **판정은 정규식이 아니라 파서가 한다.** 이 규칙을 세우기 전에 두 번 틀렸다.
//
// ① 코드 블록 안의 예시를 진짜 링크로 셌다. `harness-five-primitives.md` 의
//    ```markdown 블록 안에 있는 `[…](./project_go_cli_coverage.md)` 두 개를 「발행본이
//    404 를 낸다」고 보고했는데, 그것은 **문서에 인쇄된 예시**였다.
// ② 앵커를 벗기지 않아 `/blog/…/cicd-pipeline-fundamentals/#master--slave-표기는…` 을
//    「없는 편」으로 셌다. 편은 있고 앵커만 붙어 있었다. 29건이 전부 이 유형이었다.
//
// 두 실수 모두 「위반이 있다」는 방향의 거짓이었고, 사실은 발행본 1,612개 링크가 전부
// 온전했다. 없는 문제를 고치러 가는 것도 있는 문제를 놓치는 것만큼 나쁘다.
//
// 규칙 셋:
//
//   R1  발행본의 `/blog/<카테고리>/<슬러그>/` 는 실제 편이나 카테고리를 가리켜야 한다
//   R2  발행본의 상대 `.md` 링크는 **언제나** 위반이다. `components/markdown.tsx` 가
//       내부 링크를 `<Link href>` 로 그대로 내보내는데, 정적 export 에 `.md` 경로가
//       없으므로 반드시 404 가 된다. 사이트 안을 가리키려면 `/blog/…/…/` 여야 한다
//   R3  문서의 상대 `.md` 링크는 그 파일이 실제로 있어야 한다. **기준은 리포 루트가
//       아니라 그 문서가 놓인 디렉터리다** — 실측 22곳이 루트 기준으로 적혀 있었다
//
// 사용법:
//   node check-links.mjs --self-test   검사기가 실제로 잡는지 증명한다 (본 스캔 전에 반드시)
//   node check-links.mjs               content/blog 전량을 스캔한다
//   node check-links.mjs --docs        발행본 밖의 리포 문서 전량을 스캔한다
//   node check-links.mjs --files a.md  넘긴 경로만 스캔한다 (.md 가 아니거나 없으면 종료 코드 2)

import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";

const BLOG_ROOT = "content/blog/";

// ---------------------------------------------------------------------------
// 판정
// ---------------------------------------------------------------------------

/**
 * 링크 하나를 판정한다. **파일 시스템에 닿지 않는다.**
 *
 * 존재 여부는 `ctx` 로 주입받는다. 이렇게 두면 자기 검사가 임시 디렉터리를 만들거나
 * 리포의 실제 파일에 기대지 않고 규칙 자체를 검사할 수 있다 — 실제 파일에 기대는 케이스는
 * 그 파일이 사라지는 날 조용히 헛돈다.
 *
 * @returns {null|{code:string, why:string}} 문제가 없으면 null
 */
export function judgeLink(url, ctx) {
  if (!url) return null;

  // 외부 링크와 문서 안 앵커는 이 검사기의 대상이 아니다. 외부 링크의 생사는 네트워크에
  // 달려 있어 커밋을 막는 근거가 되지 못하고, 앵커는 제목 슬러그 규칙을 알아야 판정된다.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return null;
  if (url.startsWith("#")) return null;

  const [rawPath] = url.split("#");
  if (!rawPath) return null;

  if (ctx.isBlog) {
    if (rawPath.startsWith("/blog/")) {
      const key = rawPath.replace(/^\/blog\//, "").replace(/\/$/, "");
      if (!key) return null; // 목록 페이지
      if (ctx.hasSlug(key) || ctx.hasCategory(key)) return null;
      return { code: "R1", why: `가리키는 편이나 카테고리가 없다 (${key})` };
    }
    if (/\.md$/.test(rawPath)) {
      // 🔴 존재 여부를 보지 않는다. 파일이 있어도 위반이다 — 사이트에는 `.md` 경로가
      // 아예 없으므로, 대상이 리포에 있는지와 무관하게 독자는 404 를 본다.
      return { code: "R2", why: "발행본의 .md 링크는 정적 export 에서 404 다 (/blog/…/…/ 로 써라)" };
    }
    return null;
  }

  if (/\.md$/.test(rawPath)) {
    if (ctx.fileExists(rawPath)) return null;
    return { code: "R3", why: "가리키는 파일이 없다 (기준은 리포 루트가 아니라 이 문서의 디렉터리다)" };
  }
  return null;
}

/**
 * 마크다운에서 링크를 뽑는다.
 *
 * 🔴 `mdast` 를 쓰는 이유는 근사가 싫어서가 아니라 **코드 블록과 인라인 코드가 저절로
 * 빠지기 때문**이다. 정규식으로 세면 문서에 인쇄된 예시 링크가 위반으로 올라온다.
 */
export function extractLinks(markdown) {
  const tree = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const found = [];
  const walk = (node) => {
    // `definition` 은 참조식 링크(`[가][ref]` 와 `[ref]: /경로`)의 URL 을 담은 노드다.
    // `link` 만 보면 이 형식이 통째로 빠진다. 참조되지 않은 정의까지 걸리는 것은 덤이
    // 아니라 이득이다 — 쓰이지 않는 정의도 낡으면 거짓 정보로 남는다.
    if ((node.type === "link" || node.type === "definition") && node.url) {
      found.push({
        url: node.url,
        line: node.position?.start?.line ?? 0,
        column: node.position?.start?.column ?? 0,
        text: node.type === "definition" ? `[${node.identifier}]` : toText(node),
      });
    }
    for (const child of node.children || []) walk(child);
  };
  walk(tree);
  return found;
}

function toText(node) {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  return (node.children || []).map(toText).join("");
}

// ---------------------------------------------------------------------------
// 자기 검사
// ---------------------------------------------------------------------------

const SLUGS = new Set(["rag/a", "rag/b"]);
const CATS = new Set(["rag"]);
const PRESENT = new Set(["../HANDOFF.md", "./sibling.md"]);

const blogCtx = {
  isBlog: true,
  hasSlug: (k) => SLUGS.has(k),
  hasCategory: (k) => CATS.has(k),
  fileExists: () => true,
};
const docCtx = {
  isBlog: false,
  hasSlug: () => false,
  hasCategory: () => false,
  fileExists: (p) => PRESENT.has(p),
};

const CASES = [
  { name: "① 발행본이 실재하는 편을 가리키면 통과",
    url: "/blog/rag/a/", ctx: blogCtx, want: null },
  { name: "② 🔴 발행본이 없는 편을 가리키면 R1",
    url: "/blog/rag/zzz/", ctx: blogCtx, want: "R1" },
  { name: "③ 🔴 앵커가 붙어도 편만 보고 판정한다 (29건을 거짓 양성으로 만든 자리)",
    url: "/blog/rag/a/#어떤-제목", ctx: blogCtx, want: null },
  { name: "④ 카테고리 목록 링크는 통과",
    url: "/blog/rag/", ctx: blogCtx, want: null },
  { name: "⑤ 끝 슬래시가 없어도 같은 편으로 읽는다",
    url: "/blog/rag/a", ctx: blogCtx, want: null },
  { name: "⑥ 🔴 발행본의 상대 .md 는 파일이 있어도 R2 — 사이트에 .md 경로가 없다",
    url: "./sibling.md", ctx: blogCtx, want: "R2" },
  { name: "⑦ 외부 링크는 대상이 아니다",
    url: "https://example.com/x.md", ctx: blogCtx, want: null },
  { name: "⑧ 문서 안 앵커는 대상이 아니다",
    url: "#어떤-제목", ctx: docCtx, want: null },
  { name: "⑨ mailto 는 대상이 아니다",
    url: "mailto:someone@example.com", ctx: docCtx, want: null },
  { name: "⑩ 🔴 문서가 없는 파일을 가리키면 R3",
    url: "../없는문서.md", ctx: docCtx, want: "R3" },
  { name: "⑪ 문서가 있는 파일을 가리키면 통과",
    url: "../HANDOFF.md", ctx: docCtx, want: null },
  { name: "⑫ 문서에서 앵커가 붙어도 경로만 보고 판정한다",
    url: "../HANDOFF.md#지금-상태", ctx: docCtx, want: null },
  { name: "⑬ .md 가 아닌 상대 경로는 대상이 아니다 (이미지 등)",
    url: "./images/x.png", ctx: docCtx, want: null },
];

// 파서가 무엇을 걸러 내는지 — 위 판정과 달리 **추출** 단계의 계약이다.
const EXTRACT_CASES = [
  { name: "⑭ 본문의 링크를 뽑는다",
    md: "[가](/blog/rag/a/) 를 본다", want: 1 },
  { name: "⑮ 🔴 코드 블록 안의 링크는 뽑지 않는다 (거짓 양성 2건을 만든 자리)",
    md: "```markdown\n[가](./project_x.md)\n```\n", want: 0 },
  { name: "⑯ 🔴 인라인 코드 안의 링크는 뽑지 않는다",
    md: "예시는 `[가](./x.md)` 처럼 쓴다", want: 0 },
  { name: "⑰ 표 안의 링크도 뽑는다 — 이 리포는 표를 많이 쓴다",
    md: "| 무엇 | 어디 |\n| --- | --- |\n| 가 | [나](/blog/rag/a/) |\n", want: 1 },
  { name: "⑱ 줄 번호가 파일 기준이다",
    md: "머리말\n\n둘째 문단\n\n[가](/blog/rag/zzz/)", want: 1, firstLine: 5 },
  { name: "⑲ 참조식 링크도 뽑는다",
    md: "[가][ref] 를 본다\n\n[ref]: /blog/rag/zzz/\n", want: 1 },
];

function selfTest() {
  let pass = 0;
  for (const c of CASES) {
    const got = judgeLink(c.url, c.ctx);
    const code = got ? got.code : null;
    const ok = code === c.want;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.name}${ok ? "" : `  (기대 ${c.want ?? "통과"} · 실제 ${code ?? "통과"})`}`);
    if (ok) pass++;
  }
  for (const c of EXTRACT_CASES) {
    const links = extractLinks(c.md);
    let ok = links.length === c.want;
    let detail = ok ? "" : `  (기대 ${c.want}개 · 실제 ${links.length}개)`;
    if (ok && c.firstLine !== undefined && links[0]?.line !== c.firstLine) {
      ok = false;
      detail = `  (줄 기대 ${c.firstLine} · 실제 ${links[0]?.line})`;
    }
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.name}${detail}`);
    if (ok) pass++;
  }

  const t = targetSelfTest();
  pass += t.pass;
  const total = CASES.length + EXTRACT_CASES.length + t.total;

  console.log(`\n링크 검사기 자기 검사: ${pass}/${total}`);
  if (pass !== total) process.exit(1);
  console.log("검사기가 작동한다. 본 스캔의 0 은 결론이다.\n");
}

/**
 * 대상 수집을 자식 프로세스로 실제로 돌려 종료 코드를 본다.
 *
 * `check-markup` 과 같은 방어다. 순수 함수만 검사하면 게이트를 검사한 것이 아니다 —
 * 거부 목록을 옳게 채워도 `main` 이 읽지 않으면 검사기는 조용히 통과한다.
 */
function targetSelfTest() {
  const dir = mkdtempSync(join(tmpdir(), "check-links-"));
  const clean = join(dir, "clean.md");
  const notMarkdown = join(dir, "clean.txt");
  writeFileSync(clean, "링크가 없는 문서다.\n", "utf8");
  writeFileSync(notMarkdown, "마크다운이 아니다.\n", "utf8");

  const run = (args) => {
    try {
      execFileSync(process.execPath, [process.argv[1], "--files", ...args], { stdio: "pipe" });
      return 0;
    } catch (e) {
      return e.status;
    }
  };

  const cases = [
    { name: "⑳ .md 하나만 넘기면 통과한다", args: [clean], want: 0 },
    { name: "㉑ 🔴 .md 가 아닌 경로가 섞이면 종료 코드 2 — 조용한 누락을 막는다",
      args: [clean, notMarkdown], want: 2 },
    { name: "㉒ 🔴 없는 .md 를 넘기면 종료 코드 2 — ENOENT 스택으로 죽지 않는다",
      args: [clean, join(dir, "없는파일.md")], want: 2 },
  ];

  let pass = 0;
  for (const c of cases) {
    const got = run(c.args);
    const ok = got === c.want;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.name}${ok ? "" : `  (기대 ${c.want} · 실제 ${got})`}`);
    if (ok) pass++;
  }

  // 수집 자체가 어긋난 경로를 만들어 내는 것은 위 셋이 잡지 못한다. core.quotePath 를
  // 끄지 않으면 한글 경로가 따옴표에 감싸여 대상에서 조용히 빠진다 (TOOL-TRAPS 43번).
  const docs = collectDocs();
  const notAscii = docs.filter((p) => /[^\x20-\x7E]/.test(p));
  const notMd = docs.filter((p) => !p.endsWith(".md"));
  // 🔴 비-ASCII 경로가 없으면 이 케이스는 아무것도 지키지 않는다. 통과로 세면 안 된다.
  const collectOk = notAscii.length > 0 && notMd.length === 0;
  console.log(`  ${collectOk ? "PASS" : "FAIL"}  ㉓ 🔴 수집한 경로가 전부 .md 로 끝난다 — core.quotePath 가 한글 경로를 감싸지 않는다${
    collectOk ? "" : notAscii.length === 0 ? "  (비-ASCII 경로가 없어 대조할 것이 없다)" : `  (비-ASCII ${notAscii.length}개 중 어긋난 것 ${notMd.length}개)`
  }`);
  if (collectOk) pass++;

  rmSync(dir, { recursive: true, force: true });
  return { pass, total: cases.length + 1 };
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

function buildContext() {
  const blog = collectBlog();
  const slugs = new Set(blog.map((p) => p.slice(BLOG_ROOT.length).replace(/\.md$/, "")));
  const cats = new Set([...slugs].map((s) => s.split("/")[0]));
  return { slugs, cats };
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

function scan(files) {
  const { slugs, cats } = buildContext();
  const { targets, rejected } = resolveGivenFiles(files);

  const rows = [];
  for (const path of targets) {
    const normalized = path.replace(/\\/g, "/");
    const isBlog = normalized.startsWith(BLOG_ROOT);
    const ctx = {
      isBlog,
      hasSlug: (k) => slugs.has(k),
      hasCategory: (k) => cats.has(k),
      fileExists: (rel) => existsSync(resolve(dirname(path), rel)),
    };
    const hits = [];
    for (const link of extractLinks(readFileSync(path, "utf8"))) {
      const verdict = judgeLink(link.url, ctx);
      if (verdict) hits.push({ ...link, ...verdict });
    }
    if (hits.length) rows.push({ id: normalized, hits });
  }
  return { rows, scanned: targets.length, rejected };
}

function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    process.exit(0);
  }

  const filesIdx = process.argv.indexOf("--files");
  let files = filesIdx >= 0 ? process.argv.slice(filesIdx + 1).filter((a) => !a.startsWith("--")) : null;
  if (process.argv.includes("--docs")) files = collectDocs();
  if (!files) files = collectBlog();

  const { rows, scanned, rejected } = scan(files);

  // 🔴 일부 누락은 대상 없음과 같은 취급이다. 받은 것 중 일부를 조용히 버리면 부른 쪽은
  // 전량을 검사했다고 믿는다 — 이 리포에서 실제로 겪은 거짓 0 의 형태다.
  if (rejected.length) {
    console.error(`🔴 넘어온 경로 ${rejected.length}개가 스캔에서 빠졌다 (.md 가 아니거나 파일이 없다). 일부만 검사한 결과는 0건이 아니다.`);
    for (const path of rejected.slice(0, 5)) console.error(`   ${path}`);
    if (rejected.length > 5) console.error(`   … 외 ${rejected.length - 5}개`);
    process.exit(2);
  }

  if (scanned === 0) {
    console.error("🔴 스캔 대상이 0개다. 0건이 아니라 대상 없음이다.");
    process.exit(2);
  }

  let total = 0;
  for (const row of rows) {
    console.log(`\n${row.id}  (${row.hits.length}곳)`);
    for (const hit of row.hits) {
      total++;
      console.log(`  ${String(hit.line).padStart(4)}:${String(hit.column).padEnd(4)} [${hit.code}] ${hit.url}`);
      console.log(`       ${hit.why}`);
    }
  }

  console.log(`\n스캔 ${scanned}개 파일 · 위반 ${rows.length}개 파일 · ${total}곳`);
  if (total > 0) process.exit(1);
  console.log("깨진 링크가 없다.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
