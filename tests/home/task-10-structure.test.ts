// tests/home/task-10-structure.test.ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Task 10 (pages/index.tsx 조립 재작성) 의 구조 단언.
 *
 * ⚠️ **Task 10 구현 전에는 이 파일의 「신규 파일 존재」·「미사용 증명」 계열 검사가
 *    전부 빨갛고, 그것이 정상이다.** `components/home/*.tsx` 는 아직 하나도 없고
 *    `pages/index.tsx` 는 아직 구 마크업(`PortfolioNav` 직접 렌더, `SectionAtlas` 미조립) 그대로다.
 *    이 파일은 화면에 안 보이는 것만 검사한다 — 렌더 여부·접근성·시각 상태는
 *    `e2e/hero.spec.ts`·`shell.spec.ts`·`smoke.spec.ts` 가 맡는다.
 *
 * ⚠️ **부정 단언(「없다」)에는 반드시 대조군을 붙인다.** 이 리포는 「없다」와
 *    「읽을 수 없었다」가 같은 출력으로 나와 거짓 0 을 실제로 겪었다(docs/TOOL-TRAPS.md).
 *    각 negative describe 옆의 control describe 가 같은 읽기 경로로 「이건 있어야 정상」을
 *    확인한다 — control 이 깨지면 negative 의 초록은 무의미하다.
 */

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, "pages", "index.tsx");
const HOME_DIR = path.join(ROOT, "components", "home");

/** 존재하지 않는 파일은 "읽을 수 없었다" 를 숨기지 않고 그대로 던진다 — 조용한 빈 문자열 금지. */
function readSource(p: string): string {
  return fs.readFileSync(p, "utf8");
}

const INDEX = readSource(INDEX_PATH);

/**
 * `components/home/` 아래 `.tsx` 파일들을 이름→내용 맵으로 읽는다.
 * 디렉터리가 아직 없으면(Task 10 이전) 빈 맵을 돌려준다 — 이 경우 자체를
 * 아래 대조군 검사가 「0개」로 잡아 실패시킨다. 조용히 통과하지 않는다.
 */
function readHomeComponents(): Record<string, string> {
  if (!fs.existsSync(HOME_DIR)) return {};
  const out: Record<string, string> = {};
  for (const entry of fs.readdirSync(HOME_DIR, { withFileTypes: true })) {
    if (entry.isFile() && /\.tsx$/.test(entry.name)) {
      out[entry.name] = readSource(path.join(HOME_DIR, entry.name));
    }
  }
  return out;
}

/** JSX 사용 횟수를 센다 — import 문이 아니라 `<Name` 형태의 실제 사용. */
function jsxUsageCount(src: string, componentName: string): number {
  const re = new RegExp(`<${componentName}[\\s/>]`, "g");
  return Array.from(src.matchAll(re)).length;
}

describe("추출기 자체 증명 — 대조군이 실제로 살아 있는가", () => {
  it("pages/index.tsx 를 실제로 읽었다 (빈 문자열이 아니다)", () => {
    expect(INDEX.length, "pages/index.tsx 읽기 결과가 비어 있다 — 경로가 틀렸을 가능성").toBeGreaterThan(0);
  });

  it("jsxUsageCount 는 없는 컴포넌트에 0 을, 있는 컴포넌트에 1 이상을 돌려준다", () => {
    const sample = `export function X() { return <Foo /> }`;
    expect(jsxUsageCount(sample, "Foo")).toBe(1);
    expect(jsxUsageCount(sample, "Bar")).toBe(0);
  });
});

describe("[검사 1] pages/index.tsx 는 SectionAtlas 를 렌더하지 않는다 — 구현 전 RED (파일 부재)", () => {
  it("대조군: SectionSelectedWork 사용이 1건 이상이다", () => {
    // 이 대조군이 실패하면 「SectionAtlas 0건」의 초록은 신뢰할 수 없다 —
    // pages/index.tsx 자체가 아직 조립 코드로 재작성되지 않았다는 뜻이다.
    const count = jsxUsageCount(INDEX, "SectionSelectedWork");
    expect(count, "SectionSelectedWork 사용이 0건 — 아직 조립 코드로 재작성되지 않았다").toBeGreaterThanOrEqual(1);
  });

  it("components/home/section-atlas.tsx 파일이 존재한다", () => {
    const p = path.join(HOME_DIR, "section-atlas.tsx");
    expect(fs.existsSync(p), `${p} 가 없다`).toBe(true);
  });

  it("pages/index.tsx 안에 SectionAtlas 사용이 0건이다", () => {
    const count = jsxUsageCount(INDEX, "SectionAtlas");
    expect(count, `SectionAtlas 사용이 ${count}건 — pages/index.tsx 가 아틀라스 섹션을 직접 조립하면 안 된다`).toBe(0);
  });
});

