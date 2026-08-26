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

/**
 * 인덱스가 담아야 할 최소 페이지 수.
 *
 * 글이 156 편이고 카테고리·태그·페이지네이션까지 잡히므로 실제로는 242 다(2026-08-26 실측).
 * **하한을 글 수에 맞춘다** — 이 값이 100 이던 시절에는 156 편 중 56 편이 인덱스에서
 * 사라져도 초록이었고, 에러 메시지만 「글이 156 편이므로」라고 말하고 있었다.
 * 근거로 든 숫자가 판정식에 없으면 그 메시지는 설명이 아니라 장식이다.
 */
const MIN_PAGES = 156;

/**
 * 조각 하나의 최소 바이트.
 *
 * ⚠️ 개수만 세면 **0바이트 조각도 초록**이다(2026-08-26 실측: 10,853→0 바이트로 비웠는데
 *    `✔ … 조각 242 건` 에 exit 0). pagefind 조각은 gzip 이라 빈 파일이 될 수 없고,
 *    실제 최소값은 수백 바이트다. 32 는 「gzip 헤더조차 없다」를 잡는 하한이다.
 */
const MIN_FRAGMENT_BYTES = 32;

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
    return {
      code: 1,
      message: `✖ 한국어 페이지가 ${pages} 건뿐이다. 글만 156 편이므로 하한 ${MIN_PAGES} 에 못 미친다.`,
    };
  }

  /**
   * 조각 파일이 실제로 **내용까지** 있는지 본다.
   *
   * page_count 는 entry JSON 안의 **자기 신고 값**이다. 조각이 없거나 비었는데
   * 숫자만 남아 있으면 검색은 전부 0건을 내는데 이 검증기는 초록이 된다 —
   * 「소스가 깨끗한 것이 산출물이 깨끗하다는 뜻은 아니다」와 같은 구조다.
   *
   * ⚠️ 개수만 세던 판이 실제로 이 구멍에 빠졌다. 조각 하나를 0바이트로 비워도 초록이었다.
   *    확장자로 거르는 것도 함께 한다 — 잔여 파일이나 하위 디렉터리가 조각으로 계수됐다.
   */
  const fragmentDir = path.join(dir, "fragment");
  const entries = fs.existsSync(fragmentDir)
    ? fs.readdirSync(fragmentDir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith(".pf_fragment"))
    : [];
  if (entries.length === 0) {
    return {
      code: 1,
      message: `✖ ${fragmentDir} 에 .pf_fragment 조각이 0 건이다. page_count 는 ${pages} 라고 말하지만 실물이 없다.`,
    };
  }

  const tiny = entries.filter(
    (e) => fs.statSync(path.join(fragmentDir, e.name)).size < MIN_FRAGMENT_BYTES,
  );
  if (tiny.length > 0) {
    return {
      code: 1,
      message:
        `✖ 조각 ${tiny.length} 건이 ${MIN_FRAGMENT_BYTES} 바이트 미만이다 — 개수는 맞는데 속이 비었다.\n` +
        `  예: ${tiny.slice(0, 3).map((e) => e.name).join(", ")}`,
    };
  }

  return {
    code: 0,
    message: `✔ pagefind 인덱스 정상 — 언어 ${names.join(", ")} / ${ko} 페이지 ${pages} 건 / 조각 ${entries.length} 건`,
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

  /**
   * 인덱스 하나를 만든다. 인자를 바꿔 원하는 곳만 망가뜨린다.
   *
   * `bytes` 는 조각 하나의 크기다. 이게 인자인 이유는 「개수는 맞는데 속이 빈」 경우가
   * 실제로 검증기를 통과했기 때문이다 — 픽스처가 항상 정상 크기면 그 구멍을 영원히 못 잡는다.
   */
  const make = (name, entry, fragmentCount, bytes = 64, ext = ".pf_fragment") => {
    const dir = path.join(root, name);
    fs.mkdirSync(dir, { recursive: true });
    if (entry !== null) fs.writeFileSync(path.join(dir, "pagefind-entry.json"), entry, "utf8");
    if (fragmentCount > 0) {
      const fragDir = path.join(dir, "fragment");
      fs.mkdirSync(fragDir, { recursive: true });
      for (let i = 0; i < fragmentCount; i++) {
        fs.writeFileSync(path.join(fragDir, `f${i}${ext}`), "x".repeat(bytes), "utf8");
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
    ["페이지 수가 하한 바로 아래", make("edge-below", ok(MIN_PAGES - 1), 3), 1],
    ["페이지 수가 하한 정확히", make("edge-exact", ok(MIN_PAGES), 3), 0],
    ["page_count 는 있는데 조각이 0 건", make("no-fragment", ok(242), 0), 1],
    // ↓ 개수만 세던 시절 조용히 통과하던 두 구간. 이 둘이 이 자기검사의 존재 이유다.
    ["조각은 있는데 0 바이트", make("empty-fragment", ok(242), 5, 0), 1],
    ["조각 확장자가 다르다 (잔여 파일)", make("wrong-ext", ok(242), 5, 64, ".bak"), 1],
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
