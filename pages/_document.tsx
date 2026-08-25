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

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
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
