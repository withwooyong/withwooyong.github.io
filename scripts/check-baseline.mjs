// scripts/check-baseline.mjs
//
// GC-6 — 블로그가 아닌 페이지의 빌드 산출물이 바뀌지 않았음을 확인한다.
//
// 사용법:
//   node scripts/check-baseline.mjs            검사한다. 차이가 있으면 종료 코드 1
//   node scripts/check-baseline.mjs --update   기준선을 갱신한다 (사람이 판단한 뒤에만)
//
// ⚠️ 기준선 갱신을 자동화하면 이 검사는 아무것도 막지 못한다. --update 는 사람만 실행한다.
//
// buildId 처리: Next.js 는 빌드마다 새 buildId 를 만들고 그것이 HTML 에 박힌다.
// 그대로 해시하면 내용이 같아도 매번 다르므로, buildId 를 고정 문자열로 치환한 뒤 해시한다.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT = "out";
const BASELINE = path.join("scripts", "baseline.json");

/** 블로그 산출물은 이 검사의 대상이 아니다 — 글을 더하면 당연히 바뀐다. */
function isTarget(rel) {
  const norm = rel.split(path.sep).join("/");
  return norm.endsWith(".html") && !norm.startsWith("blog/");
}

function walk(dir, base, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_next") continue; // 청크는 블로그 추가로도 바뀐다
      walk(full, base, acc);
    } else {
      const rel = path.relative(base, full);
      if (isTarget(rel)) acc.push(rel.split(path.sep).join("/"));
    }
  }
  return acc;
}

function hashOf(file) {
  let text = fs.readFileSync(file, "utf8");
  const m = text.match(/"buildId":"([^"]+)"/);
  if (m) text = text.split(m[1]).join("<BUILD_ID>");
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function collect() {
  if (!fs.existsSync(OUT)) {
    console.error("\n❌ out/ 이 없다. 먼저 `npm run build` 를 돌려라.");
    console.error("   안 만든 것을 「바뀐 것이 없음」으로 세지 않는다.");
    process.exit(2);
  }
  const files = walk(OUT, OUT, []).sort();
  const map = {};
  for (const rel of files) map[rel] = hashOf(path.join(OUT, rel));
  return map;
}

const current = collect();
const update = process.argv.includes("--update");

if (update) {
  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + "\n", "utf8");
  console.log(`✅ 기준선 갱신 — ${Object.keys(current).length}개 파일`);
  console.log(`   ${BASELINE} 를 커밋해야 CI가 같은 기준으로 본다.`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error(`\n❌ ${BASELINE} 이 없다. 먼저 --update 로 기준선을 만들어라.`);
  process.exit(2);
}

const base = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
const changed = [];
const added = [];
const removed = [];

for (const [rel, h] of Object.entries(current)) {
  if (!(rel in base)) added.push(rel);
  else if (base[rel] !== h) changed.push(rel);
}
for (const rel of Object.keys(base)) if (!(rel in current)) removed.push(rel);

const total = changed.length + added.length + removed.length;

if (total === 0) {
  console.log(`✅ GC-6 — 비블로그 산출물 ${Object.keys(current).length}개 불변`);
  process.exit(0);
}

console.error(`\n❌ GC-6 위반 — 비블로그 산출물이 바뀌었다 (${total}건)\n`);
for (const rel of changed) console.error(`   변경  ${rel}`);
for (const rel of added) console.error(`   추가  ${rel}`);
for (const rel of removed) console.error(`   삭제  ${rel}`);
console.error(`\n의도한 변경이면 \`npm run check-baseline:update\` 로 기준선을 갱신하고 커밋하라.`);
process.exit(1);
