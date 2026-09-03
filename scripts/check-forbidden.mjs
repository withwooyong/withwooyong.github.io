#!/usr/bin/env node
// 금칙어 스캔 — 익명화 정책을 어긴 낱말이 발행본에 남았는지 찾는다.
//
// 왜 필요한가: 규칙이 문서로만 있으면 표기형 하나가 빠져도 드러나지 않는다.
// 실제로 목록이 `FASTCAMPUS`·`teddynote` 라틴 표기로만 돼 있어 한글 표기형
// 「패스트캠퍼스」·「테디노트」가 통째로 빠졌고, 그 상태로 돌린 검사가
// 「0건」을 반환했다. 그 0건이 CHANGELOG에 「이 한 편에만 7건, 다른 4개 카테고리 0건」으로
// 기록됐지만 실제로는 다른 두 편에 6건이 더 있었다.
// ⇒ 거짓 음성은 「못 찾음」이 아니라 「없음을 확인함」으로 기록된다. 그래서 검사기가 필요하다.
//
// 사용법:
//   node scripts/check-forbidden.mjs --self-test     검사기 작동 증명 (본 스캔 전에 반드시)
//   node scripts/check-forbidden.mjs                 발행본 스캔 (content/blog) — 판정한다
//   node scripts/check-forbidden.mjs --built         산출물 스캔 (out/blog) — 판정한다. 빌드 후에 돌린다
//   node scripts/check-forbidden.mjs --all           조사 모드 — 리포 전체를 훑되 판정하지 않는다
//   node scripts/check-forbidden.mjs <파일...>       지정 파일만
//
// 종료 코드: HARD 위반이 1건이라도 있으면 1, 아니면 0. SOFT는 보고만 하고 막지 않는다.
//            --all 은 언제나 0이다 — 아래 「적용 범위」 참조.
//            --built 는 out/blog 가 없으면 2로 종료한다 — 안 만든 것을 「깨끗함」으로 세지 않는다.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// ── 금칙어 ────────────────────────────────────────────────────────
//
// HARD — 고유명사. 문맥과 무관하게 위반이다. 발견되면 빌드를 막는다.
//   ⚠️ 라틴 표기를 넣을 때는 한글 표기형을 반드시 같이 넣어라. 이 검사기가 존재하는 이유다.
const HARD = [
  // 회사·서비스
  "야나두", "yanadoo",
  "히츠",
  "티빙", "TVING",
  "BTV", "B tv",
  "커머스개발", "커머스 개발",
  // 인명·계정
  "허우용", "teddylee", "teddynote", "테디노트",
  // 교육·플랫폼
  "FASTCAMPUS", "패스트캠퍼스",
  // 사내 시스템
  "argus", "아르고스",
  // 직함
  "실장",
];

// SOFT — 취지 낱말. 정당한 문맥이 있을 수 있어 기계가 판정하지 못한다.
//   예: `recruiter` 에이전트 설명의 「면접 질문」·「이력서」는 채용 담당 에이전트의 기능이지
//       글쓴이의 구직 활동이 아니다. 보고만 하고 사람이 판정한다.
const SOFT = [
  "면접", "커닝페이퍼", "암기용", "화이트보드", "이력서",
  "강의", "수강", "예상 질문",
];

// 검사하지 않는 것 — 못 하는 일을 하는 척하지 않는다.
//   1인칭(「나」·「내」·「저는」)은 grep으로 분리되지 않는다. 양방향으로 실패한다.
//     거짓 양성: 「동시성 문제가」·「메이저는」  /  거짓 음성: 「내 검색 커리어」
//     확장 패턴 `내 [가-힣]{2,6}` 은 「인덱스 내 문서」를 대량 오탐한다.
//   ⇒ 1인칭은 사람이 매칭 줄을 열어 읽는 수밖에 없다. 목록에 넣으면 오탐에 묻혀
//      진짜 위반이 보이지 않게 되므로 넣지 않는다.

// ── 스캔 ──────────────────────────────────────────────────────────
const SKIP_DIRS = new Set(["node_modules", ".next", "out", "dist", "build", ".git"]);
const TEXT_EXT = /\.(md|mdx|ts|tsx|js|mjs|json)$/;
const BUILT_EXT = /\.(html|json|txt|xml)$/; // 산출물은 HTML 이 본체다

