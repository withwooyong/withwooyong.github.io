# Changelog

이 저장소의 사용자에게 영향이 큰 변경만 날짜별로 간단히 적습니다. (커밋 해시는 선택적으로 추적합니다.)

## 2026-08-08

> **`ai-agent` 카테고리 51편 발행.** 원본 16편 878KB(`langgraph/00~11` + `rag/07~10`)를 15개 시리즈 51편으로 변환했다. 블로그가 **31편 → 82편**, sitemap이 **83 → 142 URL**로 늘었다. 도식 158개가 절별 대조로 전량 보존됐고, 발행본 51편 전부가 들어오는 링크를 1건 이상 갖는다. `main` 배포 완료(`629ea9c`).

### 추가

- **`ai-agent` 카테고리 51편** [`content/blog/ai-agent/`](content/blog/ai-agent/) — 기초 3시리즈 7편(`6792ac6`), 실행 모델 3시리즈 10편(`236fac8`), 제품 클론 4시리즈 9편(`840e280`), 2025 담론 2시리즈 8편(`ed468e0`), 2026 담론 2시리즈 12편(`68f98a2`), Q&A 4편(`45d3235`), 지식 지도 1편(`102d4c8`)
- **Q&A 4편** [`content/blog/ai-agent/ai-agent-qna-*.md`](content/blog/ai-agent/) — 원본 15편에 흩어진 면접 절을 회수해 **파일이 아니라 주제축으로 재편성**했다. 파일별로 모으면 같은 질문이 네 곳에 흩어진다. 94문항 (`45d3235`)
- **지식 지도** [`content/blog/ai-agent/ai-agent-knowledge-map.md`](content/blog/ai-agent/ai-agent-knowledge-map.md) — 개념 계보(각 단계가 앞 단계의 무엇을 풀고 대신 무엇을 만드는가), 문제→편 매핑 19행, 통합 용어집 41항. **참조가 전부 앞 편을 가리켜 slug가 확정된 마지막에 집필**했다 (`102d4c8`)
- **분할 설계서** [`docs/superpowers/plans/2026-08-08-ai-agent-category-split-design.md`](docs/superpowers/plans/2026-08-08-ai-agent-category-split-design.md) — 절별 KB 실측, 교차 중복 7건, 검산 기준값, 금지선 7건, 화행 잔재 수정 목록 (`c0c38fe`)

### 수정

- **`rag` ↔ `ai-agent` 양방향 링크** — `rag-knowledge-map.md`가 *"에이전트 아키텍처 쪽에서 따로 다룬다"*고 예고만 하고 **대상이 없던 상태**였다. 12개 링크로 연결하고, `langgraph-parallel-multiagent`·`agentic-rag-relevance-check`·`langgraph-module-boundaries`·`rag-qna-operations`에서 심화 편으로 잇는 링크를 추가했다 (`73f5b60`)
- **면접 화행 잔재 12건** [`content/blog/ai-agent/`](content/blog/ai-agent/) — `인용할 때는 … 수준으로 말하는 것이 안전하다`처럼 **독자에게 발화를 지시하는 문장**을 서술 규칙으로 바꿨다. 금칙어가 한 개도 없어 스캔에 안 잡히는 유형이다. 원인은 원본이 시점 조건과 화법을 한 문장에 붙여 놓은 것이라, 조건을 살리면 화법이 따라온다 (`73f5b60`)
- **B5 원본 항목 2건 복원** — 변환자가 자체 대조 중 말없이 줄인 것을 되돌렸다. `인력 감축 서사가 아니라 승수 서사로` → `감축 서사가 아니라`는 **논지를 뒤집을 뻔했다**. 무엇을 감축하지 않는다는 것인지가 사라진다 (`715a89f`)
- **독립 검증 지적 6건** — `13개 축`(실제 12행) 4군데, Q&A 제목 문항 수 오기 2건, 지식 지도 `50편`(실제 51), 원본 출처 구분 주석 누락, 도입 순서 주차 수치 소실, 복원한 주석의 근거 주체가 3사 비교표에 성립하지 않음. **셋이 "세어 쓴 수가 틀린" 유형이고 전부 자동 검사를 통과한다** (`b654a5a`, `629ea9c`)

### 문서

