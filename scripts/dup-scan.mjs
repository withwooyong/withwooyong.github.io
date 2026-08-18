#!/usr/bin/env node
// 축자 복제 스캔 — 신규 발행본이 기발행본의 문장·표 셀을 그대로 옮겼는지 찾는다.
//
// 왜 필요한가: 검증자가 중복을 찾으려 기발행본을 정독하면, 처방을 쓸 때 그 문장을 다시 꺼낸다.
// 실제로 한 배치에서 검증자 처방을 그대로 채택한 자리가 기발행본의 연속 30자 축자였다.
// 사람 눈으로는 안 잡힌다 — 원본에는 없고 기발행본에만 있는 문장이기 때문이다.
//
// 사용법:
//   node scripts/dup-scan.mjs --self-test              검사기 작동 증명 (본 스캔 전에 반드시)
//   node scripts/dup-scan.mjs <파일...>                지정 파일을 나머지 전편과 대조
//   node scripts/dup-scan.mjs --category ai-transformation
//   node scripts/dup-scan.mjs --min 20 <파일...>       임계값 변경 (기본 20자)
//
// 대상을 몇 편 넘기든 결과는 같다 — 각 편은 **자기 자신을 뺀 나머지 전부**와 대조된다.
// 대상끼리도 대조하므로 새 배치를 통째로 넘겨도 된다. 2026-08-18 이전에는 대상 전부를
// 대조 집합에서 빼서, 배치를 통째로 넘기는 경우에만 조용히 0건을 냈다 (자체 검사 ⑤).
//
// 판정하지 않는다. 양쪽 문자열과 위치를 그대로 보고한다 — 판정은 사람이 한다.

import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";

const BLOG_DIR = join(process.cwd(), "content", "blog");
const DEFAULT_MIN = 20;

// CLI 인자는 상대경로(`content/blog/x.md`)로 오고 listPosts()는 절대경로를 낸다.
// 같은 파일을 같은 문자열로 만들지 않으면 「자기 자신 제외」가 조용히 실패한다.
// `startsWith(cwd)` 판정은 cwd 밖의 절대경로를 상대경로로 오인한다 — resolve가 둘 다 다룬다.
const toAbs = (p) => resolve(p);

// 「글자」의 정의 — 한글·영문·숫자. 이것이 하나도 없으면 그 줄은 기호뿐이다.
const HAS_WORD = /[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]/;

