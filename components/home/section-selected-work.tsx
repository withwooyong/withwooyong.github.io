import Link from "next/link";
import { experiences } from "@/data/experience";
import { cn } from "@/lib/utils";

/**
 * 01 Selected Work — 메인에는 대표 3개만 싣는다. 전체는 T11 의 `/work` 가 받는다.
 *
 * ⚠️ 계획서 1806줄은 이 태스크가 `experiences`**와 `projects`** 를 함께 소비한다고 적었지만
 *    여기서는 `experiences` 만 쓴다. 한 화면에 「경력」과 「프로젝트」 두 목록을 겹쳐 놓으면
 *    **대표만 보이는 섹션**이라는 전제가 깨지고, 같은 일이 두 번 나열된다
 *    (프로젝트 대부분이 위 경력 3건 안에서 수행된 것이다).
 *    `data/projects.ts` 는 T11 의 `/work` 가 소비한다 — 거기가 전체를 펼치는 자리다.
 *
 * ⚠️ **`data/experience.ts` 의 과도기 색상 필드 두 개는 소비하지 않는다.**
 *    회사 라벨용과 불릿용 둘 다 구 4색 액센트(blue/green/purple/orange)를 담고 있어,
 *    하나라도 쓰면 신규 단일 시그널 토큰 체계를 조용히 우회하게 된다.
 *    여기서 쓰는 것은 `role`·`company`·`period`·`summary` 네 개뿐이고,
 *    `tests/home/task-10-structure.test.ts` 가 소스 문자열로 그것을 감시한다 —
 *    그래서 이 주석에도 그 필드 이름을 적지 않는다.
 */

/** 포커스 표시. 셸·푸터와 같은 문자열이다. 동적으로 조립하지 마라 — 추출기가 못 읽는다. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n0";

export function SectionSelectedWork() {
  const featured = experiences.slice(0, 3);

  return (
    <section id="selected-work" className="border-t border-n4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">01 — Selected Work</p>
        <h2 className="mt-4 text-section font-bold text-n9 break-keep">
          20년간 만든 것은 서비스가 아니라 조직이었다
        </h2>

        <ul className="mt-12 space-y-12">
          {featured.map((exp) => (
            <li key={`${exp.company}-${exp.period}`} className="border-l-2 border-n4 pl-6">
              <p className="tabular text-label uppercase tracking-widest text-n6">{exp.period}</p>
              <h3 className="mt-2 text-card-title font-semibold text-n9 break-keep">{exp.role}</h3>
              <p className="text-body text-n6 break-keep">{exp.company}</p>
              <p className="mt-3 text-body text-n7 break-keep">{exp.summary}</p>
            </li>
          ))}
        </ul>

        <Link
          href="/work/"
          className={cn(
            "mt-12 inline-block rounded-sm text-body text-signal hover:underline transition-interactive break-keep",
            FOCUS_RING,
          )}
        >
          전체 이력과 시스템 다이어그램 보기 →
        </Link>
      </div>
    </section>
  );
}