- **요구사항 §15 추가** [`docs/superpowers/specs/2026-08-07-tech-blog-requirements.md`](docs/superpowers/specs/2026-08-07-tech-blog-requirements.md) — `ai-agent` 실행에서 확정된 것. 중복 판정이 실행 단계에서 뒤집힌 사례 4건(CR-6.3·6.4), 금칙어 제거가 다른 축의 정확성을 깨뜨리는 두 유형(CR-1.9·1.10), 자동 검사가 못 잡는 3종(SC-12·13·14), 실명 기업 서술의 두 갈래, 검증자 미분리 구간 기록(SC-15)

## 2026-08-07

> **기술블로그 신설.** 별도 저장소(`yanadoo-exit/shared/knowledge`)의 학습 정리 md 143개를 소스로, **편집·검수를 거친 발행본만** 이 저장소에 두는 구조로 기술블로그를 추가했다. 1차 `search-engineering` 6편, 2차 첫 카테고리 `rag` 25편을 발행해 **총 31편**이 공개됐다. `main` 배포 완료(`d543dac`).

### 추가

- **블로그 콘텐츠 파이프라인** [`lib/blog/`](lib/blog/) — 타입(`types.ts`), frontmatter 검증(`frontmatter.ts`), 파일시스템 스캔 로더(`loader.ts`). 위키가 5개 문서를 배열에 하드코딩하던 방식을 **디렉터리 스캔**으로 일반화했다. 스키마를 위반하면 **빌드가 실패**해 잘못된 글이 발행되지 않는다 (`55b96cc`, `3dd2448`, `fc60c13`)
- **목차 생성 공용화** [`lib/toc.ts`](lib/toc.ts) — `lib/wiki.ts`의 `buildToc`을 추출해 위키·블로그가 공유한다. 기존 import 경로(`@/lib/wiki`)는 re-export로 유지해 호출부를 한 줄도 고치지 않았다 (`1097046`)
- **블로그 라우트 5종** [`pages/blog/`](pages/blog/) — 홈 / 카테고리 목록 / 포스트 상세 / 태그 인덱스 / 태그별 목록. 렌더링은 기존 `components/markdown.tsx`·`mermaid.tsx`를 그대로 재사용한다 (`2e7c6c3`, `cfe8d74`)
- **sitemap 자동 생성** [`scripts/generate-sitemap.mjs`](scripts/generate-sitemap.mjs) — `next build` 후 `out/`을 스캔해 만든다. 라우팅 로직을 두 번 구현하지 않아도 되고 실제로 생성된 페이지만 들어간다. `noindex`인 위키·로드맵·notion 경로는 제외. 수동 관리하던 `public/sitemap.xml` 삭제 (`9d1fd6f`, `a575b5c`)
- **발행본 31편** [`content/blog/`](content/blog/) — 검색 엔지니어링 6편(`0015a58`), RAG 25편(`ed8feb2`~`4259c84`). 도식 **103개** 보존, 내부 링크 96개(깨짐 0), 시리즈 7개
- **카테고리·태그 통제 어휘** [`content/blog/categories.ts`](content/blog/categories.ts), [`content/blog/tags.ts`](content/blog/tags.ts) — 143편 전수 조사로 카테고리 12개와 태그 81종을 확정하고 **코드에서 강제**한다. 어휘를 벗어나면 빌드가 실패해, 128편 배치 변환에서 `redis`/`redis-cache` 같은 동의어 분산이 생기지 않는다 (`404d220`)
- **단위 테스트 36개** [`tests/blog/`](tests/blog/) — Vitest 도입. 목차 생성·frontmatter 검증·파일 스캔·시리즈 네비게이션·빈 카테고리 필터 (`55b96cc` 외)
- **메인 사이트 연동** [`pages/index.tsx`](pages/index.tsx), [`data/portfolio.ts`](data/portfolio.ts) — 네비게이션에 "기술 노트", "글·링크" 섹션에 **대표글 제목을 `getStaticProps`로 노출**. 하드코딩하지 않으므로 대표글이 바뀌면 자동 반영된다 (`de844cd`, `79770c6`)

### 수정

