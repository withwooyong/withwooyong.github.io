# 사이트 리뉴얼 완료 보고서

**프로젝트**: withwooyong.github.io (Next.js 14 Pages Router, 정적 export)  
**작성일**: 2026-05-01  
**기준 문서**: [site-renewal-roadmap.md](./site-renewal-roadmap.md) 1~6단계(로드맵 P0~P2) 및 CI·품질 항목

---

## 1. 요약

로드맵에 정의된 **1단계(문서·URL)부터** **6단계(P2 확장)까지** 구현을 반영했고, **`npm run lint` / `npm run build`를 통과**했습니다.  
코드 리뷰·보안 점검·QA는 **자동화 가능한 범위(린트·빌드·정적 분석 관점)와** **수동 체크리스트**로 정리했습니다.

---

## 2. 단계별 이행 내역

### 1단계 — 문서·배포 URL 기준

| 항목 | 상태 | 비고 |
|------|------|------|
| README 빌드 설명 | 완료 | `npm run export` 제거, `out/` 및 `NEXT_PUBLIC_SITE_URL` 안내 |
| 사이트 절대 URL | 완료 | [`lib/site.ts`](../lib/site.ts) `getSiteOrigin()` / `absoluteUrl()` — 기본 `https://withwooyong.github.io` |

### 2단계 — SEO·메타

| 항목 | 상태 | 비고 |
|------|------|------|
| canonical / OG / Twitter | 완료 | [`components/site-head.tsx`](../components/site-head.tsx) |
| JSON-LD `Person` | 완료 | 한국어 홈·영문 요약 페이지 각각 삽입 |
| `robots.txt` / `sitemap.xml` | 완료 | [`public/robots.txt`](../public/robots.txt), [`public/sitemap.xml`](../public/sitemap.xml) |

### 3단계 — 전역 스타일·소형 UI

| 항목 | 상태 | 비고 |
|------|------|------|
| 전역 `* { transition }` 제거 | 완료 | [`styles/globals.css`](../styles/globals.css) — 과도한 전역 애니메이션 완화, `prefers-reduced-motion` 반영 |
| 푸터 연도 | 완료 | `new Date().getFullYear()` |
| `next/font` (Inter) | 완료 | [`pages/_app.tsx`](../pages/_app.tsx), Google Fonts `@import` 제거 |
| shadcn CSS 변수 + 다크 토큰 | 완료 | 카드·다이얼로그 등과 정합 |

### 4단계 — 접근성·모바일

| 항목 | 상태 | 비고 |
|------|------|------|
| 스킵 링크 | 완료 | [`components/portfolio-nav.tsx`](../components/portfolio-nav.tsx) → `#main` |
| 모바일 네비 | 완료 | 동일 파일 — `md` 미만 햄버거 패널 |
| 시스템 구성 다이얼로그 | 완료 | [`components/system-diagram-card.tsx`](../components/system-diagram-card.tsx) — `button` 트리거, `DialogTitle`/`DialogDescription` 스크린리더용 |

### 5단계 — 구조·유지보수(P1)

| 항목 | 상태 | 비고 |
|------|------|------|
| 시스템 다이어그램 데이터화 | 완료 | [`data/portfolio.ts`](../data/portfolio.ts) `diagramGroups`(회사별 그룹 + `DiagramItem`) + 공통 카드 컴포넌트. 2026-07-21 흐름도 전환으로 기존 `systemDiagrams` 배열에서 이름·구조가 바뀌었고, 도식 자체는 [`data/diagrams/`](../data/diagrams/)의 `FlowSpec` 10개로 분리됨 |
| 네비·스킬·글 링크 데이터 | 완료 | 동일 모듈 `navItems`, `skillCategories`, `writingLinks` |
| 학력 `id` | 완료 | `id="education"`, 네비에「학력」추가, `scroll-mt-20` |
| 문서 `lang` | 완료 | [`pages/_document.tsx`](../pages/_document.tsx) `lang="ko"` — 영문 페이지는 루트에 `lang="en"` 래퍼 |

### 6단계 — 확장(P2)

| 항목 | 상태 | 비고 |
|------|------|------|
| 블로그/MDX | 부분 | **외부 링크 섹션「글·링크」로** 대체(MDX 파이프라인 없이 유지보수 단순화) |
| 영문 | 완료 | [`pages/en/index.tsx`](../pages/en/index.tsx) 요약 페이지 + 한국어 전체로 안내 |
| 다크 모드 | 완료 | `html`에 `dark` 클래스, 로컬 스토리지, [`components/theme-toggle.tsx`](../components/theme-toggle.tsx) |
| 이미지 최적화 | 문서화 | `next.config.js`의 `images.unoptimized: true` 유지 — **PNG 자산은 빌드 외부에서 WebP/리사이즈** 권장(수동 또는 스크립트) |

---

## 3. 변경·추가된 주요 파일

