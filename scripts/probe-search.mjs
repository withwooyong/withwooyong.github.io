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
 * 판정 가능한 기본형 쿼리의 하한.
 *
 * ⚠️ 이 하한이 없으면 관문이 **스스로 무력해진다.** 판정식 `hit < testable - 1` 은
 *    「1건은 0을 내도 봐준다」는 뜻인데, `testable` 이 1이면 `0 < 0` 이 거짓이라
 *    **전멸인데 통과**한다. 2 여도 절반이 죽은 채 통과한다.
 *    코퍼스가 바뀌어 쿼리가 낡으면 `stale` 제외로 `testable` 이 조용히 줄어들므로,
 *    이 구간에 저절로 진입한다 — 관문이 실패하는 게 아니라 **좁아지다 사라진다.**
 *
 * 기본형이 지금 8건이라 2건까지 낡는 것을 허용한다. 기본형 개수를 바꾸면 이 값도 함께 보라.
 */
const MIN_TESTABLE = 6;

/**
 * 관문 판정. 브라우저 없이 순수 계산이라 자기검사가 같은 함수를 부를 수 있다.
 *
 * ⚠️ **export 하지 않는다.** 이 파일은 top-level 에서 HTTP 서버를 띄우고 브라우저를 열어
 *    프로브를 통째로 돌린다. 다른 모듈이 `import { judge }` 하면 그 부수효과가 전부 실행되고,
 *    부르는 쪽 코드는 도달조차 못 한다(2026-08-26 실측 — 리뷰어가 진리표를 독립 계산하려다 겪었다).
 *    자기검사는 같은 프로세스의 `--self-test` 분기로 부르므로 export 가 필요 없다.
 *
 * @param {{q:string, kind:string, n:number, corpus:number}[]} rows
 * @returns {{ code: 0|1, lines: string[], error: string|null }}
 */
function judge(rows) {
  const lines = [];
  const base = rows.filter((r) => r.kind.startsWith("기본형"));
  const stale = base.filter((r) => r.corpus === 0);
  const testable = base.filter((r) => r.corpus > 0);
  const hit = testable.filter((r) => r.n > 0).length;

  if (stale.length > 0) {
    lines.push(
      `\n⚠️ 원문에 없는 쿼리 ${stale.length} 건은 판정에서 제외했다: ${stale.map((r) => r.q).join(", ")}`,
    );
    lines.push("   검색이 못 찾은 것이 아니라 없는 말을 찾은 것이다. 쿼리를 원문에 있는 말로 바꿔라.");
  }

  lines.push(`\n기본형 ${hit}/${testable.length} 건이 1건 이상 반환 (기본형 총 ${base.length} 건)`);

  if (testable.length < MIN_TESTABLE) {
    return {
      code: 1,
      lines,
      error:
        `✖ 판정 가능한 쿼리가 ${testable.length} 건뿐이다 (하한 ${MIN_TESTABLE}).\n` +
        "  이건 검색 실패가 아니라 **관문이 성립하지 않는다**는 뜻이다.\n" +
        "  쿼리 목록이 코퍼스와 어긋났다. 원문에 있는 말로 갱신하고 다시 재라.",
    };
  }
  if (hit < testable.length - 1) {
    return {
      code: 1,
      lines,
      error: "✖ 관문 실패 — 기본형이 2건 이상 0을 냈다. 설계서 §8.5 로 돌아가라.",
    };
  }
  /**
   * ⚠️ 통과 문구에 **수치를 붙인다.** 「✔ 관문 통과」한 줄만 로그에서 잘라 인용하면
   *    「한글 검색이 된다」로 읽히는데, 이 관문이 실제로 보장하는 것은 그보다 훨씬 좁다 —
   *    「원문에 아직 실재하는 기본형 쿼리가 ${MIN_TESTABLE} 건 이상 남아 있고,
   *     그중 검색 결과 0건인 것이 최대 1건이다」가 전부다.
   *    조사형은 판정에 넣지 않고, 기본형 1건이 0을 내는 것도 통과시킨다.
   */
  return {
    code: 0,
    lines: [...lines, `✔ 관문 통과 — 기본형 ${hit}/${testable.length} (0건 허용 1)`],
    error: null,
  };
}

/**
 * 판정 로직이 실제로 무언가를 잡는지 증명한다.
 *
 * 이 리포의 다른 검사기 5종이 전부 `:verify` 쌍을 갖는다. 관문이라 부르는 것에만
 * 그게 없으면 「증명하지 않은 초록」이 되고, 그건 이 리포가 반복해서 데인 얼굴이다.
 *
 * 케이스 목록과 개수는 **코드 안에** 있다 — 문서에 적으면 낡는다.
 */