- **CRLF 개행에서 목차가 통째로 비던 문제** [`lib/toc.ts`](lib/toc.ts) — `md.split("\n")`로 자르면 Windows 체크아웃 시 줄 끝에 `\r`이 남는데, **JS의 `.`은 `\r`을 line terminator로 보아 제외**하므로 `/^(##|###)\s+(.*)$/`의 `(.*)`가 `$`에 닿지 못해 헤딩이 하나도 매치되지 않았다. 브랜치를 옮기는 것만으로 재현된다. `split(/\r?\n/)`로 수정하고 로더가 본문을 LF로 정규화한다 — 그러지 않으면 같은 커밋에서도 빌드 플랫폼에 따라 산출물이 달라진다 (`b454017`)
- **시리즈 글의 이전/다음이 무관한 글을 가리키던 문제** [`lib/blog/loader.ts`](lib/blog/loader.ts) — `getAdjacentPosts`가 카테고리 내 날짜순 이웃을 반환하는데, 분할된 긴 글은 한 원본에서 나와 `date`가 전부 같아 정렬이 **제목 가나다순 타이브레이커**로 넘어갔다. 시리즈 소속 23편 중 **22편**이 어긋났다. `series`가 있으면 같은 시리즈 안에서 `seriesOrder` 순으로 잇고, 시리즈를 **닫힌 단위**로 둔다(1편 prev=null, 마지막 next=null). 1차에는 시리즈가 없어 이 경로가 한 번도 실행된 적이 없었다 (`da2366c`)
- **선택 필드의 `undefined` 키가 빌드를 깨뜨리던 문제** [`lib/blog/frontmatter.ts`](lib/blog/frontmatter.ts) — `validateFrontmatter`가 값 없는 선택 필드도 키로 남겨, Next.js의 `getStaticProps` JSON 직렬화가 실패했다(`Error serializing .post.series`). 조건부 스프레드로 키 자체를 만들지 않게 고치고 우회하던 헬퍼를 삭제. 우회책은 새 페이지마다 잊지 않고 호출해야 하는 규율이라 페이지가 늘면 반드시 빠뜨린다 (`25fb8a4`)
- **태그 슬러그 검증 부재** [`lib/blog/frontmatter.ts`](lib/blog/frontmatter.ts) — 형식(`^[a-z0-9-]+$`)과 통제 어휘(81종)를 이중으로 강제한다. 없으면 `Redis`와 `redis`가 별개 태그 페이지가 되고 `CI/CD`의 슬래시가 경로를 깨뜨린다. 위반한 값을 **전부** 오류 메시지에 담아 어느 태그가 문제인지 바로 찾을 수 있게 했다 (`1948cc5`, `404d220`)
- **글이 0편인 카테고리가 노출되던 문제** — 2차 준비로 카테고리 12개를 미리 등록했으나 실제 글은 2개에만 있었다. 빈 페이지가 색인되면 "콘텐츠 없음"으로 평가받는다. `getPublishedCategories()`로 목록에서 빼고 `getStaticPaths`에서도 제외해 **페이지 자체를 만들지 않는다**. sitemap 93 → 83 URL (`d543dac`)
- **카운트 텍스트의 라이트·다크 명도가 뒤바뀐 문제** [`pages/blog/`](pages/blog/) — `text-slate-400 dark:text-slate-500`은 흰 배경에서 연하고 어두운 배경에서 진해 양쪽 다 대비가 낮다. 두 값을 맞바꿔 Lighthouse `color-contrast` 실패를 해소 (`a53a815`)

### 문서

- **요구사항·작업계획서** [`docs/superpowers/`](docs/superpowers/) — 143편 실측 기반 요구사항(§1~§14)과 1차 실행계획. 2차 실행 사양(카테고리 12개·태그 81종·발행 제외 9편)과 `rag` 실행에서 확정된 규칙 정정을 포함한다 (`b0077fa`~)

### 변경

- **포지셔닝 문구를 개발총괄·CTO 지향으로 정비** [`pages/index.tsx`](pages/index.tsx), [`pages/en/index.tsx`](pages/en/index.tsx) (`9d5e165`)
  - 국·영문의 `<title>`·`og:title`·`twitter:title`·JSON-LD `jobTitle`·히어로 부제를 `Agile Developer & Tech Lead` → **`개발총괄·CTO 지향 20년차 백엔드·플랫폼 리더`**(영문 `Head of Engineering / CTO-track · 20-yr Backend & Platform Leader`)로 교체
  - LinkedIn Featured 카드가 `og:title`을 따라오므로 카드 문구도 배포 후 함께 갱신된다
