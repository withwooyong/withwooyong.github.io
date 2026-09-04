#!/usr/bin/env node
// 렌더되지 않는 마크다운 강조를 잡는다.
//
// 왜 이 검사기가 필요한가: 기존 검사 다섯(금칙어·복제·원본 대조·분량·개수)은 **낱말과
// 바이트만** 보고 마크업 문법을 보지 않는다. 그 사이로 별표가 본문에 그대로 찍힌
// 페이지가 75개 · 306회 쌓였고, 발견한 것은 검사기가 아니라 배포된 화면이었다.
//
// 기전은 **둘**이며, 둘째는 실측으로 뒤늦게 드러났다.
//
// ① CommonMark 의 right-flanking 조건. 닫는 `**` 가 닫는 구분자로 인정받으려면 앞이
//    공백이 아니어야 하고, **앞이 구두점이면 뒤가 공백이거나 구두점이어야 한다.**
//    조사가 낱말에 붙는 한국어에서 「…」·"…"·(…) 뒤에 조사가 오면 이 조건이 깨진다.
//
//      ✗ 열린**「무엇을」**를 정한다      ← 앞이 낫표, 뒤가 한글 → 별표가 화면에 보인다
//      ✅ 열린**「무엇을」를** 정한다      ← 조사를 강조 안으로 넣는다
//
// ② 🔴 GFM 취소선이 여는 `**` 를 삼킨다. 한 줄의 **강조 밖과 강조 안에 물결(`~`)이
//    하나씩** 있으면, 취소선 파싱이 그 둘을 짝으로 먼저 가져가면서 강조의 짝이 깨진다.
//    범위 표기(`①~③`)를 즐겨 쓰는 이 리포에서 실재했다.
//
//      ✗ 가~나 계보, 다 적용. **라~마 안 보인다.**
//
//    ⚠️ **「닫는 `**` 가 줄 끝」은 조건이 아니다.** 인수인계에 그렇게 적혀 있었으나 닫는
//    별표 뒤가 쉼표인 사례가 나왔다. 실측 세 건의 우연한 공통점이 조건으로 굳은 것이며,
//    다음 사람이 같은 기전을 **처음 보는 셋째 기전으로 착각하게** 만들었다. 대조군 아홉
//    개로 갈랐다. 무는 것은 물결의 위치이지 별표 뒤에 무엇이 오는지가 아니다.
//
//    ⚠️ **이스케이프도 강조 축소도 듣지 않는다.** 실측으로 둘 다 그대로 2회를 냈다.
//    듣는 것은 강조 안에서 물결을 없애는 것뿐이다 — 말로 풀거나 인라인 코드로 감싼다.
//    그래서 이 유형은 `fix-markup` 이 자동으로 고치지 못하고 손볼 자리로 남는다.
//
//    ⇒ **①의 「구두점 + 별표 + 문자」 정규식으로는 이 유형이 걸리지 않는다.** 물결이
//    무는 것은 여는 별표라 닫는 쪽 패턴에 아예 걸리지 않는다. 근사를 쓰지 않는 둘째 이유다.
//
// ⇒ 🔴 **판정을 정규식으로 근사하지 않는다.** 이 리포에는 페이지를 실제로 그리는 파서가
// 이미 있으므로(`react-markdown` 의 micromark 계열) 그 파서를 직접 돌린다. 근사가 아니라
// 정답이며, 코드 블록과 인라인 코드가 자동으로 제외된다 — 실측으로 산출물 `grep` 의 409회
// 중 103회가 **코드 블록 안의 정당한 마크다운 예시**였다. 정규식은 그 셋을 가리지 못한다.
//
// 사용법:
//   node check-markup.mjs --self-test   검사기가 실제로 잡는지 증명한다 (본 스캔 전에 반드시)
//   node check-markup.mjs               content/blog 전량을 스캔한다
//   node check-markup.mjs --category rag 한 카테고리만 스캔한다
//   node check-markup.mjs --docs        발행본 밖의 리포 문서 전량을 스캔한다
//   node check-markup.mjs --files a.md  넘긴 경로만 스캔한다 (.md 가 아닌 것이 섞이면 종료 코드 2)

