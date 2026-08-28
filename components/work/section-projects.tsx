import { FOCUS_RING } from "@/components/work/focus-ring";
import { projects } from "@/data/projects";
import { cn } from "@/lib/utils";

/**
 * 03 프로젝트 — 대표 서비스 카드.
 *
 * ⚠️ **`<ul>` 의 `aria-label` 이 이 섹션의 유일한 개수 검사 접합면이다.**
 *    2026-08-28 뮤테이션 실측: 이 섹션만 개수 대조가 없던 때
 *    카드를 0개 렌더해도 E2E 70 건이 전부 초록이었다. h2 존재만 보는 검사는
 *    섹션이 비어 있는 것을 못 본다. 이름을 바꾸면 검사가 조용히 못 찾는 쪽으로 무너진다.
 *
 * ⚠️ **링크 접근명은 렌더에서 만든다 — `data/projects.ts` 의 `label` 을 고치지 않는다.**
 *    세 카드의 `label` 이 전부 「서비스 보기」라, 화면 텍스트만으로는 링크 목록 낭독에서
 *    야나두·BTV·TVING 이 완전히 동일하다. 목적지(제목)와 새 창 예고를 접근명에 얹어
 *    구분한다. 화면에 보이는 글자는 그대로 두는 편이 시각 사용자에게 낫다.
 */

export function SectionProjects() {
  return (
    <section className="border-t border-n4 py-24 sm:py-32" aria-labelledby="projects-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-label uppercase tracking-widest text-signal">03 — Projects</p>
        <h2 id="projects-heading" className="mt-4 text-section font-bold text-n9 break-keep">
          프로젝트
        </h2>

        <ul aria-label="프로젝트" className="mt-12 grid gap-6 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.title} className="flex flex-col rounded-lg border border-n4 bg-n1 p-6">
              <p className="text-label uppercase tracking-widest text-n6 break-keep">
                {project.label}
              </p>
              <h3 className="mt-2 text-card-title font-semibold text-n9 break-keep">
                {project.title}
              </h3>
              <p className="mt-3 flex-1 text-body text-n7 break-keep">{project.description}</p>

              <ul className="mt-4 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-sm border border-n4 px-2 py-1 text-label text-n6 break-keep"
                  >
                    {tag}
                  </li>
                ))}
              </ul>

              {project.links.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-4">
                  {project.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${project.title} ${link.label} — 새 창`}
                        className={cn(
                          "rounded-sm text-body text-signal hover:underline transition-interactive break-keep",
                          FOCUS_RING,
                        )}
                      >
                        {link.label} <span aria-hidden="true">→</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
