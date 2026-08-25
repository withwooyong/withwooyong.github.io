import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

/**
 * 내비 항목.
 *
 * ⚠️ 미완성 라우트는 여기에 넣지 않는다. 비활성으로 두지도 않는다 —
 *    죽은 링크가 있는 사이트로 읽힌다(설계서 §4).
 *
 *    /atlas  → 단계 4에서 추가한다. 발행(단계 3) 시점의 헤더에는 없다.
 *    ⌘K 검색 → 단계 3에서 우측에 추가한다.
 */
const NAV: NavItem[] = [
  { href: "/work/", label: "Work" },
  { href: "/blog/", label: "Blog" },
  { href: "/about/", label: "About" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // 히어로 구간에서는 투명, 벗어나면 n2 배경 + n4 하단 경계
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-interactive",
        scrolled ? "bg-n2 border-b border-n4" : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-card-title font-semibold text-n9 break-keep">
          허우용 <span className="text-n6 font-normal">Ted</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="주요 메뉴">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-body text-n7 hover:text-n9 transition-interactive break-keep"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/en/"
            className="hidden sm:inline text-label uppercase tracking-widest text-n6 hover:text-n9 transition-interactive"
          >
            EN
          </Link>
          <ThemeToggle />
          <button
            type="button"
            className="md:hidden text-body text-n7 px-2"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "닫기" : "메뉴"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" className="md:hidden border-t border-n4 bg-n2" aria-label="모바일 메뉴">
          <ul className="mx-auto max-w-6xl px-4 py-4 space-y-3 sm:px-6">
            {[...NAV, { href: "/en/", label: "EN" }].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block text-body text-n7 hover:text-n9 break-keep"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
