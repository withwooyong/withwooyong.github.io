#!/usr/bin/env node
// 설치된 의존성의 engines.node 가 CI 의 Node 에서도 도는지 판정한다.
//
// 🔴 `npm install` 은 의존성의 engines 를 강제하지 않는다. 그래서 로컬 Node 에서만
//    만족되는 패키지가 경고 없이 설치되고 **CI 에서만 죽는다.** 실측으로 두 번 겪었다.
//    ① jsdom 30 이 로컬 Node 24 에서 21/21 을 내고 CI 의 Node 20 에서 죽었다.
//    ② 발표본의 운영 의존성 넷(commander 15 · postcss-nested 8 · unplugin-vue-markdown 32 ·
//       vite-plugin-static-copy 4)이 Node 22 를 요구하는데 로컬이 24 라 38초에 빌드됐다.
//
// 🔴 **②의 넷은 직접 의존성이 아니라 transitive 다.** `slidev-poc/package.json` 에는
//    `@slidev/cli` 만 있고 넷은 그 아래에서 hoisting 된다. 그래서 직접 의존성만 보는 검사는
//    이 사례를 **잡지 못한다** — 실측으로 node-version 을 20 으로 낮춰도 위반 0 이었다.
//    ⇒ 설치된 트리 **전량**을 본다.
//
// ⚠️ ②를 낳은 발표본 갈래는 2026-09-12 에 걷어냈고 지금 보는 트리는 리포 루트 하나다.
//    그래도 이 검사는 남긴다 — 같은 함정(`npm install` 이 engines 를 강제하지 않는다)이
//    본체 트리에도 그대로 있고, ①은 애초에 본체의 jsdom 이었다.
//
// ⚠️ 로컬 트리는 CI 트리의 상위집합이다. 로컬에만 있는 판이 섞이면 그 방향의 어긋남은
//    **거짓 양성**일 뿐 거짓 음성이 아니다. 여기서 0 이면 CI 에서도 0 이다.
//
// 판정(decideEngines)과 수집(collect)을 나눈다. 판정이 순수 함수라야 node_modules 없이
// 자기 검사가 돌고, 뮤테이션이 그 자리를 되살릴 수 있다. 가드가 main 에 흩어져 있으면
// 통째로 지워도 케이스가 전부 통과한다.
import fs from "node:fs";
import path from "node:path";

const WORKFLOW = path.join(".github", "workflows", "deploy.yml");

/**
 * 어느 트리를 볼 것인가. **CI 가 `npm ci` 를 돌리는 디렉터리와 같아야 한다.**
 *
 * ⚠️ 이 상수는 낡을 수 있다. 워크플로에서 설치 디렉터리를 실제로 읽어 대조하는 케이스를
 *    자기 검사에 둔다 — 워크스페이스가 늘거나 줄면 거기서 걸린다.
 */
const TARGETS = [
  { dir: ".", modules: "node_modules" },
];

/**
 * CI 가 쓰는 Node 메이저 버전을 워크플로 파일에서 읽는다. **워크플로가 정본이다.**
 */
