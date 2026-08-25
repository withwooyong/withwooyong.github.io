import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
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

/**
 * 포커스 표시. 전역 CSS 에도 컴포넌트에도 없어서 브라우저 기본 아웃라인에만
 * 기대고 있었다 — 다크 기본 배경에서 대비가 보장되지 않는다.
 *
 * ⚠️ 문자열을 동적으로 조립하지 마라. Tailwind 추출기는 소스를 정규식으로 훑으므로
 *    `"focus-visible:ring-" + color` 형태는 규칙이 생성되지 않는다.
 * ⚠️ `focus:` 가 아니라 `focus-visible:` 이다. `focus:` 면 마우스 클릭에도 링이 뜬다.
 */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n0";

export function SiteHeader() {
  const { asPath } = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  // NAV 의 href 는 전부 `/…/` 로 끝난다(next.config.js 의 trailingSlash: true).
  // 그래서 `/blog/foo/` 같은 글 상세에서도 Blog 가 활성으로 잡힌다.
  // ⚠️ 로고(`/`)에는 붙이지 않는다 — 모든 경로가 `/` 로 시작하므로 전 페이지가 활성이 된다.
  const isActive = (href: string) => asPath === href || asPath.startsWith(href);

  useEffect(() => {
    // 히어로 구간에서는 투명, 벗어나면 n2 배경 + n4 하단 경계
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /**
   * 드로어가 열려 있는 동안에만 붙는다.
   *
   * `fixed inset-0` 은 시각적으로만 덮을 뿐이라 뒤 콘텐츠(로고·테마 토글·EN)는
   * 여전히 Tab 으로 닿는다. 그래서 순환 목록을 직접 만들어 가둔다.
   * 목록은 [햄버거 버튼, …드로어 안의 a/button] 순 — DOM 순서와 같다.
   * 버튼을 포함시키는 이유는 그것이 드로어 위에 떠서(z-50) 유일한 닫기 수단이기 때문이다.
   */
  useEffect(() => {
    if (!menuOpen) return;

    const focusables = () => {
      const drawer = drawerRef.current;
      const inDrawer = drawer
        ? Array.from(drawer.querySelectorAll<HTMLElement>("a, button"))
        : [];
      const button = menuButtonRef.current;
      return button ? [button as HTMLElement].concat(inDrawer) : inDrawer;
    };

    // 열릴 때는 드로어 안 첫 항목으로 옮긴다(버튼이 아니라).
    const first = drawerRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) return;

      const head = items[0];
      const tail = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const index = active ? items.indexOf(active) : -1;

      if (index === -1) {
        // 포커스가 이미 드로어 밖으로 샜다 — 되돌린다.
        event.preventDefault();
        head.focus();
        return;
      }
      if (event.shiftKey && active === head) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && active === tail) {
        event.preventDefault();
        head.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    // 드로어 뒤가 스크롤되면 전체화면의 의미가 없다.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 정리 함수 안에서 ref.current 를 직접 읽으면 react-hooks/exhaustive-deps 가 경고한다.
    // 햄버거 버튼은 헤더가 마운트된 동안 늘 렌더되는 같은 노드라 여기서 붙잡아도 안전하고,
    // 언마운트 때 떨어진 노드에 focus() 하는 것은 브라우저에서 무동작이다.
    const button = menuButtonRef.current;

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // 닫힐 때 포커스를 버튼으로 되돌린다(요구 5).
      button?.focus();
    };
  }, [menuOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-interactive",
        scrolled ? "bg-n2 border-b border-n4" : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={cn(
            "rounded-sm text-card-title font-semibold text-n9 break-keep",
            FOCUS_RING,
          )}
        >
          허우용 <span className="text-n6 font-normal">Ted</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8" aria-label="주요 메뉴">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "border-b-2 pb-1 text-body transition-interactive break-keep",
                FOCUS_RING,
                isActive(item.href)
                  ? "border-signal text-n9"
                  : "border-transparent text-n7 hover:text-n9",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* 설계서 §4 의 우측 순서는 「검색(⌘K) · 테마 토글 · /en」이다.
              검색은 단계 3까지 미노출이므로 이 자리(토글 왼쪽)를 비워 둔다. */}
          <ThemeToggle />
          <Link
            href="/en/"
            aria-current={isActive("/en/") ? "page" : undefined}
            className={cn(
              "hidden rounded-sm text-label uppercase tracking-widest transition-interactive sm:inline",
              FOCUS_RING,
              isActive("/en/") ? "text-n9" : "text-n6 hover:text-n9",
            )}
          >
            EN
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            // z-50: 드로어(z-40) 위에 떠 있어야 X 아이콘이 보이고 눌린다.
            className={cn(
              "relative z-50 rounded-sm p-2 text-n7 transition-interactive hover:text-n9 md:hidden",
              FOCUS_RING,
            )}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/*
        ⚠️ 조건부 렌더로 되돌리지 마라. 닫힘 상태에서 #mobile-nav 가 사라지면
           버튼의 aria-controls 가 없는 id 를 가리켜 ARIA 관계가 끊긴다.
           항상 렌더하고 열림 여부는 클래스로만 감춘다.
        z-40 은 스킵 링크(z-[60])보다 낮다 — 스킵 링크가 드로어에 가리면 안 된다.
      */}
      <nav
        id="mobile-nav"
        ref={drawerRef}
        aria-label="모바일 메뉴"
        className={cn(
          "fixed inset-0 z-40 bg-n0 md:hidden",
          menuOpen ? "block" : "hidden",
        )}
      >
        <ul className="mx-auto max-w-6xl space-y-4 px-4 pb-8 pt-24 sm:px-6">
          {/* 좁은 화면에서는 헤더의 EN 링크가 숨으므로(sm:inline) 드로어 안에 있어야 한다. */}
          {[...NAV, { href: "/en/", label: "EN" }].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "block rounded-sm border-l-2 pl-4 text-card-title transition-interactive break-keep",
                  FOCUS_RING,
                  isActive(item.href)
                    ? "border-signal text-n9"
                    : "border-transparent text-n7 hover:text-n9",
                )}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