function walk(dir, out = [], extRe = TEXT_EXT) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(join(dir, e.name), out, extRe);
    } else if (extRe.test(e.name)) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

// 프론트매터를 제외하지 않는다 — post 객체가 통째로 props로 넘어가 __NEXT_DATA__ 에
// 직렬화되므로, 프론트매터 값도 페이지 소스에 그대로 공개된다.
// 라틴 낱말은 단어 경계를 요구한다 — 요구하지 않으면 "heats"가 "Cheatsheet"에 걸린다(실제로 걸렸다).
// 한글 낱말은 경계를 요구하지 않는다 — 조사가 붙어 「테디노트의」처럼 이어지므로 경계가 없다.
// ⇒ 한 규칙으로 두 표기 체계를 다루려 한 것이 오탐의 근원이었다.
function isAsciiWord(w) {
  for (const c of w) if (c.charCodeAt(0) > 127) return false;
  return true;
}
// ⚠️ 밑줄은 단어 문자가 아니다 — 구분자다.
//   `_` 를 단어 문자로 치면 파일명 `Ted_yanadoo.png` 의 `yanadoo` 가 경계 검사에서 탈락해
//   통째로 놓친다. 실제로 그렇게 놓쳤고, 그 파일명이 블로그 전 페이지의 og:image 에
//   들어가 산출물에 366회 남아 있었는데 검사는 계속 0건을 반환했다.
//   식별자·파일명에서 `_` 는 낱말을 잇는 문자가 아니라 나누는 문자다. 경계로 취급한다.
function isWordChar(c) {
  if (c === undefined) return false;
  return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || (c >= "0" && c <= "9");
}
// 산출물에만 적용하는 정당 문맥 — 정확한 문자열로 못박는다.
//   JSON-LD 의 author 는 저작자 표기이며 기술 블로그의 표준이다. 위반이 아니라고 판정했다.
//   ⚠️ 이 면제는 「이 문자열 안에 있을 때」만이다. 같은 이름이 본문·제목에 나오면 그대로 잡는다.
//      「기술 블로그니까 이름은 괜찮다」로 넓히면 검사기가 이름을 아예 못 보게 된다.
const BUILT_ALLOW = ['"author":{"@type":"Person","name":"허우용"}'];

// countAll: 한 줄 안의 모든 출현을 센다. 산출물 HTML은 한 줄이 수십 KB라 줄 단위로 세면
//   페이지당 2회가 1건으로 접혀 수치가 거짓이 된다. 소스(.md)는 줄이 나뉘어 있어 기본은 접는다.
// allow: 이 문자열들 **안쪽**의 매칭은 세지 않는다. 문맥 판정을 문자열 일치로 좁혀서 한다.
function scanText(text, words, opts = {}) {
  const countAll = opts.countAll === true;
  const allow = opts.allow ?? [];
  const hits = [];
  const lines = text.split("\n");
  // 면제 구간을 줄별로 미리 잡아 둔다 — 낱말마다 다시 훑지 않기 위해서다.
  const allowRanges = allow.length
    ? lines.map((line) => {
        const r = [];
        for (const a of allow) {
          let at = 0;
          while ((at = line.indexOf(a, at)) !== -1) { r.push([at, at + a.length]); at += a.length; }
        }
        return r;
      })
    : null;
  for (const w of words) {
    const needle = w.toLowerCase();
    const boundary = isAsciiWord(w);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      let at = 0;
      while ((at = lower.indexOf(needle, at)) !== -1) {
        const before = at === 0 ? undefined : line[at - 1];
        const after = line[at + needle.length];
        const boundaryOk = !boundary || (!isWordChar(before) && !isWordChar(after));
        const exempt = allowRanges !== null &&
          allowRanges[i].some(([s, e]) => at >= s && at + needle.length <= e);
        if (boundaryOk && !exempt) {
          const snippet = countAll
            ? line.slice(Math.max(0, at - 40), at + needle.length + 40).trim()
            : line.replace(/\r$/, "").trim();
          hits.push({ word: w, line: i + 1, text: snippet });
          if (!countAll) break; // 소스는 한 줄에 여러 번 있어도 한 번만 보고한다
          at += needle.length;
          continue;
        }
        at += 1;
      }
    }
  }
  return hits;
}

