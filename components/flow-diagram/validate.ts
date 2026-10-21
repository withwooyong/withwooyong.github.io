import type { FlowSpec } from "./types";

/** 스펙 1개의 문제를 사람이 읽을 수 있는 문자열 배열로 반환. 문제 없으면 빈 배열 */
export function validateFlowSpec(spec: FlowSpec): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  if (spec.nodes.length === 0) {
    errors.push(`[${spec.id}] 노드가 하나도 없습니다`);
  }

  for (const node of spec.nodes) {
    if (seen.has(node.id)) {
      errors.push(`[${spec.id}] 노드 id "${node.id}"가 중복되었습니다`);
    }
    seen.add(node.id);

    if (node.w <= 0 || node.h <= 0) {
      errors.push(`[${spec.id}] 노드 "${node.id}"의 크기가 0 이하입니다`);
    }
    if (
      node.x < 0 ||
      node.y < 0 ||
      node.x + node.w > spec.viewBox.w ||
      node.y + node.h > spec.viewBox.h
    ) {
      errors.push(
        `[${spec.id}] 노드 "${node.id}"가 viewBox(${spec.viewBox.w}x${spec.viewBox.h})를 벗어났습니다`,
      );
    }
  }

  for (const edge of spec.edges) {
    if (!seen.has(edge.from)) {
      errors.push(`[${spec.id}] 엣지 from "${edge.from}"에 해당하는 노드가 없습니다`);
    }
    if (!seen.has(edge.to)) {
      errors.push(`[${spec.id}] 엣지 to "${edge.to}"에 해당하는 노드가 없습니다`);
    }
    if (edge.from === edge.to) {
      errors.push(`[${spec.id}] 엣지 from과 to가 같습니다 ("${edge.from}")`);
    }
  }

  errors.push(...validateSequence(spec));

  return errors;
}

/** 순서 재생 필드(order · duration · steps)의 규칙 */
function validateSequence(spec: FlowSpec): string[] {
  const errors: string[] = [];
  const used = new Set<number>();

  for (const edge of spec.edges) {
    const label = `${edge.from} -> ${edge.to}`;
    if (edge.order !== undefined) {
      if (!Number.isInteger(edge.order) || edge.order < 1) {
        errors.push(`[${spec.id}] 엣지 "${label}"의 order(${edge.order})는 1 이상의 정수여야 합니다`);
      } else {
        used.add(edge.order);
      }
    }
    if (edge.duration !== undefined && !(Number.isFinite(edge.duration) && edge.duration > 0)) {
      errors.push(`[${spec.id}] 엣지 "${label}"의 duration(${edge.duration})은 양수여야 합니다`);
    }
  }

  // 1부터 빈 번호가 없어야 한다. 빠진 번호 하나가 재생 순서를 조용히 건너뛰게 만든다
  const max = used.size > 0 ? Math.max(...Array.from(used)) : 0;
  for (let n = 1; n <= max; n += 1) {
    if (!used.has(n)) {
      errors.push(`[${spec.id}] order ${n}번이 비었습니다. 1부터 ${max}까지 빈 번호가 없어야 합니다`);
    }
  }

  const stepSeen = new Set<number>();
  for (const step of spec.steps ?? []) {
    if (!used.has(step.order)) {
      errors.push(`[${spec.id}] steps 의 order ${step.order}에 해당하는 엣지가 없습니다`);
    }
    if (stepSeen.has(step.order)) {
      errors.push(`[${spec.id}] steps 의 order ${step.order}가 중복되었습니다`);
    }
    stepSeen.add(step.order);
  }

  return errors;
}

/**
 * 스펙 전체를 검증하고 문제가 있으면 throw 한다.
 * data/diagrams/index.ts에서 모듈 로드 시점에 호출되므로
 * 문제가 있으면 `npm run build`가 실패한다.
 */
export function assertFlowSpecs(specs: FlowSpec[]): void {
  const errors = specs.flatMap(validateFlowSpec);
  if (errors.length > 0) {
    throw new Error(`잘못된 FlowSpec이 있습니다:\n${errors.join("\n")}`);
  }
}

/**
 * data/portfolio.ts의 diagramGroups가 참조하는 specId들이 실제로
 * flowSpecs(또는 다른 available 맵)에 존재하는지 빌드 타임에 검증한다.
 * 존재하지 않는 id가 있으면 전부 모아 한 번에 throw 한다.
 */
export function assertSpecIdsResolve(specIds: string[], available: Record<string, unknown>): void {
  const errors = specIds
    .filter((specId) => !(specId in available))
    .map((specId) => `[${specId}] 이 id를 가진 FlowSpec이 등록되어 있지 않습니다`);

  if (errors.length > 0) {
    throw new Error(
      `참조할 수 없는 specId가 있습니다. data/portfolio.ts의 specId 오타이거나 data/diagrams/index.ts의 allSpecs 등록 누락입니다:\n${errors.join("\n")}`,
    );
  }
}
