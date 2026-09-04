#!/usr/bin/env node
// 검색 인덱스를 만든다. 생성기이면서 검증기다.
//
// 🔴 **소스를 다시 파싱하지 않는다.** 렌더러가 이미 만든 `post.toc` 를 재사용하므로
// 헤딩 텍스트와 앵커 id 의 진실원이 하나로 유지된다. 다시 파싱하면 목차와 앵커가
// 조용히 어긋나고, 그때 검색 결과는 없는 자리로 착지한다.
//
// 🔴 **인덱스는 out/blog/ 아래에 둔다.** 루트에 두면 check-forbidden --built 의
// 스캔 범위(out/blog + out/_next/data/**/blog/**.json) 밖이 되어, 제목·설명·헤딩
// 2,671개가 금칙어 검사를 우회하는 새 산출물이 생긴다.
//
// 생성물이므로 리포에 커밋하지 않는다 (.gitignore 의 out/ 이 이미 덮는다).
// 커밋하면 본문보다 낡을 수 있고, 이 리포가 세 세션 연속 겪은 실패가 정확히
// 「수를 늘렸는데 그 수가 적힌 곳을 안 고쳤다」다.
//
// 사용법:
//   node scripts/build-search-index.mjs --self-test   가드가 실제로 작동하는지 증명한다
//   node scripts/build-search-index.mjs               인덱스를 만든다 (빌드 뒤에)
//
// 종료 코드: 0 정상 · 2 대상 없음 · 수 어긋남 · 카나리 실패

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const OUT = "out";
const DATA_ROOT = join(OUT, "_next", "data");
const CONTENT_ROOT = join("content", "blog");
const INDEX_PATH = join(OUT, "blog", "search-index.json");
const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// 카나리
// ---------------------------------------------------------------------------

// 반드시 인덱스에 들어가야 하는 편이다. 구조가 바뀌어 toc 를 못 읽으면 이 편의 헤딩이
// 0개가 되는데, 그것을 「위반 없음」으로 세면 빈 인덱스가 성공으로 나간다.
//
// 임계값이 실측(26개)이 아니라 20 인 이유는, 편을 정상적으로 손보다 헤딩이 몇 개
// 줄었을 때 검사기가 죽으면 안 되기 때문이다. 20 은 「구조가 깨졌다」와 「정상 편집」을
// 가르는 값이지 이 편의 현재 헤딩 수가 아니다.
export const CANARY_POST = "ai-agent/ai-agent-qna-fundamentals";
export const CANARY_MIN_HEADINGS = 20;