// ── self-test ─────────────────────────────────────────────────────
// F3의 원인 두 가지(한글 표기형 누락 · 대소문자)를 정확히 겨눈 케이스를 넣는다.
function selfTest() {
  const cases = [
    { name: "한글 표기형을 잡는가",           text: "출처는 테디노트 RAG 비법노트다.",              expect: ["테디노트"] },
    { name: "라틴 소문자를 잡는가",           text: "see fastcampus curriculum",                    expect: ["FASTCAMPUS"] },
    { name: "한글 표기형(교육 플랫폼)",       text: "패스트캠퍼스 강의에서",                        expect: ["패스트캠퍼스", "강의"] },
    { name: "프론트매터도 검사하는가",        text: '---\nsource: "테디노트 RAG 비법노트"\n---\n본문', expect: ["테디노트"] },
    { name: "라틴이 다른 낱말에 묻히지 않는가", text: "7 커맨드 Cheatsheet를 만든다",          expect: [] },
    { name: "한글은 조사가 붙어도 잡는가",     text: "테디노트의 자료를 보면",                 expect: ["테디노트"] },
    { name: "깨끗한 문장에 오탐이 없는가",    text: "Elasticsearch 색인 파이프라인을 설계한다.",    expect: [] },
    { name: "SOFT를 HARD로 승격하지 않는가",  text: "recruiter 에이전트는 면접 질문을 만든다.",     expect: ["면접"] },

    // ↓ 산출물 검사(--built)를 세우며 드러난 두 결함. 각각이 거짓 0건의 원인이었다.
    { name: "밑줄 뒤의 라틴을 잡는가",        text: '<img src="/images/Ted_yanadoo.png">',           expect: ["yanadoo"] },
    { name: "밑줄 앞의 라틴을 잡는가",        text: "yanadoo_app.png 를 참조한다",                  expect: ["yanadoo"] },
    { name: "산출물은 한 줄에 여러 번 나와도 횟수를 센다", countAll: true,
      text: '<meta property="og:image" content="/i/Ted_yanadoo.png"><meta name="twitter:image" content="/i/Ted_yanadoo.png">',
      expect: ["yanadoo"], counts: { yanadoo: 2 } },
    { name: "기본 모드는 한 줄을 1건으로 접는다",
      text: '<meta content="/i/Ted_yanadoo.png"><meta content="/i/Ted_yanadoo.png">',
      expect: ["yanadoo"], counts: { yanadoo: 1 } },

    // ↓ 정당 문맥 면제. 「넓게 봐주기」가 아니라 「이 문자열 안에서만」이라는 것을 양쪽으로 고정한다.
    { name: "JSON-LD author 의 실명은 산출물에서 면제한다", built: true, countAll: true,
      text: '{"@type":"BlogPosting","author":{"@type":"Person","name":"허우용"},"url":"/x"}',
      expect: [] },
    { name: "면제는 그 문맥 밖으로 새지 않는다", built: true, countAll: true,
      text: '<title>기술 노트 | 허우용</title><p>허우용이 설계했다</p>',
      expect: ["허우용"], counts: { 허우용: 2 } },
    { name: "면제는 소스 스캔에 적용되지 않는다",
      text: '본문에 "author":{"@type":"Person","name":"허우용"} 를 그대로 적었다',
      expect: ["허우용"] },
  ];

  // ── 커버리지 ──────────────────────────────────────────────────────
  //
  // 🔴 위의 손으로 쓴 케이스들은 HARD 18개 중 **5개**, SOFT 8개 중 **2개**만 증명했다.
  //    나머지 19개는 목록에 적혀 있을 뿐 **한 번도 검출된 적이 없다.** 표기형 하나가
  //    빠져 거짓 0 이 CHANGELOG 에 사실로 기록된 것이 이 검사기가 생긴 이유인데,
  //    정작 자기 검사가 같은 실패에 열려 있었다.
  //
  //    낱말마다 케이스를 손으로 쓰면 새 낱말을 넣을 때 케이스를 빠뜨린다. 그래서
  //    **목록을 순회해 생성한다** — 목록이 정본이므로 케이스도 목록에서 나와야 한다.
  const NEUTRAL = "이 문장은 통제용이며 다른 낱말을 담지 않는다";
  for (const w of [...HARD, ...SOFT]) {
    cases.push({ name: `커버리지 — 「${w}」를 실제로 잡는다`, text: `${NEUTRAL} ${w} 뒤쪽도 중립이다`, expect: [w] });
  }

  // 한글 낱말은 조사가 붙어 이어진다. 라틴과 달리 단어 경계를 요구하지 않는 이유이며,
  // 그 처리가 낱말별로 실제로 작동하는지는 붙여 봐야 안다.
  //
  // ⚠️ `allowExtra` — 조사가 붙으면 **다른 금칙어가 낱말 안쪽에 생긴다.** 실측으로
  //    「수강」+「의」가 「강의」를 낳았다. 이 케이스가 묻는 것은 「조사가 붙어도 그
  //    낱말을 잡는가」이므로 놓침만 본다. 겹침 자체는 아래에서 따로 못박는다.
  for (const w of [...HARD, ...SOFT].filter((x) => !isAsciiWord(x))) {
    cases.push({
      name: `커버리지 — 「${w}」에 조사가 붙어도 잡는다`,
      text: `${NEUTRAL} ${w}의 자리다`,
      expect: [w],
      allowExtra: true,
    });
  }

  // 🔴 낱말 안쪽의 부분 일치는 **실재하며 고칠 대상이 아니다.** 한글은 조사가 붙어
  //    이어지므로 단어 경계를 요구할 수 없고, 요구하면 「테디노트의」를 놓친다.
  //    대가로 「수강의」가 「강의」로도 걸린다. 이것을 모른 채 스캔 결과를 읽으면
  //    위양성을 진짜 위반으로 보고하게 되므로, 특성으로 고정해 둔다.
  cases.push({
    name: "🔴 「수강의」는 「강의」로도 걸린다 (낱말 안쪽 부분 일치는 검사기의 특성이다)",
    text: "수강의 자리다",
    expect: ["수강", "강의"],
  });

  // 🔴 한글에 단어 경계를 요구하면 **라틴·숫자에 바로 붙은 자리**를 놓친다.
  //    한글 문맥에서는 조사도 경계로 잡히므로(한글은 `isWordChar` 가 아니다) 차이가
  //    드러나지 않는다 — 뮤턴트가 살아남은 자리였다. 파일명·슬러그가 그 경로다.
  cases.push({
    name: "라틴·숫자에 바로 붙은 한글도 잡는다 (한글에 단어 경계를 요구하면 놓친다)",
    text: "slug2024야나두page 를 참조한다",
    expect: ["야나두"],
  });

  // 🔴 커버리지 루프는 **목록에 남아 있는** 낱말만 돈다. 낱말을 지우면 케이스도 함께
  //    사라져 조용히 통과한다 — 이 검사기가 막으려던 바로 그 실패다. 개수를 못박아
  //    「줄어듦」을 실패로 만든다. 늘어나는 것은 정책 강화이므로 통과시킨다.
  const HARD_MIN = 18;
  const SOFT_MIN = 8;
  cases.push({ name: `목록이 줄어들지 않았다 (HARD ≥ ${HARD_MIN})`, listLen: HARD.length, listMin: HARD_MIN });
  cases.push({ name: `목록이 줄어들지 않았다 (SOFT ≥ ${SOFT_MIN})`, listLen: SOFT.length, listMin: SOFT_MIN });

  let pass = 0, fail = 0;
  console.log("=== self-test — 검사기가 실제로 잡는지 증명한다 ===\n");
  for (const c of cases) {
    // 목록 길이 케이스는 스캔이 아니다 — 목록 자체가 검사 대상이다.
    if (c.listMin !== undefined) {
      const ok = c.listLen >= c.listMin;
      console.log(`  ${ok ? "✅" : "❌"} ${c.name}`);
      if (!ok) console.log(`       ${c.listMin}개 이상이어야 하는데 ${c.listLen}개다 — 낱말이 지워졌다`);
      ok ? pass++ : fail++;
      continue;
    }
    const hits = scanText(c.text, [...HARD, ...SOFT], {
      countAll: c.countAll === true,
      allow: c.built ? BUILT_ALLOW : [], // built 케이스만 면제를 켠다
    });
    const found = new Set(hits.map((h) => h.word));
    const missing = c.expect.filter((w) => !found.has(w));
    const extra = c.allowExtra ? [] : [...found].filter((w) => !c.expect.includes(w));
    // counts 가 있으면 「몇 번 나왔는가」까지 본다. 산출물 HTML은 한 줄이 수십 KB라
    // 줄 단위로 세면 페이지당 2회가 1건으로 접힌다 — 그 접힘을 여기서 고정한다.
    const countMiss = [];
    for (const [w, n] of Object.entries(c.counts ?? {})) {
      const got = hits.filter((h) => h.word === w).length;
      if (got !== n) countMiss.push(`${w} ${n}회여야 하는데 ${got}회`);
    }
    const ok = missing.length === 0 && extra.length === 0 && countMiss.length === 0;
    console.log(`  ${ok ? "✅" : "❌"} ${c.name}`);
    if (!ok) {
      if (missing.length) console.log(`       놓친 낱말: ${missing.join(", ")}`);
      if (extra.length) console.log(`       오탐: ${extra.join(", ")}`);
      if (countMiss.length) console.log(`       횟수 불일치: ${countMiss.join(", ")}`);
    }
    ok ? pass++ : fail++;
  }
  console.log(`\n통과 ${pass} / 실패 ${fail}`);
  return fail === 0 ? 0 : 1;
}