- **소개 철학 섹션을 AI-네이티브 톤으로 재작성** [`pages/index.tsx`](pages/index.tsx) (`9d5e165`)
  - "Tech Lead로서의 철학" → **"개발 리더로서의 철학"** 으로 개제, 폐기 문구("동료가 6개월 뒤에 읽어도 이해되는 코드") 제거
  - "개발 실행은 이미 AI로 이동 / 좋은 코드 = AI가 정확히 읽고 안전하게 고칠 수 있는 구조"로 재작성, 리더의 일을 아키텍처 표준·코드 리뷰·보안 게이트·검증 파이프라인 구축으로 서술

## 2026-07-21

> 작업 브랜치 `feat/system-diagram-animation` — **main 미병합 · 미배포**. 시스템 구성도 섹션의 정지 PNG를 데이터 흐름이 애니메이션되는 인라인 SVG로 교체하는 작업. **다이어그램 10개 전부 완료**되어 회사 4곳(야나두 → SK브로드밴드 → CJ헬로비전 → 쌍용정보통신) 카드가 모두 화면에 노출된다. 계획서 Task 1~16 완료.

### 추가

- **흐름도 렌더링 파이프라인** [`components/flow-diagram/`](components/flow-diagram/) — 순수 데이터(`FlowSpec`)를 받아 SVG 다이어그램을 그리는 컴포넌트 묶음. 타입·기하 계산·스펙 검증기(`9661d33`), 뷰포트 감지 훅(`307b362`), SVG 프리미티브(노드 5종·화살촉 마커·계층 띠·범례, `0a16d1c`), 렌더러(`db0e674`). 자동 레이아웃 엔진 없이 좌표를 데이터에 직접 명시하는 방식이며 신규 npm 의존성 0개
- **CSS 흐름 애니메이션** [`styles/globals.css`](styles/globals.css) — 엣지 종류별 색 토큰(요청/데이터/외부/비동기, 라이트·다크 각각)과 `stroke-dashoffset`·`offset-path` 키프레임. `prefers-reduced-motion: reduce`에서 전면 정지, 뷰포트 밖 다이어그램은 `data-flow-animate`로 애니메이션 차단 (`e54e0b5`)
- **SKB 로그 기반 추천·검색 흐름도** [`data/diagrams/skb-flow-search.ts`](data/diagrams/skb-flow-search.ts) — 4계층 19노드 19엣지. 로그 수집(FileBeat→Logstash→Kafka→ES) / 분석(Python·Sanic) / 서빙 / 텍스트·NUGU 음성 검색 (`a1cefc9`)
- **나머지 흐름도 9개** [`data/diagrams/`](data/diagrams/) — 파일럿 이후 회사 4곳의 도식을 모두 채웠다. 원본 PNG가 있는 것은 구조를 그대로 재현하고, 화면 캡처뿐이거나 원본이 없는 것은 **원본에 문자로 실재하는 항목만** 노드로 올려 재구성했다
  - 야나두: AI 서비스(16노드, 신규 제작 `b083a79`), 전체 시스템(24노드 — 이 저장소 최대, 연결선 신규 작성 `1710c87`), 앱(11노드 `89536e2`)
  - SK브로드밴드: B tv N-Screen(13노드 `6544c1d`), 시스템 아키텍처(13노드 `4b01f64`), 서빙 API·영상 메타·이미지 플랫폼(22노드 `737b59e`)
  - CJ헬로비전: TVING N-Screen(11노드, 신규 제작 `feedc11`)
  - 쌍용정보통신: KT QOOK TV A-MOC · 가입자계 ISM(6+7노드, 자료 없이 기억 기반이라 **사용자 검수를 거쳐** 커밋 `0008e3d`)
- **야나두 · CJ헬로비전 · 쌍용정보통신 그룹** [`data/portfolio.ts`](data/portfolio.ts) — 회사 그룹 3개를 신설해 총 4개 그룹 10장 구성을 완성. 야나두 회사 라벨은 사이트 전체와 동일하게 `(주)야나두 a kakao company (구 카카오키즈)`로 표기
- **모바일 전용 2열 재배치** [`components/flow-diagram/stacked-layout.ts`](components/flow-diagram/stacked-layout.ts) — 좁은 화면에서 위상 정렬로 노드 순서를 정하고 계층별 2열로 접어 가로 스크롤을 없앤다. 비인접 엣지는 오른쪽 통로 4트랙으로 분산 (`0e16ac6`)
- **빌드 타임 스펙 검증** — 엣지가 없는 노드를 가리키거나 좌표가 viewBox를 벗어나면 `npm run build`가 실패한다. `DiagramItem.specId`가 실제 스펙으로 해석되는지도 함께 검사해, 오타로 카드가 조용히 사라지는 것을 막는다 (`04c2af8`, `a95fa12`)

