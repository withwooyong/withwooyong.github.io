#!/usr/bin/env node
// HANDOFF.md 가 다시 쌓이지 않게 막는다.
//
// 🔴 배경 — `/handoff` 는 세션마다 「이번 세션이 한 일」 절을 맨 위에 더하고, 앞 세션 절은
//    「직전」·「앞선」으로 이름만 바꿔 남긴다. 지우는 단계가 없어 2026-09-17 에 2,798줄 ·
//    260 KB 가 됐다. 문서에 「덮어써라」고 적는 것만으로는 스킬의 지시와 부딪치면 지켜지지
//    않으므로 커밋과 CI 에서 판정한다.
//
// 판정 셋 (규칙의 정본은 CLAUDE.md 「작업 흐름」의 기록 행이다):
//   ① 줄 수가 상한(LIMIT) 이하다.
//   ② H2 절이 SECTIONS 넷과 **이름 · 순서까지** 같다. 절을 더하는 것이 쌓이는 첫걸음이다.
//   ③ 제목에 「세션이 한 일」이 없다. `/handoff` 가 쌓을 때 쓰는 제목이다.
//
// 판정(decideHandoff)과 수집(main)을 나눈다. 판정이 순수 함수라야 자기 검사가 파일 없이
// 돌고, 뮤테이션이 그 자리를 되살릴 수 있다.
//
// 사용법:
//   node scripts/check-handoff.mjs              HANDOFF.md 를 판정한다 (위반 1 · 파일 없음 2)
//   node scripts/check-handoff.mjs --self-test  검사기가 실제로 잡는지 증명한다
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const HANDOFF = join(ROOT, "HANDOFF.md");

export const LIMIT = 150;
export const SECTIONS = ["지금 상태", "남은 작업", "다시 읽을 것", "도구 함정"];
const SESSION_LOG = /세션이 한 일/;

/** 줄로 나눈다. CRLF 도 한 줄이고, 파일 끝의 개행은 줄을 하나 더 만들지 않는다. */
export function splitLines(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** 코드 블록 밖의 제목만 뽑는다. 코드 블록 안의 `## ` 는 예시일 뿐 절이 아니다. */
export function extractHeadings(lines) {
  const headings = [];
  let fence = null;
  for (const line of lines) {
    const f = line.match(/^\s*(`{3,}|~{3,})/);
    if (f) {
      if (fence === null) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) headings.push({ level: h[1].length, text: h[2] });
  }
  return headings;
}

export function decideHandoff(text, limit = LIMIT) {
  const problems = [];
  const lines = splitLines(text);
  if (lines.length > limit) {
    problems.push(`줄 수 ${lines.length} — 상한 ${limit}줄을 넘었다. 쌓지 말고 덮어써라`);
  }

  const headings = extractHeadings(lines);
  const h2 = headings.filter((h) => h.level === 2).map((h) => h.text);
  if (JSON.stringify(h2) !== JSON.stringify(SECTIONS)) {
    problems.push(`H2 절이 정해진 넷과 다르다 — 지금: [${h2.join(" · ")}] / 정해진 것: [${SECTIONS.join(" · ")}]`);
  }

  for (const h of headings) {
    if (SESSION_LOG.test(h.text)) problems.push(`세션 기록 제목이 있다 — 「${h.text}」. 세션 기록은 커밋 메시지에 남긴다`);
  }

  return { lines: lines.length, problems };
}

export function main(path = HANDOFF) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.error(`🔴 ${path} 를 읽지 못했다 — 대상 없음은 통과가 아니다`);
    return 2;
  }
  const { lines, problems } = decideHandoff(text);
  if (problems.length === 0) {
    console.log(`✅ HANDOFF ${lines}줄 / 상한 ${LIMIT}줄 · 절 ${SECTIONS.length}개 일치`);
    return 0;
  }
  console.error(`🔴 HANDOFF 위반 ${problems.length}건`);
  for (const p of problems) console.error(`  ${p}`);
  return 1;
}

// ─────────────────────────────────────────────────────────────

function selfTest() {
  const body = (extra = []) =>
    ["# HANDOFF", "", "## 지금 상태", "a", "## 남은 작업", "b", ...extra, "## 다시 읽을 것", "c", "## 도구 함정", "d"];
  const pad = (lines, total) => [...lines, ...Array(total - lines.length).fill("x")];
  const ok = (r) => r.problems.length === 0;
  const has = (r, word) => r.problems.some((p) => p.includes(word));

  const cases = [
    ["① 정해진 네 절의 짧은 판은 통과한다", ok(decideHandoff(body().join("\n") + "\n"))],
    ["② 🔴 상한을 한 줄 넘으면 잡는다", has(decideHandoff(pad(body(), LIMIT + 1).join("\n") + "\n"), "상한")],
    ["③ 상한과 정확히 같으면 통과한다 — 파일 끝 개행이 줄을 더하지 않는다", ok(decideHandoff(pad(body(), LIMIT).join("\n") + "\n"))],
    ["④ 🔴 CRLF 파일도 같은 판정이다 — 제목 끝의 CR 이 절 이름을 바꾸지 않는다", ok(decideHandoff(body().join("\r\n") + "\r\n"))],
    ["⑤ 절이 하나 빠지면 잡는다", has(decideHandoff(body().filter((l) => l !== "## 도구 함정").join("\n")), "H2")],
    ["⑥ 🔴 절을 하나 더하면 잡는다 — 쌓이는 첫걸음이다", has(decideHandoff(body(["## 이번 주 메모", "e"]).join("\n")), "H2")],
    ["⑦ 절의 순서가 바뀌면 잡는다", has(decideHandoff(["## 남은 작업", "## 지금 상태", "## 다시 읽을 것", "## 도구 함정"].join("\n")), "H2")],
    ["⑧ 코드 블록 안의 `## ` 는 절로 세지 않는다", ok(decideHandoff(body(["```", "## 예시 절", "```"]).join("\n")))],
    ["⑨ 🔴 「이번 세션이 한 일」 제목을 잡는다 — H3 여도 잡는다", has(decideHandoff(body(["### 이번 세션이 한 일", "e"]).join("\n")), "세션 기록")],
    ["⑩ 🔴 파일이 없으면 종료 코드 2 — 대상 없음은 통과가 아니다", main(join(ROOT, "HANDOFF-없는-파일.md")) === 2],
    ["⑪ 리포의 HANDOFF.md 를 실제로 읽어 줄을 센다 — 0줄이면 대상을 못 본 것이다", decideHandoff(readFileSync(HANDOFF, "utf8")).lines > 0],
  ];

  let pass = 0;
  for (const [name, passed] of cases) {
    console.log(`  ${passed ? "PASS" : "FAIL"}  ${name}`);
    if (passed) pass += 1;
  }
  console.log(`\nHANDOFF 검사기 자기 검사: ${pass}/${cases.length}`);
  return pass === cases.length ? 0 : 1;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  process.exit(process.argv[2] === "--self-test" ? selfTest() : main());
}