// ── 적용 범위 ─────────────────────────────────────────────────────
//
// 익명화 정책의 대상은 **블로그 발행본**(content/blog)뿐이다. 다음은 대상이 아니다:
//   · pages/index.tsx · data/portfolio.ts · pages/product-lead*  — 포트폴리오다.
//     실명·회사명을 담는 것이 위반이 아니라 목적이다.
//   · docs/ · HANDOFF.md · CHANGELOG.md  — 내부 문서다. 금칙어 목록 자체를 담고 있다.
//
// 이 구분이 곧 정책이다. 범위를 넓히면 위반 490건이 보고되는데 그중 발행본은 0건이라,
// 검사기가 늑대소년이 되고 진짜 위반이 소음에 묻힌다.
// ⇒ --all 은 판정하지 않는다. 어디에 무엇이 있는지 보여주는 조사 도구이고, 판정은 사람이 한다.
//
// ⚠️ 소스가 깨끗한 것은 산출물이 깨끗하다는 증거가 아니다 — --built 가 필요한 이유다.
//   content/blog 에 금칙어가 0건이어도, 그 글을 감싸는 템플릿(components/site-head.tsx)이
//   금칙어를 넣으면 발행된 페이지에는 남는다. 실제로 og:image 기본값이 그랬고
//   out/blog 에 366회 남아 있는 동안 소스 스캔은 계속 0건을 반환했다.
//   out/blog 는 content/blog 의 산출물이므로 같은 정책이 적용되는 같은 대상이다 — 판정한다.
//   out/ 전체가 아니라 out/blog 만인 이유는 위와 같다. 포트폴리오는 정책 대상이 아니다.