### 변경

- **시스템 구성도 섹션 구조 개편** [`pages/index.tsx`](pages/index.tsx), [`data/portfolio.ts`](data/portfolio.ts), [`components/system-diagram-card.tsx`](components/system-diagram-card.tsx) — 3열 PNG 카드 그리드를 회사별 그룹 + 세로 스택으로 교체. 재직 기간은 `DiagramGroup.period` 단일 출처에서 가져오며, 확대 보기에 `[흐름도] / [원본 자료]` 전환 탭을 추가(원본 PNG가 없는 신규 도식은 탭 숨김). 경력 타임라인 카드(`Career.png`)는 상단 경력 섹션과 중복되어 제거 (`6f3579c`)
- **모바일 전환 기준을 컨테이너 폭 실측 기반으로 교정** — 전환 판단은 화면 폭이 아니라 카드 안쪽 컨테이너 폭(`화면 폭 − 80px`)에서 걸린다. 2열 임계값 290px, 전환 기준 `max(minWidth, viewBox.w × 0.7)`. 360·375·393·430px 실기기가 전부 2열로 들어오며, 768px 태블릿도 축소 대신 재배치된다 (`f380864`, `1c6ce07`)
- **쌍용정보통신 프로젝트 명칭을 경력 섹션과 통일** [`data/portfolio.ts`](data/portfolio.ts) — 계획 문서의 "KT IPTV A-MOC"·"통합보안관제 NMS" 대신 경력 카드의 확정 표기인 **"KT QOOK TV A-MOC 플랫폼"**·**"KT 가입자계 통합보안관리시스템(ISM)"** 을 사용한다. 같은 페이지 안에서 이름이 갈리면 별개 프로젝트로 오해된다 (`0008e3d`)

### 수정

- **다이얼로그를 열면 SVG DOM id가 중복**되던 문제 — 카드와 다이얼로그가 같은 스펙을 동시에 렌더해 `<title>`/`<desc>`/마커 id가 겹쳤다. `useId()`로 인스턴스별 접두어를 생성해 분리 (`04c2af8`)
- **2열 배치에서 바로 아래 칸 연결이 우회선으로 빠지던 문제** — 순번 차이만으로 판정하면 앞선 계층의 노드 수가 홀수일 때 다른 열을 같은 열로 오인한다. 실제 `x` 좌표 일치까지 확인하도록 수정, 우회 엣지 7→5개 (`27b6651`)
- **좁은 화면에서 엣지 라벨이 노드에 겹쳐 글자가 잘리던 문제** [`components/flow-diagram/stacked-layout.ts`](components/flow-diagram/stacked-layout.ts) — 모바일 재배치는 노드가 열 전체 폭을 차지해 라벨을 놓을 여백이 구조적으로 없다(`Collection` → `collectio`). 좁은 화면에서는 라벨을 그리지 않고, 방향은 화살촉이·종류는 색과 범례가 계속 전달하도록 정리 (`85e14b6`)
- 계층 y 범위가 겹칠 때 노드가 두 계층에 중복 배치되던 문제 (`17263fd`)
- 타원 노드에서 대각선 화살표가 도형에서 떨어져 보이던 문제(사각형 기준 앵커 계산), 긴 한글 라벨이 노드를 넘치던 문제, 노드마다 생기던 불필요한 탭 스톱 등 프리미티브 지적 5건 (`2707934`)

## 2026-07-08

### 추가

- **프로덕트 리더십 v2 시안 페이지** [`pages/product-lead-v2/index.tsx`](pages/product-lead-v2/index.tsx) (공개 라우트 `/product-lead-v2/`, 다른 세션에서 작성) — `/product-lead/`와 동일한 레이아웃·효과에 문구만 재구성한 A/B 시안. 핵심 차이: ① 히어로·핵심 요약을 **"차세대 CMS(NCMS) 재구축 발주 PM 완주"** 중심으로 재배치(재구축 경험을 앞세우고 TVING은 "그 도메인의 1세대"로 후치) ② "원조 구축" → **"1세대 구축/설계"** ③ "발주사 PM" → **"발주 PM"** 표기 ④ CJ 여정 임팩트를 "재구축 판단의 출발점"으로 연결 ⑤ SEO description에 "20~30인 조직 총괄" 명시 (`5421a9c`)

