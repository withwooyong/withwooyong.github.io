/**
 * 주요 프로젝트 카드 콘텐츠.
 *
 * `pages/index.tsx` 의 projects 섹션에 JSX 로 박혀 있던 것을 그대로 옮겼다.
 * `data/experience.ts` 와 같은 원칙 — **문자열은 한 글자도 바꾸지 않는다.**
 *
 * ⚠️ `gradient` 와 `logoClass` 는 경로나 색 이름이 아니라 **완성된 Tailwind 클래스 문자열**이다.
 *    Tailwind 는 소스 텍스트를 정적으로 훑어 클래스를 만든다. 배경 로고 유틸리티를
 *    템플릿 문자열로 조립하면 스캐너가 그것을 찾지 못해 CSS 가 통째로 사라진다.
 *    그래서 마크업이 소비하는 값은 경로가 아니라 클래스다.
 *    다만 경로 자체는 콘텐츠이므로 `logo` 에 **병기**해 둔다 — 클래스 문자열을 되파싱하지 않고도
 *    `next/image` 같은 다른 방식으로 갈아탈 수 있어야 하기 때문이다.
 *
 *    같은 이유로 이 주석에는 대괄호 임의값 문법을 예시로 적지 않는다 —
 *    스캐너는 주석도 텍스트로 읽어서, 예시로 적은 것까지 실제 CSS 로 만들어 버린다.
 *    (실측: 조립식 예시를 주석에 적었더니 css-loader 가 그 경로를 모듈로 찾다 빌드가 죽었다)
 */
export type ProjectLink = {
  /** 버튼이 여는 외부 URL */
  href: string;
  /** 버튼 라벨 — 예: "서비스 보기" */
  label: string;
};

export type ProjectItem = {
  title: string;
  description: string;
  /**
   * ⚠️ **과도기 필드 — 콘텐츠가 아니라 구 디자인의 표현이다.**
   * 카드 상단 그라디언트 클래스 — 예: "from-yellow-400 to-orange-500".
   * 신규 단일 시그널 토큰 체계(`text-signal`·`text-hero` 등)에는 이 4색 액센트가 없다.
   * 새 디자인으로 옮겨갈 때 **제거 대상**이며, 그때까지는 지금 마크업이 이 값을 쓴다.
   */
  gradient: string;
  /**
   * ⚠️ **과도기 필드 — 콘텐츠가 아니라 구 디자인의 표현이다.**
   * 배경 로고를 얹는 완성된 Tailwind 클래스. 없으면 생략.
   * 이미지 경로가 클래스 문자열 안에 묻혀 있으므로 **경로가 필요하면 `logo` 를 쓴다** —
   * 이 문자열을 되파싱하지 마라. 새 디자인으로 옮겨갈 때 **제거 대상**이다.
   */
  logoClass?: string;
  /**
   * 배경 로고의 원본 이미지 경로 — 예: "/images/yanadoo-logo.png".
   * `logoClass` 와 같은 이미지를 가리키지만 이쪽이 **표현에 묶이지 않은 콘텐츠**다.
   * 지금 마크업은 이 필드를 소비하지 않는다. `next/image` 등 다른 방식으로 바꿀 때 쓰라고 병기해 둔 것이다.
   */
  logo?: string;
  /** 카드 위에 얹는 라벨 — 예: "야나두" */
  label: string;
  tags: string[];
  /**
   * 카드 하단 링크 버튼. 2개 이상이면 `grid grid-cols-2` 로 감싸고,
   * 1개면 감싸는 div 없이 버튼만 놓는다 — 기존 마크업이 그랬다.
   */
  links: ProjectLink[];
};

export const projects: ProjectItem[] = [
  {
    title: "야나두 AI 서비스",
    description: "교육&커머스 도메인의 AI 챗봇 서비스 개발",
    gradient: "from-yellow-400 to-orange-500",
    logoClass: "bg-[url('/images/yanadoo-logo.png')]",
    logo: "/images/yanadoo-logo.png",
    label: "야나두",
    tags: ["커머스", "AI", "챗봇", "교육", "B2B"],
    links: [
      { href: "https://www.yanadoo.co.kr/AIYanadoo", label: "AI 맞춤학습" },
      { href: "https://www.yanadoo.co.kr/AIContents", label: "서비스 보기" },
    ],
  },
  {
    title: "SK Broadband BTV",
    description: "BTV 백엔드 연동 CMS/검색/추천/이미지 시스템 개발",
    gradient: "from-red-600 to-red-700",
    logoClass: "bg-[url('/images/skb-logo.png')]",
    logo: "/images/skb-logo.png",
    label: "BTV",
    tags: ["OTT", "검색", "추천", "이미지", "CMS"],
    links: [
      {
        href: "https://www.bworld.co.kr/product/btv/mobile_btv.do?menu_id=P03050200",
        label: "서비스 보기",
      },
    ],
  },
  {
    title: "TVING",
    description: "N-Screen 통합 CMS 및 검색/추천 서비스 개발",
    gradient: "from-red-500 to-pink-600",
    logoClass: "bg-[url('/images/tving-logo.png')]",
    logo: "/images/tving-logo.png",
    label: "TVING",
    tags: ["N-Screen", "CMS", "검색", "API"],
    links: [{ href: "https://www.tving.com", label: "서비스 보기" }],
  },
];