// ── main ──────────────────────────────────────────────────────────
const argv = process.argv.slice(2);

if (argv.includes("--self-test")) process.exit(selfTest());

const surveyOnly = argv.includes("--all");
const builtMode = argv.includes("--built");

let files;
if (builtMode) {
  const root = join(process.cwd(), "out", "blog");
  let ok = false;
  try { ok = statSync(root).isDirectory(); } catch { ok = false; }
  if (!ok) {
    console.error("\n❌ out/blog 가 없다. --built 는 빌드 산출물을 검사한다 — 먼저 `npm run build` 를 돌려라.");
    console.error("   ⚠️ 산출물이 없는 채로 「0건」을 반환하면 그것이 곧 거짓 음성이다. 그래서 통과시키지 않는다.\n");
    process.exit(2);
  }
  files = walk(root, [], BUILT_EXT);
  // 클라이언트 네비게이션용 데이터도 발행물이다. HTML 의 __NEXT_DATA__ 와 같은 props 가
  // out/_next/data/<buildId>/blog/**.json 으로 한 벌 더 나간다.
  // 「HTML 에 들어 있으니 됐다」로 넘기면 그 한 벌이 사각지대가 된다 — 검사하는 척하지 않는다.
  // buildId 는 빌드마다 바뀌므로 경로를 박지 않고 훑어서 /blog/ 를 지나는 것만 고른다.
  const dataRoot = join(process.cwd(), "out", "_next", "data");
  let dataOk = false;
  try { dataOk = statSync(dataRoot).isDirectory(); } catch { dataOk = false; }
  if (dataOk) {
    const slash = String.fromCharCode(92);
    for (const f of walk(dataRoot, [], BUILT_EXT)) {
      const p = relative(process.cwd(), f).split(slash).join("/");
      // 블로그 홈은 `<buildId>/blog.json` 이라 `/blog/` 를 지나지 않는다. 둘 다 받는다.
      if (p.includes("/blog/") || p.endsWith("/blog.json")) files.push(f);
    }
  }
} else if (surveyOnly) files = walk(process.cwd());
else if (argv.length > 0) files = argv.filter((a) => !a.startsWith("--"));
else files = walk(join(process.cwd(), "content", "blog"));

