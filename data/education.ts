/**
 * 학력 콘텐츠.
 *
 * 구 `pages/index.tsx` 의 `#education` 섹션(HEAD 기준 460~484줄)에 JSX 문자열로 박혀 있던
 * 것을 그대로 옮겼다. Task 10 이 index.tsx 를 전면 재작성하면서 이 문자열들이 추적 파일에서
 * 통째로 사라질 뻔했다 — 실측으로 `git grep 서울시립대` 가 작업트리 0건이었다.
 *
 * **문자열은 한 글자도 바꾸지 않는다.** 오탈자로 보여도 여기서 고치지 않는다 —
 * 고치는 순간 「추출이 틀렸다」와 「고친 게 맞다」를 아무도 구분하지 못한다
 * (`data/experience.ts` 머리 주석과 같은 이유).
 *
 * ⚠️ **소비자: T12 (`/about`).** 지금 이 데이터를 렌더하는 페이지는 하나도 없다.
 *    `/about` 을 만드는 사람은 이 파일을 반드시 읽어라 — `data/portfolio.ts` 만 보고
 *    학력 페이지를 만들면 **학교 이름도 논문 제목도 없는 페이지**가 나온다.
 *
 * ⚠️ 논문 **요약 원문**은 여기가 아니라 `data/portfolio.ts` 의 `thesisSummaryNarration`
 *    에 있다(구 `ThesisSummaryDialog` 가 쓰던 것). 학력을 옮길 때 둘을 함께 본다.
 */
export type EducationItem = {
  /** 학교와 학위 */
  school: string;
  /** 학위논문 제목 */
  thesisTitle: string;
  /** 논문 PDF 공개 링크 */
  thesisPdfUrl: string;
};

export const education: EducationItem[] = [
  {
    school: "서울시립대학교 (석사)",
    thesisTitle: "시스템 통합 서비스를 위한 확장 가능한 NoSQL 설계방법 연구",
    thesisPdfUrl:
      "https://drive.google.com/file/d/1eAv426PXVEaCpMvQAvcUHkMUZ2WggM4j/view?usp=sharing",
  },
];