export function ciNodeMajor(source) {
  const text = source ?? fs.readFileSync(WORKFLOW, "utf8");
  const match = text.match(/node-version:\s*"?(\d+)/);
  return match ? Number(match[1]) : null;
}

/**
 * `engines.node` 범위가 그 메이저 대역을 허용하는지 본다.
 *
 * ⚠️ 판정은 **메이저 단위**다. `^20.19.0` 은 통과시키는데, `actions/setup-node` 가 그
 *    대역의 최신 patch 를 주므로 실질적으로 맞다. patch 까지 보려면 CI 가 실제로 설치한
 *    버전을 알아야 하는데, 그것은 워크플로 파일에 없다.
 */
export function rangeAllowsMajor(range, major) {
  if (!range || major === null) return true;
  return String(range)
    .split("||")
    .some((part) => {
      const term = part.trim();
      // `*` 는 「아무 버전이나」다. 숫자를 못 찾은 것을 불허로 읽으면 거짓 양성이 난다 —
      // 실측으로 fraction.js · glob · minimatch 셋이 그렇게 위반으로 올라왔다.
      if (term === "" || term === "*" || term === "x") return true;
      // `>=v12.22.7` 처럼 v 가 붙는 표기가 있다 (saxes 6).
      const match = term.match(/^(\^|~|>=|>)?\s*v?(\d+)/);
      if (!match) return false;
      const [, op, digits] = match;
      const declared = Number(digits);
      if (op === ">=" || op === ">") return major >= declared;
      return declared === major;
    });
}

/**
 * 워크플로에서 `npm ci` 를 돌리는 디렉터리를 전부 뽑는다.
 *
 * 🔴 스텝 블록 단위로 자른다. 파일 전체에서 두 문자열을 따로 찾으면 **설치와 무관한 스텝의**
 *    working-directory 가 목록에 섞인다.
 */
export function workflowInstallDirs(source) {
  const text = source ?? fs.readFileSync(WORKFLOW, "utf8");

  // 스텝 하나는 `- ` 로 열리고 다음 `- ` 앞에서 닫힌다.
  const blocks = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (/^\s*-\s/.test(line)) {
      if (current) blocks.push(current);
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) blocks.push(current);

  const dirs = new Set();
  for (const block of blocks) {
    const body = block.join("\n");
    if (!/npm\s+ci\b/.test(body)) continue;
    const where = body.match(/working-directory:\s*(\S+)/);
    dirs.add(where ? where[1] : ".");
  }
  return [...dirs].sort();
}

/**
 * @param {{name: string, dir: string, engines: string}[]} seen 설치본에서 관측한 engines 선언
 * @param {number|null} ciMajor
 * @param {string[]} dirs 반드시 관측되어야 하는 트리. 하나라도 비면 재지 못한 것이다
 * @returns {{code: 0|1|2, reason: string, violations: object[], missing: string[], judged: number}}
 */
export function decideEngines(seen, ciMajor, dirs) {
  const none = { violations: [], missing: [], judged: 0 };

  // 대상이 없는 것을 「위반 없음」으로 세지 않는다. 0개 통과는 통과가 아니다.
  if (!Array.isArray(seen) || seen.length === 0) return { code: 2, reason: "empty-list", ...none };

  // 🔴 트리 하나가 통째로 없으면 그쪽에서 관측되는 것이 0개가 되는데, 다른 쪽이 채워 주므로
  //    전체는 0개가 아니다. 그래서 「대상이 비었다」로는 잡히지 않고 조용히 통과한다.
  //    실제로 CI 는 slidev-poc 를 본체보다 **뒤에** 설치한다 — 순서가 어긋나면 여기가 열린다.
  const missingTree = (dirs ?? []).filter((dir) => !seen.some((o) => o.dir === dir));
  if (missingTree.length > 0) return { code: 2, reason: "missing-tree", ...none, missing: missingTree };

  if (ciMajor === null) return { code: 2, reason: "no-ci-version", ...none };

  const declared = seen.filter((o) => o.engines);
  if (declared.length === 0) return { code: 2, reason: "nothing-to-judge", ...none };

  const violations = declared.filter((o) => !rangeAllowsMajor(o.engines, ciMajor));
  const code = violations.length > 0 ? 1 : 0;
  return {
    code,
    reason: code === 0 ? "ok" : "too-new",
    violations,
    missing: [],
    judged: declared.length,
  };
}

/** 설치된 트리를 훑어 engines.node 를 선언한 패키지를 전부 모은다. */
function collect(target) {
  const seen = [];
  const stack = [target.modules];

  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);

      // `@scope` 는 패키지가 아니라 한 겹 더 들어가는 디렉터리다. 여기서 멈추면 스코프
      // 패키지가 통째로 빠진다 — @slidev/cli 가 그 형태다.
      if (entry.name.startsWith("@")) { stack.push(full); continue; }
      if (entry.name === ".bin") continue;

      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(full, "package.json"), "utf8"));
        const engines = pkg.engines?.node ?? null;
        if (engines) seen.push({ name: pkg.name ?? entry.name, dir: target.dir, engines });
      } catch { /* package.json 이 없으면 패키지가 아니다 */ }

      // 중첩 설치본. hoisting 이 안 된 것은 여기에만 있다.
      stack.push(path.join(full, "node_modules"));
    }
  }
  return seen;
}

// ---------------------------------------------------------------------------
// 자기 검사
// ---------------------------------------------------------------------------

// 실제로 CI 를 깨뜨린 값을 그대로 쓴다.
const RANGE_CASES = [
  ["① jsdom 30 의 요구는 Node 20 을 허용하지 않는다", "^22.22.2 || ^24.15.0 || >=26.0.0", 20, false],
  ["② jsdom 26 의 요구는 Node 20 을 허용한다", ">=18", 20, true],
  ["③ 캐럿은 그 메이저 대역만 허용한다", "^20.19.0 || ^22.13.0 || >=24.0.0", 20, true],
  ["④ 🔴 발표본을 죽인 commander 15 의 요구는 Node 20 을 허용하지 않는다", ">=22.12.0", 20, false],
  ["⑤ 같은 요구가 Node 22 는 허용한다 — 워크플로를 올려 닫은 자리다", ">=22.12.0", 22, true],
  ["⑥ 🔴 `*` 는 아무 버전이나 허용한다 — 숫자를 못 찾은 것을 「불허」로 읽으면 거짓 양성이 셋 난다", "*", 22, true],
  ["⑦ 🔴 `v` 접두사가 붙어도 읽는다 — saxes 의 `>=v12.22.7` 이 그 형태다", ">=v12.22.7", 22, true],
  ["⑧ 하이픈 범위의 상한을 넘으면 허용하지 않는다", "18 - 20", 22, false],
];