### 변경

- **프로덕트 리더십 진입 링크를 모두 `/product-lead-v2/`로 교체** — 히어로 보조 CTA·`#product` 섹션 CTA [`pages/index.tsx`](pages/index.tsx), sitemap 등록도 v1→v2 교체(`lastmod` 2026-07-08) [`public/sitemap.xml`](public/sitemap.xml). v1(`/product-lead/`)은 직접 URL로만 접근 가능하며 자기 canonical을 유지한 채 남아 있음 — 시안 확정 시 정리 필요 (`6524b1e`)

## 2026-07-07

### 추가

- 프로덕트 리더십 대표 여정에 **쌍용정보통신(통신연구소/뉴미디어기술팀, 2005.11 - 2012.06 · 6년 8개월)** 경력 추가 — KT ISM·KT QOOK TV A-MOC를 "20년 OTT·플랫폼 여정의 출발점"으로 서술해 페이지 곳곳의 "20년" 표현과 정합 확보 [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) (`77558bb`)
- `/product-lead/`에 메인과 동일한 **배경 효과**(도트 패턴·그라데이션 워시·블롭 2개·SVG 스트라이프 `HeroStripeBackdrop`)와 핵심 요약 4카드 **동전 회전**(`CoinFlipDeck`, 4번째 카드 딜레이 0.54s를 [`styles/globals.css`](styles/globals.css)에 추가), h1 **손글씨 인사말**("안녕하세요, 허우용입니다" 리빌) 적용 — 기존 타이틀 "플랫폼 프로덕트 리더"는 부제로 이동 (`fa6f660`)
- 대표 여정 카드에 **역할 서술(`roleDetail`) 추가** — 안내 문구가 약속한 "맥락 → 역할 → 접근 → 임팩트" 4단 구조 완성. 직함(카드 제목)과 구분해 각 시기의 책임 범위를 한 문장으로 서술하고, 역할 줄로 옮긴 내용(전 직군 총괄, 발주사 PM)은 접근 문장에서 덜어내 중복 정리 [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) (`07beac5`)

### 변경

- `/product-lead/`에서 **"처음"이라는 표현 제거** — "TVING CMS를 처음 구축한/만든" → "TVING CMS를 구축한/만든". 핵심 요약 CMS 카드·대표 여정 역할 서술·SEO description·히어로 문단 4곳 일괄 적용 [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) (`ece6b85`)
- 핵심 요약 CMS 카드 문구 정비 — "통과"→"경험", 발주사 PM 표기 통일 [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) (`732cbd9`)
- 소개의 "개발자로서의 철학"을 **"Tech Lead로서의 철학"** 으로 재작성 — 팀의 코드 표준 → 기획·UI/UX 제품 관점(신규 단락) → 위임·성장·AI의 3단락 구성. 기존 시그니처 메시지(6개월 뒤에도 읽히는 코드, AI 활용)는 리더 관점으로 승격해 유지 [`pages/index.tsx`](pages/index.tsx) (`ad35823`, `3ffdaab`)
- 프로덕트 리더십 대표 여정의 **팀명을 메인 경력 카드 기준으로 통일** — SKB `(B tv 백엔드 · 미디어클라우드)` → `SK Broadband (AI 서비스 개발스쿼드/미디어클라우드스쿼드)`, `CJ 헬로비전` → `CJ Hellovision` [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) (`ad35823`)

### 수정

- `/product-lead/` **모바일 반응형 정비** — 역량 매핑 표의 요구 역량 열 `whitespace-nowrap`을 `md:` 이상으로 한정해 모바일에서 근거 열이 짓눌리던 문제 해결, h1 손글씨 인사말에 `break-keep`을 적용해 좁은 화면에서 어절 단위 줄바꿈. 320/390/1280px 실화면 검증 완료 [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) (`cab2203`)
- **모바일 타이포그래피 최적화**(iPhone 12 Pro/14 Pro Max 실화면 검증) — ① 전역 `word-break: keep-all` + `overflow-wrap: break-word`로 사이트 전체 한글 어절 단위 줄바꿈 [`styles/globals.css`](styles/globals.css) ② 메인 손글씨 h1 모바일 크기 60px→48px(`text-5xl sm:text-6xl md:text-8xl`)로 한 줄 유지 ③ 히어로 소개 문단의 강제 `<br/>`을 모바일에서 숨겨 자연스러운 문단 흐름(640px+ 기존 유지) ④ `/product-lead/` CTA 버튼 모바일 가운데 정렬 (`1343171`)
- 경력·대표 여정 카드의 **재직 년월 배지와 근속기간을 같은 줄에 배치**(세로 쌓임 제거) — 메인 4곳·프로덕트 리더십 4곳 [`pages/index.tsx`](pages/index.tsx), [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) (`f6af9c7`)

