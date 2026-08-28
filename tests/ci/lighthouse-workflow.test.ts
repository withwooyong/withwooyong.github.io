// .github/workflows/lighthouse.yml 과 lighthouserc.json 이 T15 의 주장을 실제로 지키는지 검사한다.
//
// 🔴 이 파일이 존재하는 이유는 라이트하우스 잡이 **무엇이 잘못돼도 초록**이기 때문이다.
//    단언이 전부 warn 인 데다 스텝에 continue-on-error 까지 붙어 있어서,
//    URL 이 전부 404 여도 · 수집이 0건이어도 · lhci 가 아예 실행되지 않아도 잡은 초록이다.
//    「경고로만 돈다」는 설계 결정은 **수치**에 대한 것이지 **설정**에 대한 것이 아니다.
//    수치는 경고로 두고, 설정이 말이 되는지는 여기서 딱딱하게 막는다.
//    이 파일은 deploy.yml 의 `Content invariants` 단계에서 도는 진짜 게이트다.
//
// 🔴 문자열 grep 으로 검사하지 않는다 — deploy-workflow.test.ts 와 같은 이유다.
//    `run: lhci autorun` 을 텍스트로 찾으면 주석 처리된 스텝도 통과해 버린다.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";

interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
  "continue-on-error"?: boolean;
  [key: string]: unknown;
}

interface WorkflowJob {
  steps: WorkflowStep[];
  [key: string]: unknown;
}

interface Workflow {
  jobs: Record<string, WorkflowJob>;
  [key: string]: unknown;
}

type Assertion = [string, Record<string, unknown>?] | string;

interface LighthouseRc {
  ci: {
    collect: { staticDistDir?: string; url?: string[]; numberOfRuns?: number };
    assert: { assertions: Record<string, Assertion> };
    upload?: Record<string, unknown>;
  };
}

const root = process.cwd();

const workflow = yaml.load(
  fs.readFileSync(path.join(root, ".github/workflows/lighthouse.yml"), "utf8"),
) as Workflow;

const rc = JSON.parse(
  fs.readFileSync(path.join(root, "lighthouserc.json"), "utf8"),
) as LighthouseRc;

const steps: WorkflowStep[] = workflow.jobs?.lighthouse?.steps ?? [];

function findStepIndex(predicate: (step: WorkflowStep) => boolean): number {
  return steps.findIndex(predicate);
}

/**
 * `run:` 블록에서 **실제로 실행되는 줄**만 남긴다.
 *
 * 🔴 YAML 파서까지 내려가도 이것만으로는 부족하다. `run` 의 값은 파서에게 그냥 문자열이라
 *    `lhci autorun` 을 `# lhci autorun` 으로 바꿔도 `run.includes("lhci autorun")` 이 참이다.
 *    뮤테이션에서 이 뮤턴트 하나만 생존했다 — 파싱을 셸 주석 수준까지 내린 이유다.
 */
