#!/usr/bin/env node
// 금칙어 스캔 — 익명화 정책을 어긴 낱말이 발행본에 남았는지 찾는다.
//
// 왜 필요한가: 규칙이 문서로만 있으면 표기형 하나가 빠져도 드러나지 않는다.
// 실제로 목록이 `FASTCAMPUS`·`teddynote` 라틴 표기로만 돼 있어 한글 표기형
// 「패스트캠퍼스」·「테디노트」가 통째로 빠졌고, 그 상태로 돌린 검사가
// 「0건」을 반환했다. 그 0건이 CHANGELOG에 「이 한 편에만 7건, 다른 4개 카테고리 0건」으로
// 기록됐지만 실제로는 다른 두 편에 6건이 더 있었다.
// ⇒ 거짓 음성은 「못 찾음」이 아니라 「없음을 확인함」으로 기록된다. 그래서 검사기가 필요하다.
//
// 사용법:
//   node scripts/check-forbidden.mjs --self-test     검사기 작동 증명 (본 스캔 전에 반드시)
//   node scripts/check-forbidden.mjs                 발행본 스캔 (content/blog) — 판정한다
//   node scripts/check-forbidden.mjs --all           조사 모드 — 리포 전체를 훑되 판정하지 않는다
//   node scripts/check-forbidden.mjs <파일...>       지정 파일만
//
// 종료 코드: HARD 위반이 1건이라도 있으면 1, 아니면 0. SOFT는 보고만 하고 막지 않는다.
//            --all 은 언제나 0이다 — 아래 「적용 범위」 참조.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// ── 금칙어 ────────────────────────────────────────────────────────
//
// HARD — 고유명사. 문맥과 무관하게 위반이다. 발견되면 빌드를 막는다.
//   ⚠️ 라틴 표기를 넣을 때는 한글 표기형을 반드시 같이 넣어라. 이 검사기가 존재하는 이유다.
const HARD = [
  // 회사·서비스
  "야나두", "yanadoo",
  "히츠",
  "티빙", "TVING",
  "BTV", "B tv",
  "커머스개발", "커머스 개발",
  // 인명·계정
  "허우용", "teddylee", "teddynote", "테디노트",
  // 교육·플랫폼
  "FASTCAMPUS", "패스트캠퍼스",
  // 사내 시스템
  "argus", "아르고스",
  // 직함
  "실장",
];

// SOFT — 취지 낱말. 정당한 문맥이 있을 수 있어 기계가 판정하지 못한다.
//   예: `recruiter` 에이전트 설명의 「면접 질문」·「이력서」는 채용 담당 에이전트의 기능이지
//       글쓴이의 구직 활동이 아니다. 보고만 하고 사람이 판정한다.
const SOFT = [
  "면접", "커닝페이퍼", "암기용", "화이트보드", "이력서",
  "강의", "수강", "예상 질문",
];

// 검사하지 않는 것 — 못 하는 일을 하는 척하지 않는다.
//   1인칭(「나」·「내」·「저는」)은 grep으로 분리되지 않는다. 양방향으로 실패한다.
//     거짓 양성: 「동시성 문제가」·「메이저는」  /  거짓 음성: 「내 검색 커리어」
//     확장 패턴 `내 [가-힣]{2,6}` 은 「인덱스 내 문서」를 대량 오탐한다.
//   ⇒ 1인칭은 사람이 매칭 줄을 열어 읽는 수밖에 없다. 목록에 넣으면 오탐에 묻혀
//      진짜 위반이 보이지 않게 되므로 넣지 않는다.

// ── 스캔 ──────────────────────────────────────────────────────────
const SKIP_DIRS = new Set(["node_modules", ".next", "out", "dist", "build", ".git"]);
const TEXT_EXT = /\.(md|mdx|ts|tsx|js|mjs|json)$/;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(join(dir, e.name), out);
    } else if (TEXT_EXT.test(e.name)) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

// 프론트매터를 제외하지 않는다 — post 객체가 통째로 props로 넘어가 __NEXT_DATA__ 에
// 직렬화되므로, 프론트매터 값도 페이지 소스에 그대로 공개된다.
// 라틴 낱말은 단어 경계를 요구한다 — 요구하지 않으면 "heats"가 "Cheatsheet"에 걸린다(실제로 걸렸다).
// 한글 낱말은 경계를 요구하지 않는다 — 조사가 붙어 「테디노트의」처럼 이어지므로 경계가 없다.
// ⇒ 한 규칙으로 두 표기 체계를 다루려 한 것이 오탐의 근원이었다.
function isAsciiWord(w) {
  for (const c of w) if (c.charCodeAt(0) > 127) return false;
  return true;
}
function isWordChar(c) {
  if (c === undefined) return false;
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9") || c === "_";
}
function scanText(text, words) {
  const hits = [];
  const lines = text.split("\n");
  for (const w of words) {
    const needle = w.toLowerCase();
    const boundary = isAsciiWord(w);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      let at = 0;
      while ((at = lower.indexOf(needle, at)) !== -1) {
        const before = at === 0 ? undefined : line[at - 1];
        const after = line[at + needle.length];
        if (!boundary || (!isWordChar(before) && !isWordChar(after))) {
          hits.push({ word: w, line: i + 1, text: line.replace(/\r$/, "").trim() });
          break; // 한 줄에 같은 낱말이 여러 번 있어도 한 번만 보고한다
        }
        at += 1;
      }
    }
  }
  return hits;
}

