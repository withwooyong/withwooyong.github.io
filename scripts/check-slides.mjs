#!/usr/bin/env node
// 발표본 산출물이 out/slides/ 에 실제로 들어갔는지 판정한다.
//
// 🔴 이 검사기가 없으면 복사가 통째로 빠져도 CI 는 초록이 난다. slidev build 의 성공은
//    「빌드가 됐다」만 말할 뿐 「배포될 자리에 있다」를 말하지 않는다.
//
// 판정(decideSlides)과 수집(collect)을 나눈다. 판정이 순수 함수라야 산출물 없이 자기 검사가
// 돌고, 뮤테이션이 그 자리를 되살릴 수 있다. 가드가 main 에 흩어져 있으면 통째로 지워도
// 케이스가 전부 통과한다.
import fs from "node:fs";
import path from "node:path";

const DECKS = path.join("slidev-poc", "decks.json");
const OUT_SLIDES = path.join("out", "slides");

/**
 * @param {{slug: string, source: string}[]} decks 발표본 목록
 * @param {null | Record<string, {index: boolean, assets: number}>} present
 *        out/slides 아래에서 관측한 것. 디렉터리 자체가 없으면 null 이다.
 * @returns {{code: 0|1|2, reason: string, missingIndex: string[], emptyAssets: string[]}}
 *
 * ⚠️ 종료 코드 2 를 내는 두 자리에 `reason` 을 붙인다. 반환문이 글자까지 같으면
 *    뮤테이션이 그 자리를 지목하지 못하고, 케이스도 둘을 구분하지 못한다.
 */
function decideSlides(decks, present) {
  // 대상이 없는 것을 「위반 없음」으로 세지 않는다. 0개 통과는 통과가 아니다.
  if (!Array.isArray(decks) || decks.length === 0) {
    return { code: 2, reason: "empty-list", missingIndex: [], emptyAssets: [] };
  }
  // 빌드를 안 돌린 것과 위반을 구분한다.
  if (present === null) {
    return { code: 2, reason: "no-output", missingIndex: [], emptyAssets: [] };
  }

  const missingIndex = [];
  const emptyAssets = [];
  for (const deck of decks) {
    const seen = present[deck.slug];
    if (!seen || !seen.index) {
      missingIndex.push(deck.slug);
      continue;
    }
    if (seen.assets === 0) emptyAssets.push(deck.slug);
  }

  const code = missingIndex.length + emptyAssets.length > 0 ? 1 : 0;
  return { code, reason: code === 0 ? "ok" : "missing", missingIndex, emptyAssets };
}

function collect(decks) {
  let ok = false;
  try { ok = fs.statSync(OUT_SLIDES).isDirectory(); } catch { ok = false; }
  if (!ok) return null;

  const present = {};
  for (const deck of decks) {
    const dir = path.join(OUT_SLIDES, deck.slug);
    let index = false;
    try { index = fs.statSync(path.join(dir, "index.html")).isFile(); } catch { index = false; }

    let assets = 0;
    try {
      assets = fs.readdirSync(path.join(dir, "assets")).length;
    } catch { assets = 0; }

    present[deck.slug] = { index, assets };
  }
  return present;
}

function selfTest() {
  const D = [{ slug: "a", source: "a.md" }, { slug: "b", source: "b.md" }];
  const full = { a: { index: true, assets: 3 }, b: { index: true, assets: 5 } };

  const cases = [
    {
      name: "① 넷이 다 있으면 0건이다",
      run: () => decideSlides(D, full).code === 0,
    },
    {
      name: "② index.html 이 없으면 위반이다",
      run: () => {
        const r = decideSlides(D, { ...full, b: { index: false, assets: 5 } });
        return r.code === 1 && r.missingIndex.includes("b");
      },
    },
    {
      name: "③ 🔴 index.html 은 있고 assets 가 비면 위반이다 — 빈 껍데기가 배포된다",
      run: () => {
        const r = decideSlides(D, { ...full, a: { index: true, assets: 0 } });
        return r.code === 1 && r.emptyAssets.includes("a");
      },
    },
    {
      name: "④ 목록에 있는데 산출물에 아예 없으면 위반이다",
      run: () => {
        const r = decideSlides(D, { a: { index: true, assets: 3 } });
        return r.code === 1 && r.missingIndex.includes("b");
      },
    },
    {
      name: "⑤ 🔴 out/slides 가 없으면 종료 코드 2 — 안 만든 것을 「깨끗함」으로 세지 않는다",
      run: () => {
        const r = decideSlides(D, null);
        return r.code === 2 && r.reason === "no-output";
      },
    },
    {
      name: "⑥ 🔴 목록이 비면 종료 코드 2 — 0개 통과를 통과로 세지 않는다",
      run: () => {
        const r = decideSlides([], full);
        return r.code === 2 && r.reason === "empty-list";
      },
    },
    {
      name: "⑦ 위반이 둘이면 둘 다 센다 — 하나를 고치고 초록을 보는 일이 없다",
      run: () => {
        const r = decideSlides(D, { a: { index: false, assets: 0 }, b: { index: true, assets: 0 } });
        return r.missingIndex.length === 1 && r.emptyAssets.length === 1;
      },
    },
    {
      name: "⑧ 🔴 decks.json 이 실제로 넷을 담고 있다 — 대조할 것이 있는지 먼저 센다",
      run: () => {
        const real = JSON.parse(fs.readFileSync(DECKS, "utf8"));
        return real.length === 4 && real.every((d) => d.slug && d.source);
      },
    },
    {
      name: "⑨ 🔴 decks.json 이 가리키는 소스가 전부 디스크에 있다",
      run: () => {
        const real = JSON.parse(fs.readFileSync(DECKS, "utf8"));
        return real.every((d) => fs.existsSync(path.join("slidev-poc", d.source)));
      },
    },
  ];

  let pass = 0;
  for (const c of cases) {
    let ok = false;
    try { ok = c.run() === true; } catch { ok = false; }
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.name}`);
    if (ok) pass += 1;
  }
  console.log(`\n발표본 검사기 자기 검사: ${pass}/${cases.length}`);
  if (pass === cases.length) console.log("검사기가 작동한다. 본 스캔의 0 은 결론이다.");
  return pass === cases.length ? 0 : 1;
}

// ── main ──────────────────────────────────────────────────────────
if (process.argv.includes("--self-test")) process.exit(selfTest());

let decks;
try {
  decks = JSON.parse(fs.readFileSync(DECKS, "utf8"));
} catch {
  console.error(`\n❌ ${DECKS} 를 읽지 못했다. 발표본 목록이 없으면 검사할 기준이 없다.\n`);
  process.exit(2);
}

const result = decideSlides(decks, collect(decks));

if (result.code === 2) {
  console.error("\n❌ out/slides 가 없거나 발표본 목록이 비었다.");
  console.error("   `npm run build` 뒤 `npm run build-slides` 를 돌려라.");
  console.error("   ⚠️ 대상이 없는 채로 「0건」을 반환하면 그것이 곧 거짓 음성이다.\n");
  process.exit(2);
}

if (result.code === 1) {
  console.error(`\n❌ 발표본 산출물이 빠졌다\n`);
  for (const s of result.missingIndex) console.error(`   index.html 없음  ${s}`);
  for (const s of result.emptyAssets) console.error(`   assets 비어 있음  ${s}`);
  console.error("");
  process.exit(1);
}

console.log(`✅ 발표본 ${decks.length}개가 out/slides 에 있다 — ${decks.map((d) => d.slug).join(" · ")}`);