import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfm } from "micromark-extension-gfm";
import { gfmFromMarkdown } from "mdast-util-gfm";

/** 발췌 폭. 좁으면 어디인지 모르고, 넓으면 콘솔이 넘친다. */
const EXCERPT = 24;

/**
 * 렌더되지 않은 강조를 찾는다.
 *
 * 계약: 반환 항목 하나가 **화면에 그대로 보이는 별표 구분자 하나**(`*` 두 개)에
 * 대응한다. 산출물을 `grep -o` 로 셀 때와 단위가 같으므로 두 수치를 직접 맞대 볼 수 있다.
 * 발췌(`text`)의 별표를 세지 않는 이유는, 발췌 폭이 인접한 위반을 삼키거나 잘라 내어
 * 개수가 폭에 따라 달라지기 때문이다 — 개수는 발췌가 아니라 항목 수로 센다.
 *
 * @param {string} markdown 프론트매터를 뺀 본문
 * @returns {{line:number, column:number, text:string}[]}
 */
export function findUnrenderedEmphasis(markdown) {
  const tree = fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const hits = [];

  // 파서가 강조로 인정한 것은 `strong` 노드가 되어 사라진다. `text` 노드에 별표가
  // 남아 있다는 것은 곧 「닫는 구분자로 인정받지 못했다」는 뜻이다. 코드 블록(`code`)과
  // 인라인 코드(`inlineCode`)는 별도 노드 종류라 이 순회에 들어오지 않는다 —
  // 제외하는 코드를 따로 쓰지 않는 이유가 이것이다.
  (function walk(node) {
    if (node.type === "text" && node.position?.start?.offset !== undefined) {
      // 🔴 노드의 `value` 가 아니라 **원문 슬라이스**를 본다. 파서는 이스케이프를 풀어
      // `\*\*` 를 value 에 별표로 넣으므로, value 를 보면 「일부러 별표를 보이려고 쓴 것」과
      // 「깨진 강조」가 구분되지 않는다. 원문에는 백슬래시가 남아 있어 저절로 갈린다.
      const from = node.position.start.offset;
      const raw = markdown.slice(from, node.position.end.offset);
      for (let i = raw.indexOf("**"); i >= 0; i = raw.indexOf("**", i + 2)) {
        const offset = from + i;
        const before = markdown.slice(0, offset);
        const line = before.split("\n").length;
        hits.push({
          line,
          column: offset - (before.lastIndexOf("\n") + 1) + 1,
          text: raw.slice(Math.max(0, i - EXCERPT), i + 2 + EXCERPT).replace(/\n/g, " "),
        });
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
// 확인한 것이며, `leaks` 는 「화면에 별표가 보이는가」를 뜻한다.
//
// ⚠️ 케이스의 md 문자열에는 별표가 리터럴로 들어간다. 이 검사기는 `content/blog` 만
// 스캔하고 `scripts/` 를 보지 않으므로 자기 자신에 매칭되지 않는다 — 스캔 대상을
// 넓히려거든 이 전제를 먼저 깨라.
// ---------------------------------------------------------------------------

const CASES = [
  { name: "① 닫는 별표 앞이 전각 낫표이고 뒤가 한글이면 렌더되지 않는다",
    md: "**「무엇을 요구할 수 있는가」**를 정한다", leaks: true },
  { name: "② 조사를 강조 안으로 넣으면 렌더된다 — ①의 교정형",
    md: "**「무엇을 요구할 수 있는가」를** 정한다", leaks: false },
  { name: "③ 닫는 별표 앞이 전각 겹따옴표여도 같다",
    md: "**“인용”**을 본다", leaks: true },
  { name: "④ 닫는 별표 앞이 반각 닫는괄호여도 같다",
    md: "**설명(주석)**을 본다", leaks: true },
  { name: "⑤ 닫는 별표 앞이 마침표여도 같다",
    md: "**끝.**이다", leaks: true },
  { name: "⑥ 앞이 한글이면 뒤에 조사가 붙어도 렌더된다 — 대다수가 여기 속한다",
    md: "**보통 낱말**을 본다", leaks: false },
  { name: "⑦ 앞이 구두점이어도 뒤가 공백이면 렌더된다",
    md: "**「낫표」** 뒤가 공백", leaks: false },
  { name: "⑧ 앞이 구두점이어도 뒤가 구두점이면 렌더된다",
    md: "**「낫표」**, 뒤가 구두점", leaks: false },
  { name: "⑨ 한국어에 한정되지 않는다 — 뒤가 라틴 문자여도 깨진다",
    md: "**word)**s tail", leaks: true },
  { name: "⑩ 강조 안쪽의 구두점은 무관하다 — 닫는 별표의 **바로 앞**만 본다",
    md: "**중간」의** 낫표", leaks: false },
  { name: "⑪ 코드 블록 안의 별표는 위반이 아니다 (산출물 grep 이 여기서 103회를 부풀렸다)",
    md: "```\n1. **입력 수집**: 어떤 데이터를\n```\n", leaks: false },
  { name: "⑫ 인라인 코드 안의 별표도 위반이 아니다",
    md: "`**「낫표」**를` 이라고 쓴다", leaks: false },
  { name: "⑬ 표 셀 안에서도 잡는다 — 이 리포의 본문 상당수가 표다",
    md: "| 항목 | 값 |\n| --- | --- |\n| **「가」**를 | 1 |\n", leaks: true },
  { name: "⑭ 제목 안에서도 잡는다",
    md: "## **「제목」**을 단다\n", leaks: true },
  { name: "⑮ 이스케이프한 별표는 강조가 아니므로 위반이 아니다",
    md: "\\*\\*리터럴 별표\\*\\*를 쓴다", leaks: false },
  { name: "⑯ 위반이 한 줄에 둘이면 둘 다 센다 — 줄 수가 아니라 출현 횟수다",
    md: "**「가」**를 하고 **「나」**를 한다", leaks: true, count: 4 },
  { name: "⑰ GFM 취소선이 여는 별표를 삼킨다 — 물결 둘 이상 + 닫는 별표가 줄 끝",
    md: "가~나 계보, 다 적용. **라~마 안 보인다.**", leaks: true, count: 2 },
  { name: "⑱ 줄 번호가 맞는다 — 위반 앞의 빈 줄과 문단을 센다",
    md: "머리말\n\n둘째 문단\n\n**「가」**를 본다", leaks: true, count: 2, firstLine: 5 },
  { name: "⑲ 🔴 줄 번호가 **파일 기준**이다 — 프론트매터를 지우면 그만큼 어긋난다",
    md: "---\ntitle: 가\ncategory: 나\n---\n\n**「가」**를 본다",
    strip: true, leaks: true, count: 2, firstLine: 6 },
];

/**
 * 대상 수집을 **자식 프로세스로 실제로 돌려** 종료 코드를 본다.
 *
 * 🔴 순수 함수만 검사하면 게이트를 검사한 것이 아니다. `resolveGivenFiles` 가 거부 목록을
 * 옳게 채워도 `main` 이 그것을 읽지 않으면 검사기는 여전히 조용히 통과한다 — 실제로
 * 그랬다. `git ls-files` 가 한글 경로를 따옴표로 감싸 내보내는 바람에 문서 54개 중 4개가
 * `.md` 로 끝나지 않게 됐고, 검사기는 **50개만 스캔하고 종료 코드 0** 을 냈다.
 * 「대상 없음」은 막혔지만 「대상 일부 누락」은 뚫려 있었다.
 *
 * 검사 대상은 리터럴이 아니라 **런타임에 만든 임시 파일**이다. 이름을 소스에 적으면
 * 그 문자열이 존재하게 되어 케이스가 자기 자신에 걸린다.
 */
function targetSelfTest() {
  const dir = mkdtempSync(join(tmpdir(), "check-markup-"));
  const clean = join(dir, "clean.md");
  const notMarkdown = join(dir, "clean.txt");
  writeFileSync(clean, "**정상**인 강조 하나가 있다.\n", "utf8");
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
    { name: "⓵ .md 하나만 넘기면 통과한다 — 거부 게이트가 거짓 양성을 내지 않는다",
      args: [clean], want: 0 },
    { name: "⓶ 🔴 .md 가 아닌 경로가 섞이면 종료 코드 2 — 조용한 누락을 막는다",
      args: [clean, notMarkdown], want: 2 },
    { name: "⓷ 넘어온 경로가 전부 .md 가 아니면 종료 코드 2 — 대상 없음과 같은 취급",
      args: [notMarkdown], want: 2 },
    { name: "⓸ 🔴 없는 .md 를 넘기면 종료 코드 2 — ENOENT 스택으로 죽지 않는다",
      args: [clean, join(dir, "없는파일.md")], want: 2 },
  ];

  // ⓹ 는 종료 코드가 아니라 **수집 결과**를 본다. 위 넷은 거부 게이트가 작동하는지만
  // 보므로, 수집이 애초에 어긋난 경로를 만들어 내는 것은 잡지 못한다.
  const docs = collectDocs();
  const notAscii = docs.filter((p) => /[^\x20-\x7E]/.test(p));
  const notMd = docs.filter((p) => !p.endsWith(".md"));
  cases.push({
    name: "⓹ 🔴 수집한 경로가 전부 .md 로 끝난다 — core.quotePath 가 한글 경로를 감싸지 않는다",
    // 🔴 비-ASCII 경로가 없으면 이 케이스는 아무것도 지키지 않는다. 통과로 세면 안 된다 —
    // 지키는 것이 없는 케이스가 PASS 를 내는 것이 자기 검사가 헛도는 전형이다.
    manual: notAscii.length > 0 && notMd.length === 0,
    detail: notAscii.length === 0
      ? "  (비-ASCII 경로가 없어 대조할 것이 없다)"
      : `  (비-ASCII ${notAscii.length}개 중 .md 로 끝나지 않는 것 ${notMd.length}개)`,
  });

  let pass = 0;
  for (const c of cases) {
    if (c.manual !== undefined) {
      console.log(`  ${c.manual ? "PASS" : "FAIL"}  ${c.name}${c.manual ? "" : c.detail}`);
      if (c.manual) pass++;
      continue;
    }
    const got = run(c.args);
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
    const hits = findUnrenderedEmphasis(c.strip ? stripFrontmatter(c.md) : c.md);
    const n = hits.length;
    let ok = c.count !== undefined ? n === c.count : (n > 0) === c.leaks;
    let detail = ok ? "" : `  (기대 ${c.count !== undefined ? c.count : c.leaks ? "1건 이상" : "0건"} · 실제 ${n})`;
    if (ok && c.firstLine !== undefined && hits[0]?.line !== c.firstLine) {
      ok = false;
      detail = `  (줄 기대 ${c.firstLine} · 실제 ${hits[0]?.line})`;
    }
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.name}${detail}`);
    if (ok) pass++;
  }
  const t = targetSelfTest();
  pass += t.pass;
  const total = CASES.length + t.total;

  console.log(`\n마크업 검사기 자기 검사: ${pass}/${total}`);
  if (pass !== total) process.exit(1);
  console.log("검사기가 작동한다. 본 스캔의 0 은 결론이다.\n");
}

// ---------------------------------------------------------------------------
// 본 스캔
// ---------------------------------------------------------------------------

/**
 * 프론트매터를 **지우지 않고 같은 수의 빈 줄로 바꾼다.**
 *
 * 🔴 지워 버리면 보고하는 줄 번호가 프론트매터 길이만큼 어긋난다. 실측으로 프론트매터가
 * 11줄인 편에서 실제 48행의 위반이 **37행**으로 보고됐고, 고치러 간 사람은 엉뚱한 줄을
 * 연다. 위반이 프론트매터 안에 있을 수는 없으므로 **내용**은 버려도 되지만 **줄 수**는
 * 버리면 안 된다.
 */
export function stripFrontmatter(text) {
  return text.replace(
    /^---\r?\n[\s\S]*?\r?\n---\r?\n/,
    (matched) => "\n".repeat(matched.split("\n").length - 1),
  );
}

/**
 * `--files` 로 넘어온 경로를 스캔 대상으로 바꾼다.
 *
 * 반환의 `rejected` 는 `.md` 가 아니어서 대상이 되지 못한 경로다.
 */
export function resolveGivenFiles(files) {
  const targets = [];
  const rejected = [];
  for (const path of files) {
    // 확장자가 아니어서 빠지든 파일이 없어서 빠지든, 부른 쪽이 명시한 경로가 대상이 되지
    // 못한 것은 마찬가지다. `--docs` 의 수집 단계는 없는 파일을 미리 걸러 여기 오지 않는다 —
    // 거기서는 인덱스와 작업 트리의 불일치가 정상이지만, 여기서는 부른 쪽의 주장이 틀린 것이다.
    if (!path.endsWith(".md") || !existsSync(path)) {
      rejected.push(path);
      continue;
    }
    const parts = path.replace(/\\/g, "/").split("/");
    targets.push({ id: parts.slice(-2).join("/").replace(/\.md$/, ""), path });
  }
  return { targets, rejected };
}

/**
 * 발행본 밖의 리포 문서를 모은다 — `content/blog/` 를 뺀, git 이 추적하는 모든 `.md`.
 *
 * 🔴 **수집을 호출부에 맡기지 않는다.** 훅과 CI 가 각자 `git ls-files` 파이프라인을 쓰면
 * 같은 함정을 두 곳에서 되풀이한다. 실제로 `core.quotePath` 의 기본값이 한글 파일명을
 * `"pages/…\355\227\210…md"` 로 감싸 내보내는 바람에 경로가 `.md` 로 끝나지 않게 되고,
 * 4개가 조용히 빠졌다. 끄는 자리는 한 곳이어야 한다.
 *
 * `.superpowers/sdd/` 는 따로 걸러 내지 않는다. 그 아래 `.gitignore` 가 `*` 로 막고 있어
 * `ls-files` 에 애초에 나오지 않기 때문이다 — 제외 목록을 gitignore 와 검사기 두 곳에
 * 두면 갈라지고, 갈라진 쪽은 아무도 갱신하지 않는다.
 */
export function collectDocs() {
  const out = execFileSync(
    "git",
    ["-c", "core.quotePath=false", "ls-files", "--", "*.md"],
    { encoding: "utf8" },
  );
  const tracked = out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("content/blog/"));

  // 🔴 인덱스에 있어도 작업 트리에 없을 수 있다 — 파일을 지우고 아직 스테이징하지 않은
  // 흔한 상태다. 거르지 않으면 `readFileSync` 가 ENOENT 스택 트레이스로 죽는데, 훅에서
  // 그것을 본 사람은 검사기가 고장 났다고 읽고 `--no-verify` 로 넘어간다.
  //
  // 조용히 버리지는 않는다. 검사하지 못한 것이 있으면 몇 개인지 말한다 — 이 검사기가
  // 막으려는 것이 바로 「말없이 줄어든 대상」이다.
  //
  // ⚠️ **이 필터에는 자기 검사가 없다.** 상황을 만들려면 리포의 인덱스에 없는 파일을
  // 올려야 하는데, 자기 검사가 남의 스테이징 상태를 건드리는 편이 더 나쁘다. `--files`
  // 쪽의 같은 방어는 케이스 ⓸ 와 뮤턴트 M8 이 지키므로 회귀는 그쪽에서 잡힌다.
  const present = tracked.filter((path) => existsSync(path));
  const gone = tracked.length - present.length;
  if (gone > 0) {
    console.error(`⚠️ 추적 중이지만 작업 트리에 없는 문서 ${gone}개를 대상에서 뺐다 (지운 뒤 스테이징하지 않은 파일).`);
  }
  return present;
}

function scan({ category = null, files = null } = {}) {
  const root = join(process.cwd(), "content", "blog");
  let targets = [];
  let rejected = [];

  if (files) {
    // 훅이 넘긴 경로만 본다. 옛 편 306건이 남아 있는 동안 전량 검사를 훅에 걸면
    // 콘텐츠 커밋이 전부 막히고, 그러면 --no-verify 로 우회하게 되어 훅이 무력해진다.
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
  for (const target of targets) {
    const hits = findUnrenderedEmphasis(stripFrontmatter(readFileSync(target.path, "utf8")));
    if (hits.length) rows.push({ id: target.id, hits });
  }
  return { rows, scanned: targets.length, rejected };
}
// ---------------------------------------------------------------------------
// 직접 실행할 때만 스캔한다.
//
// 🔴 가드가 없으면 이 파일을 `import` 하는 쪽에서 본 스캔이 통째로 돌아 버린다 —
// 실측으로 분포를 세려고 함수 둘을 가져다 쓴 스크립트가 전량 스캔 출력 35KB 를
// 뒤집어썼다. 검사기는 **실행 파일이자 모듈**이며, 후자를 잊으면 재사용이 막힌다.
// ---------------------------------------------------------------------------

function main() {

  if (process.argv.includes("--self-test")) {
    selfTest();
    process.exit(0);
  }

  const categoryIdx = process.argv.indexOf("--category");
  const category = categoryIdx >= 0 ? process.argv[categoryIdx + 1] : null;
  const filesIdx = process.argv.indexOf("--files");
  let files = filesIdx >= 0 ? process.argv.slice(filesIdx + 1).filter((a) => !a.startsWith("--")) : null;

  // `--docs` 는 대상을 스스로 모은 뒤 `--files` 와 같은 경로를 탄다. 위 거부 게이트를
  // 함께 지나므로, 수집이 어긋나면 여기서도 멎는다.
  if (process.argv.includes("--docs")) files = collectDocs();

  const { rows, scanned, rejected } = scan({ category, files });

  // 🔴 **일부 누락도 대상 없음과 같은 취급이다.** 아래 `scanned === 0` 가드는 「하나도 못
  // 받았다」만 막았고, 「받은 것 중 일부를 조용히 버렸다」는 뚫려 있었다. 실측으로
  // `git ls-files` 가 한글 경로를 따옴표로 감싸 내보내는 바람에 문서 54개 중 4개가 `.md`
  // 로 끝나지 않게 됐는데, 검사기는 50개만 스캔하고 **종료 코드 0** 을 냈다. 부른 쪽은
  // 전량을 검사했다고 믿는다 — 거짓 0 의 가장 다루기 어려운 형태다.
  //
  // 호출부에서 `git -c core.quotePath=false` 를 쓰면 이 상황이 오지 않지만, 그것을
  // 잊었을 때 조용히 통과하는 대신 여기서 멎어야 한다.
  if (rejected.length) {
    console.error(`🔴 넘어온 경로 ${rejected.length}개가 스캔에서 빠졌다 (.md 가 아니거나 파일이 없다). 일부만 검사한 결과는 0건이 아니다.`);
    for (const path of rejected.slice(0, 5)) console.error(`   ${path}`);
    if (rejected.length > 5) console.error(`   … 외 ${rejected.length - 5}개`);
    console.error("경로가 따옴표로 감싸여 있다면 `git -c core.quotePath=false ls-files` 로 뽑아라.");
    process.exit(2);
  }

  // 🔴 대상이 없으면 「0건」이 아니라 「모름」이다. 둘을 같은 종료 코드로 내면 오타 하나가
  // 통과로 보인다 — 이 리포에서 실제로 겪은 거짓 0 의 형태다.
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
      console.log(`  ${String(hit.line).padStart(4)}:${String(hit.column).padEnd(4)} ${hit.text}`);
    }
  }

  console.log(`\n스캔 ${scanned}개 파일 · 위반 ${rows.length}개 파일 · ${total}회`);
  if (total > 0) {
    console.log("\n교정: 닫는 별표 앞의 구두점을 강조 안에 두거나, 뒤의 조사를 강조 안으로 옮긴다.");
    process.exit(1);
  }
  console.log("렌더되지 않는 강조가 없다.");

}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
