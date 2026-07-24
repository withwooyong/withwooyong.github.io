import { SiteHead } from "@/components/site-head";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { absoluteUrl, NOTION_RESUME_URL } from "@/lib/site";
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
    jobTitle: "Head of Engineering / CTO-track Backend & Platform Leader",
  };

  return (
    <>
      <SiteHead
        title="Wooyong (Ted) Heo — Head of Engineering / CTO-track · 20-yr Backend & Platform Leader"
        description="Summary portfolio of Wooyong (Ted) Heo: a 20+ year engineering leader and former Head of Commerce Development at Yanadoo (a kakao company, formerly Kakao Kids), 2022.02–2026.07. Drove 10M+ user services and platform builds at KT, CJ Hellovision, and SK Broadband across on-prem (IDC) and AWS, and leverages AI to maximize engineering productivity. Full detail on the Korean page."
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
              <p className="text-lg text-slate-600 dark:text-slate-300 mt-1">Head of Engineering / CTO-track · 20-yr Backend & Platform Leader</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                A 20+ year engineering leader and former Head of Commerce Development at Yanadoo (a kakao company, formerly Kakao Kids) from 2022.02 to 2026.07, leading a ~30-person organization (education & commerce). Drove 10M+ user services and platform builds at KT, CJ Hellovision, and SK Broadband — a platform architect across both on-prem (IDC) and AWS. I connect AI, platforms, and people to grow services and engineering productivity.
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
                <li>Leads a ~30-person engineering organization across product, mobile, backend, and operations.</li>
                <li>Believes great engineers write code people understand — code a teammate can still read six months later — which is what builds team velocity and service stability.</li>
                <li>Uses AI across coding, review, documentation, and repetitive work to maximize productivity, and has shipped multiple AI chatbot products in education and commerce.</li>
                <li>Large-scale TV / OTT backend integrations (search, recommendations, CMS, media pipelines) for 10M+ user services.</li>
              </ul>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
            <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
              <a href={NOTION_RESUME_URL} target="_blank" rel="noopener noreferrer">
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
