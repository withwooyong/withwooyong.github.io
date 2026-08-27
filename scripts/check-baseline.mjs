// scripts/check-baseline.mjs
//
// GC-6 — 블로그가 아닌 페이지의 빌드 산출물이 바뀌지 않았음을 확인한다.
//
// 사용법:
//   node scripts/check-baseline.mjs                    검사한다. 차이가 있으면 종료 코드 1
//   node scripts/check-baseline.mjs --update           기준선을 갱신한다 (사람이 판단한 뒤에만)
//   node scripts/check-baseline.mjs --update --force   파일이 줄어드는 갱신을 강행한다
//
// ⚠️ 기준선 갱신을 자동화하면 이 검사는 아무것도 막지 못한다. --update 는 사람만 실행한다.
//
// 빌드마다 달라지는 값은 해시 전에 마스킹한다. 안 하면 매번 실패하는 경보가 되고,
// 그 복구로 --update 가 습관이 되면 정작 지켜야 할 페이지까지 함께 덮인다.
//
//   buildId        — Next.js 가 빌드마다 새로 만들어 HTML 에 박는다.
//   featuredPosts  — out/index.html 은 경로상 비블로그지만 데이터로 블로그에 결합돼 있다.
//                    getStaticProps 가 featured 글의 제목·설명을 HTML 에 박는다.
//                    두 자리에 박힌다 — 렌더된 본문과 __NEXT_DATA__ JSON. 둘 다 지운다.
//
// ⚠️ 마스킹은 좁게 유지한다. 넓히면 그만큼 이 검사가 못 보는 영역이 된다.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const OUT = "out";
const BASELINE = path.join("scripts", "baseline.json");

/**
 * 블로그 산출물은 이 검사의 대상이 아니다 — 글을 더하면 당연히 바뀐다.
 *
 * 아틀라스도 같은 이유로 뺀다. 노드가 글에서 자동 생성되므로 글이 늘면 함께 늘고,
 * 제외하지 않으면 감시 대상이 **13개에서 175개로** 불어나 기준선이 사실상 무의미해진다
 * (「전부 바뀌었다」가 매번 정상인 검사는 아무것도 못 잡는다).
 *
 * ⚠️ 여기서 빼는 것은 「아틀라스를 안 본다」는 뜻이지 「아틀라스가 안전하다」는 뜻이 아니다.
 *    아틀라스 쪽 회귀는 `tests/atlas/*` 와 E2E 가 맡는다.
 */
function isTarget(rel) {
  const norm = rel.split(path.sep).join("/");
  return norm.endsWith(".html") && !norm.startsWith("blog/") && !norm.startsWith("atlas/");
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

/**
 * `"<key>":[ ... ]` 구간을 통째로 고정 문자열로 바꾼다.
 *
 * 정규식(`\[[^\]]*\]`)을 쓰지 않는 이유: 글 제목이나 설명에 `]` 가 한 글자만 들어가도
 * (예: 「RAG [1편]」) 매칭이 거기서 끊겨 마스킹이 절반만 되고 나머지가 해시에 남는다.
 * 조용히 깨지는 종류의 버그라 눈에 띄지 않는다.
 *
 * 그래서 JSON 문자열을 인식하며 대괄호 깊이를 세는 스캐너를 쓴다.
 * 따옴표 안인지, 백슬래시로 이스케이프된 따옴표인지를 추적하므로 내용이 무엇이든 정확하다.
 *
 * key 가 없는 파일은 그대로 돌려준다 — 나머지 13개는 영향을 받지 않는다.
 */
function maskJsonArray(text, key, placeholder, file) {
  const marker = `"${key}":[`;
  const start = text.indexOf(marker);
  if (start === -1) return text;

  const open = start + marker.length - 1; // `[` 의 위치
  let depth = 0;
  let inStr = false;
  let esc = false;
  let i = open;

  for (; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) {
        i++; // `]` 를 포함해서 자른다
        break;
      }
    }
  }

  // 배열이 닫히지 않았다. 여기서 그냥 넘어가면 파일 끝까지 마스킹되어
  // 검사기가 「무엇이 바뀌어도 통과」하는 장식이 된다. 조용히 넘어가지 않는다.
  if (depth !== 0) {
    console.error(`\n❌ ${file} 의 "${key}" 배열을 파싱하지 못했다 (대괄호가 닫히지 않음).`);
    console.error("   마스킹 범위를 확정할 수 없으므로 검사를 중단한다.");
    process.exit(2);
  }

  return text.slice(0, open) + placeholder + text.slice(i);
}

