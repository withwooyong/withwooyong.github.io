# 시스템 구성도 섹션 고도화 — 애니메이션 흐름도 설계

작성일: 2026-07-21
대상: `withwooyong.github.io` 메인 페이지 `#systems` 섹션

## 배경

현재 `#systems` 섹션은 PNG 이미지 9장을 3열 카드 그리드로 나열한다. 문제는 다음과 같다.

- 정지 이미지라 **데이터가 어디서 어디로 흐르는지** 전달되지 않는다.
- `yanadoo_all.png`는 박스만 나열되어 있고 **연결선이 전혀 없다**.
- `ai.png`는 AI야나두 페이지의 GNB 캡처 한 줄에 불과해 구성도라 부를 수 없다.
- `TVING.png`는 웹/앱 화면 캡처만 있고 담당 작업(CMS·검색·EPG·통합API·이미지서버)이 드러나지 않는다.
- `Career.png`(경력 타임라인)는 페이지 상단 경력 섹션과 중복된다.
- PNG는 다크모드에서 흰 배경으로 뜨고, 확대 시 흐려지며, 텍스트가 검색·번역·스크린리더 대상이 되지 못한다.
- 회사별 순서가 뒤섞여 있어 커리어 서사가 읽히지 않는다.

## 목표

1. 모든 구성도를 **인라인 SVG + CSS 애니메이션**으로 재제작해 데이터 흐름을 시각화한다.
2. 회사 순서를 **야나두 → SK브로드밴드 → CJ헬로비전 → 쌍용정보통신**으로 정렬한다.
3. 자료가 없던 항목(야나두 AI, TVING, 쌍용정보통신)의 구성도를 신규 제작한다.
4. 원본 PNG는 폐기하지 않고 확대 보기의 "원본 자료" 탭으로 보존한다.

## 비목표 (YAGNI)

- 자동 레이아웃 엔진(dagre/elk) 도입 — 다이어그램 수가 고정이므로 좌표를 데이터로 직접 명시한다.
- GIF/MP4 렌더링 — 정적 배포 용량, 다크모드 미대응, 텍스트 접근 불가로 배제한다.
- 다이어그램 편집 UI — 콘텐츠는 코드로만 관리한다.
- mermaid 활용 — 흐름 모션 표현이 불가능하다.

## 현재 구조

| 위치 | 내용 |
|---|---|
| `pages/index.tsx:467` | `#systems` 섹션. `systemDiagrams.map()`으로 카드 렌더 |
| `data/portfolio.ts:29` | `systemDiagrams` 배열 (9개 항목) |
| `components/system-diagram-card.tsx` | 카드 + 확대 Dialog 컴포넌트 |
| `components/section-reveal.tsx` | IntersectionObserver 기반 등장 애니메이션 (패턴 재사용 대상) |

교체 지점이 세 곳으로 한정되어 있어 영향 범위가 좁다.

## 아키텍처

### 신규 디렉터리 `components/flow-diagram/`

| 파일 | 역할 |
|---|---|
| `types.ts` | `FlowSpec` 타입 정의 — `viewBox`, `lanes[]`, `nodes[]`, `edges[]`, `legend[]` |
| `primitives.tsx` | `FlowNode`(박스/실린더/원/클라이언트), `FlowEdge`(경로 + 화살표 마커), `FlowLane`(계층 띠), `FlowLegend` |
| `flow-diagram.tsx` | `FlowSpec`을 받아 SVG 전체를 렌더하는 단일 렌더러 |
| `use-in-view.ts` | 뷰포트 진입 감지 훅 (애니메이션 게이팅용) |

### 신규 디렉터리 `data/diagrams/`

다이어그램 1개당 스펙 파일 1개. 노드 좌표는 스펙에 직접 기술한다.

```
yanadoo-ai.ts        yanadoo-platform.ts   yanadoo-app.ts
skb-btv.ts           skb-architecture.ts
skb-flow-search.ts   skb-flow-serving.ts
tving-nscreen.ts     ssangyong-amoc.ts     ssangyong-nms.ts
```

### 데이터 모델

