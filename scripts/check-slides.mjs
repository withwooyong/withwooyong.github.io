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

// slidev 의 기본값은 history 라우팅이다. 적지 않으면 그것이 된다.
const ROUTER_OK = "hash";

/**
 * @param {{slug: string, text: string|null}[]} entries 발표본 소스 원문
 * @returns {{code: 0|1|2, reason: string, wrongMode: string[]}}
 *
 * 🔴 GitHub Pages 는 사이트 루트의 404.html 만 쓰므로 slidev 가 만든 디렉터리별 404.html 을
 *    무시한다. history 라우팅이면 /slides/<슬러그>/2 같은 장 번호가 서버에 없는 경로가 되어
 *    전부 404 다. 실제로 그렇게 배포됐고, 빌드도 산출물 검사도 전부 초록이었다 —
 *    index.html 과 assets 는 멀쩡히 있었기 때문이다.
 */
function decideRouter(entries) {
  // 대상이 없는 것을 「위반 없음」으로 세지 않는다. 위 decideSlides 와 같은 이유다.
  if (!Array.isArray(entries) || entries.length === 0) {
    return { code: 2, reason: "empty-list", wrongMode: [] };
  }

  const wrongMode = [];
  for (const entry of entries) {
    if (readRouterMode(entry.text) !== ROUTER_OK) wrongMode.push(entry.slug);
  }

  const code = wrongMode.length > 0 ? 1 : 0;
  return { code, reason: code === 0 ? "ok" : "bad-router", wrongMode };
}

/**
 * frontmatter 에 적힌 routerMode 값을 읽는다. 없으면 null 이다.
 *
 * ⚠️ 본문 아무 데나 있는 routerMode 를 세면 안 된다. 이 규칙을 설명하는 슬라이드가
 *    한 장 있기만 해도 그 편이 판정을 통과해 버린다. 주석 줄도 설정이 아니다 —
 *    실제로 이 리포의 발표본은 routerMode 바로 위에 네 줄짜리 주석을 달고 있다.
 */
function readRouterMode(text) {
  if (typeof text !== "string") return null;

  const lines = text.split("\n").map((line) => line.replace("\r", "").trim());
  if (lines[0] !== "---") return null; // frontmatter 로 열지 않으면 설정 자체가 없다

  let mode = null;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === "---") break; // 여기서 frontmatter 가 닫힌다. 아래는 본문이다
    if (lines[i].startsWith("#")) continue;
    if (!lines[i].startsWith("routerMode:")) continue;
    mode = lines[i].slice("routerMode:".length).trim();
  }
  return mode;
}

function collectSources(decks) {
  return decks.map((deck) => {
    let text = null;
    try { text = fs.readFileSync(path.join("slidev-poc", deck.source), "utf8"); } catch { text = null; }
    return { slug: deck.slug, text };
  });
}

function selfTest() {
  const D = [{ slug: "a", source: "a.md" }, { slug: "b", source: "b.md" }];
  const full = { a: { index: true, assets: 3 }, b: { index: true, assets: 5 } };
  // 판정이 보는 것은 frontmatter 안의 값 하나다. 나머지는 실제 발표본을 닮게 둔다.
  const FM = (mode) => `---\ntheme: seriph\nmdc: true\nrouterMode: ${mode}\n---\n\n# 제목\n`;

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
    {
      name: "⑩ frontmatter 에 hash 로 적혀 있으면 0건이다",
      run: () => decideRouter([{ slug: "a", text: FM("hash") }]).code === 0,
    },
    {
      name: "⑪ 🔴 history 로 적혀 있으면 위반이다 — 값을 보지 않고 존재만 보면 여기서 통과한다",
      run: () => {
        const r = decideRouter([{ slug: "a", text: FM("hash") }, { slug: "b", text: FM("history") }]);
        return r.code === 1 && r.wrongMode.length === 1 && r.wrongMode.includes("b");
      },
    },
    {
      name: "⑫ 🔴 아예 적혀 있지 않으면 위반이다 — 적지 않은 것이 곧 history 다",
      run: () => {
        const r = decideRouter([{ slug: "a", text: "---\ntheme: seriph\n---\n\n# 제목\n" }]);
        return r.code === 1 && r.wrongMode.includes("a");
      },
    },
    {
      name: "⑬ 🔴 frontmatter 밖 본문에 있는 것은 세지 않는다 — 이 규칙을 설명하는 슬라이드가 통과시킨다",
      run: () => {
        const body = "---\ntheme: seriph\n---\n\n# 라우팅\n\nrouterMode: hash 로 적어야 한다\n";
        const r = decideRouter([{ slug: "a", text: body }]);
        return r.code === 1 && r.wrongMode.includes("a");
      },
    },
    {
      name: "⑭ 주석 네 줄 아래에 있어도 읽는다 — 실제 발표본이 그 형태다",
      run: () => {
        const commented = "---\nmdc: true\n# 왜 hash 인지 적은 주석\n# 두 번째 줄\nrouterMode: hash\n---\n";
        return decideRouter([{ slug: "a", text: commented }]).code === 0;
      },
    },
    {
      name: "⑮ 🔴 소스를 읽지 못했으면 위반이다 — 못 읽은 것을 「깨끗함」으로 세지 않는다",
      run: () => decideRouter([{ slug: "a", text: null }]).code === 1,
    },
    {
      name: "⑯ 🔴 목록이 비면 종료 코드 2 — 0개 통과를 통과로 세지 않는다",
      run: () => {
        const r = decideRouter([]);
        return r.code === 2 && r.reason === "empty-list";
      },
    },
    {
      name: "⑰ 🔴 decks.json 이 가리키는 발표본이 실제로 전부 hash 다 — 대조할 것이 있는지 먼저 센다",
      run: () => {
        const real = JSON.parse(fs.readFileSync(DECKS, "utf8"));
        const r = decideRouter(collectSources(real));
        return real.length > 0 && r.code === 0;
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

// 두 판정을 먼저 다 내고 한 번에 보고한다. 하나를 고치고 초록을 보는 일이 없다.
const result = decideSlides(decks, collect(decks));
const router = decideRouter(collectSources(decks));

if (result.code === 2 || router.code === 2) {
  console.error("\n❌ out/slides 가 없거나 발표본 목록이 비었다.");
  console.error("   `npm run build` 뒤 `npm run build-slides` 를 돌려라.");
  console.error("   ⚠️ 대상이 없는 채로 「0건」을 반환하면 그것이 곧 거짓 음성이다.\n");
  process.exit(2);
}

if (result.code === 1 || router.code === 1) {
  console.error(`\n❌ 발표본 검사가 걸렸다\n`);
  for (const s of result.missingIndex) console.error(`   index.html 없음   ${s}`);
  for (const s of result.emptyAssets) console.error(`   assets 비어 있음  ${s}`);
  for (const s of router.wrongMode) {
    console.error(`   routerMode 가 ${ROUTER_OK} 가 아니다  ${s}`);
  }
  if (router.wrongMode.length > 0) {
    console.error("\n   GitHub Pages 는 사이트 루트의 404.html 만 쓴다. history 라우팅이면");
    console.error("   /slides/<슬러그>/<장번호> 가 전부 404 가 되어 새로고침과 링크 공유가 깨진다.");
    console.error("   해당 소스의 frontmatter 에 `routerMode: hash` 를 넣어라.");
  }
  console.error("");
  process.exit(1);
}

console.log(`✅ 발표본 ${decks.length}개가 out/slides 에 있고 전부 ${ROUTER_OK} 라우팅이다 — ${decks.map((d) => d.slug).join(" · ")}`);
