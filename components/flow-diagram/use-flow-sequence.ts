import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  computeSchedule,
  hasSequence,
  inboundWindows,
  nodeStatusAt,
  packetKeyframes,
  pulseKeyframes,
  stepIndexAt,
  type NodeStatus,
} from "./sequence";
import type { FlowSpec } from "./types";

export type FlowSequence = {
  /** animate: Web Animations 로 재생. static: 움직임 없이 완료 상태로 정지(reduced-motion 등) */
  mode: "animate" | "static";
  playing: boolean;
  stepCount: number;
  /** 0 부터 */
  stepIndex: number;
  /** 현재 단계의 order. 이 order 의 엣지를 강조한다 */
  currentOrder: number;
  caption: string;
  /** idle 이 아닌 도착 노드의 상태 */
  statuses: Record<string, NodeStatus>;
  canPrev: boolean;
  canNext: boolean;
  toggle: () => void;
  prev: () => void;
  next: () => void;
};

type View = { step: number; statuses: Record<string, NodeStatus> };

/** 재생을 실제로 몰고 가는 쪽. React 상태와 분리해 프레임마다 리렌더하지 않는다 */
type Controller = {
  setVisible: (visible: boolean) => void;
  setPlaying: (playing: boolean) => void;
  /** 그 단계의 처음부터 끝까지 한 번 재생하고 멈춘다. 자동 반복은 멈춘다 */
  goToStep: (index: number) => void;
  dispose: () => void;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * 흐름도 「순서 재생」.
 *
 * 한 바퀴 길이의 Web Animation 을 패킷마다·도착 노드마다 하나씩 만들고(모두 같은 길이),
 * 마스터 시계 하나(root.animate)의 currentTime 으로 상태를 읽는다.
 * 일시정지·단계 이동은 모든 애니메이션의 currentTime 을 같이 옮기는 것으로 끝난다.
 *
 * 인스턴스 분리: DOM 을 rootRef 안에서만 찾고 상태는 훅 안에만 있으므로
 * 같은 스펙이 카드와 다이얼로그에서 동시에 떠도 서로 영향이 없다.
 * 호버(setHovered)는 이 훅의 의존성에 없어서 재생을 끊지 않는다.
 *
 * order 가 없는 스펙에서는 null 을 돌려주고 어떤 효과도 달지 않는다.
 */
export function useFlowSequence(
  rootRef: RefObject<HTMLElement | null>,
  spec: FlowSpec,
  inView: boolean,
): FlowSequence | null {
  const enabled = hasSequence(spec.edges);
  const schedule = useMemo(() => computeSchedule(spec.edges), [spec.edges]);
  const inbound = useMemo(() => inboundWindows(spec.edges, schedule), [spec.edges, schedule]);

  const [mode, setMode] = useState<"animate" | "static">("animate");
  const [playing, setPlaying] = useState(true);
  const [view, setView] = useState<View>({ step: 0, statuses: {} });
  const [staticStep, setStaticStep] = useState(0);

  const ctlRef = useRef<Controller | null>(null);
  // 효과가 다시 만들어져도(좁은 화면 재배치 등) 보던 자리에서 이어 가기 위한 기억
  const timeRef = useRef(0);
  const atEndRef = useRef(false);
  const visibleRef = useRef(inView);
  const playingRef = useRef(playing);
  visibleRef.current = inView;
  playingRef.current = playing;

  // 움직임 선호 · Web Animations 지원 여부
  useEffect(() => {
    if (!enabled) return;
    const canAnimate =
      typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
    const query = typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
    const update = () => setMode(!canAnimate || query?.matches ? "static" : "animate");
    update();
    query?.addEventListener("change", update);
    return () => query?.removeEventListener("change", update);
  }, [enabled]);

  // 재생기 본체
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || mode !== "animate" || !root || schedule.cycleSeconds <= 0) return;

    const cycleMs = schedule.cycleSeconds * 1000;
    const animations: Animation[] = [];

    const options: KeyframeAnimationOptions = { duration: cycleMs, iterations: Infinity };
    // 마스터 시계. 눈에 보이는 효과가 없는 사용자 정의 속성만 움직인다
    const master = root.animate([{ "--flow-clock": "0" }, { "--flow-clock": "1" }], options);
    animations.push(master);

    root.querySelectorAll<SVGElement>("[data-flow-packet]").forEach((el) => {
      const index = Number(el.dataset.flowPacket);
      const start = schedule.edgeStarts[index];
      const end = schedule.edgeEnds[index];
      if (start === null || start === undefined || end === null || end === undefined) return;
      animations.push(el.animate(packetKeyframes(start, end, schedule.cycleSeconds), options));
    });

    root.querySelectorAll<SVGElement>("[data-flow-node]").forEach((el) => {
      const arrivals = (inbound.get(el.dataset.flowNode ?? "") ?? []).map((w) => w.end);
      if (arrivals.length === 0) return;
      const frames = pulseKeyframes(arrivals, schedule.cycleSeconds).map((f) => ({
        offset: f.offset,
        transform: `scale(${f.scale})`,
      }));
      animations.push(el.animate(frames, options));
    });

    let visible = visibleRef.current;
    let isPlaying = playingRef.current;
    let running = false;
    let stopAt: number | null = null;
    let raf = 0;
    let lastKey = "";

    const readTime = () => ((Number(master.currentTime) || 0) % cycleMs) / 1000;
    const seek = (seconds: number) => {
      animations.forEach((a) => {
        a.currentTime = seconds * 1000;
      });
    };

    const publish = (t: number, atEnd = false) => {
      timeRef.current = t;
      atEndRef.current = atEnd;
      const step = stepIndexAt(schedule, t, atEnd);
      const statuses: Record<string, NodeStatus> = {};
      inbound.forEach((windows, id) => {
        const status = nodeStatusAt(windows, t);
        if (status !== "idle") statuses[id] = status;
      });
      const key = `${step}|${Object.entries(statuses)
        .map(([id, s]) => `${id}:${s}`)
        .join(",")}`;
      if (key === lastKey) return;
      lastKey = key;
      setView({ step, statuses });
    };

    const halt = () => {
      cancelAnimationFrame(raf);
      animations.forEach((a) => a.pause());
      running = false;
    };

    const tick = () => {
      const t = readTime();
      if (stopAt !== null && t >= stopAt) {
        const end = stopAt;
        stopAt = null;
        halt();
        seek(end);
        publish(end, true);
        return;
      }
      publish(t);
      raf = requestAnimationFrame(tick);
    };

    const sync = () => {
      const shouldRun = visible && (isPlaying || stopAt !== null);
      if (shouldRun && !running) {
        running = true;
        animations.forEach((a) => a.play());
        raf = requestAnimationFrame(tick);
      } else if (!shouldRun && running) {
        halt();
      }
    };

    // animate() 는 곧바로 재생을 시작하므로, 멈추고 기억해 둔 자리로 옮긴 뒤 상황에 맞게 다시 켠다
    animations.forEach((a) => a.pause());
    seek(timeRef.current);
    publish(timeRef.current, atEndRef.current);
    sync();

    ctlRef.current = {
      setVisible(next) {
        visible = next;
        sync();
      },
      setPlaying(next) {
        isPlaying = next;
        if (next) stopAt = null;
        sync();
      },
      goToStep(index) {
        const target = schedule.windows[index];
        if (!target) return;
        isPlaying = false;
        stopAt = target.end;
        seek(target.start);
        publish(target.start);
        sync();
      },
      dispose() {
        halt();
        animations.forEach((a) => a.cancel());
      },
    };

    return () => {
      ctlRef.current?.dispose();
      ctlRef.current = null;
    };
  }, [rootRef, enabled, mode, schedule, inbound]);

  // 화면 밖에서는 멈추고, 들어오면(자동 반복 중이었다면) 다시 시작한다
  useEffect(() => {
    ctlRef.current?.setVisible(inView);
  }, [inView]);

  const stepCount = schedule.windows.length;

  const badgeNodes = useMemo(() => new Set(inbound.keys()), [inbound]);

  if (!enabled || stepCount === 0) return null;

  const stepIndex = Math.min(mode === "static" ? staticStep : view.step, stepCount - 1);
  const currentOrder = schedule.windows[stepIndex].order;
  const caption = spec.steps?.find((s) => s.order === currentOrder)?.caption ?? "";

  const statuses: Record<string, NodeStatus> =
    mode === "static"
      ? Object.fromEntries(Array.from(badgeNodes).map((id) => [id, "done" as const]))
      : view.statuses;

  const goTo = (index: number) => {
    if (index < 0 || index >= stepCount) return;
    setPlaying(false);
    if (mode === "static") setStaticStep(index);
    else ctlRef.current?.goToStep(index);
  };

  return {
    mode,
    playing,
    stepCount,
    stepIndex,
    currentOrder,
    caption,
    statuses,
    canPrev: stepIndex > 0,
    canNext: stepIndex < stepCount - 1,
    toggle: () => {
      const next = !playing;
      setPlaying(next);
      ctlRef.current?.setPlaying(next);
    },
    prev: () => goTo(stepIndex - 1),
    next: () => goTo(stepIndex + 1),
  };
}
