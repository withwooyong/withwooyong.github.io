# 인수인계 (HANDOFF)

**갱신일**: 2026-07-21
**저장소**: [withwooyong.github.io](https://github.com/withwooyong/withwooyong.github.io)
**작업 브랜치**: `feat/system-diagram-animation` — **main 미병합 · 미푸시 · 미배포**. 워킹 트리 깨끗, `npm run build` 통과.
**최신 커밋**: `a25f34e` chore: 시스템 구성도 섹션 정리 및 최종 검증

---

## 1. 현재 상태

메인 페이지 `#systems`(시스템 구성도) 섹션을 **정지 PNG 9장 → 데이터 흐름이 애니메이션되는 인라인 SVG 10장**으로 교체하는 작업이 **완료**되었다. 계획서 `docs/superpowers/plans/2026-07-21-system-diagram-animation.md`의 **Task 1~16 전부 완료**.

회사 4곳 · 카드 10장이 모두 화면에 노출된다.

| 그룹 | 카드 | 규모 |
|---|---|---|
| (주)야나두 a kakao company (구 카카오키즈) | AI 서비스 / 전체 시스템 / 앱 | 16 / 24 / 11 노드 |
| SK브로드밴드 | B tv N-Screen / 시스템 아키텍처 / 로그 기반 추천·검색 / 서빙 API·영상 메타·이미지 플랫폼 | 13 / 13 / 19 / 22 노드 |
| CJ헬로비전 | TVING N-Screen | 11 노드 |
| 쌍용정보통신 | KT QOOK TV A-MOC / KT 가입자계 통합보안관리시스템(ISM) | 6 / 7 노드 |

**남은 결정은 배포 여부 하나뿐이다.** 브랜치는 아직 원격에 없다.

---

## 2. 다음 세션에서 할 일

계획서상 할 일은 없다. 아래는 사용자 판단이 필요한 선택지다.

1. **배포** — `main` 병합 후 push. push 즉시 GitHub Actions가 프로덕션에 배포하므로 **사용자가 명시적으로 요청할 때만** 실행한다.
2. 사이트 전체 훑어보기 후 문구·강조(`accent`) 조정
3. 메모(`tiving-repositioning`)의 후속 작업 — `/product-lead/` v1 제거 또는 확정 문구 단일화, "발주 PM" vs "발주사 PM" 표기 통일

---

## 3. 이번 세션 완료 내역

| # | 작업 | 커밋 | 핵심 파일 |
|---|---|---|---|
| 8 | SKB 서빙 API·영상 메타·이미지 플랫폼 (22노드) | `737b59e` | `data/diagrams/skb-flow-serving.ts` |
| 9 | SKB 시스템 아키텍처 (13노드) | `4b01f64` | `data/diagrams/skb-architecture.ts` |
| 9-fix | 좁은 화면 엣지 라벨 숨김 (렌더러, 전체 스펙 적용) | `85e14b6` | `components/flow-diagram/stacked-layout.ts` |
| 10 | B tv N-Screen (13노드) | `6544c1d` | `data/diagrams/skb-btv.ts` |
| 11 | 야나두 AI 서비스 (16노드, 신규 제작) + 야나두 그룹 신설 | `b083a79` | `data/diagrams/yanadoo-ai.ts` |
| 12 | 야나두 전체 시스템 (24노드, 연결선 신규 작성) | `1710c87` | `data/diagrams/yanadoo-platform.ts` |
| 13 | 야나두 앱 (11노드) | `89536e2` | `data/diagrams/yanadoo-app.ts` |
| 14 | TVING N-Screen (11노드, 신규 제작) + CJ헬로비전 그룹 신설 | `feedc11` | `data/diagrams/tving-nscreen.ts` |
| 15 | 쌍용정보통신 A-MOC·ISM (6+7노드, **검수 후 커밋**) + 그룹 신설 | `0008e3d` | `data/diagrams/ssangyong-{amoc,nms}.ts` |
| 16 | 최종 정리 및 검증 (체크리스트 10항목 전부 통과) | `a25f34e` | 계획서 |

---

## 4. 주요 설계 결정과 근거

### 사실 정확성

- **"원본에 문자로 실재하는 것만 노드로 올린다"** — 원본에 도식이 없거나(B tv, TVING) 조각뿐인(야나두 앱) 경우, 빈 공간을 그럴듯한 시스템으로 메우고 싶어진다. 포트폴리오에서 사실과 다른 도식은 신뢰도에 직접 타격이므로, 원본 이미지에 **텍스트로 적힌 항목**만 승격했다. Task 10에서 추가한 `이미지 HUB`·`영상 인식 시스템`·`운영 Admin`, Task 14의 `미디어 메타 시스템`·`통계·콘텐츠 리스트`가 모두 이 규칙으로 들어왔다
- **명칭은 저장소에 이미 확정된 표기를 따른다** — 계획·인수인계 문서는 "KT IPTV A-MOC"/"NMS"였지만 `pages/index.tsx:352-361` 경력 카드는 "KT QOOK TV A-MOC 플랫폼"/"ISM"이었다. 같은 페이지에서 이름이 갈리면 별개 프로젝트로 오해되므로 경력 카드 기준을 채택(사용자 승인). **기억 기반 항목일수록 문서보다 코드에 확정된 표기가 우선**이다
- **회사 라벨은 `(주)야나두 a kakao company (구 카카오키즈)`** — 사용자가 카카오 계열사임을 강조하길 원했고, 사이트 전체(`worksFor`·SEO description·경력 카드)가 이미 이 표기를 쓴다

### 배치 (수동 좌표에서 교차를 줄이는 기법)

노드가 20개를 넘으면 격자 배치만으로는 선이 노드를 관통한다. 이번에 확립한 기법 셋:

1. **허브 위 열 비우기** (Task 12) — 허브(`야나두 API`)는 위·아래 양쪽에 연결되므로 위에서 내려오는 선이 반드시 윗줄을 지난다. 허브 바로 위 한 칸을 비우면 선들이 그 통로로 수렴해 아무것도 관통하지 않는다
2. **레인 하단 여백을 가로 우회 통로로** (Task 12) — 레인 안쪽이지만 노드 아래는 항상 비어 있다. 같은 행을 가로지르는 긴 엣지를 여기로 흘려보낸다
3. **인접 레인끼리만 잇도록 흐름 재정렬 + 틈 통과** (Task 14) — 흐름을 `운영·수집 → 저장 → 서빙 → 서비스`로 배열하면 레인을 건너뛰는 엣지가 없어져 관통이 **원천 제거**된다. 불가피한 예외는 노드 사이 20px 틈에 중심 x를 맞춰 수직 통과시킨다
- **N갈래 방사는 어떤 배치를 써도 일부 교차가 남는다** (Task 13). 계단식 x, 2열 분할, 간격 확대를 모두 계산했으나 관통 지점이 옮겨갈 뿐이었다. 허브를 갈래 열의 **세로 중앙**에 맞춰 위아래 대칭으로 분산시키는 것이 현실적 최선
- 참고: `flow-diagram.tsx:117`이 엣지를, `:156`이 노드를 그린다. **선이 노드 뒤로 지나가므로** 교차가 생겨도 시각적 충격은 작다

### 모바일

- **`bidirectional` 엣지의 `from`/`to` 방향은 데스크톱 렌더링과 무관하지만 모바일 순서를 결정한다** — `toStackedSpec`이 `topoSortNodes`로 레인 내 순서를 정하므로, 되돌아오는 엣지를 `from`으로 쓰면 그 노드가 진입 간선 없는 소스로 판정돼 맨 앞으로 튀어나온다. **역방향·되돌아오는 엣지는 흐름 순서대로 from/to를 적을 것**
- **사이클이 있으면 위상 정렬이 `(y, x)` 폴백으로 떨어진다**(`stacked-layout.ts:230`). 해당 스펙: `skb-architecture`(게이트웨이 순환), `yanadoo-ai` 레인 2(왕복 루프). 사용자가 **"데스크톱 원본 충실도 우선"** 을 선택해 그대로 뒀다
- **엣지 라벨은 좁은 화면에서 그리지 않는다**(`85e14b6`) — 노드가 열 전체 폭을 써서 라벨 자리가 구조적으로 없다. 4열 격자처럼 촘촘한 데스크톱 배치(50px 간격)에서도 라벨이 겹치므로, 그런 경우엔 **노드 `sub`로 승격**하는 편이 낫다

---

## 5. 알려진 이슈 · 주의사항

- **노드는 레인 y 범위에 완전히 포함되어야 한다** (`stacked-layout.ts:185`). 1px이라도 넘치면 모바일 재배치에서 레인 배정에 실패해 **노드가 조용히 사라지는데, 빌드 검증기는 viewBox 이탈만 잡으므로 빌드가 통과한다.** 새 스펙 작성 시 가장 먼저 확인할 조건
- **모바일 재배치 결과는 빌드가 검증하지 못한다** — `toStackedSpec` 출력은 클라이언트에서만 생성된다. 개발 모드 한정으로 `validateFlowSpec`을 돌려 콘솔 에러를 내도록 해뒀으니(`flow-diagram.tsx`) **스펙 수정 시 브라우저 콘솔을 확인할 것**
- **`.next` 디렉터리를 `next dev`와 `next build`가 공유**하므로 빌드 후 개발 서버가 깨진다. 재시작 시 `.next`를 지워야 하고, Windows 파일 잠금 때문에 첫 `rm -rf .next`가 실패할 수 있으니 재시도할 것
- 수제 탭(`[흐름도]/[원본 자료]`)의 ARIA가 부분적 — `role="tablist"`/`role="tab"`은 있으나 `role="tabpanel"`·`aria-controls`·화살표 키 이동이 없다. 키보드 조작 자체는 정상
- 꺾은선 엣지 라벨이 호(arc) 길이 중점이 아니라 정점 개수 중점에 놓인다 — 미관상 근사
- `stacked-layout.ts`의 `innerWidth = node.w - 12`가 폭 12px 미만 노드에서 음수가 된다 — 현재 데이터에선 무해
- `npm run build`에 기존 Browserslist·baseline-browser-mapping 노후 경고가 있다(이번 작업과 무관)
- `public/images/Career.png`는 코드 참조가 0건이지만 **사용자 판단으로 파일을 남겼다**(156KB). 문서(CHANGELOG·계획서)에만 이력으로 언급된다

---

## 6. 작업 방식 · 소통 메모

- **시각적 결과물은 반드시 화면으로 확인한다.** 이번 세션은 스펙마다 데스크톱(1440px) → 모바일(375px) → 콘솔 에러 순으로 브라우저 검증 후 커밋했다. 노드·엣지 개수를 DOM에서 세어 **모바일 재배치에서 누락이 없는지** 매번 확인
- **판단이 갈리는 지점은 선택지로 제시한다.** 이번 세션의 4건(모바일 노드 순서 / 라벨 겹침 / 쌍용 검수 / Career.png)이 모두 이 방식으로 처리됐다. 특히 **자료 없는 항목은 커밋 전에 검수 게이트**를 둔다
- 진행 원장은 `.superpowers/sdd/progress.md`(git-ignored)에 있다. 계획서에서 이탈한 지점은 계획서 본문에 인라인으로 기록해 뒀다
- **푸시 금지**: `main`은 프로덕션이며 push 즉시 GitHub Actions가 배포한다. 사용자가 명시적으로 요청할 때만 푸시한다
- 커밋 메시지는 한글로 작성한다

---

## 7. 이번 세션 변경 파일

```
data/diagrams/                       (9개 스펙 신규)
  skb-flow-serving.ts  skb-architecture.ts  skb-btv.ts
  yanadoo-ai.ts  yanadoo-platform.ts  yanadoo-app.ts
  tving-nscreen.ts  ssangyong-amoc.ts  ssangyong-nms.ts
  index.ts                           (레지스트리 등록 · 빌드 타임 검증)
data/portfolio.ts                    (그룹 3개 신설 → 4그룹 10항목)
components/flow-diagram/stacked-layout.ts   (좁은 화면 엣지 라벨 제거)
docs/superpowers/plans/2026-07-21-system-diagram-animation.md
                                     (이탈 기록 · 체크리스트 실측값)
docs/site-renewal-completion-report.md      (systemDiagrams → diagramGroups 현행화)
CHANGELOG.md  HANDOFF.md
```
