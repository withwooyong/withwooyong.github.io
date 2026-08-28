import { Head, Html, Main, NextScript } from "next/document";

/**
 * 첫 페인트 전에 테마 클래스를 확정한다.
 *
 * useEffect 로 하면 라이트로 한 번 그린 뒤 다크로 바뀌어 흰 화면이 번쩍인다.
 * 다크가 기본이라 이 번쩍임이 모든 방문자에게 보인다.
 *
 * 저장값이 없으면 다크다 — prefers-color-scheme 을 보지 않는다(설계서 §5.5).
 * localStorage 접근이 막힌 환경(사생활 보호 모드 등)에서도 다크로 떨어진다.
 *
 * <Head> 안에 둔다. 파서가 body 를 열기도 전에 실행되므로 클래스가 먼저 확정된다.
 */
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('portfolio-theme');document.documentElement.classList.toggle('dark',s!=='light');}catch(e){document.documentElement.classList.add('dark');}})();`;

/**
 * 첫 페인트 배경 — 렌더 차단 CSS 가 도착하기 전에 칠한다.
 *
 * 클래스만 정해 놓으면 색은 아직 없다. head 의 스타일시트가 셋인데
 * 앞의 둘(구글폰트 · jsdelivr)이 서드파티라, 그게 늦으면 그 시간만큼
 * 흰 캔버스가 그대로 보인다.
 *
 * color-scheme 은 우리 CSS 가 아니라 브라우저 UA 스타일에 말을 건다.
 * 기본 캔버스 · 스크롤바 · form 컨트롤이 이걸 보고 정해진다.
 *
 * 클래스 선택자로 적는다 — 런타임 토글이 저절로 따라오게 하기 위해서다.
 * documentElement.style 로 박으면 인라인 명시도가 이겨서, 토글이 그 값을
 * 직접 지워 주지 않으면 테마가 안 바뀐다.
 *
 * ⚠️ 이 hex 는 --n0 와 값이 두 벌이다. 임계 경로라 불가피하다.
 *    어긋나면 tests/design/tokens.test.ts 가 빨개진다.
 */
const CRITICAL_STYLE = `html{background-color:#f7f7f8;color-scheme:light}html.dark{background-color:#08080a;color-scheme:dark}`;

const NANUM_HREF = "https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap";
const PRETENDARD_HREF =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

/**
 * 웹폰트 스타일시트를 **렌더 차단에서 뺀다.**
 *
 * 두 시트 모두 서드파티다(구글폰트 · jsdelivr). 렌더 차단으로 두면 한글 본문의
 * 첫 페인트가 남의 CDN 응답 시간에 묶인다 — 히어로 제목이 LCP 요소라 그대로 LCP 다.
 * jsdelivr 쪽만 10건 · 216KB 를 끌어온다.
 *
 * 기법: `media="print"` 로 내보내면 브라우저가 **낮은 우선순위로 받되 렌더를 막지 않는다.**
 * 다 받은 뒤 이 스크립트가 `media` 를 `all` 로 바꿔 실제로 적용시킨다.
 *
 * ⚠️ `onLoad={...}` 로 쓸 수 없다. `_document` 는 서버에서만 렌더되고
 *    react-dom 의 SSR 은 이벤트 핸들러를 HTML 로 직렬화하지 않는다 — 속성이 아예 안 나간다.
 *    그래서 id 로 찾아 스크립트에서 거는 형태여야 한다.
 *
 * ⚠️ **Nanum Pen Script(구글폰트)는 JSX 가 아니라 이 스크립트가 심는다.**
 *    처음에는 평범한 `<link>` 로 두고 「Next 가 빌드 시점에 인라인하므로 차단 요청이
 *    아니다」라고 적었는데, 산출물을 열어 보니 **거짓이었다.**
 *
 *    Next 14.2 의 `makeStylesheetInert` 가 `OPTIMIZED_FONT_PROVIDERS`(구글폰트 · typekit)
 *    링크의 `href` 를 `data-href` 로 바꿔 무력화하는 것까지는 맞다. 그런데 `post-process.js`
 *    가 그 CSS 를 받아 오지 못하면 **head 맨 끝에 원본 링크를 그대로 복원한다.**
 *    실측(`out/index.html`): head 안 `<style>` 은 CRITICAL_STYLE 하나뿐 — 인라인된 폰트
 *    CSS 는 0건이고, 앞쪽에 href 없는 죽은 링크가, 맨 끝에 살아 있는 차단 링크가 남는다.
 *    `media=print` 를 붙여도 **복원본이 그 속성을 가져간다는 보장이 없다.**
 *
 *    ⇒ **URL 을 React 트리에서 빼는 것이 유일하게 확정적인 회피다.** 최적화기는 `<Head>`
 *      의 엘리먼트만 훑으므로 스크립트 문자열 안의 URL 에는 손대지 못한다.
 *      jsdelivr 는 애초에 그 목록에 없어 `media=print` 가 그대로 살아남는다.
 *
 * ⚠️ **이 주석을 믿지 말고 다시 재라.** 위의 거짓 단언은 Next 문서상 맞는 문장이었고,
 *    그래서 아무도 산출물을 열어 보지 않았다. 확인법:
 *    `npm run build` 후 `out/index.html` 의 `</head>` 앞까지에서 `rel="stylesheet"` 중
 *    `media` 도 `data-href` 도 없는 서드파티 링크를 센다. **0 이어야 한다.**
 *
 * `font-display: swap` 보장: 비동기 로드 자체가 그것이다. 첫 페인트 시점에는 @font-face
 * 선언이 아직 문서에 없으므로 폴백 글꼴로 그려지고, 시트가 적용되는 순간 바뀐다 —
 * 글자가 안 보이는 구간(FOIT)이 생길 수 없다.
 *
 * ⚠️ **try 가 둘인 것과 순서가 이 순서인 것은 의도다.** Pretendard 는 한글 **본문** 글꼴이고
 *    Nanum 은 장식이다. 하나의 try 로 묶고 Nanum 주입을 앞에 두면, 장식 쪽이 던졌을 때
 *    본문 글꼴이 `media=print` 에 **영구히 갇힌 채** 폴백으로 그려진다 — 그리고 그 실패는
 *    콘솔에도 화면에도 신호를 남기지 않는다. 위 THEME_SCRIPT 가 try/catch 를 두른 것과 같은 이유다.
 */
const FONT_SWAP_SCRIPT = `(function(){function s(l){if(!l)return;if(l.sheet){l.media='all';}else{l.addEventListener('load',function(){this.media='all';});}}try{s(document.getElementById('font-pretendard'));}catch(e){}try{var n=document.createElement('link');n.id='font-nanum';n.rel='stylesheet';n.media='print';n.href="https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap";document.head.appendChild(n);s(n);}catch(e){}})();`;

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_STYLE }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* media="print" → 스크립트가 "all" 로 전환한다. 위 FONT_SWAP_SCRIPT 주석 참조. */}
        <link
          id="font-pretendard"
          rel="stylesheet"
          media="print"
          crossOrigin="anonymous"
          href={PRETENDARD_HREF}
        />
        <script dangerouslySetInnerHTML={{ __html: FONT_SWAP_SCRIPT }} />
        {/* JS 가 없으면 media 를 바꿔 줄 사람이 없다. 그 경우만 예전처럼 차단 로드한다. */}
        <noscript>
          <link rel="stylesheet" crossOrigin="anonymous" href={PRETENDARD_HREF} />
          {/* ⚠️ 이 Nanum 폴백은 **실제로는 동작하지 않는다.** 산출물 실측: Next 최적화기가
              noscript 안의 것까지 `data-href` 로 무력화해 href 없는 죽은 링크가 된다.
              그래도 남겨 둔 것은 무해하고, Next 가 이 동작을 고치면 저절로 살아나기 때문이다.
              현재 JS 없는 환경은 globals.css 의 폴백(Apple SD Gothic Neo · cursive)으로 그려진다 —
              Nanum 은 장식용이라 이 저하를 받아들인다. Pretendard(본문)는 위 링크로 정상 폴백된다. */}
          <link rel="stylesheet" href={NANUM_HREF} />
        </noscript>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
