import { SiteHead } from "@/components/site-head";
import { SiteShell } from "@/components/site-shell";
import { SectionCapability } from "@/components/work/section-capability";
import { SectionDomains } from "@/components/work/section-domains";
import { SectionExperience } from "@/components/work/section-experience";
import { SectionPositioning } from "@/components/work/section-positioning";
import { SectionProjects } from "@/components/work/section-projects";
import { SectionSystems } from "@/components/work/section-systems";

/**
 * `/work` — `product-lead`·`-v2`·`-loadmap`·`-wiki` 4갈래를 하나로 접은 페이지.
 *
 * **여기는 조립 코드다.** 마크업은 `components/work/section-*.tsx` 여섯 개에 있고,
 * 메인(`pages/index.tsx` + `components/home/section-*.tsx`)과 같은 형태다.
 * 섹션 하나를 고칠 때 이 파일을 열 일은 없어야 한다 — 그것이 분리의 목적이다.
 *
 * 무엇을 남기고 무엇을 버렸는지, 그리고 그 근거는 전부
 * `docs/superpowers/plans/2026-08-25-work-merge-notes.md` 에 있다. 여기에 복사하지 않는다 —
 * 두 벌이 되면 한 벌이 먼저 썩는다.
 *
 * ⚠️ **접근명은 장식이 아니라 이 페이지의 계약이다.** `e2e/work.spec.ts` 는
 *    `<h2>` 다섯의 접근명, `table` 의 `aria-label`, `ul` 의 `aria-label`,
 *    가로 스크롤 `region` 의 접근명, `data-diagram-group` 으로 「그려졌는가」를 잰다.
 *    클래스는 바꿔도 되지만 이 이름들을 바꾸면 검사가 조용히 못 찾는 쪽으로 무너진다.
 *
 * ⚠️ **개수 검사는 데이터에서 센 수와 화면에서 센 수를 맞춘다.** 그래서 목록을
 *    `slice` 하지 않는다. 「대표만 보여 준다」는 메인(`components/home/section-selected-work.tsx`)
 *    의 역할이고, 여기는 전체를 펴는 자리다.
 *
 * ⚠️ **`data/` 의 과도기 색상 필드는 하나도 소비하지 않는다.**
 *    회사 라벨용·불릿용·카드 그라디언트·배경 로고 클래스가 전부 구 4색 액센트를 담고 있어,
 *    하나라도 쓰면 신규 단일 시그널 토큰 체계를 조용히 우회하게 된다.
 *    여기서 쓰는 것은 콘텐츠 필드뿐이다.
 */
export default function Work() {
  return (
    <>
      <SiteHead
        title="Work — 허우용 · Ted"
        description="OTT·커머스 플랫폼 20년의 이력, 요구 역량 매핑, 시스템 구조와 도메인 실행 설계를 한 페이지에."
        path="/work/"
      />
      <SiteShell>
        <SectionPositioning />
        <SectionCapability />
        <SectionExperience />
        <SectionProjects />
        <SectionSystems />
        <SectionDomains />
      </SiteShell>
    </>
  );
}
