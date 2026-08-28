import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import type { GetStaticPaths, GetStaticProps } from "next";

/**
 * 제거된 `/product-lead-wiki/<slug>/` 라우트의 스텁 (설계서 §4 · 계획서 T13).
 *
 * **라우트를 남기는 이유:** 이 파일 하나가 하위 5 URL 을 덮는다
 * (`hub`·`cms`·`payment`·`admin`·`governance`). 인덱스 1개를 더한 위키 6 URL 이
 * 파일 2개로 접힌다 — 라우트를 지우면 그 6개가 전부 404 가 되고, 외부에서 걸린
 * 링크와 기존 색인이 그대로 죽는다. 그래서 **본문만 스텁으로 갈아끼운다.**
 *
 * **slug 를 하드코딩하는 이유:** `lib/wiki.ts` 의존을 여기서 끊어야 T14 가
 * `lib/wiki.ts`·`components/wiki-shell.tsx` 를 지울 수 있다. 원문이던
 * `pages/product-lead-loadmap/*.md` 는 라우트 삭제와 함께 T13 이 이미 지웠다.
 * 목록은 접기 직전의 `wikiDocs` 실측값과 같다.
 *
 * **`SiteHead` 를 쓰지 않는 이유:** `components/site-head.tsx` 는 canonical 을 자기 경로로
 * 박는데, 스텁의 canonical 은 목적지를 가리켜야 한다. 그래서 생 `<Head>` 다.
 *
 * ⚠️ **robots 메타를 일부러 넣지 않는다.** 스텁 9개가 전부 `/work/` 를 canonical 로
 *    가리키므로, 그 무리에 `noindex` 가 있으면 구글이 무리 전체(= `/work/` 포함)에
 *    적용할 수 있다. 색인 제외는 canonical 하나로 충분하다.
 *    `e2e/redirects.spec.ts` 가 「robots 메타 0개」로 이 계약을 못 박고 있다.
 */
const SLUGS = ["hub", "cms", "payment", "admin", "governance"] as const;

/** 이동 목적지. 여기를 바꿀 때는 세 곳을 함께 고친다: meta refresh · canonical · Link href. */
const DESTINATION = "/work/";

export const getStaticPaths: GetStaticPaths = () => ({
  paths: SLUGS.map((slug) => ({ params: { slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = () => ({ props: {} });

export default function WikiDocStub() {
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
        <title>플랫폼 코어 실행 설계 문서로 이동 중… · 허우용 (Ted)</title>
        <link rel="canonical" href={`https://withwooyong.github.io${DESTINATION}`} />
        <meta httpEquiv="refresh" content={`0; url=${DESTINATION}`} />
      </Head>

      {/*
        data-pagefind-ignore="all" — 사이트 내부 검색(⌘K) 색인에서 이 페이지를 뺀다.
        없으면 스텁 5개가 같은 제목으로 검색 결과에 뜨고, 누른 사람은 곧바로 /work/ 로 튕긴다.
        "all" 이어야 제목·메타까지 처리에서 빠진다("index" 는 제목을 여전히 집는다).
      */}
      <main
        id="main"
        tabIndex={-1}
        data-pagefind-ignore="all"
        className="mx-auto max-w-xl px-4 py-24 text-center leading-relaxed break-keep text-slate-600 focus:outline-none dark:text-slate-300"
      >
        <p className="mb-4 text-sm">
          <strong>플랫폼 코어 실행 설계 위키</strong> 의 문서는 <strong>/work</strong> 로 합쳐졌습니다.
          이동하고 있습니다…
        </p>
        <Link href={DESTINATION} className="font-semibold underline underline-offset-4">
          자동으로 이동하지 않으면 여기를 눌러 주세요
        </Link>
      </main>
    </>
  );
}
