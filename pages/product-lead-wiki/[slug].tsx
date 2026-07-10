import { Markdown } from "@/components/markdown";
import { SiteHead } from "@/components/site-head";
import { WikiShell } from "@/components/wiki-shell";
import { getDoc, wikiDocs, type TocEntry, type WikiDoc } from "@/lib/wiki";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";

type Props = {
  docs: WikiDoc[];
  doc: WikiDoc;
  markdown: string;
  toc: TocEntry[];
  prev: WikiDoc | null;
  next: WikiDoc | null;
};

export const getStaticPaths: GetStaticPaths = () => ({
  paths: wikiDocs.map((d) => ({ params: { slug: d.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = ({ params }) => {
  const slug = String(params?.slug);
  const { doc, markdown, toc } = getDoc(slug);
  const i = wikiDocs.findIndex((d) => d.slug === slug);

  return {
    props: {
      docs: wikiDocs,
      doc,
      markdown,
      toc,
      prev: i > 0 ? wikiDocs[i - 1] : null,
      next: i < wikiDocs.length - 1 ? wikiDocs[i + 1] : null,
    },
  };
};

export default function WikiDocPage({ docs, doc, markdown, toc, prev, next }: Props) {
  return (
    <>
      <SiteHead
        title={`${doc.title} | 플랫폼 코어 실행 설계 위키`}
        description={doc.essence}
        path={`/product-lead-wiki/${doc.slug}/`}
        noindex
      />

      <WikiShell docs={docs} activeSlug={doc.slug} toc={toc}>
        <article className="max-w-4xl">
          <header className="space-y-3 border-b border-slate-200 pb-6 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">{doc.posting}</p>
            <h1 className="text-2xl font-bold leading-[1.3] break-keep sm:text-3xl md:text-4xl">{doc.title}</h1>
            <p className="text-sm text-slate-500 break-keep sm:text-base dark:text-slate-400">{doc.subtitle}</p>
            <blockquote className="rounded-lg bg-slate-50 px-4 py-3.5 sm:px-5 sm:py-4 dark:bg-slate-900">
              <p className="text-sm font-semibold leading-relaxed break-keep text-slate-800 sm:text-base dark:text-slate-200">
                &ldquo;{doc.essence}&rdquo;
              </p>
            </blockquote>
            <p className="text-xs leading-relaxed break-keep text-amber-700 dark:text-amber-400">
              As-Is 도식은 공개정보에서 추론한 가설이며, 로드맵의 기간·목표치는 전부 가정입니다.
            </p>
          </header>

          <Markdown>{markdown}</Markdown>

          <nav className="mt-14 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between dark:border-slate-800">
            {prev ? (
              <Link
                href={`/product-lead-wiki/${prev.slug}/`}
                className="group flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                <span className="break-keep">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/product-lead-wiki/${next.slug}/`}
                className="group flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 sm:justify-end dark:text-slate-300 dark:hover:text-blue-400"
              >
                <span className="break-keep">{next.title}</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>
      </WikiShell>
    </>
  );
}
