import { Button } from "@/components/ui/button";
import type { NavItem } from "@/data/portfolio";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PortfolioNavProps = {
  items: NavItem[];
  brand: string;
  englishHref?: string;
};

export function PortfolioNav({ items, brand, englishHref = "/en/" }: PortfolioNavProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        본문으로 건너뛰기
      </a>
      <nav
        className={cn(
          "fixed top-0 w-full z-50 border-b backdrop-blur-md transition-[background-color,box-shadow,backdrop-filter,border-color] duration-300 ease-out",
          scrolled
            ? "bg-white/92 dark:bg-slate-950/92 shadow-sm shadow-slate-900/[0.06] dark:shadow-black/25 border-slate-200/95 dark:border-slate-700/90 backdrop-blur-lg"
            : "bg-white/78 dark:bg-slate-900/72 border-transparent"
        )}
        aria-label="주요 메뉴"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 shrink-0">{brand}</div>

            <div className="hidden md:flex items-center gap-6 flex-1 justify-end">
              <div className="flex flex-wrap justify-end gap-x-6 gap-y-1">
                {items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="portfolio-nav-link text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors text-sm py-1"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-600">
                <Link
                  href={englishHref}
                  className="portfolio-nav-link text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 whitespace-nowrap py-1"
                  hrefLang="en"
                >
                  EN
                </Link>
                <ThemeToggle />
              </div>
            </div>

            <div className="flex md:hidden items-center gap-2">
              <Link href={englishHref} className="text-sm font-medium text-slate-600 dark:text-slate-300 px-2" hrefLang="en">
                EN
              </Link>
              <ThemeToggle />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 border-slate-200 dark:border-slate-600"
                aria-expanded={open}
                aria-controls="mobile-nav-panel"
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {open ? (
          <div
            id="mobile-nav-panel"
            className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-4 py-4 space-y-3"
          >
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block py-2 text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 last:border-0"
                onClick={close}
              >
                {item.label}
              </a>
            ))}
          </div>
        ) : null}
      </nav>
    </>
  );
}
