import { assertFlowSpecs, assertSpecIdsResolve, type FlowSpec } from "@/components/flow-diagram";
import { diagramGroups } from "@/data/portfolio";
import { skbArchitectureSpec } from "./skb-architecture";
import { skbFlowSearchSpec } from "./skb-flow-search";
import { skbFlowServingSpec } from "./skb-flow-serving";

const allSpecs: FlowSpec[] = [skbArchitectureSpec, skbFlowSearchSpec, skbFlowServingSpec];

// 모듈 로드 시점에 검증한다. 문제가 있으면 npm run build가 실패한다.
assertFlowSpecs(allSpecs);

export const flowSpecs: Record<string, FlowSpec> = Object.fromEntries(
  allSpecs.map((spec) => [spec.id, spec]),
);

// diagramGroups가 참조하는 specId가 전부 flowSpecs에 존재하는지 빌드 타임에 교차 검증한다.
// data/portfolio.ts는 data/diagrams를 import하지 않으므로 이 방향(diagrams -> portfolio)은
// 순환 참조를 만들지 않는다.
assertSpecIdsResolve(
  diagramGroups.flatMap((group) => group.items.map((item) => item.specId)),
  flowSpecs,
);

export { skbArchitectureSpec, skbFlowSearchSpec, skbFlowServingSpec };
