import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { SearchButton } from "@/components/search/search-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { lockScroll } from "@/lib/ui/scroll-lock";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

/**
 * 내비 항목.
 *
 * ⚠️ 미완성 라우트는 여기에 넣지 않는다. 비활성으로 두지도 않는다 —
 *    죽은 링크가 있는 사이트로 읽힌다(설계서 §4).
 *
 *    /atlas  → 아틀라스·검색 계획서(2026-08-26) **T13** 에서 만들고 **T16**(=Task 12) 에서
 *              여기에 넣었다. 라우트가 실물로 있으므로 죽은 링크가 아니다.
 *    ⌘K 검색 → 같은 계획서 T5 에서 우측에 추가한다. NAV 가 아니라 버튼이다.
 *    /work   → 선행 계획서(2026-08-25) **T11** 에서 `pages/work/index.tsx` 와 함께 되살렸다.
 *    /about  → 같은 계획서 T12 로 이월돼 있다. 그 태스크에서 되살린다.
 *
 * ⚠️ 위 T13·T16 은 2026-08-27 까지 T11·T12 로 적혀 있었다. 그 계획서의 T11 은
 *    「Canvas + 자동선택」, T12 는 「렌즈·사이드바·패널」이라 **셸과 무관하다.**
 *    정본은 계획서 §「실행 순서와 그 이유」의 다이어그램이다.
 *
 * ⚠️ 이 배열은 `e2e/shell.spec.ts` 의 `NAV_PRESENT`·`NAV_ABSENT` 와 **한 쌍이다.**
 *    여기에 항목을 넣거나 빼면 거기도 함께 옮겨라. 2026-08-26 에 한쪽만 고쳤다가
 *    셸이 붙는 순간 빨개질 시한폭탄을 만든 적이 있고, skip 중이라 아무에게도 안 보였다.
 *
 * ⚠️ 2026-08-26 실측: 이 배열이 죽은 링크를 들고 있어도 **산출물에는 안 나타난다** —
 *    `SiteShell` 이 아직 어느 페이지에도 붙어 있지 않기 때문이다(`data-site-shell` 0건).
 *    즉 out/ 을 grep 해서 0 이 나오는 것은 이 배열이 깨끗하다는 증거가 아니다.
 *    셸이 처음 붙는 T13 시점에 여기 남아 있는 것이 그대로 렌더된다.
 */
