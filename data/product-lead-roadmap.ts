/**
 * TVING Platform Product Lead — "어떻게 일할 것인가" 실행 설계 콘텐츠.
 *
 * 원문: pages/product-lead-loadmap/*.md (허브 + 4개 도메인 문서) — **T13 이 라우트째 지웠다.**
 * 이 모듈에 옮겨 적은 데이터가 그 내용의 유일한 사본이다.
 *
 * ⚠️ **import 하는 파일이 0건이다(2026-08-28 실측).** 유일한 소비자였던 JSX
 *    pages/product-lead-loadmap/index.tsx 를 T13 이 지웠기 때문이다 — 그 URL 은 이제
 *    public/product-lead-loadmap/index.html 스텁이 /work/ 로 보낸다.
 *    이 파일은 T14 의 고아 정리 대상이다 — 새로 import 하지 마라.
 *
 * 주의: 모든 As-Is 서술은 공개정보에서 추론한 가설이며, 로드맵의 기간·목표치는 전부 가정이다.
 */

/** 공고 주요업무 ↔ 실행 접근 매핑 */
export type MissionMap = {
  no: string;
  posting: string;
  domain: string;
  approach: string;
};

export const missionMap: MissionMap[] = [
  {
    no: "1",
    posting: "콘텐츠·플랫폼 코어 엔진 중장기 로드맵 (CMS·결제/정산·공통 어드민)",
    domain: "CMS · 결제/정산 · 공통 어드민",
    approach: "도메인별 북극성 지표를 하나씩 세우고, 플랫폼 전체를 관통하는 하나의 지표 트리로 묶는다.",
  },
  {
    no: "2",
    posting: "차세대 CMS 재구축 기획 총괄 (멀티테넌트·글로벌·워크플로우 자동화)",
    domain: "CMS",
    approach: "진단으로 baseline을 만들고, 지표에 합의한 뒤, Strangler Fig 방식으로 점진 전환한다.",
  },
  {
    no: "3",
    posting: "플랫폼 거버넌스 및 기능 모듈화",
    domain: "거버넌스 · 글로벌",
    approach: "모듈마다 소유권을 명시하고, 모듈 간 API 계약을 문서가 아니라 CI 게이트로 강제한다.",
  },
  {
    no: "4",
    posting: "내부 고객 경험 향상 및 플랫폼 이네이블먼트",
    domain: "공통 어드민",
    approach: "북극성을 '셀프서비스 비율'로 둔다 — 운영자가 개발 티켓 없이 스스로 끝낸 작업의 비율.",
  },
  {
    no: "5",
    posting: "플랫폼 성과 지표 정의 및 PM 조직 빌딩",
    domain: "거버넌스 · 조직",
    approach: "Time-to-Launch를 플랫폼 북극성으로 삼고, 사람을 뽑기 전에 역할 정의를 먼저 끝낸다.",
  },
];

/** 4개 도메인이 어떻게 얽히는가 — 관찰과 함의 */
export type Coupling = {
  observation: string;
  implication: string;
};

export const couplings: Coupling[] = [
  {
    observation: "공통 어드민은 모든 도메인을 관통한다",
    implication: "권한과 감사는 도메인이 아니라 횡단 관심사다. 가장 먼저 세워야 나머지가 안전해진다.",
  },
  {
    observation: "거버넌스도 관통한다",
    implication: "테넌트 설정 하나가 CMS와 결제 양쪽을 바꾼다. 늦게 넣을수록 비싸진다.",
  },
  {
    observation: "CMS의 권리 정보가 정산의 입력이 된다",
    implication: "권리 보유자를 모르면 배급사에 얼마를 줄지 모른다. 두 도메인이 한 모델을 공유해야 한다.",
  },
  {
    observation: "결제가 CMS의 노출을 결정한다",
    implication: "시청 권한이 없으면 카탈로그에 보여도 재생할 수 없다.",
  },
];

/** 우선순위 판단의 세 가지 원칙 */
export type Principle = {
  title: string;
  reason: string;
};

export const priorityPrinciples: Principle[] = [
  {
    title: "리스크가 큰 것부터 방어한다",
    reason: "권리 위반 노출, PII 유출, 이중 청구는 되돌릴 수 없다.",
  },
  {
    title: "검증 기반부터 구축한다",
    reason: "baseline·원장·감사로그·모듈 레지스트리가 없으면, 바꾼 게 맞는지 알 수 없다.",
  },
  {
    title: "코어 재구축은 가장 뒤에 둔다",
    reason: "가장 크고 가장 위험하다. 앞의 둘이 준비된 뒤에 착수한다.",
  },
];

/** 착수 순서 4단계 */
export type Stage = {
  period: string;
  title: string;
  items: string[];
  accent: string;
};

