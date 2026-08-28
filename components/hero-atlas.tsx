// components/hero-atlas.tsx
//
// 히어로 배경의 장식 SVG. **데이터는 하나도 여기 없다** — 좌표·엣지·액센트 판정은
// lib/hero/atlas-nodes.ts 가, 점등 산식은 lib/hero/motion.ts 가 정본이다.
// 여기에 복제하는 순간 GC-9 계측기(tests/design/accent-area.test.ts)가 실물이 아니라
// 자기 사본을 재게 되어, 화면이 규칙을 어겨도 초록이 된다.

import type { CSSProperties } from "react";
import {
  HERO_EDGES,
  HERO_GROWTH,
  HERO_NODES,
  accentCoreRadius,
  isAccentNode,
} from "@/lib/hero/atlas-nodes";
import { stagger } from "@/lib/hero/motion";

/**
 * 소수 셋째 자리에서 끊는다.
 *
 * 정적 export 라 이 SVG 는 HTML 로 직렬화된다. 0.30000000000000004 같은 값이 그대로
 * 실리면 산출물이 커지고 `check-baseline` 의 diff 가 부동소수 잡음으로 덮인다.
 */
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * 스크롤 진행도에 따라 켜지는 노드 그래프.
 *
 * `preserveAspectRatio="xMidYMid slice"` 라 정사각 viewBox 가 뷰포트를 **덮고 넘친다** —
 * 짧은 축이 잘린다. 그래서 세로로 긴 화면(모바일)에서는 가로가 절반 넘게 잘려 나가고,
 * 액센트 면적 비율이 데스크톱보다 커진다. 액센트를 고를 때 그것을 이미 계산했다
 * (lib/hero/atlas-nodes.ts 의 `ACCENT_INDICES` 주석).
 *
 * ⚠️ **모션을 끈 사용자의 첫 페인트 점프**(hero.tsx 의 같은 주석 참고)를 여기서도 CSS 로
 *    막는다. 정적 export 는 진행도 0 으로 직렬화되므로 서버 HTML 의 아틀라스는 완전히
 *    꺼져 있고, 액센트 코어는 반지름이 0 이라 아예 없다. 훅의 setProgress(1) 은 페인트
 *    뒤에 돌아 그것을 한 번에 켠다 — 그 팝인이 바로 없애려던 변화다.
 *
 *    불투명도는 미디어 질의 유틸리티만으로 최종값을 찍을 수 있다(엣지 0.8, 점등 원 1).
 *    반지름은 노드마다 값이 달라 유틸리티 이름에 넣을 수 없다 — 클래스명을 문자열 보간으로
 *    만들면 Tailwind 의 소스 스캔이 그것을 보지 못해 CSS 가 아예 생성되지 않는다.
 *    그래서 **값은 인라인 CSS 변수로 내려보내고 클래스는 고정 문자열로 둔다.** 클래스가
 *    상수라 스캔에 잡히고, 미디어 질의 안에서 그 변수를 SVG 기하 속성 r 에 대입한다.
 *    (SVG 에서 CSS px 는 사용자 좌표 단위와 같으므로 viewBox 100 기준 값을 그대로 쓴다.)
 *    r 을 CSS 로 못 받는 아주 오래된 엔진에서는 속성값이 그대로 남고, 훅의 setProgress(1)
 *    폴백이 한 프레임 뒤에 채운다 — 없던 동작으로 되돌아갈 뿐 깨지지 않는다.
 */
export function HeroAtlas({ progress }: { progress: number }) {
  const total = HERO_NODES.length;
  const lit = HERO_NODES.map((_, i) => stagger(progress, i, total));

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className="absolute inset-0 h-full w-full"
    >
      {/*
        엣지가 먼저다 — DOM 순서가 곧 z 순서라 나중에 그리는 노드가 선을 덮는다.

        엣지의 점등은 **양 끝 노드가 모두 켜진 뒤**다(min). 별도의 지연 상수를 두지 않고도
        「노드보다 조금 늦게 따라온다」가 자동으로 성립하고, 노드 수를 바꿔도 어긋나지 않는다.
      */}
      <g stroke="var(--n4)" strokeWidth={0.3} strokeLinecap="round">
        {HERO_EDGES.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={HERO_NODES[a].x}
            y1={HERO_NODES[a].y}
            x2={HERO_NODES[b].x}
            y2={HERO_NODES[b].y}
            opacity={round(0.25 + 0.55 * Math.min(lit[a], lit[b]))}
            // 점등 완료값 0.25 + 0.55 = 0.8. 유틸리티가 표현 속성보다 우선한다.
            className="motion-reduce:opacity-80"
          />
        ))}
      </g>

      {HERO_NODES.map((node, i) => {
        const t = lit[i];
        const r = round(node.r * (1 + (HERO_GROWTH - 1) * t));
        // 점등 완료 상태의 반지름. 모션을 끈 경우 CSS 가 이 값을 첫 페인트부터 쓴다.
        const grownVars = {
          "--hero-r": `${round(node.r * HERO_GROWTH)}px`,
          "--hero-core-r": `${round(accentCoreRadius(i))}px`,
        } as CSSProperties;
        return (
          <g key={`n${i}`} style={grownVars}>
            {/* 미점등 바닥 */}
            <circle
              cx={node.x}
              cy={node.y}
              r={r}
              fill="var(--n5)"
              className="motion-reduce:[r:var(--hero-r)]"
            />
            {/* 점등 — 불투명도로 --n5 위에 --n7 을 겹친다 */}
            <circle
              cx={node.x}
              cy={node.y}
              r={r}
              fill="var(--n7)"
              opacity={round(t)}
              className="motion-reduce:[r:var(--hero-r)] motion-reduce:opacity-100"
            />
            {/*
              액센트는 **큰 원을 통째로 칠하지 않는다.** 큰 --n7 원 안의 작은 --signal 코어다.
              「불이 켜졌다」는 큰 원이 읽어 주고 면적은 코어만 든다 — GC-9 의 처방이다.
              코어 반지름은 반드시 `accentCoreRadius()` 로 얻는다. 여기서 직접 곱하면
              계측기와 갈라진다.
            */}
            {isAccentNode(i) ? (
              <circle
                cx={node.x}
                cy={node.y}
                r={round(accentCoreRadius(i) * t)}
                fill="var(--signal)"
                className="motion-reduce:[r:var(--hero-core-r)]"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
