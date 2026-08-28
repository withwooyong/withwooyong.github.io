import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

/**
 * 제거된 `/product-lead-wiki/` 인덱스 라우트의 스텁 (설계서 §4 · 계획서 T13).
 *
 * **라우트를 남기는 이유:** 위키 6 URL 중 하위 5개는 `[slug].tsx` 가, 인덱스 1개는
 * 이 파일이 덮는다. 라우트를 지우면 그 6개가 404 가 되고 외부 링크·기존 색인이
 * 그대로 죽는다. 그래서 파일은 지우지 않고 **본문만 스텁으로 갈아끼운다.**
 *
 * `WikiShell`·`lib/wiki` import 를 전부 끊었다 — 그래서 T14 가 그 둘을 지웠다.
 *
 * **`SiteHead` 를 쓰지 않는 이유:** `components/site-head.tsx` 는 canonical 을 자기 경로로
 * 박는데, 스텁의 canonical 은 목적지를 가리켜야 한다. 그래서 생 `<Head>` 다.
 *
 * ⚠️ **robots 메타를 일부러 넣지 않는다.** 스텁 9개가 전부 `/work/` 를 canonical 로
 *    가리키므로, 그 무리에 `noindex` 가 있으면 구글이 무리 전체(= `/work/` 포함)에
 *    적용할 수 있다. 색인 제외는 canonical 하나로 충분하다.
 *    `e2e/redirects.spec.ts` 가 「robots 메타 0개」로 이 계약을 못 박고 있다.
 *
 * 스텁 5개(정적 3 + wiki 2)는 `public/notion/index.html` 의 선례와 같은 모양이다 —
 * 이동을 예고하는 제목, `<main>` 랜드마크, 서술형 대체 링크, JS 보조 경로.
 */

/** 이동 목적지. 여기를 바꿀 때는 세 곳을 함께 고친다: meta refresh · canonical · Link href. */
const DESTINATION = "/work/";

export default function WikiIndexStub() {
  const router = useRouter();

  /**
   * meta refresh 가 막힌 환경을 위한 보조 경로.
   *
   * `replace` 여야 뒤로가기가 이 스텁으로 되돌아오는 루프를 만들지 않는다.
   * `location.replace` 대신 `router.replace` 를 쓰는 것은 같은 Next 앱 안이라
   * 전체 리로드 없이 넘어가기 때문이다. 주 경로는 어디까지나 `meta refresh` 다 —
   * JS 가 꺼진 환경에서는 그쪽만 동작한다.
   */
  useEffect(() => {
    void router.replace(DESTINATION);
  }, [router]);

  return (
    <>
      <Head>
        <title>플랫폼 코어 실행 설계 위키로 이동 중… · 허우용 (Ted)</title>
        <link rel="canonical" href={`https://withwooyong.github.io${DESTINATION}`} />
        <meta httpEquiv="refresh" content={`0; url=${DESTINATION}`} />
      </Head>

      {/*
        data-pagefind-ignore="all" — 사이트 내부 검색(⌘K) 색인에서 이 페이지를 뺀다.
        없으면 스텁이 검색 결과에 뜨고, 누른 사람은 곧바로 /work/ 로 튕긴다.
        "all" 이어야 제목·메타까지 처리에서 빠진다("index" 는 제목을 여전히 집는다).
      */}
      <main
        id="main"
        tabIndex={-1}
        data-pagefind-ignore="all"
        className="mx-auto max-w-xl px-4 py-24 text-center leading-relaxed break-keep text-slate-600 focus:outline-none dark:text-slate-300"
      >
        <p className="mb-4 text-sm">
          <strong>플랫폼 코어 실행 설계 위키</strong> 는 <strong>/work</strong> 로 합쳐졌습니다. 이동하고
          있습니다…
        </p>
        <Link href={DESTINATION} className="font-semibold underline underline-offset-4">
          자동으로 이동하지 않으면 여기를 눌러 주세요
        </Link>
      </main>
    </>
  );
}