### 변경

- 대표 여정을 **최신 경력부터 역순 정렬**(야나두 → SKB → CJ헬로비전 → 쌍용정보통신)하고, 기간을 연 단위에서 **월 단위(`2022.02 - 재직중` 등) + 근속기간(연·개월)** 표기로 통일 — 메인 경력 카드와 동일 포맷·레이아웃 [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) (`9a11609`)
- `/product-lead/`에 메인 페이지의 CSS 효과 재사용 적용 — 전 섹션 `SectionReveal` 스크롤 등장, 카드 hover 그림자, CTA 버튼 hover 리프트, 프로필 사진 동전 회전(`profile-coin-*`). 신규 CSS 추가 없음 (`9a11609`)

## 2026-07-06

### 추가

- 경력 카드에 **근속기간(연·개월)** 표시 — 날짜(뱃지)와 분리해 파란색으로 강조, 스캔 시 재직 기간이 바로 읽히도록 함 [`pages/index.tsx`](pages/index.tsx). 소개 "현재 포지션" 카드도 동일 표기로 통일 (`b370439`)
- 히어로 인사말을 **macOS "hello" 손글씨 스타일**로 변경 — Nanum Pen Script(Google Fonts, [`pages/_document.tsx`](pages/_document.tsx)) + 왼→오 획이 그려지는 손글씨 리빌 애니메이션 [`styles/globals.css`](styles/globals.css), `prefers-reduced-motion` 존중 (`b370439`)

### 변경

- 쌍용정보통신 재직 시작을 **정식 채용일 기준**으로 정정: `2005.05` → `2005.11 - 2012.06 (6년 8개월)` [`pages/index.tsx`](pages/index.tsx) (`b370439`)
- 프로덕트 리더십 페이지 결제·정산·구독 역량 문구를 총괄 기준 정식 문구로 교체(플레이스홀더 제거) [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) (`b370439`)
- SKB 경력을 **차세대 CMS(NCMS) 재구축 발주사 PM**(MSA 설계·검토·오픈 조율) 역할로 표현 정확화, CJ TVING 임팩트 `처음부터 구축`→`팀과 함께 구축`, 대표 여정 부제의 `정량 지표 보강 예정` 문구 제거 [`pages/index.tsx`](pages/index.tsx), [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) (`431f3c0`)

## 2026-07-05

### 추가

- 프로덕트 리더십 요약 페이지 [`pages/product-lead/index.tsx`](pages/product-lead/index.tsx) — 공개 라우트 `/product-lead/`. 핵심 요약 4·대표 여정 3(맥락→접근→임팩트)·플랫폼 프로덕트 리드 요구 역량 매핑 표. 정성 서술 기반이며 정량 지표는 실측치 확보 후 보강 예정 (`b9b88a6`)
- 홈 `#product` "프로덕트 리더십" 요약 섹션 + 히어로 보조 CTA(`플랫폼 프로덕트 리더로 보기`) + 내비 앵커 [`pages/index.tsx`](pages/index.tsx), [`data/portfolio.ts`](data/portfolio.ts) (`b9b88a6`)
- [`public/sitemap.xml`](public/sitemap.xml) — `/product-lead/` 등록(공개 색인) (`b9b88a6`)

### 변경

- 회사 표기 정비: `야나두` → **(주)야나두 a kakao company (구 카카오키즈)**, 직책을 **커머스개발실장**으로 [`pages/index.tsx`](pages/index.tsx)·[`pages/en/index.tsx`](pages/en/index.tsx)의 JSON-LD·메타 description·히어로·경력 카드에 반영. 서비스/제품명("야나두 AI 서비스", "야나두 앱")은 유지 (`b9b88a6`)