export const stages: Stage[] = [
  {
    period: "0–3개월",
    title: "진단 + Quick Win",
    items: ["baseline 계측", "퇴사자 계정 회수", "권리 만료 자동 알림"],
    accent: "emerald",
  },
  {
    period: "3–9개월",
    title: "검증 기반",
    items: ["감사로그 · SSO", "원장 병렬 기록", "모듈 레지스트리", "API Gateway 파사드"],
    accent: "amber",
  },
  {
    period: "9–18개월",
    title: "코어 이관",
    items: ["CMS 저위험 → 코어", "결제 카나리", "어드민 셸"],
    accent: "blue",
  },
  {
    period: "18개월+",
    title: "확장",
    items: ["테넌트 구조", "글로벌 준비", "셀프서비스"],
    accent: "violet",
  },
];

/** 부임 후 0-30-60-90일 */
export type OnboardingPhase = {
  window: string;
  theme: string;
  items: string[];
};

export const onboarding: OnboardingPhase[] = [
  {
    window: "0–30일",
    theme: "듣기와 측정",
    items: [
      "운영자 인터뷰 — 5개 직군",
      "작업 로그 계측 시작",
      "권한 · 계정 인벤토리",
      "백엔드 · 데이터 · AI팀과 관계 형성",
      "세 가지 질문 던지기",
    ],
  },
  {
    window: "30–60일",
    theme: "문제 정의와 Quick Win",
    items: ["baseline 5종 확정", "퇴사자 계정 회수", "권리 만료 자동 알림", "우선순위 매트릭스 확정"],
  },
  {
    window: "60–90일",
    theme: "로드맵과 합의",
    items: [
      "재구축 범위 · 순서 문서화",
      "북극성 · 가드레일 · 중단 기준 합의",
      "PM 역할 정의 · 채용 기준",
      "경영진 투자 근거 발표",
    ],
  },
];

/** 부임 첫 30일에 반드시 던지는 세 가지 질문 */
export const firstQuestions: string[] = [
  "지난 분기에 고객 개인정보를 조회한 사람의 목록을 뽑을 수 있나요?",
  "운영 DB에 상시 접속 가능한 계정은 몇 개인가요?",
  "지난 분기 개발 티켓 중, 운영자가 스스로 처리할 수 있었어야 하는 건 몇 %인가요?",
];

/** 통합 지표 체계 */
export const northStar = {
  title: "Time-to-Launch",
  description: "새로운 사업 하나를 이 플랫폼 위에 얹는 데 드는 시간",
};

export type DomainMetric = {
  domain: string;
  metric: string;
  supporting: string;
};

export const domainMetrics: DomainMetric[] = [
  { domain: "CMS", metric: "수급 → 노출 리드타임", supporting: "자동화 처리율 · 단계별 소요시간" },
  { domain: "결제 · 정산", metric: "결제 성공률 × 정산 마감일", supporting: "던닝 회수율 · 대사 자동 매칭률" },
  { domain: "공통 어드민", metric: "셀프서비스 비율", supporting: "작업당 소요시간 · 온보딩 리드타임" },
  { domain: "거버넌스", metric: "신규 테넌트 온보딩 소요일", supporting: "API 계약 위반 차단 · 번역 커버리지" },
];

/** 전사 가드레일 — 하나라도 깨지면 실패 */
export const guardrails: string[] = [
  "권리 · 지역 위반 노출 = 0",
  "이중 청구 = 0",
  "원장 불변식 위반 = 0",
  "퇴사자 잔존 권한 = 0",
  "운영 DB 상시접속 = 0",
  "재작업률 baseline +5%p 이내",
];

/** 지표를 만들 때의 원칙 */
export const metricPrinciples: Principle[] = [
  {
    title: "북극성은 반드시 하나",
    reason: "여러 개면 아무것도 아니게 된다. 도메인마다 하나, 플랫폼 전체에 하나.",
  },
  {
    title: "속도 지표에는 품질 짝지표를",
    reason: "리드타임 ↔ 재작업률 / 자동화율 ↔ 결함율 / 셀프서비스 ↔ 감사 커버리지.",
  },
  {
    title: "게이밍 가능한 지표는 쓰지 않는다",
    reason: "'AI 사용량'이 아니라 '리드타임'. 사용량은 늘리기 쉽고 성과와 무관하다.",
  },
];

/** 중단 기준 — 확산 전에 멈출 조건을 먼저 정한다 */
export type StopRule = {
  domain: string;
  condition: string;
};

export const stopRules: StopRule[] = [
  { domain: "CMS", condition: "권리 위반 노출 1건 → 해당 도메인 즉시 롤백" },
  { domain: "결제", condition: "카나리 구간 이중 청구 1건 → 100% 레거시 복귀" },
  { domain: "공통 어드민", condition: "셀프서비스 확대 후 감사로그 누락 발견 → 모듈 롤백" },
  { domain: "거버넌스", condition: "JIT 권한 도입 후 장애 MTTR 악화 → 승인 SLA 도입" },
];
