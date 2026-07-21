# 인수인계 (HANDOFF)

**갱신일**: 2026-07-21
**저장소**: [withwooyong.github.io](https://github.com/withwooyong/withwooyong.github.io)
**작업 브랜치**: `feat/system-diagram-animation` — **main 미병합 · 미푸시 · 미배포**. 워킹 트리 깨끗, `npm run build` 통과.
**최신 커밋**: `1c6ce07` style: 모바일 레이아웃 여백 조정

---

## 1. 다음 세션을 위한 맥락

한국어 단일 포트폴리오(허우용 / Ted)를 **GitHub Pages 정적 호스팅**에 맞춰 유지·확장하는 것이 목표다. Pages Router + `output: "export"`이므로 **서버 런타임·API Route·`next/image` 최적화 파이프라인**은 사용하지 않는다.

이번 세션의 주제는 메인 페이지 하단 **`#systems`(시스템 구성도) 섹션 고도화**다. 사용자 요구는 "정지 이미지로는 데이터가 어디서 어디로 흐르는지 알 수 없으니 모션으로 표현해 달라"였고, PNG 9장을 **데이터 흐름이 애니메이션되는 인라인 SVG 10개**로 교체하기로 했다.

현재는 **파일럿 단계가 끝난 상태**다. 렌더링 파이프라인과 모바일 대응이 완성되었고, 10개 중 **1개(SKB 로그 기반 추천·검색)만 화면에 노출**되어 있다. 사용자가 데스크톱·모바일 모두 승인했으므로 다음 세션은 **남은 9개 스펙 데이터 파일을 찍어내는 반복 작업**이다.

---

## 2. 다음 세션에서 할 일 (여기서부터 시작)

계획서 [`docs/superpowers/plans/2026-07-21-system-diagram-animation.md`](docs/superpowers/plans/2026-07-21-system-diagram-animation.md)의 **Task 8부터 순서대로** 진행한다. 각 태스크 구조는 동일하다:

> 스펙 파일 1개 생성 → `data/diagrams/index.ts`에 등록 → `data/portfolio.ts`에 카드 항목 추가 → `npm run build` → 커밋

| Task | 다이어그램 | 원본 자료 | 비고 |
|---|---|---|---|
| 8 | SKB 서빙 API · 영상 메타 · 이미지 플랫폼 | `public/images/SKB_flow2.png` | 3트랙 구조 |
| 9 | SKB 시스템 아키텍처 | `public/images/SKB_Arch.png` | 원본에 화살표 완비 — 그대로 재현 |
| 10 | B tv N-Screen | `public/images/BTV.png` | 캡처+번호 주석 → 담당 업무 5가지로 재구성 |
| 11 | 야나두 AI 서비스 | **없음** | AIYanadoo 페이지 + `yanadoo_all.png` 백엔드 기반 신규 |
| 12 | 야나두 전체 시스템 | `public/images/yanadoo_all.png` | 원본에 연결선 없음 → 신규 작성 |
| 13 | 야나두 앱 | `public/images/yanadoo_app.png` | **원본 미확인 — 작업 전 이미지를 열어볼 것** |
| 14 | TVING N-Screen | `public/images/TVING.png` (화면 캡처만) | 담당 업무 기준 신규 |
| 15 | 쌍용정보통신 A-MOC · NMS | **없음** | ⚠️ **구술 기억 기반 — 배포 전 사용자 검수 필수** |
| 16 | 최종 정리 및 검증 | — | 그룹 순서·10개 카드·육안 체크리스트 10항목 |

최종 그룹 순서는 **야나두 → SK브로드밴드 → CJ헬로비전 → 쌍용정보통신** (현재는 SKB 그룹 하나만 존재).

### 각 다이어그램의 성격 (사용자가 직접 지정 — 스펙 작성 시 반영)

- **B tv N-Screen**: 재직 당시 실제 수행한 프로젝트들
- **SKB 시스템 구조**: 재직 당시 담당했던 서비스들의 시스템 구조
- **SKB 플로우 1**: 로그 기반 추천 시스템 개발, 검색 서비스 개발
- **SKB 플로우 2**: NCMS 프로젝트 후속 — 서빙 API, 영상물 메타 서비스, 통합 이미지 플랫폼
- **TVING**: CMS 설계·개발, 검색 시스템 연동 API 및 화면, 실시간 EPG(채널 편성) 연동, 통합 API, 이미지 서버
- **쌍용정보통신**: KT IPTV A-MOC 참여 개발, 통합보안관제(NMS) 개발 — 원래 구성도를 그리지 않았던 항목이라 **기억에 의존**한다. 사실과 다른 도식은 포트폴리오 신뢰도에 직접 타격이므로 개념 수준으로만 그리고 **반드시 검수받을 것**

---

## 3. 이번 세션 완료 내역

| # | 작업 | 커밋 | 핵심 파일 |
|---|---|---|---|
| 1 | 타입 · 기하 계산 · 스펙 검증기 | `9661d33` | `components/flow-diagram/{types,geometry,validate}.ts` |
| 2 | CSS 색 토큰 · 애니메이션 키프레임 | `e54e0b5` | `styles/globals.css` |
| 3 | 뷰포트 감지 훅 | `307b362` | `components/flow-diagram/use-in-view.ts` |
| 4 | SVG 프리미티브 (+리뷰 지적 5건 수정) | `0a16d1c` `2707934` | `components/flow-diagram/primitives.tsx` |
| 5 | 흐름도 렌더러 | `db0e674` | `components/flow-diagram/flow-diagram.tsx` |
| 6 | SKB 추천·검색 스펙 (첫 다이어그램) | `a1cefc9` | `data/diagrams/skb-flow-search.ts` |
| 7 | 섹션을 회사별 카드 구조로 교체 | `6f3579c` | `pages/index.tsx`, `data/portfolio.ts`, `components/system-diagram-card.tsx` |
| 7-fix | DOM id 중복 · specId 빌드 검증 | `04c2af8` `a95fa12` | `flow-diagram.tsx`, `validate.ts`, `data/diagrams/index.ts` |
| 7B | 모바일 세로 재배치 · 카드 헤더 반응형 | `221243b` `17263fd` | `components/flow-diagram/stacked-layout.ts` |
| 7C | 모바일 2열 접기 재설계 | `0e16ac6` `27b6651` `f380864` `1c6ce07` | `stacked-layout.ts`, `flow-diagram.tsx`, `system-diagram-card.tsx` |

설계 문서: [`docs/superpowers/specs/2026-07-21-system-diagram-animation-design.md`](docs/superpowers/specs/2026-07-21-system-diagram-animation-design.md)

---

## 4. 주요 설계 결정과 근거

- **인라인 SVG + CSS 애니메이션** (GIF/MP4 아님) — 정적 export라 런타임이 없고, GIF는 다크모드 미대응·확대 시 흐림·텍스트 접근 불가. SVG는 노드 라벨이 실제 `<text>`라 검색·번역·스크린리더가 모두 동작한다
- **자동 레이아웃 엔진(dagre/elk) 미도입** — 다이어그램 수가 고정이므로 좌표를 데이터에 직접 명시한다. 번들이 가볍고 결과를 정확히 통제할 수 있다. 대가는 노드 규격을 바꾸면 모든 스펙 좌표를 다시 잡아야 한다는 점
- **애니메이션은 CSS 단독, SMIL(`<animateMotion>`) 미사용** — SMIL은 `prefers-reduced-motion`으로 정지시킬 수 없다
- **테스트 러너 미도입** — 저장소에 원래 없으며 사용자와 합의된 사항. 대신 **빌드 타임 검증기**가 게이트 역할을 한다(`assertFlowSpecs` + `assertSpecIdsResolve`). 검증기가 실제로 작동하는지 스펙을 일부러 부패시켜 빌드 실패를 확인하는 절차를 수행했다
- **모바일은 축소가 아니라 재배치** — 1200px 도식을 375px에 넣으면 12px 글자가 3.7px이 된다. 계층별 2열로 접어 글자 크기를 유지한다
- **전환 기준은 고정 픽셀이 아닌 비율** — `max(minWidth, viewBox.w × 0.7)`. 스펙마다 원본 폭이 달라 고정값은 다음 스펙에서 반드시 어긋난다

---

## 5. 알려진 이슈 · 주의사항

- **모바일 재배치 결과는 빌드가 검증하지 못한다** — `toStackedSpec` 출력은 클라이언트에서만 생성되므로 좌표가 viewBox를 벗어나도 빌드가 통과한다. 개발 모드 한정으로 `validateFlowSpec`을 돌려 콘솔 에러를 내도록 해뒀다(`flow-diagram.tsx`). **9개 스펙 작업 중 브라우저 콘솔을 반드시 확인할 것**
- **`.next` 디렉터리를 `next dev`와 `next build`가 공유**하므로 빌드 후 개발 서버가 깨진다. 재시작 시 `.next`를 지워야 하고, Windows 파일 잠금 때문에 첫 `rm -rf .next`가 실패할 수 있으니 재시도할 것
- 수제 탭(`[흐름도]/[원본 자료]`)의 ARIA가 부분적 — `role="tablist"`/`role="tab"`은 있으나 `role="tabpanel"`·`aria-controls`·화살표 키 이동이 없다. 키보드 조작 자체는 정상(네이티브 `<button>`)
- 꺾은선 엣지 라벨이 호(arc) 길이 중점이 아니라 정점 개수 중점에 놓인다 — 미관상 근사
- `stacked-layout.ts`의 `innerWidth = node.w - 12`가 폭 12px 미만 노드에서 음수가 된다 — 현재 데이터(130~160px)에선 무해
- `npm run build`에 기존 Browserslist·baseline-browser-mapping 노후 경고가 있다(이번 작업과 무관)
- `public/images/Career.png`는 더 이상 참조되지 않는다(경력 타임라인 카드 제거). 파일 자체는 남겨뒀으니 Task 16에서 삭제 여부를 판단할 것

---

## 6. 작업 방식 · 소통 메모

- **Subagent-Driven Development**로 진행 중이다. 태스크마다 구현 에이전트 → 리뷰 에이전트 → (필요 시) 수정 에이전트 순서. 진행 원장은 `.superpowers/sdd/progress.md`(git-ignored)에 있으며, 재개 시 **원장과 `git log`를 먼저 확인**해 이미 완료된 태스크를 다시 실행하지 말 것
- 계획서는 실행 중 3회 갱신했다(Task 6→7 검증 게이트 이동, 7B 추가, 7C 추가). **계획서와 실제 코드가 갈라진 지점**은 계획서 본문에 인라인으로 기록해 뒀다
- **시각적 결과물은 반드시 화면으로 확인받는다.** 사용자가 "마음에 꼭 들지 않는데 어떻게 고칠지 모르겠다"고 할 때는 원인을 진단해 **구체적 선택지로 제시**하는 편이 효과적이었다. 모바일 레이아웃은 이 방식으로 5회 반복해 개선됐다
- **푸시 금지**: `main`은 프로덕션이며 push 즉시 GitHub Actions가 배포한다. 사용자가 명시적으로 요청할 때만 푸시한다. 현재 브랜치도 아직 원격에 올라가지 않았다

---

## 7. 이번 세션 변경 파일

```
components/flow-diagram/          (신규 디렉터리 — 8개 파일)
  types.ts  geometry.ts  validate.ts  use-in-view.ts
  primitives.tsx  flow-diagram.tsx  stacked-layout.ts  index.ts
data/diagrams/                    (신규 디렉터리 — 2개 파일)
  skb-flow-search.ts  index.ts
components/system-diagram-card.tsx   (전면 재작성)
data/portfolio.ts                    (systemDiagrams → diagramGroups)
pages/index.tsx                      (#systems 섹션 교체)
styles/globals.css                   (흐름 애니메이션 토큰 추가)
docs/superpowers/specs/2026-07-21-system-diagram-animation-design.md   (신규)
docs/superpowers/plans/2026-07-21-system-diagram-animation.md          (신규, 실행 중 3회 갱신)
```