/**
 * `anchor` 텍스트 바로 뒤에 오는 `<div>` 서브트리를 통째로 고정 문자열로 바꾼다.
 *
 * SSG 는 같은 데이터를 두 번 쓴다 — 사람이 볼 HTML 본문에 한 번, 하이드레이션용
 * `__NEXT_DATA__` JSON 에 한 번. featuredPosts 를 JSON 에서만 지우면 렌더된 본문에
 * 제목·설명이 그대로 남아 검사는 여전히 매번 실패한다. (실측: 제목·설명이 각각 2회 출현)
 *
 * 앵커를 Tailwind 클래스가 아니라 헤딩 텍스트로 잡는 이유: 클래스가 바뀐 것은
 * GC-6 가 잡아야 마땅한 진짜 변경이다. 앵커가 거기에 딸려 깨지면 안 된다.
 *
 * 앵커가 없으면 그대로 돌려준다 — 마스킹이 안 걸리면 시끄럽게 실패할 뿐이라 안전하다.
 * 반대로 너무 넓게 걸리면 조용히 통과해 버리므로, 닫히지 않으면 크게 죽인다.
 */
function maskHtmlSubtree(text, anchor, placeholder, file) {
  const a = text.indexOf(anchor);
  if (a === -1) return text;

  const open = text.indexOf("<div", a);
  if (open === -1) return text;

  let depth = 0;
  let i = open;
  while (i < text.length) {
    if (text.startsWith("</div>", i)) {
      depth--;
      i += 6;
      if (depth === 0) break;
      continue;
    }
    if (text.startsWith("<div", i) && /[\s>]/.test(text[i + 4] ?? "")) {
      depth++;
      i += 4;
      continue;
    }
    i++;
  }

  if (depth !== 0) {
    console.error(`\n❌ ${file} 에서 "${anchor}" 뒤의 <div> 가 닫히지 않았다.`);
    console.error("   마스킹 범위를 확정할 수 없으므로 검사를 중단한다.");
    process.exit(2);
  }

  return text.slice(0, open) + placeholder + text.slice(i);
}

function hashOf(file) {
  let text = fs.readFileSync(file, "utf8");

  // buildId — 빌드마다 바뀐다. JSON 필드 말고 `/_next/static/<id>/...` 경로에도 박혀 있어
  // 찾은 뒤 그 문자열 전체를 지운다.
  const m = text.match(/"buildId":"([^"]+)"/);
  if (m) text = text.split(m[1]).join("<BUILD_ID>");

  // CSS·JS 번들 파일명에 박힌 내용 해시. **공유 번들이라 다른 페이지가 클래스를 하나 더 써도 바뀐다.**
  //
  // 실측 2026-08-27 (T11): `/atlas` 를 새로 만들자 Tailwind 번들이 53521fca… → 5af29a8c… 로 바뀌며
  // 감시 대상 14장이 전부 빨개졌다. 그런데 T11 소스를 도로 빼고 다시 빌드해 두 산출물을 비교하니
  // 파일명 해시와 buildId 를 정규화한 뒤에는 **바이트 단위로 동일**했다 — 마크업은 아무것도 안 바뀌었다.
  //
  // 이 검사가 묻는 것은 「이 페이지 자체가 바뀌었나」다. 공유 번들의 파일명은 그 질문의 답이 아니다.
  // 정규화하지 않으면 새 화면을 하나 만들 때마다 전량 빨강이 되고, 그 복구로 `--update` 가 습관이 되는
  // 순간 정작 지켜야 할 product-lead* 7개가 같은 명령으로 함께 덮인다 — 아래 featuredPosts 와 같은 사고다.
  //
  // ⚠️ 이 정규화는 **번들의 내용 변경을 감지하지 않는다.** CSS 가 실제로 달라져 화면이 바뀌는 회귀는
  //    이 검사가 아니라 시각 회귀 검사의 몫이다. 여기서 그것까지 잡으려 하면 둘 다 못 한다.
  text = text.replace(/[0-9a-f]{16}\.(css|js)/g, "<BUNDLE>.$1");

  // featuredPosts — out/index.html 은 경로상 비블로그지만 데이터 흐름으로 블로그에 결합돼 있다.
  // pages/index.tsx 의 getStaticProps 가 featured 글의 제목·설명·슬러그를 HTML 에 박고,
  // readPosts 가 date 내림차순이라 배열 순서까지 들어온다.
  // 마스킹하지 않으면 글을 하나 추천할 때마다 GC-6 가 실패하고, 그 복구로 --update 가
  // 습관이 되는 순간 정작 지켜야 할 product-lead* 7개가 같은 명령으로 함께 덮인다.
  text = maskJsonArray(text, "featuredPosts", "<FEATURED_POSTS>", file);

  // 같은 데이터가 렌더된 본문에도 있다. JSON 만 지우면 반쪽이라 여전히 매번 실패한다.
  text = maskHtmlSubtree(text, "먼저 읽어볼 글", "<FEATURED_CARD>", file);

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
const force = process.argv.includes("--force");

