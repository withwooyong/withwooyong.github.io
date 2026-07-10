import Head from "next/head";
import { absoluteUrl } from "@/lib/site";

type SiteHeadProps = {
  title: string;
  description: string;
  path?: string;
  ogImagePath?: string;
  jsonLd?: Record<string, unknown>;
  /** 검색엔진 색인에서 제외한다. URL을 아는 사람만 보는 비공개 페이지에 쓴다. */
  noindex?: boolean;
};

export function SiteHead({
  title,
  description,
  path = "/",
  ogImagePath = "/images/Ted_yanadoo.png",
  jsonLd,
  noindex = false,
}: SiteHeadProps) {
  const canonical = absoluteUrl(path.endsWith("/") ? path : `${path}/`);
  const ogImage = absoluteUrl(ogImagePath);

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="canonical" href={canonical} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="ko_KR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}
    </Head>
  );
}
