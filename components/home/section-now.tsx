import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 03 Now — 2026년 현재. 집필 · AI 전환 · 구직 세 갈래다.
 *
 * 재료는 구 `pages/index.tsx` 의 `#about`(개발 리더로서의 철학)·`#writing`(글·링크)에서
 * 왔다. 메인은 대표만 싣고 전체는 하위 페이지가 받는다 —
 * 철학 전문은 T12 의 `/about`, 글 목록은 `/blog` 다.
 *
 * ⚠️ 여기에 편수·연차 같은 실측 수치를 새로 박지 마라. 숫자는 히어로 한 곳에서만
 *    말한다 — 두 곳에 적히면 한 곳이 먼저 낡고, 그 불일치가 회귀와 구분되지 않는다.
 */
const NOW_ITEMS: { key: string; title: string; body: string }[] = [
  {
    key: "writing",
    title: "쓴다",
    body: "검색·플랫폼·AI 기술 노트를 직접 정리해 남기고 있다. 결론만 적지 않고 판단의 근거와 실측을 함께 적는다.",
  },
  {
    key: "ai-shift",
    title: "AI 로 옮겨간 실행을 다시 설계한다",
    body: "개발의 실행은 이미 AI 로 옮겨가고 있다. 리더가 할 일은 무엇을 만들지 정하는 판단과, AI 가 안전하게 일할 수 있는 틀 — 아키텍처 표준·코드 리뷰·검증 파이프라인 — 을 세우는 것이라고 본다.",
  },
  {
    key: "open-to-work",
    title: "다음 팀을 찾고 있다",
    body: "(주)야나두 a kakao company (구 카카오키즈) 커머스개발실장으로 4년 6개월을 보내고 2026년 7월에 마무리했다. 제품과 조직을 함께 세우는 자리를 찾고 있다.",
  },
];

export function SectionNow() {
  return (
    <section id="now" className="border-t border-n4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">03 — Now</p>
        <h2 className="mt-4 text-section font-bold text-n9 break-keep">2026년, 지금 하고 있는 것</h2>

        <dl className="mt-12 grid gap-10 md:grid-cols-3">
          {NOW_ITEMS.map((item) => (
            <div key={item.key}>
              <dt className="text-card-title font-semibold text-n9 break-keep">{item.title}</dt>
              <dd className="mt-2 text-body text-n7 break-keep">{item.body}</dd>
            </div>
          ))}
        </dl>

        <Link
          href="/blog/"
          className={cn(
            "mt-12 inline-block rounded-sm text-body text-signal hover:underline transition-interactive break-keep",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n0",
          )}
        >
          기술 노트 전체 읽기 →
        </Link>
      </div>
    </section>
  );
}
