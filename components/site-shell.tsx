import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-n0 text-n7">
      <a
        href="#main"
        className="sr-only break-keep focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-signal focus:text-signal-ink focus:px-4 focus:py-2 focus:rounded"
      >
        본문으로 건너뛰기
      </a>
      <SiteHeader />
      {/*
        <main> 은 원래 포커스를 받을 수 없어서, 스킵 링크가 스크롤만 시키고 포커스는
        헤더에 남는 브라우저·보조기술 조합이 있다. tabIndex={-1} 이 그걸 막는다.
        focus:outline-none 은 프로그램적 포커스에 아웃라인이 뜨는 걸 막는 것으로,
        Tab 으로는 도달할 수 없으므로 접근성 손실이 없다.
      */}
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