function activeRunLines(step: WorkflowStep): string[] {
  if (typeof step.run !== "string") return [];
  return step.run
    .split("\n")
    .map((line) => line.replace(/#.*$/, "").trim())
    .filter(Boolean);
}

function isLhciStep(step: WorkflowStep): boolean {
  return activeRunLines(step).some((line) => line.includes("lhci autorun"));
}

/**
 * 측정 URL 이 가리키는 페이지의 **소스**가 있는지 본다.
 *
 * out/ 을 보지 않는 이유는 이 스위트가 deploy.yml 에서 `Build` 보다 **먼저** 돌기 때문이다.
 * out/ 실재를 검사하면 CI 에서 늘 실패하고, 그러면 이 검사를 꺼 버리게 된다.
 *
 * 소스를 보면 글이 삭제되거나 이름이 바뀐 순간 빨개진다 — 그것이 이 함수의 목적이다.
 * 그렇지 않으면 LHCI 가 404 페이지를 측정하고 **아주 좋은 점수**를 보고한다.
 */
function routeSourceExists(url: string): boolean {
  const pathname = new URL(url).pathname;
  const segments = pathname
    .replace(/\/index\.html$/, "")
    .split("/")
    .filter(Boolean);

  if (segments.length === 0) {
    return fs.existsSync(path.join(root, "pages", "index.tsx"));
  }

  // 정적 라우트 — pages/<...>.tsx 또는 pages/<...>/index.tsx
  const asFile = path.join(root, "pages", ...segments) + ".tsx";
  const asDir = path.join(root, "pages", ...segments, "index.tsx");
  if (fs.existsSync(asFile) || fs.existsSync(asDir)) return true;

  // 블로그 글 — /blog/<분류>/<슬러그>/ 는 [category]/[slug] 동적 라우트라
  // pages/ 아래에 대응 파일이 없다. 정본은 마크다운이다.
  if (segments[0] === "blog" && segments.length === 3) {
    return fs.existsSync(
      path.join(root, "content", "blog", segments[1], `${segments[2]}.md`),
    );
  }

  return false;
}

describe("lighthouserc.json — 경고 예산", () => {
  // ⚠️ 개수를 먼저 단언한다. 「모든 단언이 warn 이다」만 검사하면 단언이 0개일 때도
  //    공허하게 참이 된다 — deploy-workflow.test.ts 가 같은 함정에 한 번 빠졌다.
  it("단언이 비어 있지 않다", () => {
    const assertions = rc.ci?.assert?.assertions ?? {};
    expect(Object.keys(assertions).length).toBeGreaterThan(0);
  });

  it("모든 단언이 warn 이다 — error 로 바꾸지 않는다 (설계서 §11)", () => {
    const assertions = rc.ci.assert.assertions;
    const notWarn = Object.entries(assertions).filter(([, value]) => {
      const level = Array.isArray(value) ? value[0] : value;
      return level !== "warn";
    });
    expect(notWarn).toEqual([]);
  });

  it("staticDistDir 이 ./out 이다", () => {
    expect(rc.ci.collect.staticDistDir).toBe("./out");
  });

  it("리포트를 리포지토리 밖으로 내보내지 않는다", () => {
    // temporary-public-storage 는 결과 HTML 을 누구나 볼 수 있는 공개 저장소에 올린다.
    // 이 리포는 미배포 브랜치에서 화면을 만든다 — 배포 전 화면이 먼저 공개되면 안 된다.
    expect(rc.ci.upload?.target).not.toBe("temporary-public-storage");
  });
});

describe("lighthouserc.json — 측정 대상이 실재한다", () => {
  const urls = rc.ci.collect.url ?? [];

  it("측정 URL 이 비어 있지 않다", () => {
    expect(urls.length).toBeGreaterThan(0);
  });

  // 🔴 계수기가 살아 있음을 먼저 증명한다. 이 대조군이 없으면
  //    routeSourceExists 가 무조건 true 를 뱉어도 아래 검사가 전부 초록이 된다.
  it("[대조군] 없는 경로에는 false 를 낸다", () => {
    expect(
      routeSourceExists("http://localhost/이런-라우트는-없다/index.html"),
    ).toBe(false);
    expect(
      routeSourceExists(
        "http://localhost/blog/agentic-coding/이런-글은-없다/index.html",
      ),
    ).toBe(false);
  });

  it.each(urls)("%s 에 대응하는 소스가 있다", (url) => {
    expect(routeSourceExists(url)).toBe(true);
  });
});

describe("lighthouse.yml — 워크플로", () => {
  it("lhci autorun 을 실행하는 스텝이 있다", () => {
    const index = findStepIndex(isLhciStep);
    expect(index).toBeGreaterThanOrEqual(0);
  });

  it("lhci 설치 버전이 고정돼 있다", () => {
    // 고정하지 않으면 lhci 새 버전이 나온 날 아무도 건드리지 않은 PR 의 수치가 바뀐다.
    const step = steps.find(isLhciStep);
    expect(step).toBeDefined();
    expect(step?.run).toMatch(/@lhci\/cli@\d+\.\d+\.\d+/);
  });

  it("빌드가 lhci 앞에 온다 — staticDistDir 이 ./out 이다", () => {
    const buildIndex = findStepIndex((step) => step.run === "npm run build");
    const lhciIndex = findStepIndex(isLhciStep);
    expect(buildIndex).toBeGreaterThanOrEqual(0);
    expect(lhciIndex).toBeGreaterThanOrEqual(0);
    expect(buildIndex).toBeLessThan(lhciIndex);
  });

  it("lhci 스텝이 continue-on-error 다 — 경고이지 게이트가 아니다", () => {
    const step = steps.find(isLhciStep);
    expect(step).toBeDefined();
    expect(step?.["continue-on-error"]).toBe(true);
  });
});

describe("deploy.yml — 배포 경로에 경고를 섞지 않는다", () => {
  it("배포 워크플로에 라이트하우스가 없다", () => {
    // 여기는 문자열 검사가 맞다 — 「없다」를 단언하므로 주석까지 걸리는 쪽이 안전하다.
    // 주석에 lhci 를 적어 두고 스텝을 넣지 않는 것도 이 파일에서는 원치 않는다.
    const deployYml = fs.readFileSync(
      path.join(root, ".github/workflows/deploy.yml"),
      "utf8",
    );
    expect(deployYml).not.toMatch(/lhci|lighthouse/i);
  });
});
