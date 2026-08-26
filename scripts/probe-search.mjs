/**
 * 한글 쿼리 10종을 실제 인덱스에 던져 본다. 설계서 §8.5 의 관문.
 *
 * 왜 Playwright 인가: pagefind.js 는 브라우저 런타임 API 다. Node 에서 import 해도
 * WebAssembly 로딩과 fetch 경로가 맞지 않는다. 실제 페이지에서 부르는 것이 유일하게 정직한 측정이다.
 *
 * 왜 원문도 세나: 「검색이 못 찾았다」와 「원문에 없는 말을 찾았다」는 완전히 다른 실패다.
 * 계획서는 이 진단을 사람이 사후에 수동으로 하도록 적었지만, 그러면 쿼리가 낡았을 때
 * 관문이 거짓 빨강을 낸다 — 실제로 초안의 「카나리 배포」가 원문 0 건이었다(2026-08-26).
 * 원문 0 건인 쿼리는 판정에서 빼고 「쿼리 오류」로 따로 보고한다.
 *
 * 실행: node scripts/probe-search.mjs
 * 전제: npm run build 가 끝나 있고 out/pagefind/ 가 있다.
 *
 * ⚠️ 파이프를 걸지 마라. 종료코드가 판정이다.
 */
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

/**
 * 쿼리 10종.
 *
 * 두 갈래를 섞었다 — **기본형**은 사용자가 실제로 치는 것이고, **조사형**은
 * 한글 스테밍 미지원(설계서 §8.2)이 어디까지 아픈지 재는 것이다.
 * 판정은 기본형으로만 한다. 조사형은 참고 수치다.
 */
const QUERIES = [
  { q: "검색엔진", kind: "기본형" },
  { q: "RAG", kind: "기본형" },
  { q: "임베딩", kind: "기본형" },
  { q: "벡터", kind: "기본형" },
  { q: "컨텍스트", kind: "기본형" },
  { q: "프롬프트", kind: "기본형" },
  { q: "서브에이전트", kind: "기본형" },
  { q: "벡터 검색", kind: "기본형·복합어" },
  // 조사형은 5종으로 늘렸다. 초안의 2종으로는 결과가 서로 모순돼 보였기 때문이다 —
  // 「임베딩의」는 원문 0 건인데 44 건을 냈고(세그멘테이션이 분절했다는 증거),
  // 「검색엔진을」은 2 건뿐이었다(기본형 「검색엔진」은 19 건). 표본이 작아 패턴을 알 수 없었다.
  { q: "검색엔진을", kind: "조사형(참고)" },
  { q: "임베딩의", kind: "조사형(참고)" },
  { q: "프롬프트를", kind: "조사형(참고)" },
  { q: "벡터가", kind: "조사형(참고)" },
  { q: "컨텍스트에", kind: "조사형(참고)" },
];

const PORT = 4188;
const ROOT = "out";
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".wasm": "application/wasm",
};

/** content/blog 의 모든 글 본문. 쿼리가 원문에 실재하는지 세는 데 쓴다. */
function readCorpus() {
  const texts = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.mdx?$/.test(e.name)) texts.push(fs.readFileSync(p, "utf8"));
    }
  };
  walk(path.join("content", "blog"));
  return texts;
}

const corpus = readCorpus();
const corpusHits = (q) => corpus.filter((t) => t.includes(q)).length;

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/blog/`);

const rows = [];
for (const { q, kind } of QUERIES) {
  const n = await page.evaluate(async (query) => {
    // 번들러를 거치지 않는 순수 브라우저 import 다. 절대경로라 pagefind 가 제 이웃 파일을 찾는다.
    const pf = await import("/pagefind/pagefind.js");
    const r = await pf.search(query);
    return r.results.length;
  }, q);
  rows.push({ q, kind, n, corpus: corpusHits(q) });
}

await browser.close();
server.close();

/** 한글은 고정폭 글꼴에서 2칸을 먹는다. padEnd 로는 표가 어긋난다. */
const width = (s) =>
  [...String(s)].reduce(
    (w, ch) => w + (/[ᄀ-ᇿ　-〿㄰-㆏가-힯＀-｠]/.test(ch) ? 2 : 1),
    0,
  );
const pad = (s, w) => String(s) + " ".repeat(Math.max(0, w - width(s)));

console.log(pad("쿼리", 16) + pad("종류", 18) + pad("원문", 8) + "검색결과");
console.log("-".repeat(50));
for (const r of rows) {
  console.log(pad(r.q, 16) + pad(r.kind, 18) + pad(r.corpus, 8) + r.n);
}

const base = rows.filter((r) => r.kind.startsWith("기본형"));
const stale = base.filter((r) => r.corpus === 0);
const testable = base.filter((r) => r.corpus > 0);
const hit = testable.filter((r) => r.n > 0).length;

if (stale.length > 0) {
  console.log(
    `\n⚠️ 원문에 없는 쿼리 ${stale.length} 건은 판정에서 제외했다: ${stale.map((r) => r.q).join(", ")}`,
  );
  console.log("   검색이 못 찾은 것이 아니라 없는 말을 찾은 것이다. 쿼리를 원문에 있는 말로 바꿔라.");
}

console.log(`\n기본형 ${hit}/${testable.length} 건이 1건 이상 반환`);

if (testable.length === 0) {
  console.error("✖ 판정할 쿼리가 하나도 없다. 쿼리 목록이 통째로 낡았다.");
  process.exit(1);
}
if (hit < testable.length - 1) {
  console.error("✖ 관문 실패 — 기본형이 2건 이상 0을 냈다. 설계서 §8.5 로 돌아가라.");
  process.exit(1);
}
console.log("✔ 관문 통과");