/** 카나리가 만족되면 null, 아니면 왜 아닌지 */
export function checkCanary(posts) {
  const found = posts.find((p) => `${p.c}/${p.s}` === CANARY_POST);
  if (!found) return `카나리 편이 인덱스에 없다: ${CANARY_POST}`;
  if (found.h.length < CANARY_MIN_HEADINGS) {
    return `카나리 편의 헤딩이 ${found.h.length}개다 (${CANARY_MIN_HEADINGS}개 이상이어야 한다)`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 종료 코드
// ---------------------------------------------------------------------------

/**
 * 집계만 받아 종료 코드를 정한다.
 *
 * 🔴 이 함수를 따로 뽑은 이유는 뮤테이션이다. 가드가 `main` 안에 흩어져 있으면 자기
 * 검사는 그것을 볼 수 없고, 가드를 통째로 지워도 케이스가 전부 통과한다.
 *
 * 순서가 규칙이다. **못 본 것이 있으면 본 것의 결과를 말하지 않는다.**
 */
export function decideExit({ target, sourceCount, indexed, canary }) {
  if (!target) {
    return { code: 2, why: `${DATA_ROOT} 가 없다. 먼저 \`npm run build\` 를 돌려라 — 안 만든 것을 「깨끗함」으로 세지 않는다.` };
  }
  if (sourceCount === 0) {
    return { code: 2, why: `${CONTENT_ROOT} 에서 .md 를 하나도 찾지 못했다. 0건이 아니라 대상 없음이다.` };
  }
  if (indexed !== sourceCount) {
    return { code: 2, why: `소스 ${sourceCount}편 중 ${indexed}편만 인덱스에 들어갔다. 일부만 담은 인덱스는 0건이 아니다.` };
  }
  if (canary) {
    return { code: 2, why: `카나리 실패 — ${canary}` };
  }
  return { code: 0, why: `${indexed}편을 인덱스에 담았다.` };
}

// ---------------------------------------------------------------------------
// 변환
// ---------------------------------------------------------------------------

/** 렌더러가 만든 post 객체를 인덱스 스키마로 옮긴다. 키가 한 글자인 이유는 반복 횟수 때문이다 */
export function toIndexPost(post) {
  const row = {
    c: post.categorySlug,
    s: post.slug,
    t: post.title,
    d: post.description,
    g: post.tags ?? [],
    h: (post.toc ?? []).map((entry) => [entry.text, entry.id]),
  };
  if (post.series) {
    row.e = post.series;
    row.o = post.seriesOrder;
  }
  return row;
}

// ---------------------------------------------------------------------------
// 수집
// ---------------------------------------------------------------------------

function walkJson(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkJson(full, out);
    else if (entry.name.endsWith(".json")) out.push(full);
  }
  return out;
}

/** out/_next/data/<buildId>/blog 를 찾는다. buildId 는 빌드마다 바뀐다 */
export function findBlogDataRoot(root = DATA_ROOT) {
  if (!existsSync(root)) return null;
  for (const buildId of readdirSync(root)) {
    const candidate = join(root, buildId, "blog");
    if (existsSync(candidate) && statSync(candidate).isDirectory()) return candidate;
  }
  return null;
}

/** 산출물 JSON 이 편인가. 카테고리·태그 페이지의 JSON 도 같은 트리에 있다 */
export function isPostJson(json) {
  const post = json?.pageProps?.post;
  return !!(post?.slug && post?.categorySlug);
}

/**
 * 산출물 JSON 에서 편만 골라 인덱스 행으로 바꾼다.
 *
 * ⚠️ 카테고리 페이지와 태그 페이지의 JSON 도 같은 트리에 있다 (실측 264개 중 편은 184개).
 * `isPostJson` 이 있는 것만 편이다.
 */
export function collectPosts(blogDataRoot) {
  const posts = [];
  for (const file of walkJson(blogDataRoot)) {
    const json = JSON.parse(readFileSync(file, "utf8"));
    if (isPostJson(json)) posts.push(toIndexPost(json.pageProps.post));
  }
  return posts;
}

/** content/blog/<카테고리>/<슬러그>.md 의 수. 인덱스 편 수와 대조하기 위한 독립 계수다 */
export function countSourcePosts(root = CONTENT_ROOT) {
  if (!existsSync(root)) return 0;
  let n = 0;
  for (const categorySlug of readdirSync(root)) {
    const dir = join(root, categorySlug);
    if (!statSync(dir).isDirectory()) continue;
    for (const name of readdirSync(dir)) if (name.endsWith(".md")) n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// 자기 검사
// ---------------------------------------------------------------------------

const EXIT_CASES = [
  // indexed 를 sourceCount 와 같게 둔다 — 다르면 아래 ③④ 가드가 먼저 걸려 이 케이스가
  // target 가드가 아니라 수 대조 가드를 시험하게 된다 (뮤테이션으로 실측: `if (!target)`
  // 를 무력화해도 이 케이스가 15/15 로 그대로 통과했다).
  ["① 산출물이 없으면 종료 2 다", { target: null, sourceCount: 184, indexed: 184, canary: null }, 2],
  ["② 소스가 0편이면 종료 2 다 — 0건이 아니라 대상 없음이다", { target: "x", sourceCount: 0, indexed: 0, canary: null }, 2],
  ["③ 🔴 소스보다 적게 담기면 종료 2 다", { target: "x", sourceCount: 184, indexed: 183, canary: null }, 2],
  ["④ 🔴 소스보다 많이 담겨도 종료 2 다", { target: "x", sourceCount: 184, indexed: 185, canary: null }, 2],
  ["⑤ 🔴 카나리가 실패하면 종료 2 다", { target: "x", sourceCount: 184, indexed: 184, canary: "헤딩 0개" }, 2],
  ["⑥ 전부 맞으면 종료 0 이다", { target: "x", sourceCount: 184, indexed: 184, canary: null }, 0],
];

// 실측 카나리 편(ai-agent-qna-fundamentals)의 헤딩 수와 맞춘 고정값이다. CANARY_MIN_HEADINGS
// 로 픽스처 길이를 만들면 그 상수를 뮤테이션했을 때 ⑩(헤딩 매핑)까지 함께 흔들려, ⑬(임계
// 미달) 하나만 떨어져야 할 뮤테이션이 ⑩·⑬ 둘을 떨어뜨린다 — 실측으로 확인했다. 그래서 이
// 값은 CANARY_MIN_HEADINGS 를 참조하지 않는다.
const SAMPLE_HEADING_COUNT = 26;

const SAMPLE_POST = {
  title: "제목",
  description: "설명",
  categorySlug: "ai-agent",
  slug: "ai-agent-qna-fundamentals",
  tags: ["ai-agent"],
  series: "ai-agent-qna",
  seriesOrder: 1,
  toc: Array.from({ length: SAMPLE_HEADING_COUNT }, (_, i) => ({ depth: 2, text: `헤딩 ${i}`, id: `헤딩-${i}` })),
};

export function selfTest() {
  const results = [];

  for (const [label, summary, expected] of EXIT_CASES) {
    results.push([decideExit(summary).code === expected, label]);
  }

  const row = toIndexPost(SAMPLE_POST);
  results.push([row.c === "ai-agent" && row.s === "ai-agent-qna-fundamentals", "⑦ 카테고리와 슬러그를 옮긴다"]);
  results.push([row.e === "ai-agent-qna" && row.o === 1, "⑧ 시리즈와 순서를 옮긴다"]);
  results.push([toIndexPost({ ...SAMPLE_POST, series: undefined, seriesOrder: undefined }).e === undefined, "⑨ 시리즈가 없으면 키를 만들지 않는다"]);
  results.push([
    Array.isArray(row.h[0]) && row.h[0].length === 2 && row.h[0][1] === "헤딩-0",
    "⑩ 🔴 헤딩을 [텍스트, 앵커id] 로 옮긴다 — 앵커를 재생성하지 않는다",
  ]);

  results.push([checkCanary([row]) === null, "⑪ 카나리 편이 헤딩 임계를 넘으면 통과다"]);
  results.push([checkCanary([]) !== null, "⑫ 🔴 카나리 편이 없으면 실패다"]);
  results.push([
    checkCanary([{ ...row, h: row.h.slice(0, CANARY_MIN_HEADINGS - 1) }]) !== null,
    "⑬ 🔴 카나리 편의 헤딩이 임계 미만이면 실패다",
  ]);

  // 🔴 대조할 것이 실제로 있는지 먼저 센다. 필터를 통과한 집합으로 그 필터를 검사할 수 없다 —
  // 「편이 아닌 JSON 을 걸러낸다」는 케이스는 걸러낼 것이 0개면 영원히 통과한다.
  // 🔴 술어를 테스트 안에 다시 적지 않는다 — collectPosts 가 실제로 부르는 isPostJson 을
  // 그대로 호출해야, isPostJson 을 지우거나 망가뜨렸을 때 이 케이스가 떨어진다.
  // 🔴 네 번째 항목이 없으면 isPostJson 의 `post?.categorySlug` 조건을 지워도 이 케이스가
  // 그대로 통과한다 — 앞의 두 「편이 아니다」 항목은 이미 slug 가 없어서 걸러지므로
  // categorySlug 가지를 실제로 시험하지 못한다 (실측: 조건을 지우고 돌려도 15/15 였다).
  const mixed = [
    { pageProps: { post: SAMPLE_POST } },
    { pageProps: { categories: [], tags: [] } },
    { pageProps: { post: { title: "슬러그가 없다" } } },
    { pageProps: { post: { slug: "슬러그는 있지만 카테고리가 없다" } } },
  ];
  const notPost = mixed.filter((j) => !isPostJson(j)).length;
  const kept = mixed.filter((j) => isPostJson(j)).length;
  results.push([notPost === 3 && kept === 1, `⑭ 🔴 편이 아닌 JSON ${notPost}개를 거르고 ${kept}개만 담는다 (거를 것이 실제로 있다)`]);

  // 🔴 검사기가 출력하는 라벨도 자기 검사 항목이다. 「무엇을 한다」고 적어 둔 것과
  // 실제 동작이 같은지를 케이스로 고정한다.
  const wrongCount = decideExit({ target: "x", sourceCount: 184, indexed: 183, canary: null });
  results.push([/183/.test(wrongCount.why) && /184/.test(wrongCount.why), "⑮ 수가 어긋나면 두 수를 다 말한다"]);

  for (const [ok, label] of results) console.log(`${ok ? "✅" : "❌"} ${label}`);
  const passed = results.filter(([ok]) => ok).length;
  console.log(`\n${passed}/${results.length}`);
  return passed === results.length ? 0 : 1;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
  if (process.argv.includes("--self-test")) process.exit(selfTest());

  const blogDataRoot = findBlogDataRoot();
  const posts = blogDataRoot ? collectPosts(blogDataRoot) : [];
  const sourceCount = countSourcePosts();
  const canary = blogDataRoot ? checkCanary(posts) : null;

  const verdict = decideExit({ target: blogDataRoot, sourceCount, indexed: posts.length, canary });

  if (verdict.code !== 0) {
    console.error(`\n🔴 ${verdict.why}`);
    process.exit(verdict.code);
  }

  // 편 정렬을 고정한다. 순서가 빌드마다 흔들리면 인덱스의 diff 가 의미를 잃고,
  // 같은 점수의 결과가 다른 차례로 나온다.
  posts.sort((a, b) => (a.c === b.c ? a.s.localeCompare(b.s) : a.c.localeCompare(b.c)));

  mkdirSync(join(OUT, "blog"), { recursive: true });
  writeFileSync(INDEX_PATH, JSON.stringify({ v: SCHEMA_VERSION, posts }), "utf8");

  const headings = posts.reduce((n, p) => n + p.h.length, 0);
  const bytes = Buffer.byteLength(readFileSync(INDEX_PATH));
  console.log(`[search-index] ${verdict.why} 헤딩 ${headings}개 · ${(bytes / 1024).toFixed(0)} KB → ${INDEX_PATH}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
