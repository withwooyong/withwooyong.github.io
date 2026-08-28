import { Hero } from "@/components/hero";
import { SectionConnect } from "@/components/home/section-connect";
import { SectionHowILead } from "@/components/home/section-how-i-lead";
import { SectionNow } from "@/components/home/section-now";
import { SectionSelectedWork } from "@/components/home/section-selected-work";
import { SiteHead } from "@/components/site-head";
import { SiteShell } from "@/components/site-shell";

/**
 * 메인 — 히어로 + 4개 섹션의 조립 코드다(설계서 §4).
 *
 * 구 마크업 9개 섹션(#about·#product·#experience·#projects·#systems·#skills·
 * #writing·#education·#contact)이 여기서 사라졌다.
 *
 * ⚠️ **「T1 이 콘텐츠를 data/ 로 다 빼 뒀으니 소실되지 않는다」는 거짓이었다.**
 *    계획서 1932줄이 그렇게 적었고 이 주석도 한때 그것을 복사했지만, 실측하니
 *    `git grep 서울시립대` 가 작업트리에서 0건이었다. T1 이 옮긴 것은 경력·프로젝트·
 *    다이어그램·스킬뿐이고 학력·철학 본문·제품 티저 카피는 **index.tsx 에만 있었다.**
 *
 *    그래서 재작성 전에 아래로 옮겨 보존했다. 셋 다 **지금 어디에서도 렌더되지 않는다** —
 *    보존이 목적이고 소비는 다음 태스크의 몫이다.
 *
 *    | 무엇 | 어디로 | 누가 소비 |
 *    | --- | --- | --- |
 *    | 학력·논문 제목·논문 PDF | `data/education.ts` | T12 `/about` |
 *    | 「개발 리더로서의 철학」 3문단 | `data/about.ts` | T12 `/about` |
 *    | 구 `#product` 티저 카피 전문 | `data/product-lead-teaser.ts` | T11 `/work` |
 *
 *    나머지(경력·프로젝트·시스템 다이어그램·스킬·글 링크)는 T1 이 옮긴 `data/experience.ts`·
 *    `projects.ts`·`portfolio.ts` 에 이미 있다. 메인은 대표만 보이고 전체는 하위 페이지가 편다.
 *
 * ⚠️ **`/product-lead-v2` 로 가는 사이트 내 유일한 진입점이 이 재작성으로 끊겼다.**
 *    구 `#product` 섹션의 CTA 가 그것이었고, product-lead 클러스터 **밖에서** 오는
 *    인바운드 링크는 이제 0건이다(클러스터 전용이던 `components/wiki-shell.tsx` 는 T14 가 지웠다).
 *    이것은 사고가 아니라 **계획된 공백**이다 — T11 이 `/work` 로 통합하고 T13 이
 *    9 URL 을 파일 4개로 접으므로, 지금 임시 링크를 넣으면 두 태스크가 곧 지운다.
 *    그때까지 그 페이지들은 **사이트맵에만 남은 고아**다.
 *
 *    ⇒ **T11 이전에 이 브랜치를 `main` 에 머지하면 실사용자가 도달할 수 없는 페이지가
 *      생긴다.** 머지 순서가 이 공백의 수명을 정한다.
 *
 * ⚠️ 구 코드가 직접 렌더하던 `PortfolioNav` 를 여기서 걷어냈다. 그것이 셸과 겹쳐
 *    「본문으로 건너뛰기」 스킵 링크 2개, 테마 토글 마크업 2벌,
 *    `id="main"` 2개가 한 페이지에 있었다(2026-08-26 산출물 실측).
 *    내비게이션·스킵 링크·테마 토글·푸터는 전부 `SiteShell` 하나가 맡는다.
 *
 *    ⇒ 그 결과 **`components/portfolio-nav.tsx` 의 호출자는 리포 전역 0건이 됐다**
 *      (실측: 나머지 매치는 전부 주석과 자기 정의). 「다른 페이지가 아직 쓴다」고
 *      적혀 있던 것은 사실이 아니다. 같은 이유로 `data/portfolio.ts` 의 `navItems` 도
 *      이제 존재하지 않는 앵커(`#about`·`#product` 등)를 가리키는 고아다.
 *      둘 다 **T14 의 삭제 후보**이며, 여기서 지우지 않는 것은 그것이 T14 소관이기
 *      때문이지 쓰이고 있어서가 아니다.
 *
 * ⚠️ 04 Atlas 섹션은 `components/home/section-atlas.tsx` 에 있지만 여기서 조립하지
 *    않는다. 계획서가 적은 이유(「/atlas 가 없어서 죽은 링크」)는 이미 낡았다 —
 *    `pages/atlas/` 는 실물로 있다. 렌더하지 않는 진짜 이유는 그 섹션이 약속하는
 *    그래프 미리보기와 토픽별 노드 수 집계가 아직 없다는 것이고, 그건 단계 4다.
 */
export default function Home() {
  return (
    <>
      {/*
        path 를 반드시 넘긴다. `SiteHead` 의 기본값이 "/" 라 안 넘겨도 이 페이지만은
        우연히 맞지만, 그 우연에 기대면 다음 페이지가 복사해 갈 때 canonical 과
        og:url 이 조용히 홈을 가리킨다. 명시가 곧 규약이다.
      */}
      <SiteHead
        title="허우용 · Ted — 백엔드 · 플랫폼 리더"
        description="20년간 만든 것은 서비스가 아니라 조직이었다. 교육·커머스 플랫폼과 검색을 두 번 세운 기록, 그리고 글 156편."
        path="/"
      />
      <SiteShell>
        <Hero />
        <SectionSelectedWork />
        <SectionHowILead />
        <SectionNow />
        {/* 04 Atlas — 노드 수 집계가 생기는 단계 4에서 켠다. 위 주석 참조 */}
        <SectionConnect />
      </SiteShell>
    </>
  );
}