function selfTest() {
  const q = (kind, corpus, n) => ({ q: "샘플", kind, corpus, n });
  const many = (count, kind, corpus, n) => Array.from({ length: count }, () => q(kind, corpus, n));

  const cases = [
    ["기본형 8건 전부 반환", [...many(8, "기본형", 5, 3)], 0],
    ["기본형 8건 중 7건 반환 (여유 1건)", [...many(7, "기본형", 5, 3), q("기본형", 5, 0)], 0],
    ["기본형 8건 중 6건 반환", [...many(6, "기본형", 5, 3), ...many(2, "기본형", 5, 0)], 1],
    // ↓ 하한이 없던 시절 조용히 통과하던 구간. 이 둘이 이 자기검사의 존재 이유다.
    ["판정 가능 1건이 전멸", [q("기본형", 5, 0), ...many(7, "기본형", 0, 0)], 1],
    ["판정 가능 2건 중 1건 전멸", [q("기본형", 5, 0), q("기본형", 5, 3), ...many(6, "기본형", 0, 0)], 1],
    ["판정 가능 0건", [...many(8, "기본형", 0, 0)], 1],
    ["낡은 쿼리 2건 + 나머지 6건 전부 반환 (하한 경계)", [...many(2, "기본형", 0, 0), ...many(6, "기본형", 5, 3)], 0],
    ["낡은 쿼리 3건 → 하한 미달", [...many(3, "기본형", 0, 0), ...many(5, "기본형", 5, 3)], 1],
    ["조사형이 전멸해도 판정에 영향 없다", [...many(8, "기본형", 5, 3), ...many(5, "조사형(참고)", 5, 0)], 0],
    ["복합어(기본형·복합어)도 기본형으로 센다", [...many(7, "기본형", 5, 3), q("기본형·복합어", 5, 3)], 0],
  ];

  let failed = 0;
  for (const [name, rows, expected] of cases) {
    const got = judge(rows).code;
    if (got !== expected) {
      console.error(`  ✖ ${name} — 종료코드 ${expected} 를 기대했는데 ${got} 였다`);
      failed++;
    } else {
      console.log(`  ✔ ${name} → ${got}`);
    }
  }

  if (failed > 0) {
    console.error(`✖ 자기검사 실패 — ${cases.length} 건 중 ${failed} 건이 틀렸다.`);
    return 1;
  }
  console.log(`✔ 자기검사 통과 — ${cases.length} 건. 이 관문의 초록을 믿어도 된다.`);
  return 0;
}

// ⚠️ 브라우저를 띄우기 **전에** 갈라진다. 자기검사는 순수 계산이라 out/ 도 필요 없다.
if (process.argv.includes("--self-test")) {
  process.exit(selfTest());
}

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

/** 인덱스가 담은 페이지 수. 표의 「검색」 열 모수라서 함께 찍는다. 못 읽으면 `?` 로 둔다. */
const indexedPages = (() => {
  try {
    const entry = JSON.parse(
      fs.readFileSync(path.join("out", "pagefind", "pagefind-entry.json"), "utf8"),
    );
    const langs = entry.languages ?? {};
    const ko = Object.keys(langs).find((n) => n.toLowerCase().startsWith("ko"));
    return ko ? langs[ko].page_count : "?";
  } catch {
    return "?";
  }
})();

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

/**
 * ⚠️ 두 열은 **모집단이 다르다.** 나란히 놓았다고 재현율로 읽지 마라.
 *    - 원문: `content/blog` 의 글 파일 중 그 문자열을 포함하는 **파일 수**
 *    - 검색: pagefind 인덱스 **페이지 수** 중 반환된 건수. 글뿐 아니라 카테고리·태그·
 *      페이지네이션·404 까지 들어 있어 모수 자체가 더 크다
 *    그래서 검색 > 원문 이 정상이다. 「원문 11 → 검색 51」을 464% 재현율로 읽으면 틀린다.
 */
const corpusFiles = corpus.length;
console.log(
  pad("쿼리", 16) + pad("종류", 18) + pad(`원문/${corpusFiles}편`, 12) + `검색/${indexedPages}p`,
);
console.log("-".repeat(56));
for (const r of rows) {
  console.log(pad(r.q, 16) + pad(r.kind, 18) + pad(r.corpus, 12) + r.n);
}

const verdict = judge(rows);
for (const line of verdict.lines) console.log(line);
if (verdict.code !== 0) console.error(verdict.error);
process.exit(verdict.code);