if (update) {
  const n = Object.keys(current).length;

  // `next build` 는 out/ 을 점진적으로 쓴다. 빌드가 중간에 죽은 뒤 습관적으로 --update 를
  // 돌리면 14개가 5개로 줄고, 그 기준선이 커밋되면 CI는 사라진 9개를 영원히 보지 않으면서
  // 초록불을 낸다. 「무엇을 세었는지」를 검사기가 스스로 증명해야 한다.
  if (n === 0) {
    console.error("\n❌ 수집된 파일이 0개다. 기준선을 만들지 않는다.");
    console.error("   빌드가 끝나지 않았거나 out/ 이 비어 있다. `npm run build` 부터 돌려라.");
    console.error("   0개짜리 기준선은 무엇이 바뀌어도 통과하는 「영구 초록불」이 된다.");
    process.exit(2);
  }

  if (fs.existsSync(BASELINE)) {
    const prevKeys = Object.keys(JSON.parse(fs.readFileSync(BASELINE, "utf8")));
    if (n < prevKeys.length && !force) {
      const missing = prevKeys.filter((rel) => !(rel in current));
      console.error(`\n❌ 파일이 줄었다 — 기존 ${prevKeys.length}개 → 지금 ${n}개. 갱신을 거부한다.`);
      console.error("   빌드가 중간에 죽었을 때 나타나는 증상이다. 줄어든 채로 기준선을 만들면");
      console.error("   사라진 파일은 다시는 검사되지 않는다.\n");
      for (const rel of missing) console.error(`   빠짐  ${rel}`);
      console.error("\n페이지를 정말 없앤 것이라면 `--force` 를 붙여라. 빌드가 죽은 것이라면 다시 빌드하라.");
      process.exit(2);
    }
  }

  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + "\n", "utf8");
  console.log(`✅ 기준선 갱신 — ${n}개 파일`);
  console.log(`   ${BASELINE} 를 커밋해야 CI가 같은 기준으로 본다.`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error(`\n❌ ${BASELINE} 이 없다. 먼저 --update 로 기준선을 만들어라.`);
  process.exit(2);
}

const base = JSON.parse(fs.readFileSync(BASELINE, "utf8"));

// 비어 있는 기준선은 「0개 불변」이라는 무의미한 통과를 낸다. 통과가 아니라 실패다.
if (Object.keys(base).length === 0) {
  console.error(`\n❌ ${BASELINE} 이 비어 있다. 검사할 기준이 없다.`);
  console.error("   아무것도 세지 않은 것을 「바뀐 것이 없음」으로 세지 않는다.");
  console.error("   `npm run build` 후 `npm run check-baseline:update` 로 다시 만들어라.");
  process.exit(2);
}

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
