import { NOTION_RESUME_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * 05 Connect — 연락 · 이력서 · 소셜.
 *
 * ⚠️ **푸터와 접근명이 겹치면 안 된다.** `components/site-footer.tsx` 가 같은 페이지에
 *    셸을 통해 붙고, 거기에 이미 `mailto:withwooyong@gmail.com`(접근명
 *    「withwooyong@gmail.com」)과 노션 이력서(접근명 「이력서」)가 있다.
 *    링크 목적지가 같은 것은 문제가 아니지만 **접근명이 같으면** 스크린리더의
 *    링크 목록에서 두 항목이 구분되지 않는다.
 *
 *    그래서 역할을 갈랐다 — 푸터는 어느 페이지에서나 같은 자리에 있는 **최소 라벨의
 *    상시 유틸리티**, 이 섹션은 무엇을 하러 가는지를 말하는 **행동 유도**다.
 *    아래 세 접근명은 셋 다 푸터의 어느 것과도 문자열이 다르다.
 */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n0";

const LINK_CLASS = "rounded-sm text-body text-signal hover:underline transition-interactive break-keep";

const CONTACTS: { key: string; href: string; label: string; note: string; external: boolean }[] = [
  {
    key: "email",
    href: "mailto:withwooyong@gmail.com",
    label: "이메일로 연락하기",
    note: "함께 만들 것이 있다면 가장 빠른 길이다.",
    external: false,
  },
  {
    key: "resume",
    href: NOTION_RESUME_URL,
    label: "경력기술서 전문 보기 (Notion)",
    note: "프로젝트 단위의 상세 기록이다.",
    external: true,
  },
  {
    key: "github",
    href: "https://github.com/withwooyong",
    label: "github.com/withwooyong",
    note: "저장소와 활동 기록이다.",
    external: true,
  },
];

export function SectionConnect() {
  return (
    <section id="connect" className="border-t border-n4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">05 — Connect</p>
        <h2 className="mt-4 text-section font-bold text-n9 break-keep">
          같은 그림을 볼 팀이라면 먼저 이야기하고 싶다
        </h2>

        <ul className="mt-12 grid gap-10 md:grid-cols-3">
          {CONTACTS.map((c) => (
            <li key={c.key}>
              <a
                href={c.href}
                className={cn(LINK_CLASS, "font-semibold", FOCUS_RING)}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {c.label}
              </a>
              <p className="mt-2 text-body text-n7 break-keep">{c.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
