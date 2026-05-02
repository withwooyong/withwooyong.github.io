/**
 * 히어로 배경: 타원 호 스트로크 + dashoffset 무한 스크롤 (Remotion 랜딩과 유사한 방식).
 * 장식용 — 스크린리더에서 숨김.
 */
const ARC_D = "M0.3,0.5a0.2,0.45 0 1,0 0.4,0a0.2,0.45 0 1,0 -0.4,0";

export function HeroStripeBackdrop() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[min(70vh,540px)] w-full -translate-y-[12%] text-blue-500/[0.22] dark:text-blue-400/[0.18] sm:-translate-y-[18%] md:h-[min(75vh,620px)]"
      viewBox="0 0 1 1"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g transform="rotate(0 0.5 0.5)">
        <path d={ARC_D} fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={0.038} className="hero-stripe-path" />
      </g>
      <g transform="rotate(120 0.5 0.5)">
        <path d={ARC_D} fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={0.038} className="hero-stripe-path" />
      </g>
      <g transform="rotate(240 0.5 0.5)">
        <path d={ARC_D} fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={0.038} className="hero-stripe-path" />
      </g>
    </svg>
  );
}