// ── self-test ─────────────────────────────────────────────────────
// F3의 원인 두 가지(한글 표기형 누락 · 대소문자)를 정확히 겨눈 케이스를 넣는다.
function selfTest() {
  const cases = [
    { name: "한글 표기형을 잡는가",           text: "출처는 테디노트 RAG 비법노트다.",              expect: ["테디노트"] },
    { name: "라틴 소문자를 잡는가",           text: "see fastcampus curriculum",                    expect: ["FASTCAMPUS"] },
    { name: "한글 표기형(교육 플랫폼)",       text: "패스트캠퍼스 강의에서",                        expect: ["패스트캠퍼스", "강의"] },
    { name: "프론트매터도 검사하는가",        text: '---\nsource: "테디노트 RAG 비법노트"\n---\n본문', expect: ["테디노트"] },
    { name: "라틴이 다른 낱말에 묻히지 않는가", text: "7 커맨드 Cheatsheet를 만든다",          expect: [] },
    { name: "한글은 조사가 붙어도 잡는가",     text: "테디노트의 자료를 보면",                 expect: ["테디노트"] },
    { name: "깨끗한 문장에 오탐이 없는가",    text: "Elasticsearch 색인 파이프라인을 설계한다.",    expect: [] },
    { name: "SOFT를 HARD로 승격하지 않는가",  text: "recruiter 에이전트는 면접 질문을 만든다.",     expect: ["면접"] },
  ];
  let pass = 0, fail = 0;
  console.log("=== self-test — 검사기가 실제로 잡는지 증명한다 ===\n");
  for (const c of cases) {
    const found = new Set(scanText(c.text, [...HARD, ...SOFT]).map((h) => h.word));
    const missing = c.expect.filter((w) => !found.has(w));
    const extra = [...found].filter((w) => !c.expect.includes(w));
    const ok = missing.length === 0 && extra.length === 0;
    console.log(`  ${ok ? "✅" : "❌"} ${c.name}`);
    if (!ok) {
      if (missing.length) console.log(`       놓친 낱말: ${missing.join(", ")}`);
      if (extra.length) console.log(`       오탐: ${extra.join(", ")}`);
    }
    ok ? pass++ : fail++;
  }
  console.log(`\n통과 ${pass} / 실패 ${fail}`);
  return fail === 0 ? 0 : 1;
}

// ── 적용 범위 ─────────────────────────────────────────────────────
//
// 익명화 정책의 대상은 **블로그 발행본**(content/blog)뿐이다. 다음은 대상이 아니다:
//   · pages/index.tsx · data/portfolio.ts · pages/product-lead*  — 포트폴리오다.
//     실명·회사명을 담는 것이 위반이 아니라 목적이다.
//   · docs/ · HANDOFF.md · CHANGELOG.md  — 내부 문서다. 금칙어 목록 자체를 담고 있다.
//
// 이 구분이 곧 정책이다. 범위를 넓히면 위반 490건이 보고되는데 그중 발행본은 0건이라,
// 검사기가 늑대소년이 되고 진짜 위반이 소음에 묻힌다.
// ⇒ --all 은 판정하지 않는다. 어디에 무엇이 있는지 보여주는 조사 도구이고, 판정은 사람이 한다.

// ── main ──────────────────────────────────────────────────────────
const argv = process.argv.slice(2);

if (argv.includes("--self-test")) process.exit(selfTest());

const surveyOnly = argv.includes("--all");

let files;
if (surveyOnly) files = walk(process.cwd());
else if (argv.length > 0) files = argv.filter((a) => !a.startsWith("--"));
else files = walk(join(process.cwd(), "content", "blog"));

// 이 스크립트 자신은 금칙어 목록을 담고 있으므로 검사 대상에서 뺀다.
const SELF = join(process.cwd(), "scripts", "check-forbidden.mjs");
files = files.filter((f) => join(process.cwd(), relative(process.cwd(), f)) !== SELF);

let hardTotal = 0, softTotal = 0;
const hardFiles = [], softFiles = [];

for (const f of files) {
  let text;
  try { text = readFileSync(f, "utf8"); } catch { continue; }
  const hard = scanText(text, HARD);
  const soft = scanText(text, SOFT);
  if (hard.length) { hardFiles.push([f, hard]); hardTotal += hard.length; }
  if (soft.length) { softFiles.push([f, soft]); softTotal += soft.length; }
}

const rel = (f) => relative(process.cwd(), f).split(String.fromCharCode(92)).join("/");

if (hardFiles.length) {
  console.log("\n❌ HARD — 문맥과 무관한 위반. 반드시 고쳐라\n");
  for (const [f, hits] of hardFiles)
    for (const h of hits) console.log(`  ${rel(f)}:${h.line}  [${h.word}]  ${h.text.slice(0, 110)}`);
}

if (softFiles.length) {
  console.log("\n⚠️ SOFT — 정당한 문맥일 수 있다. 줄을 열어 사람이 판정하라\n");
  for (const [f, hits] of softFiles)
    for (const h of hits) console.log(`  ${rel(f)}:${h.line}  [${h.word}]  ${h.text.slice(0, 110)}`);
}

console.log(`\n검사 파일 ${files.length}개 · HARD ${hardTotal}건 · SOFT ${softTotal}건`);
console.log("※ 1인칭은 이 검사기가 판정하지 않는다 — grep으로 분리되지 않는다(스크립트 주석 참조)");

if (surveyOnly) {
  console.log("※ --all 은 조사 모드다. 포트폴리오·내부 문서는 정책 대상이 아니므로 판정하지 않는다(종료 코드 0)");
  process.exit(0);
}
process.exit(hardTotal > 0 ? 1 : 0);