// ── 정규화 ─────────────────────────────────────────────────────────
// 마크다운 기호를 걷어내면 표 셀 경계를 넘는 일치까지 잡힌다.
// `| 셀A | 셀B |`와 산문 `셀A 셀B`가 같은 문자열로 수렴하기 때문이다.
function normalizeLine(raw) {
  return raw
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // 링크는 제목만 — URL은 겹쳐도 복제가 아니다
    .replace(/[|*_`#>~]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

// 링크 제목은 다른 편의 title이므로 겹치는 것이 정상이다.
// 분류하지 않으면 지도편·Q&A편처럼 링크가 많은 글이 전부 위양성으로 뒤덮인다.
function linkTitles(raw) {
  const out = [];
  for (const m of raw.matchAll(/\[([^\]]*)\]\([^)]*\)/g)) {
    const t = normalizeLine(m[1]);
    if (t.length > 0) out.push(t);
  }
  return out;
}

function stripFrontmatter(text) {
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? { body: text.slice(m[0].length), offset: m[0].split(/\r?\n/).length - 1 } : { body: text, offset: 0 };
}

// 줄 단위로 정규화하되 원문 줄 번호를 유지한다.
// 보고가 `파일:줄`로 나와야 사람이 열어 볼 수 있다.
function parseFile(path) {
  const text = readFileSync(path, "utf8");
  const { body, offset } = stripFrontmatter(text);
  const lines = [];
  let inFence = false;
  body.split(/\r?\n/).forEach((raw, i) => {
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      return;
    }
    const norm = normalizeLine(raw);
    // 정규화 후 글자가 하나도 남지 않는 줄은 내용이 아니다 — 표 구분선 `|---|---|`,
    // 수평선 `---`, 기호 나열이 여기 걸린다. 걸러내지 않으면 표를 쓰는 모든 편이
    // 서로 「복제」로 잡혀, 위양성이 쌓여 진짜 복제를 가린다.
    if (norm.length > 0 && HAS_WORD.test(norm))
      lines.push({ line: offset + i + 1, norm, raw: raw.trim(), fence: inFence, links: linkTitles(raw) });
  });
  return lines;
}

function listPosts(dir = BLOG_DIR) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...listPosts(p));
    else if (entry.endsWith(".md")) out.push(p);
  }
  return out;
}

// ── 색인 ───────────────────────────────────────────────────────────
// 기발행본의 모든 N자 윈도우를 Map에 넣는다. 조회가 O(1)이라 113편도 즉시 끝난다.
function buildIndex(files, min) {
  const index = new Map();
  for (const file of files) {
    for (const { line, norm, fence } of parseFile(file)) {
      for (let i = 0; i + min <= norm.length; i++) {
        const key = norm.slice(i, i + min);
        if (!index.has(key)) index.set(key, []);
        index.get(key).push({ file, line, fence });
      }
    }
  }
  return index;
}

// 매치된 윈도우가 연속되면 하나의 구간으로 병합한다.
// 병합하지 않으면 30자 축자 하나가 11건으로 보고돼 심각도를 오독하게 된다.
// selfPath: 색인이 대상 자신을 포함할 때 그 출처를 걸러낸다. 걸러내지 않으면
// 모든 줄이 자기 자신과 일치해 전편이 위양성으로 뒤덮인다.
function findMatches(target, index, min, selfPath = null) {
  const lookup = (key) => {
    const found = index.get(key);
    if (!found) return null;
    if (!selfPath) return found;
    const others = found.filter((f) => f.file !== selfPath);
    return others.length > 0 ? others : null;
  };
  const hits = [];
  for (const { line, norm, raw, fence, links } of parseFile(target)) {
    let i = 0;
    while (i + min <= norm.length) {
      const key = norm.slice(i, i + min);
      const found = lookup(key);
      if (!found) {
        i++;
        continue;
      }
      // 최장 확장: 같은 상대 파일에서 계속 이어지는지 본다
      let len = min;
      while (i + len < norm.length) {
        const next = lookup(norm.slice(i + len - min + 1, i + len + 1));
        if (!next) break;
        len++;
      }
      const matched = norm.slice(i, i + len);
      hits.push({
        line,
        raw,
        fence,
        matched,
        length: len,
        // 매치가 링크 제목 안에 통째로 들어가면 복제가 아니라 참조다
        isLink: links.some((t) => t.includes(matched)),
        sources: [...new Set(found.map((f) => `${relative(BLOG_DIR, f.file)}:${f.line}`))].slice(0, 5),
      });
      i += len - min + 1;
    }
  }
  return hits;
}

// ── 스캔 본체 ──────────────────────────────────────────────────────
// CLI와 자체 검사가 **같은 함수**를 탄다. 이전에는 대조 집합 구성이 CLI 본체에만 있어
// 자체 검사가 검증할 수 없었고, 그래서 「대상끼리 대조되지 않는다」가 4개 케이스를
// 전부 통과한 채 거짓 0을 냈다.
function scan(targets, all, min) {
  // 대상도 코퍼스에 넣고, 매치 시점에 **자기 자신만** 걸러낸다.
  // 대상 전부를 코퍼스에서 빼면 대상끼리는 영원히 대조되지 않는다 — 새 배치를 통째로
  // 넘기는 경우가 정확히 그 경우다.
  const targetPaths = targets.map(toAbs);
  const corpus = [...new Set([...all.map(toAbs), ...targetPaths])];
  const index = buildIndex(corpus, min);
  const results = targets.map((target, i) => {
    const found = findMatches(target, index, min, targetPaths[i]).sort((a, b) => b.length - a.length);
    return {
      target,
      hits: found.filter((h) => !h.isLink),
      links: found.filter((h) => h.isLink),
    };
  });
  // 대상 1편이 마주하는 대조 편수 — 자기 자신을 뺀 나머지 전부다.
  return { results, contrastCount: corpus.length - 1 };
}

// ── 자체 검사 ──────────────────────────────────────────────────────
// 「발견 0건」이 참인지 못 찾은 것인지 구분하려면 검사기가 작동함을 먼저 증명해야 한다.
function selfTest() {
  const posts = listPosts();
  if (posts.length === 0) {
    console.error("FAIL: content/blog에 발행본이 없다");
    process.exit(1);
  }
  const min = DEFAULT_MIN;
  const index = buildIndex(posts, min);

  // 기발행본에서 실재 문자열 하나를 뽑는다 (주입용)
  let sample = null;
  for (const { norm } of parseFile(posts[0])) {
    if (norm.length >= 40) {
      sample = norm.slice(0, 40);
      break;
    }
  }
  if (!sample) {
    console.error("FAIL: 40자 이상인 줄을 찾지 못해 주입 검사를 만들 수 없다");
    process.exit(1);
  }

  const probe = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((raw, i) => ({ line: i + 1, norm: normalizeLine(raw), raw }))
      .filter((l) => l.norm.length > 0);
    let count = 0;
    for (const { norm } of lines) {
      for (let i = 0; i + min <= norm.length; i++) if (index.has(norm.slice(i, i + min))) count++;
    }
    return count;
  };

  // ⑤⑥은 probe()가 아니라 scan()을 탄다. probe()는 색인을 직접 조회할 뿐
  // **대조 집합이 어떻게 구성되는지**는 건드리지 않아, 「대상끼리 대조되지 않는다」가
  // ①~④를 전부 통과한 채 새 배치를 통째로 넘긴 경우에만 거짓 0을 냈다.
  const CONTROL = "통제용문자열가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허";
  const tmp = mkdtempSync(join(tmpdir(), "dup-scan-selftest-"));
  const write = (name, body) => {
    const p = join(tmp, name);
    writeFileSync(p, `---\ntitle: "자체 검사"\n---\n\n${body}\n`, "utf8");
    return p;
  };
  const countHits = (targets, corpus) =>
    scan(targets, corpus, min).results.reduce((n, r) => n + r.hits.length, 0);

  // 표 구분선은 마크다운 기호를 걷어내면 하이픈만 남는다. 이 코퍼스는 표가 지배적이라
  // 걸러내지 않으면 표를 쓰는 모든 편이 서로 「복제」로 잡히고, 위양성이 진짜 복제를 가린다.
  const TABLE_RULE = "|-------|-------|-------|";

  let crossTargets = 0;
  let withinOne = 0;
  let tableRule = 0;
  try {
    const a = write("alpha.md", CONTROL);
    const b = write("beta.md", CONTROL);
    crossTargets = countHits([a, b], [a, b]);
    const c = write("gamma.md", `${CONTROL}\n\n${CONTROL}`);
    withinOne = countHits([c], [c]);
    const d = write("delta.md", `${CONTROL}\n\n${TABLE_RULE}`);
    const e = write("epsilon.md", `겹치지않는통제용문장하나둘셋넷다섯여섯일곱여덟아홉열\n\n${TABLE_RULE}`);
    tableRule = countHits([d, e], [d, e]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  const cases = [
    ["① 19자는 미검출 (임계값이 바이트가 아니라 「자」임을 증명)", probe(sample.slice(0, min - 1)) === 0],
    ["② 20자는 검출", probe(sample.slice(0, min)) > 0],
    ["③ 기발행본 실재 40자 주입 → 검출", probe(sample) > 0],
    ["④ 비실재 문자열 → 미검출", probe("이문장은어느발행본에도존재하지않는통제용문자열입니다검사기음성대조") === 0],
    ["⑤ 대상 2편을 함께 넘겨도 서로 대조된다 (배치 통째 검사의 거짓 0 방지)", crossTargets > 0],
    ["⑥ 한 편 안의 반복은 검출하지 않는다 (자기 대조는 위양성)", withinOne === 0],
    ["⑦ 표 구분선은 검출하지 않는다 (기호만 남는 줄은 내용이 아니다)", tableRule === 0],
  ];

  console.log(`자체 검사 — 발행본 ${posts.length}편 · 임계값 ${min}자 · 색인 ${index.size.toLocaleString()}개 윈도우\n`);
  let ok = true;
  for (const [name, pass] of cases) {
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}`);
    if (!pass) ok = false;
  }
  console.log(`\n${ok ? "검사기가 작동한다. 본 스캔의 「0건」은 결론이다." : "검사기가 고장났다. 본 스캔 결과를 믿지 마라."}`);
  process.exit(ok ? 0 : 1);
}