```ts
type FlowNodeShape = "box" | "cylinder" | "circle" | "client" | "external";
type FlowEdgeKind  = "request" | "data" | "external" | "async";

type FlowNode = {
  id: string;
  label: string;
  sub?: string;          // 보조 라벨 (기술 스택 등)
  shape: FlowNodeShape;
  x: number; y: number; w: number; h: number;
  laneId?: string;
  accent?: boolean;      // 본인 담당 시스템 강조
};

type FlowEdge = {
  from: string; to: string;
  kind: FlowEdgeKind;
  label?: string;
  bidirectional?: boolean;
  waypoints?: Array<{ x: number; y: number }>;
  animated?: boolean;    // 흐름 패킷 표시 여부
};

type FlowLane = { id: string; label: string; y: number; h: number };

type FlowSpec = {
  id: string;
  viewBox: { w: number; h: number };
  lanes?: FlowLane[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  legend?: Array<{ kind: FlowEdgeKind; label: string }>;
  title: string;         // SVG <title> — 접근성
  desc: string;          // SVG <desc> — 접근성
};
```

`accent: true`는 본인이 직접 설계·개발한 시스템을 표시해 기여 범위를 시각적으로 드러낸다.

### 애니메이션

CSS 단독으로 구현한다. JS 애니메이션 루프와 SMIL(`<animateMotion>`)은 사용하지 않는다 —
SMIL은 `prefers-reduced-motion` 미디어쿼리로 정지시킬 수 없기 때문이다.

```css
/* 1) 선을 따라 흐르는 점선 — 모든 엣지 기본 */
.flow-edge {
  stroke-dasharray: 6 10;
  animation: flow-dash 1.4s linear infinite;
}
@keyframes flow-dash { to { stroke-dashoffset: -16; } }

/* 2) 강조 경로의 이동 패킷 */
.flow-packet {
  offset-path: var(--flow-path);
  animation: flow-move 2.6s linear infinite;
}
@keyframes flow-move { from { offset-distance: 0%; } to { offset-distance: 100%; } }

/* 3) 접근성 폴백 — 화살표만 남기고 전부 정지 */
@media (prefers-reduced-motion: reduce) {
  .flow-edge, .flow-packet { animation: none; }
  .flow-edge { stroke-dasharray: none; }
  .flow-packet { display: none; }
}
```

`offset-path`를 지원하지 않는 브라우저에서는 패킷이 이동하지 않지만, 점선 흐름 애니메이션이
남으므로 흐름 방향은 여전히 전달된다(점진적 향상).

**뷰포트 게이팅**: `use-in-view` 훅으로 화면에 보이는 다이어그램에만 `data-animate="on"`을
부여한다. 스크롤 밖의 SVG 10개가 계속 애니메이션하면 CPU를 낭비한다.

### 색상 체계

엣지 종류별로 색을 구분하고 CSS 변수로 정의해 다크모드에 자동 대응한다.

| kind | 의미 | 라이트 | 다크 |
|---|---|---|---|
| `request` | 사용자 요청 | blue-600 | blue-400 |
| `data` | 내부 데이터 | emerald-600 | emerald-400 |
| `external` | 외부 연동 | amber-600 | amber-400 |
| `async` | 비동기·배치 | violet-600 | violet-400 |

노드 배경·테두리·텍스트도 동일하게 `--flow-node-bg`, `--flow-node-border`, `--flow-node-fg`
변수로 정의한다.

## 콘텐츠 구성

카드 순서는 아래와 같으며, 회사별 소제목으로 그룹핑한다. `Career.png` 카드는 제거한다.

### 야나두

1. **AI 서비스** (신규 제작 · 원본 없음)
   - 상단 학습 여정: Step1 `60초 단어 테스트 → AI 커리큘럼` / Step2 `AI 나두 · AI 스르르 학습지` / Step3 `AI 튜터 · AI 여행영어 · AI 원어민톡`
   - 하단 실시간 왕복 루프: `마이크 → GCP Speech API(STT) → AI 서버 → OpenAI → TTS → klleon 딥휴먼 아바타 → 화면`
   - 출처: https://www.yanadoo.co.kr/AIYanadoo 렌더링 확인 + `yanadoo_all.png` 백엔드 구성
2. **전체 시스템** (원본 `yanadoo_all.png` 구조 유지 + 연결선 신규 추가)
   - 4계층: FRONT / API / FRONT+BACKEND / BACKEND+INFRA
   - 요청 흐름(사용자→NGINX→React·Vue 프론트→야나두 API), 데이터 흐름(API→RDS·Redis·OpenSearch), 외부 연동(토스페이먼츠, Catenoid, 비즈마켓, MetaM)을 색으로 구분