const OK = { name: "a", dir: ".", engines: ">=18" };
const DIRS = [".", "slidev-poc"];

function selfTest() {
  const cases = [];

  for (const [name, range, major, expected] of RANGE_CASES) {
    cases.push({ name, run: () => rangeAllowsMajor(range, major) === expected });
  }

  cases.push(
    {
      name: "⑨ 워크플로에서 CI 의 Node 메이저를 읽는다",
      run: () => ciNodeMajor('    with:\n      node-version: "20"\n') === 20,
    },
    {
      name: "⑩ 전부 허용하면 0건이다",
      run: () => decideEngines([OK, { ...OK, name: "b", dir: "slidev-poc", engines: ">=20" }], 22, DIRS).code === 0,
    },
    {
      name: "⑪ 하나가 어긋나면 위반이고 그 이름이 나온다",
      run: () => {
        const r = decideEngines([OK, { ...OK, name: "b", dir: "slidev-poc", engines: ">=24" }], 22, DIRS);
        return r.code === 1 && r.violations.length === 1 && r.violations[0].name === "b";
      },
    },
    {
      name: "⑫ 위반이 둘이면 둘 다 센다 — 하나를 고치고 초록을 보는 일이 없다",
      run: () => {
        const seen = [{ ...OK, name: "b", engines: ">=24" }, { ...OK, name: "c", dir: "slidev-poc", engines: ">=26" }];
        return decideEngines(seen, 22, DIRS).violations.length === 2;
      },
    },
    {
      name: "⑬ 🔴 대상 트리 하나가 통째로 비면 종료 코드 2 — 설치 안 한 것을 「깨끗함」으로 세지 않는다",
      run: () => {
        const r = decideEngines([OK], 22, DIRS);
        return r.code === 2 && r.reason === "missing-tree" && r.missing.includes("slidev-poc");
      },
    },
    {
      name: "⑭ 🔴 대상이 비면 종료 코드 2 — 0개 통과를 통과로 세지 않는다",
      run: () => decideEngines([], 22, DIRS).reason === "empty-list",
    },
    {
      name: "⑮ 🔴 CI 의 Node 를 못 읽으면 종료 코드 2 — 정본이 없으면 판정도 없다",
      run: () => {
        const r = decideEngines([OK, { ...OK, dir: "slidev-poc" }], null, DIRS);
        return r.code === 2 && r.reason === "no-ci-version";
      },
    },
    {
      name: "⑯ 판정에 도달한 수를 센다 — 대상 수와 대조할 수 있어야 한다",
      run: () => decideEngines([OK, { ...OK, name: "b", dir: "slidev-poc" }], 22, DIRS).judged === 2,
    },
    {
      name: "⑰ 🔴 워크플로에서 npm ci 를 돌리는 디렉터리를 전부 뽑는다",
      run: () => {
        const yml = "      - run: npm ci\n      - name: 발표본\n        run: npm ci --omit=dev\n        working-directory: slidev-poc\n";
        const dirs = workflowInstallDirs(yml);
        return dirs.length === 2 && dirs.includes(".") && dirs.includes("slidev-poc");
      },
    },
    {
      name: "⑱ working-directory 가 없으면 리포 루트다",
      run: () => {
        const dirs = workflowInstallDirs("      - run: npm ci\n");
        return dirs.length === 1 && dirs[0] === ".";
      },
    },
    {
      name: "⑲ 🔴 npm ci 가 없는 스텝의 working-directory 는 세지 않는다 — 설치와 무관한 스텝이 섞인다",
      run: () => {
        const yml = "      - run: npm ci\n      - run: npx slidev build\n        working-directory: slidev-poc\n";
        const dirs = workflowInstallDirs(yml);
        return dirs.length === 1 && dirs[0] === ".";
      },
    },
    {
      name: "⑳ 🔴 TARGETS 가 워크플로의 설치 디렉터리와 정확히 일치한다 — 워크스페이스가 늘면 여기서 걸린다",
      run: () => {
        const actual = workflowInstallDirs();
        const mine = TARGETS.map((t) => t.dir).sort();
        return actual.length === mine.length && actual.every((d, i) => d === mine[i]);
      },
    },
    {
      name: "㉑ 🔴 대상 트리에 판정할 것이 실제로 있다 — 필터를 통과한 집합으로 필터를 검사할 수 없다",
      run: () => TARGETS.every((t) => collect(t).length > 0),
    },
    {
      name: "㉒ 🔴 실제 설치본 전량이 CI 의 Node 에서 돈다 — 이 자리가 두 번 CI 를 죽였다",
      run: () => decideEngines(TARGETS.flatMap(collect), ciNodeMajor(), TARGETS.map((t) => t.dir)).code === 0,
    },
    {
      name: "㉓ 🔴 engines 를 선언한 것이 하나도 없으면 종료 코드 2 — 대조할 것이 있는지 먼저 센다",
      run: () => {
        const seen = [{ ...OK, engines: null }, { ...OK, name: "b", dir: "slidev-poc", engines: null }];
        const r = decideEngines(seen, 22, DIRS);
        return r.code === 2 && r.reason === "nothing-to-judge";
      },
    },
    {
      name: "㉔ 🔴 중첩 node_modules 안의 패키지도 관측한다 — hoisting 되지 않은 것은 거기에만 있다",
      run: () => {
        // 🔴 대조군은 **중첩만** 뺀 최상위다. @scope 까지 빼고 세면 그 몫이 여유가 되어,
        //    중첩 순회를 통째로 지워도 이 케이스가 통과한다 (실측 343 대 312).
        const target = TARGETS[0];
        let top = 0;
        for (const entry of fs.readdirSync(target.modules, { withFileTypes: true })) {
          if (!entry.isDirectory() || entry.name === ".bin") continue;
          const full = path.join(target.modules, entry.name);
          const dirs = entry.name.startsWith("@")
            ? fs.readdirSync(full, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => path.join(full, e.name))
            : [full];
          for (const p of dirs) {
            try {
              if (JSON.parse(fs.readFileSync(path.join(p, "package.json"), "utf8")).engines?.node) top += 1;
            } catch { /* 패키지가 아니다 */ }
          }
        }
        return collect(target).length > top;
      },
    },
    {
      name: "㉕ 🔴 @scope 패키지도 관측된다 — @typescript-eslint/parser 처럼 한 겹 더 들어간다",
      run: () => collect(TARGETS[0]).some((o) => o.name.startsWith("@")),
    },
    {
      // 🔴 종전에는 Node 20 으로 쟀다. 그때의 위반은 전부 발표본 트리에서 나왔으므로
      //    그 갈래를 걷어낸 지금은 20 으로 재면 0 이 되어 대조군이 헛돈다.
      //    본체 트리가 실제로 걸리는 값으로 낮춰 잡는다.
      name: "㉖ 🔴 대조군 — Node 16 으로 재면 실제로 위반이 나온다. 0 이 검사기가 죽어서인지 아닌지를 이것이 가른다",
      run: () => decideEngines(TARGETS.flatMap(collect), 16, TARGETS.map((t) => t.dir)).violations.length > 0,
    },
  );

  let pass = 0;
  for (const c of cases) {
    let ok = false;
    try { ok = c.run() === true; } catch { ok = false; }
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${c.name}`);
    if (ok) pass += 1;
  }
  console.log(`\nengines 검사기 자기 검사: ${pass}/${cases.length}`);
  if (pass === cases.length) console.log("검사기가 작동한다. 본 스캔의 0 은 결론이다.");
  return pass === cases.length ? 0 : 1;
}

// ── main ──────────────────────────────────────────────────────────
if (process.argv.includes("--self-test")) process.exit(selfTest());

const seen = TARGETS.flatMap(collect);
const ciMajor = ciNodeMajor();
const result = decideEngines(seen, ciMajor, TARGETS.map((t) => t.dir));

if (result.code === 2) {
  console.error(`\n❌ 판정하지 못했다 (${result.reason})`);
  if (result.reason === "missing-tree") {
    console.error(`   설치되지 않은 트리 — ${result.missing.join(" · ")}`);
    console.error("   `npm ci` 를 먼저 돌려라. 없는 것을 「위반 0」으로 세면 그것이 거짓 음성이다.");
  }
  if (result.reason === "no-ci-version") {
    console.error(`   ${WORKFLOW} 에서 node-version 을 읽지 못했다. 정본이 없으면 판정할 기준이 없다.`);
  }
  console.error("");
  process.exit(2);
}

if (result.code === 1) {
  console.error(`\n❌ CI 의 Node ${ciMajor} 에서 돌지 않는 의존성 ${result.violations.length}개\n`);
  for (const v of result.violations) {
    console.error(`   ${v.dir}  ${v.name}  engines.node = ${v.engines}`);
  }
  console.error("\n   npm install 은 engines 를 강제하지 않는다. 로컬에서만 도는 판이다.");
  console.error("   워크플로의 node-version 을 올리거나, 낮은 요구를 가진 버전을 골라라.\n");
  process.exit(1);
}

console.log(`✅ 설치본 ${seen.length}개의 engines 선언이 전부 CI 의 Node ${ciMajor} 에서 돈다 — ${TARGETS.map((t) => t.dir).join(" · ")}`);
