// .github/workflows/deploy.yml 이 E2E 를 배포 게이트로 실행하는지 검사한다.
//
// 🔴 문자열 grep 으로 검사하지 않는다 — `run: npm run e2e` 를 텍스트로 찾으면
// 주석 처리된 스텝도 통과해 버린다. 이 워크플로의 소비자는 YAML 파서이므로
// 검사도 YAML 을 파싱해서 잡·스텝 배열·키를 직접 본다.
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

const workflowPath = path.join(process.cwd(), ".github/workflows/deploy.yml");
const workflow = yaml.load(fs.readFileSync(workflowPath, "utf8")) as Workflow;

const buildJob = workflow.jobs?.build;
const buildSteps: WorkflowStep[] = buildJob?.steps ?? [];

function findStepIndex(predicate: (step: WorkflowStep) => boolean): number {
  return buildSteps.findIndex(predicate);
}

describe("deploy.yml — E2E 배포 게이트", () => {
  it("build 잡에 `npm run e2e` 를 실행하는 스텝이 있다", () => {
    const e2eStepIndex = findStepIndex((step) => step.run === "npm run e2e");
    expect(e2eStepIndex).toBeGreaterThanOrEqual(0);
  });

  it("E2E 스텝에 continue-on-error 가 없다 — 조용히 통과하는 게이트는 게이트가 아니다", () => {
    // ⚠️ 스텝의 존재를 먼저 단언한다. 「continue-on-error 인 스텝이 하나도 없다」만
    //    검사하면 E2E 스텝 자체가 없을 때도 공허하게 참이 되어 아무것도 잡지 못한다.
    //    실제로 이 단언은 스텝을 넣기 전에도 초록이었다.
    const e2eStep = buildSteps.find((step) => step.run === "npm run e2e");
    expect(e2eStep).toBeDefined();
    expect(e2eStep?.["continue-on-error"]).toBeUndefined();

    const allSteps = Object.values(workflow.jobs ?? {}).flatMap(
      (job) => job.steps ?? [],
    );
    const softStep = allSteps.find(
      (step) => step["continue-on-error"] === true,
    );
    expect(softStep).toBeUndefined();
  });

  // 🔴 게이트의 힘은 두 조건이 함께 성립할 때만 나온다 —
  //    ① E2E 스텝이 build 잡 안에 있다  ② deploy 잡이 build 를 기다린다.
  //    needs 를 지우면 두 잡이 병렬로 돌아 E2E 가 빨개져도 배포가 그대로 나간다.
  //    continue-on-error 라는 작은 문만 잠그고 이 큰 문을 열어 두면 안 된다.
  it("deploy 잡이 build 잡을 기다린다 (needs: build)", () => {
    const deployJob = workflow.jobs?.deploy as
      | { needs?: string | string[] }
      | undefined;
    expect(deployJob).toBeDefined();

    const needs = deployJob?.needs;
    const needsList = typeof needs === "string" ? [needs] : (needs ?? []);
    expect(needsList).toContain("build");
  });

  it("Playwright 설치와 E2E 실행이 모두 빌드 스텝 뒤, 아티팩트 업로드 앞에 온다", () => {
    const buildStepIndex = findStepIndex((step) => step.run === "npm run build");
    const installStepIndex = findStepIndex((step) =>
      typeof step.run === "string" && step.run.includes("playwright install"),
    );
    const e2eStepIndex = findStepIndex((step) => step.run === "npm run e2e");
    const uploadStepIndex = findStepIndex(
      (step) => step.uses === "actions/upload-pages-artifact@v5",
    );

    expect(buildStepIndex).toBeGreaterThanOrEqual(0);
    expect(installStepIndex).toBeGreaterThanOrEqual(0);
    expect(e2eStepIndex).toBeGreaterThanOrEqual(0);
    expect(uploadStepIndex).toBeGreaterThanOrEqual(0);

    expect(installStepIndex).toBeGreaterThan(buildStepIndex);
    expect(e2eStepIndex).toBeGreaterThan(buildStepIndex);
    expect(installStepIndex).toBeLessThan(uploadStepIndex);
    expect(e2eStepIndex).toBeLessThan(uploadStepIndex);
  });

  it("E2E 실행 스텝 앞에 Playwright 브라우저 설치 스텝이 있다", () => {
    const installStepIndex = findStepIndex((step) =>
      typeof step.run === "string" && step.run.includes("playwright install"),
    );
    const e2eStepIndex = findStepIndex((step) => step.run === "npm run e2e");

    expect(installStepIndex).toBeGreaterThanOrEqual(0);
    expect(e2eStepIndex).toBeGreaterThanOrEqual(0);
    expect(installStepIndex).toBeLessThan(e2eStepIndex);

    // 설치 명령의 내용까지 본다. `npx playwright install` 로 축약되면
    // ① OS 패키지가 안 깔려 ubuntu 러너에서 브라우저가 뜨지 않고
    // ② 브라우저 3종을 모두 받아 필요 없는 시간을 쓴다.
    //    playwright.config.ts 의 두 프로젝트는 전부 chromium 이다.
    const installRun = buildSteps[installStepIndex]?.run ?? "";
    expect(installRun).toContain("--with-deps");
    expect(installRun).toContain("chromium");
  });
});
