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
    .map((specId) => `[${specId}] flowSpecs에 해당 id가 없습니다`);

  if (errors.length > 0) {
    throw new Error(`잘못된 FlowSpec이 있습니다:\n${errors.join("\n")}`);
  }
}
