import { useEffect, useMemo, useState, type RefObject } from "react";
import {
  PULSE_SECONDS,
  PULSE_SCALE,
  edgeDuration,
  hasSequence,
  nodeStatusesAtOrder,
  packetKeyframes,
  stepSeconds,
  type NodeStatus,
} from "./sequence";
import type { FlowSpec } from "./types";

export type FlowStepView = {
  /** 바깥이 정한 단계의 order. 이 order 의 엣지를 강조한다 */
  activeOrder: number;
  statuses: Record<string, NodeStatus>;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * 흐름도 「바깥이 정하는 단계」(activeOrder).
 *
 * activeOrder 가 바뀔 때마다 그 단계의 패킷을 한 번 재생하고, 도착 노드가 맥박을 친 뒤
 * 「처리 중」→「완료」가 된다. 이전 단계는 이미 끝난 상태로, 이후 단계는 시작 전으로 그린다.
 * 움직임을 줄이는 설정이거나 Web Animations 가 없으면 애니메이션 없이 곧바로 「완료」다.
 * 상태는 이 컴포넌트 인스턴스 안에만 있고 DOM 은 rootRef 안에서만 찾는다.
 *
 * activeOrder 가 undefined 거나 order 가 없는 스펙이면 null 을 돌려주고 어떤 효과도 달지 않는다.
 */
export function useFlowStep(
  rootRef: RefObject<HTMLElement | null>,
  spec: FlowSpec,
  activeOrder: number | undefined,
): FlowStepView | null {
  const enabled = activeOrder !== undefined && hasSequence(spec.edges);
  // 어느 order 가 끝까지 재생됐는지. 단계가 바뀐 첫 렌더에 옛 값이 남아도 order 가 달라 무시된다
  const [doneFor, setDoneFor] = useState<number | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || activeOrder === undefined || !root) return;

    const canAnimate =
      typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
    const reduced =
      typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
    if (!canAnimate || reduced) {
      setDoneFor(activeOrder);
      return;
    }

    setDoneFor(null);
    const animations: Animation[] = [];

    root.querySelectorAll<SVGElement>("[data-flow-packet]").forEach((el) => {
      const edge = spec.edges[Number(el.dataset.flowPacket)];
      if (!edge || edge.order !== activeOrder) return;
      const seconds = edgeDuration(edge);
      animations.push(
        el.animate(packetKeyframes(0, seconds, seconds), { duration: seconds * 1000, fill: "none" }),
      );
    });

    const arrivals = new Map<string, number>();
    spec.edges.forEach((edge) => {
      if (edge.order !== activeOrder) return;
      arrivals.set(edge.to, Math.max(arrivals.get(edge.to) ?? 0, edgeDuration(edge)));
    });
    root.querySelectorAll<SVGElement>("[data-flow-node]").forEach((el) => {
      const seconds = arrivals.get(el.dataset.flowNode ?? "");
      if (seconds === undefined) return;
      animations.push(
        el.animate(
          [
            { transform: "scale(1)" },
            { transform: `scale(${PULSE_SCALE})` },
            { transform: "scale(1)" },
          ],
          { duration: PULSE_SECONDS * 1000, delay: seconds * 1000, fill: "none" },
        ),
      );
    });

    const timer = window.setTimeout(
      () => setDoneFor(activeOrder),
      (stepSeconds(spec.edges, activeOrder) + PULSE_SECONDS) * 1000,
    );
    return () => {
      window.clearTimeout(timer);
      animations.forEach((a) => a.cancel());
    };
  }, [rootRef, enabled, spec.edges, activeOrder]);

  const statuses = useMemo(
    () =>
      enabled && activeOrder !== undefined
        ? nodeStatusesAtOrder(spec.edges, activeOrder, doneFor === activeOrder)
        : {},
    [enabled, spec.edges, activeOrder, doneFor],
  );

  if (!enabled || activeOrder === undefined) return null;
  return { activeOrder, statuses };
}
