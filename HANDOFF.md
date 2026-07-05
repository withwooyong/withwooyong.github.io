# 인수인계 (HANDOFF)

**갱신일**: 2026-07-05
**저장소**: [withwooyong.github.io](https://github.com/withwooyong/withwooyong.github.io)
**작업 브랜치**: `main` — 이 문서 커밋 시점 기준 워킹 트리 깨끗(이번 세션 변경 전부 커밋 완료).

---

## 1. 다음 세션을 위한 맥락

한국어 단일 포트폴리오(허우용 / Ted)를 **GitHub Pages 정적 호스팅**에 맞춰 유지·확장하는 것이 목표다. Pages Router + `output: "export"`이므로 **서버 런타임·API Route·`next/image` 최적화 파이프라인**은 사용하지 않는다.

이번 세션은 **회사 표기 정비 + 프로덕트 리더십 포지셔닝 페이지 추가**가 중심이었다:

1. **회사 정식 표기** — 사이트·경력 라벨의 `야나두`를 **(주)야나두 a kakao company (구 카카오키즈)**(영문: `Yanadoo Co., Ltd. (a kakao company, formerly Kakao Kids)`)로, 직책을 **커머스개발실장**으로 통일. 단 "야나두 AI 서비스"·"야나두 앱" 같은 **서비스/제품명은 그대로 유지**(브랜드명). 외부 Notion 경력기술서(페이지 `282845b3742d8060bff8cd6f0012ef63`)도 동일 규칙으로 동기화함(표·소개·포지션 헤딩).
2. **프로덕트 리더십 1-pager** — 새 공개 라우트 [`/product-lead/`](pages/product-lead/index.tsx). "개발/아키텍트" 톤 위주였던 포트폴리오를 **제품(로드맵→기획/설계→출시→지표) 관점**으로 재프레이밍한 요약 페이지. 핵심 요약·대표 여정·요구 역량 매핑 표 구성.
3. **홈 연결** — About과 경력 사이 `#product` 요약 섹션, 히어로 보조 CTA, 내비 앵커로 1-pager 유입 동선 추가.

> **다음 담당자 필독 — 아직 남은 두 가지:**
> - **정량 지표 채우기.** 현재 1-pager·여정 서술은 전부 **정성**이다. `before → after` 수치는 사용자 실측치 확보 후 보강 예정. 산출 방법은 사용자에게 전달됨: 배포 리드타임/빈도 = Jenkins·Bitbucket/Git 타임스탬프(DORA 지표), 개발 사이클타임 = Jira Control/Cycle Time 리포트, 챗봇 자동응대율 = 챗봇 analytics + CS 티켓, 커머스 전환/GMV = 결제 대시보드/BI. **개선 이벤트(재구축·자동화) 날짜를 기준으로 전후 평균 비교.**
> - **결제·정산 경험 확인.** [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx)의 역량 매핑 표에서 "결제·정산 시스템 현대화" 행이 **"(확인 필요)"** 플레이스홀더 상태다. 사용자 실경험 확인되면 근거 한 줄로 교체.

---

## 2. 실행·검증

```bash
npm ci          # 또는 npm install
npm run dev     # http://localhost:3000 — 영문 /en/, 프로덕트 리더십 /product-lead/
npm run build   # 산출물 ./out (이번 세션 빌드 통과: 5/5 정적 페이지, /product-lead 포함)
```

- 이번 세션 `npm ci && npm run build` **통과 확인** — `✓ Compiled successfully`, `/product-lead` 6.87 kB 정적 프리렌더, `out/product-lead/index.html` 생성.
- ⚠️ **dev 서버 실행 중 `npm run build` 동시 실행 금지** — 같은 `.next`를 공유해 dev 청크가 깨지며 `/en`이 500(`MODULE_NOT_FOUND`)을 낼 수 있다. 빌드가 필요하면 dev 중지 후 `rm -rf .next && npm run build`.
- **프로덕션 URL**: [`lib/site.ts`](lib/site.ts) 기본값 `https://withwooyong.github.io`. 프리뷰·커스텀 도메인은 `NEXT_PUBLIC_SITE_URL`로 덮어쓴다.
- **배포**: `.github/workflows/deploy.yml` — `main` 푸시 시 `npm ci` → `npm run build` → `out` 업로드. **main = 프로덕션.**
- **알려진 무해 경고**: lucide-react `Github` 아이콘 deprecated 힌트(빌드 에러 아님), `npm ci` 시 오래된 caniuse-lite/일부 패키지 취약점 경고 — 기능 영향 없음.

---

## 3. 디렉터리·진입점

| 경로 | 설명 |
|------|------|
| [`pages/index.tsx`](pages/index.tsx) | 한국어 메인(대부분의 섹션, `#product` 요약 섹션 포함) |
| [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) | **프로덕트 리더십 1-pager(공개 라우트 `/product-lead/`)** |
| [`pages/en/index.tsx`](pages/en/index.tsx) | 영문 요약 |
| [`pages/_app.tsx`](pages/_app.tsx), [`pages/_document.tsx`](pages/_document.tsx) | 폰트·`lang` |
| [`data/portfolio.ts`](data/portfolio.ts) | 네비(#product 앵커 포함)·시스템 다이어그램·스킬·글 링크 |
| [`components/`](components/) | `site-head`, `portfolio-nav`, `theme-toggle`, `section-reveal`, `system-diagram-card`, `coin-flip-deck`, `hero-stripe-backdrop`, `thesis-summary-dialog`, `ui/*` |
| [`lib/site.ts`](lib/site.ts) | 절대 URL |
| [`public/sitemap.xml`](public/sitemap.xml) | `/`, `/en/`, `/product-lead/` 등록 |
| [`styles/globals.css`](styles/globals.css) | 테마 변수·모션·키프레임 |
| [`CLAUDE.md`](CLAUDE.md) | 에이전트용 저장소 메모 |

---

## 4. 권장 후속 작업

1. **정량 지표 실측치 확보 → 1-pager `before → after` 보강** (위 방법 참조). 재직 중 접근 가능한 지표는 **지금 캡처**해 두는 것을 권장.
2. **결제·정산 경험** 확인 후 역량 매핑 표 "(확인 필요)" 행 교체.
3. 배포 후 `/product-lead/` **OG/canonical 미리보기**(슬랙 등) 및 화면 확인.
4. 주기적 **`npm audit`** 및 Next 패치 노트 확인.

---

## 5. 미커밋 작업 알림

이 HANDOFF 작성 시점 기준 **워킹 트리는 깨끗**하다. 이번 세션 커밋:

- `b9b88a6` feat: 프로덕트 리더십 요약 페이지 및 홈 섹션 추가, 회사 정식 표기 정비
- `docs: 세션 인수인계 갱신` — 본 HANDOFF·CHANGELOG 갱신 커밋(이 문서를 포함하는 후속 커밋)

---

## 6. 관련 문서

- [CHANGELOG.md](CHANGELOG.md) — 날짜별 변경 요약(2026-07-05 항목 참고)
- [README.md](README.md) — 설치·빌드·구조
- [docs/site-renewal-roadmap.md](docs/site-renewal-roadmap.md)
- [docs/site-renewal-completion-report.md](docs/site-renewal-completion-report.md)
