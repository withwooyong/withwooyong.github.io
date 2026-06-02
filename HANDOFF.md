# 인수인계 (HANDOFF)

**갱신일**: 2026-06-02
**저장소**: [withwooyong.github.io](https://github.com/withwooyong/withwooyong.github.io)
**작업 브랜치**: `main` — 워킹 트리 깨끗(이번 세션 변경 전부 커밋 완료).

---

## 1. 다음 세션을 위한 맥락

한국어 단일 포트폴리오(허우용 / Ted)를 **GitHub Pages 정적 호스팅**에 맞춰 유지·확장하는 것이 목표다. Pages Router + `output: "export"`이므로 **서버 런타임·API Route·`next/image` 최적화 파이프라인**은 사용하지 않는다.

이번 세션은 **콘텐츠 톤 정비 + 소개 섹션 모션 추가**가 중심이었다:

1. **히어로 소개** — "20년+ 경력 엔지니어링 리더" 관점으로 재작성. KT 경력 추가, 온프레미스(IDC)/AWS 경험 명시, AI·플랫폼·조직 연결 메시지.
2. **개발자 철학** — "사람이 이해하는 코드 / 6개월 뒤에도 읽히는 설계" 가독성 중심으로 다듬고, **AI를 활용해 업무 효율을 극대화한다**는 단락 추가.
3. **영문 페이지(`/en`)** — 위 한글 톤과 동일하게 소개·Highlights·메타 description 동기화.
4. **소개 카드 동전 회전** — 스크롤로 소개 섹션 진입 시 카드 3개가 순차적으로 Y축 360° 한 바퀴 돌다 감속 정지. 기존 프로필 사진 동전 회전(Y축)과 같은 idiom.

> 모션 튜닝 히스토리(다음 담당자 참고): 최초 3바퀴(1080°)/1.15s + 호버 재생으로 구현 → 사용자 피드백으로 **한 바퀴(360°)/1.2s**로 감속, **호버 재생 제거**. 현재는 스크롤 진입 1회만 재생된다.

---

## 2. 실행·검증

```bash
npm ci          # 또는 npm install
npm run dev     # http://localhost:3000 — 영문 http://localhost:3000/en/
npm run build   # 산출물 ./out (이번 세션 빌드 통과 확인)
```

- ⚠️ **dev 서버 실행 중 `npm run build` 동시 실행 금지** — 같은 `.next` 디렉터리를 공유해 dev 서버 청크가 깨지며 `/en`이 500(`MODULE_NOT_FOUND`)을 반환한다. 빌드가 필요하면 dev 서버를 중지하고 `rm -rf .next && npm run build` 후 다시 dev를 띄운다. (이번 세션에서 실제로 발생 → 위 방법으로 복구함)
- **프로덕션 URL 가정**: [`lib/site.ts`](lib/site.ts) 기본값 `https://withwooyong.github.io`. 커스텀 도메인·프리뷰 빌드 시 `NEXT_PUBLIC_SITE_URL`로 덮어쓴다.
- **배포**: `.github/workflows/deploy.yml` — `main` 푸시 시 `npm ci` → `npm run build` → `out` 업로드. **main은 프로덕션**이므로 머지/푸시 전 로컬 빌드 확인.

---

## 3. 디렉터리·진입점

| 경로 | 설명 |
|------|------|
| [`pages/index.tsx`](pages/index.tsx) | 한국어 메인(대부분의 섹션) |
| [`pages/en/index.tsx`](pages/en/index.tsx) | 영문 요약 |
| [`pages/_app.tsx`](pages/_app.tsx), [`pages/_document.tsx`](pages/_document.tsx) | 폰트·`lang` |
| [`data/portfolio.ts`](data/portfolio.ts) | 네비·시스템 다이어그램·스킬·글 링크 |
| [`components/coin-flip-deck.tsx`](components/coin-flip-deck.tsx) | 소개 카드 동전 회전 트리거(IntersectionObserver) |
| [`components/`](components/) | `site-head`, `portfolio-nav`, `theme-toggle`, `section-reveal`, `system-diagram-card`, `hero-stripe-backdrop`, `thesis-summary-dialog`, `ui/*` |
| [`lib/site.ts`](lib/site.ts) | 절대 URL |
| [`styles/globals.css`](styles/globals.css) | 테마 변수·모션·줄무늬/동전 키프레임 |
| [`docs/site-renewal-roadmap.md`](docs/site-renewal-roadmap.md) | 기획 로드맵 |
| [`docs/site-renewal-completion-report.md`](docs/site-renewal-completion-report.md) | 완료 보고·npm audit 메모 |
| [`CLAUDE.md`](CLAUDE.md) | 에이전트용 저장소 메모 |

---

## 4. 권장 후속 작업

1. 배포 후 **소개 카드 동전 회전**이 실제 페이지에서 의도대로(스크롤 진입 1회, 한 바퀴, 감속) 보이는지 확인.
2. 배포 후 **OG/canonical** 실 URL 미리보기(슬랙 등) — 메타 description이 새 소개 내용으로 갱신됨.
3. 주기적 **`npm audit`** 및 Next 패치 노트 확인.
4. (선택) `public/images` PNG → WebP 등 용량 최적화 — `images.unoptimized: true` 유지 전제.

---

## 5. 미커밋 작업 알림

이 HANDOFF 작성 시점에 **워킹 트리는 깨끗**하다(이번 세션 변경 전부 커밋됨). 이번 세션 커밋:

- `7d05e2c` content: 히어로 소개·철학·메타 description 갱신 및 AI 업무효율화 메시지 추가
- `2b08b35` content(en): 영문 페이지를 한글 버전과 동일한 톤으로 갱신
- `c94f3f6` feat(about): 소개 카드 스크롤 진입 시 동전 1바퀴 회전 효과 추가

---

## 6. 관련 문서

- [CHANGELOG.md](CHANGELOG.md) — 날짜별 변경 요약 (2026-06-02 항목 참고)
- [README.md](README.md) — 설치·빌드·구조
- [docs/site-renewal-roadmap.md](docs/site-renewal-roadmap.md)
- [docs/site-renewal-completion-report.md](docs/site-renewal-completion-report.md)