// 이 스크립트 자신은 금칙어 목록을 담고 있으므로 검사 대상에서 뺀다.
const SELF = join(process.cwd(), "scripts", "check-forbidden.mjs");
files = files.filter((f) => join(process.cwd(), relative(process.cwd(), f)) !== SELF);

let hardTotal = 0, softTotal = 0;
const hardFiles = [], softFiles = [];

for (const f of files) {
  let text;
  try { text = readFileSync(f, "utf8"); } catch { continue; }
  const hard = scanText(text, HARD, { countAll: builtMode, allow: builtMode ? BUILT_ALLOW : [] });
  // 산출물에서 SOFT 는 보지 않는다 — 소스에서 이미 판정한 같은 문장이 그대로 다시 나와
  // 소음만 늘린다. 산출물이 답해야 하는 질문은 「고유명사가 남았는가」 하나다.
  const soft = builtMode ? [] : scanText(text, SOFT);
  if (hard.length) { hardFiles.push([f, hard]); hardTotal += hard.length; }
  if (soft.length) { softFiles.push([f, soft]); softTotal += soft.length; }
}

const rel = (f) => relative(process.cwd(), f).split(String.fromCharCode(92)).join("/");

if (hardFiles.length && builtMode) {
  // 낱말별로 묶는다. 366건을 개별로 찍으면 읽히지 않고, 고쳐야 할 자리는 낱말당 하나다.
  console.log("\n❌ HARD — 산출물에 남은 위반. 소스가 아니라 템플릿이 원인일 수 있다\n");
  const byWord = new Map();
  for (const [f, hits] of hardFiles)
    for (const h of hits) {
      if (!byWord.has(h.word)) byWord.set(h.word, { n: 0, files: new Set(), sample: h.text });
      const e = byWord.get(h.word);
      e.n++; e.files.add(rel(f));
    }
  for (const [w, e] of [...byWord].sort((a, b) => b[1].n - a[1].n)) {
    console.log(`  [${w}]  ${e.n}회 · ${e.files.size}개 파일`);
    console.log(`       예: ${[...e.files][0]}  …${e.sample.slice(0, 100)}…`);
  }
} else if (hardFiles.length) {
  console.log("\n❌ HARD — 문맥과 무관한 위반. 반드시 고쳐라\n");
  for (const [f, hits] of hardFiles)
    for (const h of hits) console.log(`  ${rel(f)}:${h.line}  [${h.word}]  ${h.text.slice(0, 110)}`);
}

if (softFiles.length) {
  console.log("\n⚠️ SOFT — 정당한 문맥일 수 있다. 줄을 열어 사람이 판정하라\n");
  for (const [f, hits] of softFiles)
    for (const h of hits) console.log(`  ${rel(f)}:${h.line}  [${h.word}]  ${h.text.slice(0, 110)}`);
}

if (builtMode) {
  console.log(`\n산출물 ${files.length}개 파일 · HARD ${hardTotal}회 (출현 횟수다. 줄 수가 아니다)`);
  console.log("※ 산출물에서는 SOFT 를 보지 않는다 — 소스에서 판정한 문장이 그대로 다시 나올 뿐이다");
  process.exit(hardTotal > 0 ? 1 : 0);
}

console.log(`\n검사 파일 ${files.length}개 · HARD ${hardTotal}건 · SOFT ${softTotal}건`);
console.log("※ 1인칭은 이 검사기가 판정하지 않는다 — grep으로 분리되지 않는다(스크립트 주석 참조)");

if (surveyOnly) {
  console.log("※ --all 은 조사 모드다. 포트폴리오·내부 문서는 정책 대상이 아니므로 판정하지 않는다(종료 코드 0)");
  process.exit(0);
}
process.exit(hardTotal > 0 ? 1 : 0);
