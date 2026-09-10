#!/usr/bin/env node
// decks.json 을 읽어 발표본을 out/slides/<slug>/ 로 빌드한다.
//
// 목록을 워크플로에 박지 않고 파일 하나에 두는 이유는, 다섯째 발표본을 만들 때
// 빌드에서 조용히 빠지는 것을 막기 위해서다. 같은 목록을 check-slides 가 읽으므로
// 목록에 더하고 빌드에 안 더하는 실수도 드러난다.
//
// slidev 의 --out 은 slidev-poc 을 기준으로 삼으므로 절대 경로를 넘긴다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const POC = path.join(REPO, "slidev-poc");
const DECKS = path.join(POC, "decks.json");

let decks;
try {
  decks = JSON.parse(fs.readFileSync(DECKS, "utf8"));
} catch {
  console.error(`\n❌ ${DECKS} 를 읽지 못했다.\n`);
  process.exit(2);
}

if (!Array.isArray(decks) || decks.length === 0) {
  console.error("\n❌ 발표본 목록이 비었다. 빌드할 것이 없다.\n");
  process.exit(2);
}

// out/ 이 없으면 next build 를 안 돌린 것이다. 슬라이드만 있는 out/ 을 만들지 않는다 —
// 그대로 배포되면 본체가 통째로 사라진다.
if (!fs.existsSync(path.join(REPO, "out"))) {
  console.error("\n❌ out/ 이 없다. `npm run build` 를 먼저 돌려라.\n");
  process.exit(2);
}

for (const deck of decks) {
  const dest = path.join(REPO, "out", "slides", deck.slug);
  console.log(`\n▶ ${deck.source} → out/slides/${deck.slug}/`);
  execFileSync(
    "npx",
    ["slidev", "build", deck.source, "--base", `/slides/${deck.slug}/`, "--out", dest],
    { cwd: POC, stdio: "inherit", shell: process.platform === "win32" }
  );
}

console.log(`\n✅ 발표본 ${decks.length}개를 out/slides 에 빌드했다.`);