// ── 본체 ───────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
if (argv.includes("--self-test")) selfTest();

let min = DEFAULT_MIN;
const minIdx = argv.indexOf("--min");
if (minIdx >= 0) min = Number(argv[minIdx + 1]);

let targets = [];
const catIdx = argv.indexOf("--category");
if (catIdx >= 0) {
  targets = listPosts(join(BLOG_DIR, argv[catIdx + 1]));
} else {
  targets = argv.filter((a) => a.endsWith(".md"));
}

if (targets.length === 0) {
  console.error("대상이 없다. 사용법: node scripts/dup-scan.mjs [--self-test] [--min N] [--category <slug> | <파일...>]");
  process.exit(1);
}

const { results, contrastCount } = scan(targets, listPosts(), min);

console.log(`축자 복제 스캔 — 대상 ${targets.length}편 · 대조 ${contrastCount}편 · 임계값 ${min}자\n`);

let total = 0;
let linkTotal = 0;
for (const { target, hits, links } of results) {
  const name = relative(BLOG_DIR, toAbs(target));
  linkTotal += links.length;

  if (hits.length === 0) {
    console.log(`  ${name}  —  0건${links.length > 0 ? `  (링크 제목 ${links.length}건은 별도 분류)` : ""}`);
    continue;
  }
  console.log(`  ${name}  —  ${hits.length}건 (최장 ${hits[0].length}자)${links.length > 0 ? ` · 링크 제목 ${links.length}건 별도` : ""}`);
  for (const h of hits) {
    console.log(`    L${h.line}  ${h.length}자${h.fence ? " [코드펜스]" : ""}`);
    console.log(`      일치: ${h.matched}`);
    console.log(`      원문: ${h.raw.slice(0, 120)}`);
    console.log(`      상대: ${h.sources.join(" · ")}`);
  }
  console.log("");
  total += hits.length;
}

console.log(`합계 ${total}건 (링크 제목 ${linkTotal}건은 제외).`);
console.log("판정하지 않았다 — 용어 정의·의도적 인용은 정당할 수 있다. 사람이 열어 판정하라.");
