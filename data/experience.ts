/**
 * 경력 카드 콘텐츠.
 *
 * `pages/index.tsx` 의 experience 섹션에 JSX 문자열로 박혀 있던 것을 그대로 옮겼다.
 * 재설계로 index.tsx 를 전면 재작성할 때 이력 문구가 소실되지 않게 하는 것이 목적이므로,
 * **문자열은 한 글자도 바꾸지 않는다.** 오탈자로 보여도 여기서 고치지 않는다 —
 * 고치는 순간 `check-baseline` 이 「추출이 틀렸다」와 「고친 게 맞다」를 구분하지 못한다.
 *
 * ⚠️ 색상은 이름이 아니라 **완성된 Tailwind 클래스 문자열**로 담는다.
 *    Tailwind 는 소스를 정적으로 훑어 클래스를 만들기 때문에 `text-${accent}-500` 같은
 *    조립식 이름은 CSS 가 생성되지 않는다. `tailwind.config.js` 의 content 에
 *    `./data/**` 가 이미 들어 있어 이 파일의 문자열은 정상적으로 수집된다.
 */
export type ExperienceItem = {
  /** 직책. 「커머스개발실장」처럼 정식 표기를 그대로 옮긴다 */
  role: string;
  /** 회사 라벨 — Global Constraints 문구 규칙을 따른다 */
  company: string;
  /** 회사 라벨에 붙는 완성된 Tailwind 클래스 — 예: "text-blue-600 dark:text-blue-400" */
  companyClass: string;
  /** 예: "2022.02 - 2026.07" */
  period: string;
  /** 예: "4년 6개월" */
  duration: string;
  /** 카드 본문 한 문단 */
  summary: string;
  /** 불릿 기호에 붙는 완성된 Tailwind 클래스 — 예: "text-blue-500 dark:text-blue-400" */
  bulletClass: string;
  /** 불릿 목록 */
  highlights: string[];
};

export const experiences: ExperienceItem[] = [
  {
    role: "커머스개발실장",
    company: "(주)야나두 a kakao company (구 카카오키즈)",
    companyClass: "text-blue-600 dark:text-blue-400",
    period: "2022.02 - 2026.07",
    duration: "4년 6개월",
    summary:
      "기획, UI/UX, 프론트, 백엔드, 앱, 데브옵스 포지션의 인력(20~30명)으로 야나두 전반적인 서비스 개발 총괄",
    bulletClass: "text-blue-500 dark:text-blue-400",
    highlights: [
      "다양한 챗봇 형태의 AI 기술 서비스 개발 및 런칭",
      "교육&커머스 도메인 서비스 개발 총괄",
      "풀스택 개발팀 리딩 및 프로젝트 관리",
    ],
  },
  {
    role: "Senior 엔지니어 & PM",
    company: "SK Broadband (AI 서비스 개발스쿼드/미디어클라우드스쿼드)",
    companyClass: "text-green-600 dark:text-green-400",
    period: "2017.04 - 2021.06",
    duration: "4년 3개월",
    summary:
      "BTV 백엔드 개발 매니저 (PM)로 검색, 딥메타, NUGU 음성 AI 연동, CMS, 로그연동 개인화, 통합이미지플랫폼 등 다양한 서비스 개발",
    bulletClass: "text-green-500 dark:text-green-400",
    highlights: [
      "N-Screen 백엔드 연동 서비스를 위한 Spring Boot / Elasticsearch 기반 API 개발",
      "검색 시스템 개발 / 추천 서비스 API 개발 및 ELK Stack 구축",
      "대용량 데이터 처리 및 분석을 위한 Kafka Consumer, ELK 구성 데이터 연동 적재모듈 개발",
      "차세대 CMS(NCMS) 재구축 발주사 PM — MSA 설계·검토 및 오픈 조율",
    ],
  },
  {
    role: "CMS 개발 파트 리드",
    company: "CJ Hellovision (TVING 서비스개발팀)",
    companyClass: "text-purple-600 dark:text-purple-400",
    period: "2012.06 - 2017.04",
    duration: "4년 11개월",
    summary:
      "TVING CMS 개발 파트 리드로 CMS, 검색, 이미지, 미디어트랜스코딩 등 N-Screen 서비스 개발",
    bulletClass: "text-purple-500 dark:text-purple-400",
    highlights: [
      "Spring Framework 기반 CMS 개발",
      "검색 시스템 / 랭킹추천 서비스 API 개발",
      "N-Screen 통합API 개발을 위한 MongoDB 기반 API 개발",
      "이미지 resizing 서버 개발",
    ],
  },
  {
    role: "시스템 개발",
    company: "쌍용정보통신 (통신연구소/뉴미디어기술팀)",
    companyClass: "text-orange-600 dark:text-orange-400",
    period: "2005.11 - 2012.06",
    duration: "6년 8개월",
    summary: "KT 가입자계 통합보안 관제시스템 개발 및 KT QOOK TV A-MOC 플랫폼 개발",
    bulletClass: "text-orange-500 dark:text-orange-400",
    highlights: [
      "KT 가입자계 통합보안관리시스템(ISM) 프로젝트 수행",
      "KT QOOK TV A-MOC 플랫폼 개발 프로젝트 수행",
    ],
  },
];
