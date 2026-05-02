import { SiteHead } from "@/components/site-head";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { absoluteUrl } from "@/lib/site";
import { ExternalLink, Github, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function EnglishHome() {
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Wooyong Heo",
    alternateName: ["Ted", "허우용"],
    url: absoluteUrl("/en/"),
    image: absoluteUrl("/images/Ted_yanadoo.png"),
    sameAs: ["https://github.com/withwooyong"],
    jobTitle: "Agile Developer & Tech Lead",
    worksFor: { "@type": "Organization", name: "Yanadoo" },
  };

  return (
    <>
      <SiteHead
        title="Wooyong (Ted) Heo — Agile Developer & Tech Lead"
        description="Summary portfolio: engineering leadership at Yanadoo; N-Screen, OTT, and AI platform experience (SK Broadband, CJ Hellovision). Full detail on the Korean page."
        path="/en/"
        jsonLd={personJsonLd}
      />

      <div lang="en" className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
        <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/85 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline" hrefLang="ko">
              한국어 전체 포트폴리오 →
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main id="main" className="max-w-3xl mx-auto px-4 py-12 space-y-10">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="w-28 h-28 rounded-full overflow-hidden shadow-lg ring-2 ring-white/50 dark:ring-slate-600 shrink-0">
              <Image src="/images/Ted_yanadoo.png" alt="Wooyong Heo" width={112} height={112} className="w-full h-full object-cover" priority />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold tracking-tight">Wooyong (Ted) Heo</h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 mt-1">Agile Developer & Tech Lead</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                Head of Development at Yanadoo (commerce & education). Previously Senior Engineer / PM at SK Broadband and CMS part lead at CJ Hellovision (TVING). Focus areas: AI services, N-Screen, OTT, and platform engineering.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Highlights</CardTitle>
              <CardDescription>Short list — see the Korean page for the full narrative.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-300 text-sm">
                <li>Leads a 20–30 person engineering organization across product, mobile, backend, and operations.</li>
                <li>Shipped multiple AI chatbot products in education and commerce domains.</li>
                <li>Large-scale TV / OTT backend integrations (search, recommendations, CMS, media pipelines).</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <a href="https://www.notion.so/282845b3742d8060bff8cd6f0012ef63?source=copy_link" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Resume (Notion)
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:withwooyong@gmail.com">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="https://github.com/withwooyong" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </a>
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
