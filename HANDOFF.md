# 인수인계 (HANDOFF)

**갱신일**: 2026-05-01  
**저장소**: [withwooyong.github.io](https://github.com/withwooyong/withwooyong.github.io)  
**작업 브랜치(로컬 기준)**: `docs/site-renewal-roadmap` — `origin`과 동기화된 상태에서 **추가 변경이 다수 스테이징 전**으로 남아 있을 수 있음 → 아래「미커밋 작업」 확인.

---

## 1. 다음 세션을 위한 맥락

한국어 단일 포트폴리오(허우용)를 **GitHub Pages 정적 호스팅**에 맞춰 유지·확장하는 것이 목표다. Pages Router + `output: "export"`이므로 **서버 런타임·API Route·`next/image` 최적화 파이프라인**은 사용하지 않는다.

최근 세션에서 **리뉴얼 로드맵(P0~P2) 성격의 기능**(SEO, 다크 모드, 영문 요약, 네비/접근성, 데이터 분리, CI lint, 모션, 히어로 줄무늬 SVG)을 코드에 반영했다. 상세 표와 보안·QA 메모는 [`docs/site-renewal-completion-report.md`](docs/site-renewal-completion-report.md)를 본다.

---

## 2. 실행·검증

```bash
npm ci          # 또는 npm install
npm run lint
npm run dev     # http://localhost:3000 — 영문 http://localhost:3000/en/
npm run build   # 산출물 ./out
```

- **프로덕션 URL 가정**: [`lib/site.ts`](lib/site.ts) 기본값 `https://withwooyong.github.io`. 커스텀 도메인·프리뷰 빌드 시 `NEXT_PUBLIC_SITE_URL`로 덮어쓴다.
- **배포**: `.github/workflows/deploy.yml` — `main` 푸시 시 `npm ci` → `npm run lint` → `npm run build` → `out` 업로드. **main은 프로덕션**이므로 머지 전 로컬 빌드 확인.

---

## 3. 디렉터리·진입점

| 경로 | 설명 |
|------|------|
| [`pages/index.tsx`](pages/index.tsx) | 한국어 메인(대부분의 섹션) |
| [`pages/en/index.tsx`](pages/en/index.tsx) | 영문 요약 |
| [`pages/_app.tsx`](pages/_app.tsx), [`pages/_document.tsx`](pages/_document.tsx) | 폰트·`lang` |
| [`data/portfolio.ts`](data/portfolio.ts) | 네비·시스템 다이어그램·스킬·글 링크 |
| [`components/`](components/) | `site-head`, `portfolio-nav`, `theme-toggle`, `section-reveal`, `system-diagram-card`, `hero-stripe-backdrop`, `ui/*` |
| [`lib/site.ts`](lib/site.ts) | 절대 URL |
| [`styles/globals.css`](styles/globals.css) | 테마 변수·모션·줄무늬 키프레임 |
| [`docs/site-renewal-roadmap.md`](docs/site-renewal-roadmap.md) | 기획 로드맵 |
| [`docs/site-renewal-completion-report.md`](docs/site-renewal-completion-report.md) | 완료 보고·npm audit 메모 |
| [`CLAUDE.md`](CLAUDE.md) | 에이전트용 저장소 메모 |

---

## 4. 권장 후속 작업

1. **`git status`**로 변경·미추적 파일 확인 후 의미 있는 단위로 커밋·PR (`main` 머지 전 `npm run lint && npm run build`).
2. 배포 후 **OG/canonical** 실 URL 미리보기(슬랙 등).
3. 주기적 **`npm audit`** 및 Next 패치 노트 확인([CHANGELOG](CHANGELOG.md) 2026-05-01 참고).
4. (선택) `public/images` PNG → WebP 등 용량 최적화 — `images.unoptimized: true` 유지 전제.

---

## 5. 미커밋 작업 알림

이 HANDOFF 작성 시점에 브랜치 `docs/site-renewal-roadmap`에 **수정·신규 파일이 커밋되지 않은 채** 남아 있을 수 있다. 다음 담당자는 반드시 `git status`로 확인한 뒤 작업을 이어간다.

---

## 6. 관련 문서

- [CHANGELOG.md](CHANGELOG.md) — 날짜별 변경 요약  
- [README.md](README.md) — 설치·빌드·구조  
- [docs/site-renewal-roadmap.md](docs/site-renewal-roadmap.md)  
- [docs/site-renewal-completion-report.md](docs/site-renewal-completion-report.md)
