import Head from "next/head";
import { absoluteUrl } from "@/lib/site";

type SiteHeadProps = {
  title: string;
  description: string;
  path?: string;
  ogImagePath?: string;
  jsonLd?: Record<string, unknown>;
};

export function SiteHead({ title, description, path = "/", ogImagePath = "/images/Ted_yanadoo.png", jsonLd }: SiteHeadProps) {
  const canonical = absoluteUrl(path.endsWith("/") ? path : `${path}/`);
  const ogImage = absoluteUrl(ogImagePath);

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="canonical" href={canonical} />

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
