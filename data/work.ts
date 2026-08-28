/**
 * `/work` 페이지 전용 콘텐츠 — 포지셔닝 문구와 요구 역량 매핑 표.
 *
 * **출처: `pages/product-lead-v2/index.tsx` (사용자 확정본).**
 * `lead`·`sub` 는 그 파일의 포지셔닝 2문장을, `capabilityMap` 은 역량 매핑 10행을
 * **한 글자도 고치지 않고** 옮긴 것이다. 이관 근거와 버린 것의 목록은
 * `docs/superpowers/plans/2026-08-25-work-merge-notes.md` §2·§7 에 있다.
 *
 * `eyebrow`·`heading` 만 `-v2` 에 대응물이 없다 — 자체 히어로를 버렸으므로
 * 계획서(`2026-08-25-redesign-phase-1-2.md` §Task 11 Step 2) 예시 코드의 것을 쓴다.
 *
 * ⚠️ **이 파일은 다른 모듈을 import 하지 않는다.** `e2e/work.spec.ts` 가 상대 경로로
 *    직접 읽어 화면에서 센 수와 맞춘다. `@/` 별칭이든 무엇이든 import 를 하나라도
 *    더하면 Playwright 쪽 해석이 깨진다.
 *
 * ⚠️ 문구를 고치기 전에 `tests/work/work-data.test.ts` 를 보라. `lead`·`sub` 는
 *    축자 일치로 고정돼 있고, 「원조 주장」 표현과 구본 「발주사 PM」은 금지다.
 */

export type CapabilityRow = {
  /** 채용 공고가 요구하는 역량 — 렌더에서 key 로 쓰이므로 중복되면 안 된다 */
  need: string;
  /** 그 역량을 뒷받침하는 이력 */
  evidence: string;
  /**
   * 원본 타입에 있던 필드. `-v2` 확정본은 10행 모두 값을 비워 두었고,
   * 여기서도 타입만 옮기고 값은 넣지 않는다.
   */
  confirm?: boolean;
};

export const workPositioning = {
  eyebrow: "Work",
  heading: "로드맵에서 출시까지, 그리고 그 뒤의 지표까지",
  lead: "20년간 OTT·커머스 플랫폼의 코어를 설계·재구축하고, 20~30인 조직을 총괄해 온 리더.",
  sub: "차세대 CMS 재구축을 발주 PM으로 완주하고, 커머스·AI 플랫폼까지 총괄하는 프로덕트 리더.",
};

export const capabilityMap: CapabilityRow[] = [
  {
    need: "콘텐츠·플랫폼 코어 엔진 로드맵",
    evidence: "OTT·N-Screen의 CMS·검색·편성·통합 API를 설계·운영 (CJ헬로비전, SKB)",
  },
  {
    need: "대규모 CMS 재구축·현대화",
    evidence: "SKB 차세대 CMS(NCMS) 재구축 발주 PM(MSA 설계·검토) + TVING CMS 1세대 구축 리드",
  },
  {
    need: "커머스 결제·정산·구독 도메인",
    evidence: "야나두 교육·커머스 플랫폼 총괄 — 결제·정산·구독 등 커머스 핵심 도메인 서비스 개발 관리",
  },
  {
    need: "플랫폼 거버넌스·요구사항 모듈화",
    evidence: "MSA 설계, 통합 이미지/API 플랫폼, 확장 가능한 DB 설계 연구(석사 논문)",
  },
  {
    need: "MSA · API 설계 · 클라우드",
    evidence: "Spring Boot 기반 API·MSA, 온프레미스(IDC)와 AWS 모두 운영",
  },
  {
    need: "백오피스·내부 운영 UX 고도화",
    evidence: "CMS·편성·백오피스 운영 도구 개발을 제품 단위로 총괄",
  },
  {
    need: "OTT · 스트리밍 도메인",
    evidence: "KT·CJ헬로비전·SK브로드밴드에서 OTT/N-Screen/STB 20년",
  },
  {
    need: "커머스 플랫폼",
    evidence: "야나두 교육·커머스 플랫폼 총괄",
  },
  {
    need: "AI 기반 메타데이터 자동화",
    evidence: "검색·추천·딥메타 실무 + AI 챗봇 서비스 직접 개발·런칭",
  },
  {
    need: "PM·크로스펑셔널 조직 리딩",
    evidence: "기획·PM 포함 전 직군 20~30명 총괄",
  },
];
