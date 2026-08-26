/**
 * Pagefind 인덱스가 실제로 만들어졌는지 본다.
 *
 * 왜 필요한가: `npx pagefind` 는 스캔할 HTML 을 하나도 못 찾아도 **성공으로 끝난다.**
 * 그러면 out/pagefind/ 가 생기긴 하는데 안이 비어 있고, 화면에서는
 * 「검색해도 아무것도 안 나온다」로만 보인다 — 이 리포가 반복해서 데인 「거짓 0」 과 같은 얼굴이다.
 *
 * 2026-08-26 실측한 pagefind 1.5.2 의 entry 구조 (이 스크립트가 여기에 의존한다):
 *   {"version":"1.5.2","languages":{"ko":{"hash":"...","wasm":null,"page_count":242}},...}
 *
 * 종료코드
 *   0  정상
 *   1  인덱스가 비었거나 한국어가 없다
 *   2  out/pagefind 자체가 없다 (빌드를 안 돌렸다) — 「0건」 과 구분한다
 *
 * ⚠️ 먼저 `npm run check-pagefind:verify` 로 이 검사기가 실제로 무언가를 잡는다는 것을
 *    증명하고 나서 초록을 믿어라. 증명되지 않은 0 은 거짓 음성과 구별되지 않는다
 *    (CLAUDE.md 「Pre-publish checks」와 같은 규칙).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** 글 수(156)보다 적으면 무언가 빠진 것이다. 목록 페이지까지 잡히므로 실제로는 242 근처다. */
const MIN_PAGES = 100;

/**
 * 인덱스 하나를 검사한다. 부수효과 없이 판정만 돌려준다 — self-test 가 같은 함수를 부른다.
 *
 * @returns {{ code: 0|1|2, message: string }}
 */
export function checkIndex(dir) {
  const entryPath = path.join(dir, "pagefind-entry.json");

  if (!fs.existsSync(dir)) {
    return { code: 2, message: `✖ ${dir} 가 없다. \`npm run build\` 를 먼저 돌려라.` };
  }
  if (!fs.existsSync(entryPath)) {
    return { code: 2, message: `✖ ${entryPath} 가 없다. pagefind 가 끝까지 돌지 않았다.` };
  }

  let entry;
  try {
    entry = JSON.parse(fs.readFileSync(entryPath, "utf8"));
  } catch (e) {
    return { code: 2, message: `✖ ${entryPath} 를 JSON 으로 읽지 못했다: ${e.message}` };
  }

  const langs = entry.languages ?? {};
  const names = Object.keys(langs);
  if (names.length === 0) {
    return { code: 1, message: "✖ 인덱스에 언어가 하나도 없다. 스캔된 HTML 이 0건이다." };
  }

  // 한국어 키는 `ko` 또는 `ko-kr` 로 나올 수 있다. 앞부분만 본다.
  const ko = names.find((n) => n.toLowerCase().startsWith("ko"));
  if (!ko) {
    return {
      code: 1,
      message:
        `✖ 한국어 인덱스가 없다. 잡힌 언어: ${names.join(", ")}\n` +
        '  pages/_document.tsx 의 <Html lang="ko"> 를 확인하라 (GC-8).',
    };
  }

  const pages = langs[ko].page_count ?? 0;
  if (pages < MIN_PAGES) {
    return { code: 1, message: `✖ 한국어 페이지가 ${pages} 건뿐이다. 글이 156 편이므로 너무 적다.` };
  }

  /**
   * 조각 파일이 실제로 있는지도 본다.
   *
   * page_count 는 entry JSON 안의 **자기 신고 값**이다. 조각이 하나도 안 쓰였는데
   * 숫자만 남아 있으면 검색은 전부 0건을 내는데 이 검증기는 초록이 된다 —
   * 「소스가 깨끗한 것이 산출물이 깨끗하다는 뜻은 아니다」와 같은 구조다.
   */
  const fragmentDir = path.join(dir, "fragment");
  const fragments = fs.existsSync(fragmentDir) ? fs.readdirSync(fragmentDir).length : 0;
  if (fragments === 0) {
    return {
      code: 1,
      message: `✖ ${fragmentDir} 에 조각이 0 건이다. page_count 는 ${pages} 라고 말하지만 실물이 없다.`,
    };
  }

  return {
    code: 0,
    message: `✔ pagefind 인덱스 정상 — 언어 ${names.join(", ")} / ${ko} 페이지 ${pages} 건 / 조각 ${fragments} 건`,
  };
}

/**
 * 검사기가 실제로 무언가를 잡는지 증명한다.
 *
 * 케이스 목록은 **코드 안에** 있고 개수도 코드가 센다 — 문서에 적으면 낡는다.
 * 각 케이스는 임시 디렉터리에 고장난 인덱스를 만들어 기대 종료코드를 확인한다.
 */
function selfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagefind-selftest-"));

  /** 정상 인덱스 하나를 만든다. mutate 로 원하는 곳만 망가뜨린다. */
  const make = (name, entry, fragmentCount) => {
    const dir = path.join(root, name);
    fs.mkdirSync(dir, { recursive: true });
    if (entry !== null) fs.writeFileSync(path.join(dir, "pagefind-entry.json"), entry, "utf8");
    if (fragmentCount > 0) {
      const fragDir = path.join(dir, "fragment");
      fs.mkdirSync(fragDir, { recursive: true });
      for (let i = 0; i < fragmentCount; i++) {
        fs.writeFileSync(path.join(fragDir, `f${i}.pf_fragment`), "x", "utf8");
      }
    }
    return dir;
  };

  const ok = (pages) => JSON.stringify({ version: "1.5.2", languages: { ko: { page_count: pages } } });

  const cases = [
    ["디렉터리 자체가 없다", path.join(root, "존재하지-않음"), 2],
    ["entry JSON 이 없다", make("no-entry", null, 3), 2],
    ["entry 가 JSON 이 아니다", make("bad-json", "{망가짐", 3), 2],
    ["언어가 하나도 없다", make("no-lang", JSON.stringify({ languages: {} }), 3), 1],
    [
      "한국어가 아니라 영어만 잡혔다 (GC-8 회귀)",
      make("en-only", JSON.stringify({ languages: { en: { page_count: 242 } } }), 3),
      1,
    ],
    ["페이지 수가 하한 미달", make("too-few", ok(3), 3), 1],
    ["page_count 는 있는데 조각이 0 건", make("no-fragment", ok(242), 0), 1],
    ["정상", make("healthy", ok(242), 5), 0],
  ];

  let failed = 0;
  for (const [name, dir, expected] of cases) {
    const got = checkIndex(dir).code;
    if (got !== expected) {
      console.error(`  ✖ ${name} — 종료코드 ${expected} 를 기대했는데 ${got} 였다`);
      failed++;
    } else {
      console.log(`  ✔ ${name} → ${got}`);
    }
  }

  fs.rmSync(root, { recursive: true, force: true });

  if (failed > 0) {
    console.error(`✖ 자기검사 실패 — ${cases.length} 건 중 ${failed} 건이 틀렸다.`);
    return 1;
  }
  console.log(`✔ 자기검사 통과 — ${cases.length} 건. 이 검사기의 초록을 믿어도 된다.`);
  return 0;
}

const isSelfTest = process.argv.includes("--self-test");
if (isSelfTest) {
  process.exit(selfTest());
}

const result = checkIndex(path.join("out", "pagefind"));
if (result.code === 0) console.log(result.message);
else console.error(result.message);
process.exit(result.code);
