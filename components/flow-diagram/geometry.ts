import type { FlowNode, Point } from "./types";

/** 화살촉이 노드에 파고들지 않도록 띄우는 여백 */
const ANCHOR_GAP = 6;

export function nodeCenter(node: FlowNode): Point {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

/**
 * 노드 중심에서 toward 방향으로 나가는 반직선이 노드 경계(+여백)와 만나는 점.
 * 엣지가 노드 박스 안에서 시작/끝나지 않게 한다.
 */
function anchor(node: FlowNode, toward: Point): Point {
  const c = nodeCenter(node);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return c;

  if (node.shape === "circle") {
    // 원(타원) 노드는 내접 타원 경계와의 교점을 구한다: t = 1 / sqrt((dx/rx)^2 + (dy/ry)^2)
    const rx = node.w / 2 + ANCHOR_GAP;
    const ry = node.h / 2 + ANCHOR_GAP;
    const t = 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2);
    return { x: c.x + dx * t, y: c.y + dy * t };
  }

  const halfW = node.w / 2 + ANCHOR_GAP;
  const halfH = node.h / 2 + ANCHOR_GAP;
  const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : halfW / Math.abs(dx);
  const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : halfH / Math.abs(dy);
  const scale = Math.min(scaleX, scaleY);

  return { x: c.x + dx * scale, y: c.y + dy * scale };
}

/** 엣지의 SVG path d 문자열. waypoints가 있으면 꺾은선이 된다 */
export function edgePath(from: FlowNode, to: FlowNode, waypoints: Point[] = []): string {
  const first = waypoints[0] ?? nodeCenter(to);
  const last = waypoints[waypoints.length - 1] ?? nodeCenter(from);
  const start = anchor(from, first);
  const end = anchor(to, last);

  const parts = [`M ${round(start.x)} ${round(start.y)}`];
  for (const p of waypoints) parts.push(`L ${round(p.x)} ${round(p.y)}`);
  parts.push(`L ${round(end.x)} ${round(end.y)}`);
  return parts.join(" ");
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
