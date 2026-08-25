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

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_STYLE }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&display=swap" rel="stylesheet" />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