| 경로 | 역할 |
|------|------|
| `lib/site.ts` | 프로덕션 오리진·절대 URL |
| `data/portfolio.ts` | 네비, 시스템 구성도 그룹(`diagramGroups`), 스킬, 글 링크 |
| `data/diagrams/` | 흐름도 스펙(`FlowSpec`) 10개 + 레지스트리·빌드 타임 검증 |
| `components/site-head.tsx` | 메타·canonical·OG·Twitter·JSON-LD |
| `components/portfolio-nav.tsx` | 스킵 링크, 반응형 메뉴, EN 링크, 테마 토글 |
| `components/theme-toggle.tsx` | 라이트/다크 전환 |
| `components/system-diagram-card.tsx` | 시스템 카드 + 접근 가능한 다이얼로그 |
| `pages/index.tsx` | 위 컴포넌트·데이터 연동, 연락 `mailto`/`tel`, 섹션 다크 대응 |
| `pages/en/index.tsx` | 영문 요약 |
| `pages/_document.tsx` | `lang="ko"` |
| `pages/_app.tsx` | Inter `next/font` |
| `styles/globals.css` | CSS 변수, 스크롤바, 모션 완화 |
| `tailwind.config.js` | `darkMode: 'class'`, shadcn 색상 토큰, `data/` content |
| `public/robots.txt`, `public/sitemap.xml` | 크롤링 안내 |
| `.eslintrc.json` | `next lint` 비대화 설정 (`extends: next/core-web-vitals`) |
| `README.md`, `.github/workflows/deploy.yml` | 문서 정리, CI에 `npm run lint` 추가 |

---

## 4. 코드 리뷰 요약

- **구조**: 단일 대형 페이지는 유지하되, 반복되던 시스템 다이어그램·네비·헤드 메타를 **모듈/컴포넌트로 분리**해 이후 수정 지점이 명확해짐.
- **일관성**: shadcn의 `card`/`border` 등 HSL 변수와 Tailwind `darkMode: 'class'`를 맞춰 **다이얼로그·카드의 라이트/다크 일관성**을 확보.
- **접근성**: 스킵 링크, 다이얼로그 제목/설명, 이미지 확대 트리거를 **실제 `button`으로** 바꿔 키보드·스크린리더 사용성 개선.
- **개선 여지(비차단)**  
  - 경력·프로젝트 카드 본문까지 완전 데이터 분리는 미실시(범위·리스크 대비 효용).  
  - 영문 페이지는 **요약본**이며 한국어 페이지와 콘텐츠 중복을 피하기 위해 의도적으로 짧게 유지.

---

## 5. 보안 검증

| 영역 | 조치·판단 |
|------|-----------|
| 외부 링크 | `rel="noopener noreferrer"` 유지 |
| XSS | 사용자 입력 없음 — 정적 콘텐츠 위주 |
| 시크릿 | 저장소에 비밀키 추가 없음 |
| 연락처 노출 | `mailto:` / `tel:` 및 보조 텍스트로 **접근성은 유지**하나, 이메일·전화 **평문 노출 리스크는 잔존**(로드맵 9절과 동일 트레이드오프). 완화 시: 폼 서비스·이미지화·LinkedIn 우선 CTA 등 검토. |
| 의존성 | 작업 중 **`next@14.2.35` + `eslint-config-next@14.2.35`로 상향** 후 `npm audit --omit=dev` 재실행. 여전히 `next` 번들 `postcss` 및 일부 Next 항목이 감사 도구에 표시될 수 있으나, **다수는 서버·이미지 최적화·RSC 경로** 관련이다. 정적 export·`images.unoptimized` 전제에서는 실제 위험도가 낮은 편이나, **주기적 `npm audit` 및 Next 릴리스 노트 확인**을 권장한다. |

---

## 6. QA 결과

### 자동

| 검사 | 결과 |
|------|------|
| `npm run lint` | 통과 (경고 0) |
| `npm run build` | 통과, 정적 페이지 `/`, `/en`, `404` 생성 확인 |

### 수동 체크리스트(권장 확인)

- [ ] 모바일 폭에서 햄버거 메뉴 열림/닫힘 및 앵커 이동  
- [ ] 스킵 링크 포커스 스타일(Tab)  
- [ ] 테마 토글 후 새로고침 시 설정 유지  
- [ ] 시스템 구성도 모달 열기/닫기, 포커스 트랩, X 버튼  
- [ ] OG 미리보기(Facebook/Twitter/Slack 디버거) — **실제 배포 URL** 기준  
- [ ] `NEXT_PUBLIC_SITE_URL`을 커스텀 도메인으로 바꿀 경우 canonical/OG 일치 여부  

---

## 7. 잔여 리스크·후속 제안

1. **OG 절대 URL**: 기본값은 GitHub Pages URL. 커스텀 도메인 사용 시 `NEXT_PUBLIC_SITE_URL`을 CI 환경변수로 주입할 것.  
2. **이미지 용량**: 대형 PNG는 LCP에 불리 — WebP 병행·해상도 조정 권장.  
3. **Node 버전**: 워크플로는 Node 18 — 팀 정책에 맞춰 LTS 상향 검토 가능.  
4. **ESLint 설정 파일**: Cursor 환경에서 일부 훅이 `.eslintrc.json` 직접 편집을 막을 수 있어, 필요 시 팀 정책에 맞게 `eslint.config.js`(flat)로 이전 검토.

---

## 8. 로컬 검증 명령

```bash
npm ci
npm run lint
npm run build
```

개발 서버: `npm run dev` → [http://localhost:3000](http://localhost:3000), 영문 [http://localhost:3000/en/](http://localhost:3000/en/)

---

*본 보고서는 구현 시점의 저장소 상태를 기준으로 작성되었습니다. 머지 후 프로덕션에서 한 번 더 OG·canonical을 실 URL로 확인하는 것을 권장합니다.*