3. **야나두 앱** (원본 `yanadoo_app.png`)
   - UniWebView 하이브리드 앱에서 야나두·틈새단어·스르르 학습지·AI 리얼톡으로 진입하는 흐름

### SK브로드밴드

4. **B tv N-Screen** (원본 `BTV.png`)
   - STB / Mobile B tv 두 클라이언트에서 NaviLog 기반 검색·추천, 통합이미지플랫폼, NUGU 음성검색(w/SKT), 영상 딥메타로 뻗는 흐름
5. **시스템 아키텍처** (원본 `SKB_Arch.png`)
   - 원본의 화살표를 그대로 재현: API GW → Image Layer / App Layer, `Cache miss` → NoSQL, `sync` → SQL, `pub` → Kafka → ELK·통계, Batch ↔ Search, Admin·AI Layer
6. **서비스 플로우 1 — 로그 기반 추천 · 검색** (원본 `SKB_flow1.png`)
   - 수집: `로그연동 → API GW → FileBeat → Logstash → Kafka → Kafka Connect(Python) → Elasticsearch`
   - 분석: `Python/Sanic 로그분석 ↔ RDBMS`
   - 서빙: `Elasticsearch → API 서버(Ehcache) → API GW → 추천 API 요청`
   - 텍스트 검색 / 음성 검색(NUGU) 2트랙
7. **서비스 플로우 2 — 서빙 API · 영상 메타 · 이미지 플랫폼** (원본 `SKB_flow2.png`)
   - 서빙 API·CMS: `메뉴 API → API GW → Ehcache → ES/MongoDB ↔ CMS 운영(Spring Boot) ↔ RDBMS`
   - 영상물 메타: `API → GW → Ehcache → ES ↔ CMS ↔ GPU(SKT) ↔ Contents HUB`
   - 이미지 서빙: `이미지 API → DNS → Nginx+PHP-FPM(Nginx Cache) → ES ↔ CMS ↔ 이미지 HUB`

### CJ헬로비전

8. **TVING N-Screen** (신규 제작 · 원본은 화면 캡처만 유지)
   - 담당 업무 기준으로 구성: `CMS 설계·개발 → 통합 API` 를 축으로 검색 시스템 연동, 실시간 EPG(채널 편성) 연동, 이미지 서버를 연결

### 쌍용정보통신

9. **KT IPTV A-MOC** (신규 제작 · 원본 없음 · **사용자 검수 필수**)
10. **통합보안관제 NMS** (신규 제작 · 원본 없음 · **사용자 검수 필수**)
    - `에이전트 수집 → NMS 수집 서버 → 관제 화면` 수준의 개념도

9·10번은 참조 자료 없이 구술 기억에 기반하므로, 초안을 사용자가 확인한 뒤에만 배포한다.

## UI / 상호작용

### 레이아웃

기존 3열 그리드를 **회사별 그룹 + 세로 스택**으로 변경한다. 흐름 애니메이션은 좁은 3열 카드에서
판독이 불가능하기 때문이다.

```
시스템 구성도
─────────────────────────────────────
[로고] 야나두 · 2022.02 – 재직중
  ┌───────────────────────────────┐
  │ AI 서비스        [설계·개발 담당] │
  │   ← 애니메이션 SVG (full width) → │
  │   범례: ─▶ 요청 ─▶ 데이터 ─▶ 외부 │
  │   담당 업무 요약 2–3줄    [원본 ↗] │
  └───────────────────────────────┘
  ┌ 전체 시스템 ────────────────────┐
  ...
[로고] SK브로드밴드 · 2017.04 – 2021.06
  ...
```

회사 헤더의 재직 기간은 `pages/index.tsx`의 경력 섹션 배지와 동일한 값을 사용한다.

| 그룹 | 기간 | 근거 |
|---|---|---|
| 야나두 | 2022.02 – 재직중 | `pages/index.tsx:242` |
| SK브로드밴드 | 2017.04 – 2021.06 | `pages/index.tsx:274` |
| CJ헬로비전 | 2012.06 – 2017.04 | `pages/index.tsx:310` |
| 쌍용정보통신 | 2005.11 – 2012.06 | `pages/index.tsx:346` |