describe("[검사 2] pages/index.tsx 는 PortfolioNav 를 import 하지 않는다 — 구현 전 RED (구 마크업 잔존)", () => {
  it("대조군: SiteHead 는 여전히 import 돼 있다", () => {
    // 같은 import-문자열 검사 방식으로 잰다. 이것이 실패하면 INDEX 읽기 자체가 깨진 것이다.
    const count = Array.from(INDEX.matchAll(/^import\s*\{[^}]*\bSiteHead\b[^}]*\}\s*from\s*["']@\/components\/site-head["'];?$/gm)).length;
    expect(count, "SiteHead import 가 0건 — pages/index.tsx 읽기 경로 자체를 의심하라").toBeGreaterThanOrEqual(1);
  });

  it("pages/index.tsx 가 @/components/portfolio-nav 에서 PortfolioNav 를 import 하지 않는다", () => {
    const count = Array.from(
      INDEX.matchAll(/^import\s*\{[^}]*\bPortfolioNav\b[^}]*\}\s*from\s*["']@\/components\/portfolio-nav["'];?$/gm),
    ).length;
    expect(count, `PortfolioNav import 가 ${count}건 — 구 내비게이션 마크업이 아직 제거되지 않았다`).toBe(0);
  });
});

describe("[검사 3] components/home/*.tsx 는 과도기 색상 필드를 소비하지 않는다 — 구현 전 RED (디렉터리 부재)", () => {
  const HOME = readHomeComponents();
  const files = Object.keys(HOME);

  it("대조군: components/home/ 에서 읽어들인 .tsx 파일이 0개가 아니다", () => {
    // 0개면 아래 「companyClass 0건」이 파일을 하나도 못 읽었기 때문일 뿐인 자동 통과가 된다.
    expect(files.length, "components/home/ 에 .tsx 파일이 하나도 없다 — Task 10 신규 컴포넌트가 아직 없다").toBeGreaterThan(0);
  });

  it("어느 components/home/*.tsx 파일도 companyClass 를 참조하지 않는다", () => {
    const offenders = files.filter((name) => /companyClass/.test(HOME[name]));
    expect(
      offenders,
      `companyClass 를 참조하는 파일: ${offenders.join(", ")} — data/experience.ts 의 과도기 필드를 우회해야 한다`,
    ).toEqual([]);
  });

  // `bulletClass` 는 `companyClass` 와 **같은 4색 액센트의 500 단계**다(data/experience.ts).
  // 한쪽만 단언하면 다른 쪽이 들어와도 초록으로 통과한다 — 실제로 이 단언이 없던 동안
  // 리뷰가 그 구멍을 지적했다. 두 필드는 함께 살고 함께 죽는다.
  //
  // 위 「읽어들인 .tsx 파일이 0개가 아니다」 대조군을 이 it 도 공유한다. 그것이 빨가면
  // 여기 초록은 「참조가 없다」가 아니라 「파일을 못 읽었다」일 뿐이다.
  it("어느 components/home/*.tsx 파일도 bulletClass 를 참조하지 않는다", () => {
    const offenders = files.filter((name) => /bulletClass/.test(HOME[name]));
    expect(
      offenders,
      `bulletClass 를 참조하는 파일: ${offenders.join(", ")} — data/experience.ts 의 과도기 필드를 우회해야 한다`,
    ).toEqual([]);
  });

  // 위 두 부정 단언 자체가 살아 있는지 증명한다. 정규식이 어떤 이유로든 매치를 못 하게
  // 되면 두 단언은 영원히 초록이 되고, 그 침묵은 「깨끗하다」와 구분되지 않는다.
  it("대조군: 같은 방식의 탐지가 실제로 존재하는 문자열을 잡아낸다", () => {
    const sample = { "x.tsx": "const a = exp.companyClass; const b = exp.bulletClass;" };
    expect(Object.keys(sample).filter((n) => /companyClass/.test(sample[n as keyof typeof sample]))).toEqual(["x.tsx"]);
    expect(Object.keys(sample).filter((n) => /bulletClass/.test(sample[n as keyof typeof sample]))).toEqual(["x.tsx"]);
  });
});

describe("[검사 4] pages/index.tsx 의 SiteHead 호출에 path prop 이 있다", () => {
  it("대조군: SiteHead 호출 자체가 존재한다", () => {
    const count = jsxUsageCount(INDEX, "SiteHead");
    expect(count, "SiteHead 사용이 0건 — pages/index.tsx 읽기 경로 자체를 의심하라").toBeGreaterThanOrEqual(1);
  });

  it("<SiteHead ...> 호출 블록 안에 path= 가 있다", () => {
    const m = /<SiteHead\b([\s\S]*?)\/>/.exec(INDEX);
    expect(m, "<SiteHead ... /> 자기닫힘 태그를 찾지 못했다").not.toBeNull();
    expect(m![1], "SiteHead 호출에 path prop 이 없다 — canonical·og:url 이 빠진다").toMatch(/\bpath\s*=/);
  });
});
