import { assertFlowSpecs, type FlowSpec } from "@/components/flow-diagram";
import { skbFlowSearchSpec } from "./skb-flow-search";

const allSpecs: FlowSpec[] = [skbFlowSearchSpec];

// 모듈 로드 시점에 검증한다. 문제가 있으면 npm run build가 실패한다.
assertFlowSpecs(allSpecs);

export const flowSpecs: Record<string, FlowSpec> = Object.fromEntries(
  allSpecs.map((spec) => [spec.id, spec]),
);

export { skbFlowSearchSpec };