const NAV: NavItem[] = [
  { href: "/work/", label: "Work" },
  { href: "/atlas/", label: "Atlas" },
  { href: "/blog/", label: "Blog" },
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
  const drawerRef = useRef<HTMLDivElement>(null);
  // ⚠️ <header> 가 아니라 **안쪽 바 컨테이너**에 단다. <header> 는 드로어까지 품고 있어서
  //    거기에 달면 드로어 링크가 두 번 수집되고 indexOf 가 첫 번째만 찾아 순환이 어긋난다.
  //    바 컨테이너와 드로어는 <header> 아래 형제라 서로를 포함하지 않는다.
  const headerBarRef = useRef<HTMLDivElement>(null);

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
   * md 경계를 넘어가면 드로어를 강제로 닫는다. (근본 수정)
   *
   * 드로어도 햄버거 버튼도 `md:hidden` 이라, 모바일 폭에서 연 채로 기기를 회전하거나
   * (iPhone Pro Max 랜드스케이프 932px) 창을 넓히면 **둘 다 동시에 display:none 이 되는데
   * menuOpen 은 true 로 남는다.** 그러면 body.overflow = "hidden" 이 유지돼 전 사이트
   * 스크롤이 잠기고, 닫을 수 있는 보이는 컨트롤이 하나도 없어진다. 탈출구가 Escape 뿐이라
   * 마우스·터치 사용자는 갇힌다.
   *
   * ⚠️ 768px 은 Tailwind 기본 `md` 브레이크포인트다. tailwind.config.js 는 지금
   *    screens 를 재정의하지 않는다 — 재정의하는 순간 이 값도 같이 바꿔야 한다.
   */
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const closeIfWide = () => {
      if (wide.matches) setMenuOpen(false);
    };
    closeIfWide(); // 마운트 시점의 현재 폭도 한 번 확인한다

    // MediaQueryList.addEventListener 는 Safari/iOS 14+ 다. 구형은 addListener 뿐인데,
    // 없는 메서드를 부르면 useEffect 안에서 TypeError 가 나고 React 가 루트를 언마운트한다.
    // 이 컴포넌트는 site-shell 을 통해 전 페이지에 붙고 저장소에 에러 바운더리가 0건이므로,
    // 그 결과는 「가둠」이 아니라 전 페이지 백지다. package.json 에 browserslist 가 없어
    // Next 14 기본 타깃이 Safari 12 를 포함하고, SWC 는 DOM API 를 폴리필하지 않는다.
    if (typeof wide.addEventListener === "function") {
      wide.addEventListener("change", closeIfWide);
      return () => wide.removeEventListener("change", closeIfWide);
    }
    wide.addListener(closeIfWide);
    return () => wide.removeListener(closeIfWide);
  }, []);

  /**
   * 드로어가 열려 있는 동안에만 붙는다.
   *
   * `fixed inset-0` 은 시각적으로만 덮을 뿐이라 페이지 본문은 여전히 Tab 으로 닿는다.
   * 그래서 순환 목록을 직접 만들어 가둔다.
   *
   * 목록은 [헤더 바 안의 보이는 a/button, …드로어 안의 a/button] 순 — DOM 순서와 같다.
   * 헤더를 포함시키는 이유는 sticky z-50 이 드로어(z-40) 위에 떠서 로고·테마 토글·EN 이
   * **실제로 보이기** 때문이다. 보이면 순환에 있어야 한다.
   */
  useEffect(() => {
    if (!menuOpen) return;

    /**
     * 보이는 요소만 센다. (방어 수정 — 위 matchMedia 가 실패해도 Tab 을 죽이지 않는다)
     *
     * `offsetParent === null` 이면 조상 어딘가가 display:none 이다. 리사이즈로
     * 드로어와 버튼이 함께 감춰진 순간에도 안 보이는 요소에 focus() 하지 않게 된다.
     *
     * offsetParent 가 null 이 되는 다른 경우는 「요소 자신이 position: fixed」인데
     * 여기 해당하는 요소가 없다 — 드로어 안 항목은 fixed 조상 **안의 static 자식**이라
     * offsetParent 가 그 fixed 요소이고, 햄버거 버튼은 sticky 헤더 안의 relative 요소라
     * offsetParent 가 헤더다. 둘 다 non-null 이다.
     */
    const isVisible = (el: HTMLElement) => el.offsetParent !== null;

    const collect = (root: HTMLElement | null) =>
      root ? Array.from(root.querySelectorAll<HTMLElement>("a, button")) : [];

    /**
     * 헤더 바와 드로어 **양쪽**에서 모은다.
     *
     * 드로어는 z-40 인데 헤더는 sticky z-50 이라 헤더가 드로어 **위에** 뜬다.
     * 그래서 드로어가 열려 있어도 로고 · 테마 토글 · EN 링크(640–767px 에서 sm:inline)가
     * 화면에 보인다. 보이는데 탭으로 못 가는 컨트롤을 남기지 않는다.
     *
     * 폭별 분기를 손으로 짜지 않는다 — isVisible 이 대신 걸러 준다.
     * 데스크톱 내비는 `hidden md:flex` 라 모바일에서, EN 링크는 `hidden sm:inline` 이라
     * 640px 미만에서, 햄버거는 `md:hidden` 이라 768px 이상에서 저절로 빠진다.
     *
     * 순서는 DOM 순서 그대로다 — 헤더 바 결과 뒤에 드로어 결과를 잇는다.
     * 햄버거 버튼은 헤더 바 **안에** 있으므로 따로 앞에 붙이지 않는다(붙이면 중복된다).
     */
    const focusables = () =>
      collect(headerBarRef.current).concat(collect(drawerRef.current)).filter(isVisible);

    // 열릴 때는 드로어 안 첫 항목으로 옮긴다(버튼이 아니라).
    const first = drawerRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      /*
        팔레트가 열려 있으면 트랩의 주인은 팔레트다.
        이 리스너는 document 레벨이라 팔레트 안 요소가 포커스여도 발동하는데,
        focusables() 는 헤더 바와 드로어만 모으므로 팔레트 안 요소는
        indexOf === -1 이 되어 「샜다」고 오판하고 포커스를 헤더로 끌어간다.
        팔레트는 닫히면 언마운트되므로 이 셀렉터가 곧 「열려 있는가」다.
      */
      if (document.querySelector("[data-search-palette]")) return;

      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      // 보이는 항목이 하나도 없다 → preventDefault() 하지 않고 브라우저 기본 동작에 넘긴다.
      // 여기서 가두면 Tab 이 전역에서 죽는다. 죽은 Tab 보다 기본 동작이 낫다.
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

    /*
      드로어 뒤가 스크롤되면 전체화면의 의미가 없다.

      ⚠️ body.style.overflow 를 손으로 저장·복원하지 마라. 드로어와 ⌘K 팔레트가
         겹쳐 열렸다 닫히면 나중에 정리되는 쪽이 저장해 둔 "hidden" 을 되돌려
         페이지가 **영구히** 잠긴다(새로고침 외 탈출구 없음). 참조 계수가 필요하고,
         그것이 lockScroll 안에 있다.
    */
    const unlock = lockScroll();

    // 정리 함수 안에서 ref.current 를 직접 읽으면 react-hooks/exhaustive-deps 가 경고한다.
    // 햄버거 버튼은 헤더가 마운트된 동안 늘 렌더되는 같은 노드라 여기서 붙잡아도 안전하고,
    // 언마운트 때 떨어진 노드에 focus() 하는 것은 브라우저에서 무동작이다.
    const button = menuButtonRef.current;

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlock();
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
      <div
        ref={headerBarRef}
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
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
              팔레트(CommandPalette)는 SiteShell 이 한 번만 마운트하고 단축키를 스스로 듣는다.
              그래서 이 버튼은 열림 상태를 들고 있지 않고 keydown 을 합성해 보낸다 —
              상태를 두 곳에 두지 않는 가장 단순한 방법이다. */}
          <SearchButton
            onOpen={() =>
              window.dispatchEvent(
                // bubbles: true 는 지금은 없어도 동작한다(window 에 직접 dispatch 하므로).
              // 팔레트가 리스너를 document 나 다른 노드로 옮기는 순간 조용히 죽으므로 붙여 둔다.
              new KeyboardEvent("keydown", {
                key: "k",
                ctrlKey: true,
                bubbles: true,
              }),
              )
            }
          />
          {/* ⓘ ThemeToggle 은 props 를 받지 않아 FOCUS_RING 을 넘길 수 없다. 그래서 이것만
              Button 기본값인 ring-1 ring-ring(= n6)이고 나머지는 ring-2 ring-signal 이다.
              램프 안이라 위반은 아니고 일관성 문제다 — 이걸 위해 인터페이스를 바꾸지 않는다. */}
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
      <div
        id="mobile-nav"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        /* 안쪽 <nav> 와 이름이 겹치면 스크린리더가 같은 문구를 두 번 읽는다. */
        aria-label="메뉴"
        className={cn(
          "fixed inset-0 z-40 bg-n0 md:hidden",
          menuOpen ? "block" : "hidden",
        )}
      >
        {/*
          dialog 를 <nav> 에 직접 얹지 않고 바깥 <div> 로 감쌌다.
          role 을 덮어쓰면 navigation 랜드마크가 사라져 랜드마크 목록에서 메뉴를 못 찾는다.
          감싸면 「대화 상자 안의 탐색」이라는 두 의미가 다 산다.
        */}
        <nav aria-label="모바일 메뉴">
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
      </div>
    </header>
  );
}
