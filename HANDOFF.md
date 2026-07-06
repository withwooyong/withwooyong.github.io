# 인수인계 (HANDOFF)

**갱신일**: 2026-07-07
**저장소**: [withwooyong.github.io](https://github.com/withwooyong/withwooyong.github.io)
**작업 브랜치**: `main` — 이 문서 커밋 시점 기준 워킹 트리 깨끗(이번 세션 변경 전부 커밋 완료).

---

## 1. 다음 세션을 위한 맥락

한국어 단일 포트폴리오(허우용 / Ted)를 **GitHub Pages 정적 호스팅**에 맞춰 유지·확장하는 것이 목표다. Pages Router + `output: "export"`이므로 **서버 런타임·API Route·`next/image` 최적화 파이프라인**은 사용하지 않는다.

최근 흐름은 **프로덕트 리더십 포지셔닝 강화 + 표기 정비 + 메인/서브 페이지 경험 통일**이다. 최근 세션 요약:

1. **회사 정식 표기 & 커머스개발실장** — 사이트·경력 라벨을 `(주)야나두 a kakao company (구 카카오키즈)`(영문: `Yanadoo Co., Ltd. (a kakao company, formerly Kakao Kids)`) / 직책 **커머스개발실장**으로 통일. 서비스명("야나두 AI 서비스"·"야나두 앱")은 유지. 외부 Notion 경력기술서(`282845b3742d8060bff8cd6f0012ef63`)도 동기화됨.
2. **프로덕트 리더십 1-pager** — 공개 라우트 [`/product-lead/`](pages/product-lead/index.tsx). 제품 관점(맥락→접근→임팩트) 재프레이밍. 홈 `#product` 요약 섹션·히어로 보조 CTA·내비 앵커로 연결.
3. **경력 근속기간 표시** — 경력 카드마다 날짜(뱃지)와 분리해 근속기간(연·개월)을 파란색으로 강조. 근속 계산은 **입·퇴사월 포함(LinkedIn 방식)**. 쌍용정보통신은 **정식 채용일(2005.11)** 기준(6년 8개월).
4. **경력 표현 정확화** — SKB의 "New CMS"는 **차세대 CMS(NCMS) 재구축의 '발주사(고객사) PM'**(MSA 설계·검토·오픈 조율)으로 표기. CJ TVING CMS 임팩트는 "팀과 함께 구축". 이 표현 기준을 유지할 것(과장 표현으로 회귀 금지).
5. **(이번 세션) 대표 여정 정비** — [`/product-lead/`](pages/product-lead/index.tsx)의 대표 여정을 **최신 경력부터 역순 정렬**하고, 기간을 **월 단위 + 근속기간**(메인 경력 카드와 동일 값·레이아웃)으로 통일. **쌍용정보통신(2005.11 - 2012.06 · 6년 8개월)** 을 "20년 여정의 출발점"으로 추가해 4단계 여정 완성(엔지니어 → 파트 리드 → PM → 실장 성장 서사).
6. **(이번 세션) `/product-lead/` CSS 효과** — 메인 페이지의 기존 효과를 그대로 재사용: 전 섹션 `SectionReveal` 스크롤 등장, 카드 `hover:shadow-lg`, CTA 버튼 hover 리프트, 프로필 사진 동전 회전(`profile-coin-group/-face`). **신규 CSS는 추가하지 않음** — 모든 애니메이션은 [`styles/globals.css`](styles/globals.css)에 이미 정의돼 있고 `prefers-reduced-motion` 대응 포함.

> **다음 담당자 필독 — 열려 있는 항목:**
> - **근속기간 하드코딩 이중화.** 근무기간·근속기간 문자열이 이제 [`pages/index.tsx`](pages/index.tsx)와 [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) **두 곳에 중복**돼 있다. 기간 갱신 시 반드시 두 파일을 함께 수정할 것. 장기적으로는 공용 데이터 파일([`data/portfolio.ts`](data/portfolio.ts))로 추출 권장.
> - **재직중 근속(4년 6개월)** 은 2026.07 기준 **고정 문자열**이라 시간이 지나면 실제와 벌어진다. 필요 시 빌드 시 자동 계산으로 전환 검토(정적 export라 하이드레이션 불일치 주의).
> - **결제·정산·구독 근거 보강.** [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx)의 해당 역량 행은 "커머스 총괄" 기준의 **보수적 문구**. 사용자가 실제 PG/결제수단·정산 유형·구독(빌링)·재구축 사례·역할 범위를 전달하면 구체 근거로 교체 예정.
> - **정량 지표.** 1-pager·여정 서술은 여전히 **정성**. `before → after` 수치는 실측치 확보 후 보강(산출법: DORA=Jenkins·Git 타임스탬프, 사이클타임=Jira 리포트, 챗봇 자동응대율=analytics+CS, 커머스=결제 대시보드/BI).

---

## 2. 실행·검증

```bash
npm ci          # 또는 npm install
npm run dev     # http://localhost:3000 — 영문 /en/, 프로덕트 리더십 /product-lead/
npm run build   # 산출물 ./out (이번 세션 빌드 통과: 5/5 정적 페이지)
```

- 이번 세션 `npm run build` **2회 통과 확인** — `✓ Compiled successfully`, 5/5 정적 페이지.
- **히어로 폰트**: Nanum Pen Script를 [`pages/_document.tsx`](pages/_document.tsx)의 Google Fonts `<link>`로 로드. 손글씨체가 안 보이면 이 링크/네트워크부터 확인.
- ⚠️ **dev 서버 실행 중 `npm run build` 동시 실행 금지** — 같은 `.next` 공유로 dev 청크가 깨지며 `/en`이 500(`MODULE_NOT_FOUND`)을 낼 수 있다. 빌드 필요 시 dev 중지 후 `rm -rf .next && npm run build`.
- **프로덕션 URL**: [`lib/site.ts`](lib/site.ts) 기본값 `https://withwooyong.github.io`. 프리뷰·커스텀 도메인은 `NEXT_PUBLIC_SITE_URL`.
- **배포**: `.github/workflows/deploy.yml` — `main` 푸시 시 `npm ci` → `npm run build` → `out` 업로드. **main = 프로덕션.**
- **알려진 무해 경고**: lucide-react `Github` 아이콘 deprecated 힌트(에러 아님), `npm ci` 취약점/오래된 caniuse-lite 경고 — 기능 영향 없음.

---

## 3. 디렉터리·진입점

| 경로 | 설명 |
|------|------|
| [`pages/index.tsx`](pages/index.tsx) | 한국어 메인(히어로 hello·`#product` 요약·경력 근속기간 등) |
| [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) | **프로덕트 리더십 1-pager(공개 라우트 `/product-lead/`)** — 대표 여정 4단계 역순·근속기간·SectionReveal 등 CSS 효과 |
| [`pages/en/index.tsx`](pages/en/index.tsx) | 영문 요약 |
| [`pages/_document.tsx`](pages/_document.tsx) | `lang="ko"` + **Nanum Pen Script Google Fonts 링크** |
| [`pages/_app.tsx`](pages/_app.tsx) | `next/font` Inter |
| [`data/portfolio.ts`](data/portfolio.ts) | 네비(#product 앵커 포함)·시스템 다이어그램·스킬·글 링크 |
| [`components/`](components/) | `site-head`, `portfolio-nav`, `theme-toggle`, `section-reveal`, `system-diagram-card`, `coin-flip-deck`, `hero-stripe-backdrop`, `thesis-summary-dialog`, `ui/*` |
| [`styles/globals.css`](styles/globals.css) | 테마 변수·모션·키프레임(`hero-hello*`·`profile-coin-*`·`section-reveal` 포함) |
| [`public/sitemap.xml`](public/sitemap.xml) | `/`, `/en/`, `/product-lead/` 등록 |
| [`lib/site.ts`](lib/site.ts) | 절대 URL |
| [`CLAUDE.md`](CLAUDE.md) | 에이전트용 저장소 메모 |

---

## 4. 권장 후속 작업

1. **경력 데이터 공용화** — 근무기간·근속기간이 두 페이지에 중복된 상태를 [`data/portfolio.ts`](data/portfolio.ts) 추출로 해소.
2. **결제·정산·구독 근거 보강** — 사용자 제공 자료로 [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) 역량 행 구체화.
3. **정량 지표 실측치 확보 → 1-pager `before → after` 보강**(위 산출법). 재직 중 접근 가능한 지표는 지금 캡처 권장.
4. 배포 후 `/product-lead/` **실화면 확인** — 여정 역순·근속기간 표시·SectionReveal/동전 회전 동작.
5. (선택) 재직중 근속 자동 계산 전환, 주기적 **`npm audit`** 및 Next 패치 노트 확인.

---

## 5. 미커밋 작업 알림

이 HANDOFF 작성 시점 기준 **워킹 트리는 깨끗**하다. 이번 세션 커밋:

- `9a11609` content: 프로덕트 리더십 대표 여정 최신순 정렬·근속기간 표시·메인 페이지 CSS 효과 적용
- `77558bb` content: 프로덕트 리더십 대표 여정에 쌍용정보통신 경력 추가
- `docs: 세션 인수인계 갱신` — 본 HANDOFF·CHANGELOG 갱신 커밋(이 문서를 포함하는 후속 커밋)

(직전 커밋: `c045df6`/`431f3c0` SKB 발주사 PM 표현 정확화 · `d0d48d8`/`b370439` 근속기간·히어로 손글씨)

---

## 6. 관련 문서

- [CHANGELOG.md](CHANGELOG.md) — 날짜별 변경 요약(2026-07-07 항목 참고)
- [README.md](README.md) — 설치·빌드·구조
- [docs/site-renewal-roadmap.md](docs/site-renewal-roadmap.md)
- [docs/site-renewal-completion-report.md](docs/site-renewal-completion-report.md)