회사 정식 표기는 경력 섹션의 기존 문구를 따른다(예: 야나두는 `(주)야나두 a kakao company`).
기간 문자열을 두 곳에 중복 정의하지 않도록 `data/portfolio.ts`에 회사 그룹 데이터를 두고
양쪽이 참조하는 방식을 우선 검토한다.

### 카드 구성

- 제목 + 역할 배지(예: "설계·개발 담당")
- 애니메이션 SVG (컨테이너 full width)
- 엣지 종류 범례
- 담당 업무 요약 2–3줄
- 원본 PNG가 있으면 "원본 자료" 버튼

### 확대 다이얼로그

기존 `Dialog`를 유지하되 내부에 `[흐름도] [원본 자료]` 탭을 둔다.
원본 PNG가 없는 신규 도식(야나두 AI, TVING, 쌍용정보통신 2건)은 탭 UI 자체를 숨긴다.

### 호버 인터랙션

노드에 포인터를 올리면 해당 노드에 연결된 엣지만 진해지고 나머지 엣지·노드는 투명도를 낮춘다.
`SKB_Arch` 같은 복잡한 도식의 판독성을 확보하기 위한 장치다.
터치 기기에서는 호버가 없으므로 기본(전체 표시) 상태가 그대로 유지된다.

### 접근성

- SVG에 `role="img"`, `<title>`, `<desc>` 제공
- 노드 라벨은 이미지가 아닌 실제 `<text>` — 검색·브라우저 번역·스크린리더 모두 동작
- `prefers-reduced-motion: reduce`에서 애니메이션 전면 정지, 화살표만 표시
- 색만으로 엣지 종류를 구분하지 않도록 범례에 텍스트 라벨 병기

### 반응형

`viewBox` + `preserveAspectRatio="xMidYMid meet"`로 축소한다.
축소 시 라벨이 읽히지 않는 대형 도식(`skb-architecture`, `yanadoo-platform`)은 모바일에서
`overflow-x: auto` 컨테이너로 감싸 가로 스크롤을 허용하고, 페이지 본문은 가로 스크롤되지 않게 한다.

## 구현 단계

### Phase 1 — 프리미티브 + 파일럿 1개

`components/flow-diagram/` 전체와 `data/diagrams/skb-flow-search.ts`(서비스 플로우 1)만 구현한다.
좌→우 파이프라인 구조라 흐름 표현 검증에 가장 적합하다.

**검수 항목**: 애니메이션 속도, 색 대비(라이트/다크), 노드 밀도와 폰트 크기, 모바일 판독성,
호버 하이라이트 체감.

사용자 승인 전에는 Phase 2로 넘어가지 않는다.

### Phase 2 — 나머지 9개

확정된 프리미티브로 나머지 스펙 파일을 작성하고, `data/portfolio.ts`와
`components/system-diagram-card.tsx`, `pages/index.tsx:467`을 교체한다.
`Career.png` 카드를 제거한다.

### Phase 3 — 검증

- `npm run build` 성공 확인 (정적 export이므로 런타임 의존 코드가 섞이면 즉시 실패)
- 라이트/다크 모드 육안 확인
- 모바일 폭(375px) 판독성 확인
- `prefers-reduced-motion` 강제 활성화 상태에서 정지 확인
- 쌍용정보통신 도식 2건 사용자 검수

## 리스크

| 리스크 | 대응 |
|---|---|
| 쌍용정보통신 도식이 사실과 다를 수 있음 | 개념 수준으로만 그리고 배포 전 사용자 검수를 필수 절차로 둠 |
| 대형 도식(`skb-architecture`)이 모바일에서 판독 불가 | 가로 스크롤 컨테이너 + 확대 다이얼로그 제공 |
| 좌표 수기 입력으로 스펙 파일이 장황해짐 | 다이어그램당 파일을 분리해 한 파일이 커지지 않게 유지 |
| SVG 10개 동시 애니메이션의 성능 부담 | IntersectionObserver로 뷰포트 내 다이어그램만 애니메이션 |
| `offset-path` 미지원 브라우저 | 점선 흐름 애니메이션이 폴백으로 동작(점진적 향상) |