## 2026-06-02

### 추가

- 소개 카드 동전 회전: [`components/coin-flip-deck.tsx`](components/coin-flip-deck.tsx) — 스크롤 진입 시 현재 포지션/전문 분야/팀 규모 카드가 0.18s 간격으로 순차적으로 Y축 360° 한 바퀴 회전 후 감속 정지 (`prefers-reduced-motion: reduce` 시 비활성), [`styles/globals.css`](styles/globals.css) 키프레임 (`c94f3f6`)

### 변경

- [`pages/index.tsx`](pages/index.tsx) — 히어로 소개를 20년+ 엔지니어링 리더 관점으로 재작성(KT 추가, 온프레미스(IDC)/AWS 경험 명시), 개발자 철학을 코드 가독성 중심 메시지로 다듬고 AI 업무 효율 극대화 단락 추가, 메타 `description` 정비 (`7d05e2c`)
- [`pages/en/index.tsx`](pages/en/index.tsx) — 영문 페이지를 한글 버전과 동일한 톤으로 갱신(소개·Highlights·메타 description) (`2b08b35`)

## 2026-05-01

### 추가

- 영문 요약 페이지 [`pages/en/index.tsx`](pages/en/index.tsx), 네비에서 EN 링크
- SEO: [`components/site-head.tsx`](components/site-head.tsx) — canonical, Open Graph, Twitter Card, JSON-LD `Person`
- [`public/robots.txt`](public/robots.txt), [`public/sitemap.xml`](public/sitemap.xml)
- [`lib/site.ts`](lib/site.ts) — `getSiteOrigin()` / `absoluteUrl()`, 선택적 `NEXT_PUBLIC_SITE_URL`
- [`data/portfolio.ts`](data/portfolio.ts) — 네비, 시스템 다이어그램, 스킬, 글·링크 데이터
- [`components/portfolio-nav.tsx`](components/portfolio-nav.tsx) — 스킵 링크, 모바일 메뉴, 스크롤 시 네비 강조, 데스크톱 링크 밑줄 모션
- [`components/theme-toggle.tsx`](components/theme-toggle.tsx) — 라이트/다크 (`html.dark`)
- [`components/section-reveal.tsx`](components/section-reveal.tsx) — 섹션 스크롤 등장
- [`components/system-diagram-card.tsx`](components/system-diagram-card.tsx) — 시스템 구성 다이얼로그 공통화·접근성
- [`components/hero-stripe-backdrop.tsx`](components/hero-stripe-backdrop.tsx) — 히어로 SVG 줄무늬 흐름 배경
- [`pages/_document.tsx`](pages/_document.tsx) — `lang="ko"`
- [`docs/site-renewal-completion-report.md`](docs/site-renewal-completion-report.md) — 리뉴얼 완료·QA·보안 요약 보고
- ESLint: [`.eslintrc.json`](.eslintrc.json), `npm run lint` 스크립트 및 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) CI 단계
- [`HANDOFF.md`](HANDOFF.md), [`CHANGELOG.md`](CHANGELOG.md) — 세션 인수인계 및 변경 이력

### 변경

- [`README.md`](README.md) — 문서 링크 표, 기술 스택·프로젝트 구조 보강, 로컬 `/en` 안내
- [`pages/index.tsx`](pages/index.tsx) — 위 컴포넌트·데이터 연동, 다크 모드 클래스, 연락 `mailto`/`tel`, 푸터 연도 동적화, 히어로 blob·스태거·줄무늬
- [`styles/globals.css`](styles/globals.css) — shadcn용 CSS 변수, 전역 `*` transition 제거, 히어로/섹션/네비 모션, 줄무늬 키프레임
- [`tailwind.config.js`](tailwind.config.js) — `darkMode: 'class'`, shadcn 색 토큰, `data/` content 경로
- [`pages/_app.tsx`](pages/_app.tsx) — `next/font` Inter
- Next.js **14.2.35** 및 `eslint-config-next` 정렬 ([`package.json`](package.json))

### 수정

- README에서 구식 `npm run export` 안내 제거(이전 세션), `out/`·`NEXT_PUBLIC_SITE_URL`·`lint` 반영

---

이전 기록은 Git 히스토리를 참고하세요. (초기 `CHANGELOG.md` 도입일 기준 이전 변경은 본 파일에 없을 수 있습니다.)
