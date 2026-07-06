# 인수인계 (HANDOFF)

**갱신일**: 2026-07-06
**저장소**: [withwooyong.github.io](https://github.com/withwooyong/withwooyong.github.io)
**작업 브랜치**: `main` — 이 문서 커밋 시점 기준 워킹 트리 깨끗(이번 세션 변경 전부 커밋 완료).

---

## 1. 다음 세션을 위한 맥락

한국어 단일 포트폴리오(허우용 / Ted)를 **GitHub Pages 정적 호스팅**에 맞춰 유지·확장하는 것이 목표다. Pages Router + `output: "export"`이므로 **서버 런타임·API Route·`next/image` 최적화 파이프라인**은 사용하지 않는다.

최근 흐름은 **프로덕트 리더십 포지셔닝 강화 + 표기 정비 + 히어로 연출**이다. 직전 두 세션 요약:

1. **회사 정식 표기 & 커머스개발실장** — 사이트·경력 라벨을 `(주)야나두 a kakao company (구 카카오키즈)`(영문: `Yanadoo Co., Ltd. (a kakao company, formerly Kakao Kids)`) / 직책 **커머스개발실장**으로 통일. 서비스명("야나두 AI 서비스"·"야나두 앱")은 유지. 외부 Notion 경력기술서(`282845b3742d8060bff8cd6f0012ef63`)도 동기화됨.
2. **프로덕트 리더십 1-pager** — 공개 라우트 [`/product-lead/`](pages/product-lead/index.tsx). 제품 관점(로드맵→기획/설계→출시→지표) 재프레이밍. 홈 `#product` 요약 섹션·히어로 보조 CTA·내비 앵커로 연결.
3. **경력 근속기간 표시** — 경력 카드마다 날짜(뱃지)와 분리해 근속기간(연·개월)을 파란색으로 강조. 소개 "현재 포지션" 카드도 통일. 쌍용정보통신은 **정식 채용일(2005.11)** 기준으로 정정(6년 8개월). 근속 계산은 **입·퇴사월 포함(LinkedIn 방식)**.
4. **히어로 "hello" 손글씨** — "안녕하세요, 허우용입니다"를 macOS 초기화면 hello 느낌으로. Nanum Pen Script(Google Fonts `<link>`) + `clip-path` 왼→오 손글씨 리빌 애니메이션.

> **다음 담당자 필독 — 열려 있는 항목:**
> - **결제·정산·구독 근거 보강.** [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx)의 해당 역량 행은 현재 "커머스 총괄" 기준의 **보수적 문구**다(플레이스홀더는 제거됨). 사용자가 실제 PG/결제수단·정산 유형·구독(빌링)·재구축 사례·본인 역할 범위를 전달하면 구체 근거로 교체 예정.
> - **정량 지표.** 1-pager·여정 서술은 여전히 **정성**. `before → after` 수치는 실측치 확보 후 보강(산출법: DORA=Jenkins·Git 타임스탬프, 사이클타임=Jira 리포트, 챗봇 자동응대율=analytics+CS, 커머스=결제 대시보드/BI. 개선 이벤트 날짜 기준 전후 비교).
> - **재직중 근속(4년 6개월)** 은 오늘(2026.07) 기준 **고정 문자열**이라 시간이 지나면 실제와 벌어진다. 필요 시 빌드 시 자동 계산으로 전환 검토(정적 export라 하이드레이션 불일치 주의).

---

## 2. 실행·검증

```bash
npm ci          # 또는 npm install
npm run dev     # http://localhost:3000 — 영문 /en/, 프로덕트 리더십 /product-lead/
npm run build   # 산출물 ./out (이번 세션 빌드 통과: 5/5 정적 페이지)
```

- 이번 세션 `npm run build` **통과 확인** — `✓ Compiled successfully`, 5/5 정적 페이지.
- **히어로 폰트**: Nanum Pen Script를 [`pages/_document.tsx`](pages/_document.tsx)의 Google Fonts `<link>`로 로드(렌더 시 외부 요청 1건). `next/font`(Inter)와 병행. 손글씨체가 안 보이면 이 링크/네트워크부터 확인.
- ⚠️ **dev 서버 실행 중 `npm run build` 동시 실행 금지** — 같은 `.next` 공유로 dev 청크가 깨지며 `/en`이 500(`MODULE_NOT_FOUND`)을 낼 수 있다. 빌드 필요 시 dev 중지 후 `rm -rf .next && npm run build`.
- **프로덕션 URL**: [`lib/site.ts`](lib/site.ts) 기본값 `https://withwooyong.github.io`. 프리뷰·커스텀 도메인은 `NEXT_PUBLIC_SITE_URL`.
- **배포**: `.github/workflows/deploy.yml` — `main` 푸시 시 `npm ci` → `npm run build` → `out` 업로드. **main = 프로덕션.**
- **알려진 무해 경고**: lucide-react `Github` 아이콘 deprecated 힌트(에러 아님), `npm ci` 취약점/오래된 caniuse-lite 경고 — 기능 영향 없음.

---

## 3. 디렉터리·진입점

| 경로 | 설명 |
|------|------|
| [`pages/index.tsx`](pages/index.tsx) | 한국어 메인(히어로 hello·`#product` 요약·경력 근속기간 등) |
| [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) | **프로덕트 리더십 1-pager(공개 라우트 `/product-lead/`)** |
| [`pages/en/index.tsx`](pages/en/index.tsx) | 영문 요약 |
| [`pages/_document.tsx`](pages/_document.tsx) | `lang="ko"` + **Nanum Pen Script Google Fonts 링크** |
| [`pages/_app.tsx`](pages/_app.tsx) | `next/font` Inter |
| [`data/portfolio.ts`](data/portfolio.ts) | 네비(#product 앵커 포함)·시스템 다이어그램·스킬·글 링크 |
| [`components/`](components/) | `site-head`, `portfolio-nav`, `theme-toggle`, `section-reveal`, `system-diagram-card`, `coin-flip-deck`, `hero-stripe-backdrop`, `thesis-summary-dialog`, `ui/*` |
| [`styles/globals.css`](styles/globals.css) | 테마 변수·모션·키프레임(`hero-hello*` 손글씨 리빌 포함) |
| [`public/sitemap.xml`](public/sitemap.xml) | `/`, `/en/`, `/product-lead/` 등록 |
| [`lib/site.ts`](lib/site.ts) | 절대 URL |
| [`CLAUDE.md`](CLAUDE.md) | 에이전트용 저장소 메모 |

---

## 4. 권장 후속 작업

1. **결제·정산·구독 근거 보강** — 사용자 제공 자료로 [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) 역량 행 구체화.
2. **정량 지표 실측치 확보 → 1-pager `before → after` 보강**(위 산출법). 재직 중 접근 가능한 지표는 지금 캡처 권장.
3. 배포 후 `/`(히어로 hello 손글씨·애니메이션), `/product-lead/`(OG/canonical) **실화면 확인**.
4. (선택) 재직중 근속 자동 계산 전환, 히어로 폰트를 `나눔손글씨 붓`(브러시)으로 교체 옵션.
5. 주기적 **`npm audit`** 및 Next 패치 노트 확인.

---

## 5. 미커밋 작업 알림

이 HANDOFF 작성 시점 기준 **워킹 트리는 깨끗**하다. 이번 세션 커밋:

- `b370439` feat: 경력 근속기간 표시·히어로 손글씨 인사말 및 세부 정비
- `docs: 세션 인수인계 갱신` — 본 HANDOFF·CHANGELOG 갱신 커밋(이 문서를 포함하는 후속 커밋)

(직전 세션: `b9b88a6` 프로덕트 리더십 페이지·회사 표기 정비, `0f5f318` 인수인계 갱신)

---

## 6. 관련 문서

- [CHANGELOG.md](CHANGELOG.md) — 날짜별 변경 요약(2026-07-06 항목 참고)
- [README.md](README.md) — 설치·빌드·구조
- [docs/site-renewal-roadmap.md](docs/site-renewal-roadmap.md)
- [docs/site-renewal-completion-report.md](docs/site-renewal-completion-report.md)
