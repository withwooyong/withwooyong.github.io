import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Search } from "lucide-react";
import { loadPagefind } from "@/lib/search/pagefind-loader";
import { collectHits } from "@/lib/search/collect";
import type { Hit } from "@/lib/search/collect";
import { safeExcerpt } from "@/lib/search/excerpt";
import { stripParticle } from "@/lib/search/korean";
import { lockScroll } from "@/lib/ui/scroll-lock";
import { cn } from "@/lib/utils";

/**
 * ⌘K 커맨드 팔레트 (설계서 §8.4 · 계획서 T5).
 *
 * props 를 받지 않고 전역 단축키를 스스로 등록한다. 헤더의 검색 버튼은 상태를
 * 공유하지 않고 keydown 을 합성해 보낸다 — 열림 상태를 한 곳에만 두기 위해서다.
 *
 * ⚠️ 접근명은 T6 의 E2E 가 문자열로 검사한다. 바꾸지 마라.
 *      다이얼로그 aria-label = 사이트 검색
 *      입력      aria-label = 검색어
 *
 * ⚠️ 루트의 `data-search-palette` 는 site-header.tsx 의 드로어 포커스 트랩이
 *    양보 여부를 판단하는 표지다. 지우면 팔레트 안의 Tab 이 헤더로 납치된다.
 *
 * ⚠️ 다크 모드에 dark: 변형을 붙이지 않았다. styles/globals.css 의 .dark 블록이
 *    --n0~--n9 · --signal* 를 통째로 재정의하므로 bg-n1 같은 토큰 클래스는
 *    이미 테마를 따라 뒤집힌다. dark: 를 덧붙이면 이중 적용이 된다.
 *    토큰이 아닌 색은 배경 스크림(bg-black/50) 하나뿐이고, 스크림은 두 테마에서 같다.
 */

const LIST_ID = "site-search-results";

function optionId(index: number): string {
  return "site-search-option-" + index;
}

/** 포커스가 글자를 받는 곳에 있는가. `/` 단독 단축키의 유일한 차단 조건이다. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable === true;
}

/**
 * 「~(으)로」 조사 선택. 받침이 없거나 ㄹ 받침이면 「로」.
 * 제안 문구가 「임베딩로」처럼 보이면 제안 자체가 미덥지 않게 읽힌다.
 */
function euro(word: string): string {
  if (!word) return "(으)로";
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "(으)로";
  const jong = (code - 0xac00) % 28;
  return jong === 0 || jong === 8 ? "로" : "으로";
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n1";

/**
 * 팔레트 안에서 Tab 순환에 참여하는 요소.
 *
 * 결과 링크는 tabIndex={-1} 이라 여기서 저절로 빠진다 — 이동 모델을
 * aria-activedescendant 하나로 통일했기 때문이다(화살표로 고르고 Enter 로 간다).
 */
const TABBABLE =
  'a[href]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CommandPalette() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [alt, setAlt] = useState<string | null>(null);
  const [altCount, setAltCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(0);

  const openRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  /** 「닫기」와 「이동」을 구분한다. 이동일 때 포커스를 헤더 버튼으로 되돌리면 안 된다. */
  const skipRestoreRef = useRef(false);

  openRef.current = open;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setAlt(null);
    setAltCount(0);
    setBusy(false);
    setSel(0);
  }, []);

  /* ── 전역 단축키 ──────────────────────────────────────────────────
   * navigator.platform 으로 Mac 을 판별하지 않는다(설계서 §8.4).
   * 판별이 틀려도 단축키는 동작해야 하므로 metaKey || ctrlKey 를 함께 본다.
   * 플랫폼은 라벨을 그릴 때만 쓴다.
   */
  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        // Ctrl/Cmd+Shift+K 는 브라우저 개발자도구(콘솔) 단축키다. 가로채지 않는다.
        // key 가 "K" 인 경우를 남겨 두는 건 CapsLock 상태의 Ctrl+K 때문이다.
        !event.shiftKey &&
        (event.key === "k" || event.key === "K")
      ) {
        event.preventDefault();
        // 토글이다 — 열린 상태에서 다시 누르면 닫힌다(계획서 원안).
        if (openRef.current) close();
        else setOpen(true);
        return;
      }

      if (event.key === "Escape" && openRef.current) {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "/") {
        // 이미 열려 있으면 아무것도 하지 않는다. 다이얼로그가 겹치면 안 된다.
        if (openRef.current) return;
        // 입력 중이면 여기서 빠져나간다 — preventDefault 를 거치지 않으므로
        // "/" 는 그대로 그 입력의 값이 된다(예: 「검색」 + / → 「검색/」).
        if (isTypingTarget(event.target)) return;
        // 여기까지 왔으면 포커스가 글자를 받는 곳에 없다. 그래도 막아야 한다 —
        // 막지 않으면 방금 포커스된 팔레트 입력에 "/" 가 들어가 query 가 "/" 로 시작한다.
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  /* 열림 부수효과: 포커스 이동·복원, 배경 스크롤 잠금·해제.
   *
   * ⚠️ document.body.style.overflow 를 손으로 저장·복원하지 않는다.
   *    드로어와 팔레트가 겹쳐 열렸다 닫히면 나중에 정리되는 쪽이 "hidden" 을
   *    되돌려 놓아 페이지가 영구히 잠겼다. 참조 계수는 lockScroll 안에 있다. */
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const unlock = lockScroll();

    const input = inputRef.current;
    if (input) input.focus();

    return () => {
      unlock();
      if (!skipRestoreRef.current) {
        const previous = restoreFocusRef.current;
        if (previous && typeof previous.focus === "function") previous.focus();
      }
      skipRestoreRef.current = false;
      restoreFocusRef.current = null;
    };
  }, [open]);

  /* ── 검색 ─────────────────────────────────────────────────────────
   * 디바운스 160ms · 2글자 미만은 검색하지 않는다.
   * await 마다 cancelled 를 확인한다 — 확인하지 않으면 늦게 도착한 응답이
   * 이미 바뀐 쿼리의 결과를 덮어쓴다.
   */
  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setAlt(null);
      setAltCount(0);
      setBusy(false);
      setSel(0);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(function run() {
      // setBusy 는 디바운스 **안**이다. 밖에 두면 타자 한 글자마다 상태가 튀어
      // aria-live 가 떠들고, 실제로 검색하지도 않는 구간에 「검색 중」이 뜬다.
      setBusy(true);

      void (async () => {
        try {
          const pf = await loadPagefind();
          if (cancelled) return;

          const res = await pf.search(q);
          if (cancelled) return;

          /*
            조사 뗀 2차 검색은 **부가 기능**이다. 본 결과와 같은 try 에 묶어 두면
            2차가 던질 때 이미 커밋한 8건이 지워지고 「결과가 없습니다」가 됐다.
            .catch(() => 0) 이 실패를 그 자리에서 흡수한다.

            Promise.all 로 병렬화한 이유는 지연이다 — 직렬로 두면 2차가
            collectHits 의 조각 로드가 끝난 뒤에야 시작했다. 둘이 함께 끝나므로
            setBusy(false) 와 setHits 사이에 「결과는 떴는데 아직 검색 중」인 창도 없다.

            개수만 필요하다. data() 를 부르면 조각을 내려받아 비싸진다.
          */
          const stripped = stripParticle(q);
          const altCountPromise =
            stripped !== q && stripped.length >= 2
              ? pf
                  .search(stripped)
                  .then((r) => r.results.length)
                  .catch(() => 0)
              : Promise.resolve(0);

          const both = await Promise.all([
            // 태그 목록 페이지·404 는 여기서 걸러진다(인덱스 242건 중 65건이 태그다).
            // shouldContinue 는 취소 신호다 — 버려질 결과를 위해 조각을 더 받지 않는다.
            collectHits(res.results, { shouldContinue: () => !cancelled }),
            altCountPromise,
          ]);
          if (cancelled) return;

          const found = both[0];
          const count = both[1];

          setHits(found);
          setSel(0);
          if (stripped !== q && stripped.length >= 2) {
            setAlt(stripped);
            setAltCount(count);
          } else {
            setAlt(null);
            setAltCount(0);
          }
        } catch {
          // 본 검색 실패는 조용히 빈 결과다. 콘솔 에러로 사용자 흐름을 막지 않는다.
          if (cancelled) return;
          setHits([]);
          setAlt(null);
          setAltCount(0);
        } finally {
          if (!cancelled) setBusy(false);
        }
      })();
    }, 160);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  /* 선택 항목을 보이게 스크롤한다. */
  useEffect(() => {
    if (!open || hits.length === 0) return;
    const el = document.getElementById(optionId(sel));
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [open, sel, hits]);

  const go = useCallback(
    (url: string) => {
      // 「닫기」가 아니라 「이동」이다. 포커스를 헤더 검색 버튼으로 되돌리면
      // 스크린리더·키보드 사용자가 새 글이 아니라 버튼 앞에 서게 된다.
      skipRestoreRef.current = true;
      close();
      void router.push(url).then(() => {
        // site-shell.tsx 의 <main id="main" tabIndex={-1}> 로 보낸다.
        const main = document.getElementById("main");
        if (main && typeof main.focus === "function") main.focus();
      });
    },
    [close, router],
  );

  /* ── 팔레트가 열려 있는 동안의 키 처리 ────────────────────────────
   *
   * ⚠️ 패널의 React onKeyDown 이 아니라 document 리스너다.
   *    패널 안 비포커스 영역(「결과가 없습니다」 문단, <ul> 여백)을 클릭하면
   *    activeElement 가 body 가 되고, 그러면 keydown 이 패널 밖에서 나
   *    React 핸들러가 받지 못해 포커스가 모달 뒤로 샜다. 드로어 트랩은
   *    document 리스너로 이 구멍을 이미 막고 있었는데 팔레트만 안 막고 있었다.
   */
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: globalThis.KeyboardEvent) {
      const key = event.key;

      if (key === "ArrowDown") {
        event.preventDefault();
        setSel((s) => (hits.length === 0 ? 0 : (s + 1) % hits.length));
        return;
      }
      if (key === "ArrowUp") {
        event.preventDefault();
        setSel((s) => (hits.length === 0 ? 0 : (s - 1 + hits.length) % hits.length));
        return;
      }
      if (key === "Enter") {
        // 조사 제안 버튼 위에서의 Enter 는 그 버튼의 것이다.
        // 여기서 preventDefault 하면 버튼이 영영 눌리지 않는다.
        const target = event.target as HTMLElement | null;
        if (target && target.tagName === "BUTTON") return;
        const hit = hits[sel];
        if (!hit) return;
        event.preventDefault();
        go(hit.url);
        return;
      }
      if (key === "Tab") {
        // aria-modal="true" 를 내걸었으면 포커스가 실제로 갇혀 있어야 한다.
        const root = panelRef.current;
        if (!root) return;
        const nodes: HTMLElement[] = Array.prototype.slice.call(
          root.querySelectorAll(TABBABLE),
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const index = active ? nodes.indexOf(active) : -1;
        if (index === -1) {
          // 포커스가 이미 팔레트 밖이다(빈 영역 클릭 등) — 되돌린다.
          event.preventDefault();
          first.focus();
          return;
        }
        if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, hits, sel, go]);

  if (!open) return null;

  const trimmed = query.trim();
  // 넓어질 때만 제안한다. 조사를 잘못 뗐다면 결과가 늘지 않으므로 제안이 뜨지 않는다 —
  // 이 조건 자체가 조사 제거 오작동의 안전장치다(T4 실측).
  const showAlt = alt !== null && altCount > hits.length;
  const showEmpty = !busy && hits.length === 0 && trimmed.length >= 2 && !showAlt;

  /*
    aria-live 문구에 쿼리를 넣는 이유: 건수만 넣으면 5건 → 5건일 때 문자열이
    바뀌지 않아 스크린리더가 **아무 말도 하지 않는다.** 검색이 새로 돌았다는
    사실 자체가 전달되지 않는다. 검색 중에는 빈 문자열이라 아무 알림도 나가지 않는다.
  */
  const liveMessage =
    trimmed.length < 2 || busy ? "" : trimmed + " 검색 결과 " + hits.length + "건";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        ref={panelRef}
        data-search-palette
        role="dialog"
        aria-modal="true"
        aria-label="사이트 검색"
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-lg border border-n4 bg-n1 shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-n4 px-4">
          <Search className="h-4 w-4 shrink-0 text-n6" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="검색어"
            aria-expanded={hits.length > 0}
            aria-controls={LIST_ID}
            aria-autocomplete="list"
            aria-activedescendant={hits.length > 0 ? optionId(sel) : undefined}
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="제목·본문 검색"
            className="w-full bg-transparent py-4 text-body text-n9 outline-none placeholder:text-n5"
          />
          <kbd
            aria-hidden="true"
            className="hidden shrink-0 rounded border border-n4 bg-n3 px-1.5 py-0.5 text-label text-n6 sm:inline-block"
          >
            ESC
          </kbd>
        </div>

        <div className="sr-only" role="status" aria-live="polite">
          {liveMessage}
        </div>

        {/*
          ⚠️ 이 <ul> 을 조건부 렌더로 바꾸지 마라. 입력의 aria-controls 가 이 id 를
             가리키므로 목록이 사라지면 없는 id 를 가리키게 되고, 결과 0건인 동안
             (검색어를 막 치기 시작한 대부분의 시간) axe aria-valid-attr-value 위반이다.
             항상 렌더하고 항목만 조건부로 만든다 — site-header.tsx 의 드로어가 같은
             이유로 이미 그렇게 돼 있다.
        */}
        <ul
          id={LIST_ID}
          role="listbox"
          aria-label="검색 결과"
          className={cn("overflow-y-auto", hits.length > 0 && "max-h-[52vh] p-2")}
        >
          {hits.map((hit, index) => (
            <li
              key={hit.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === sel}
              className={cn(
                "rounded-md",
                index === sel ? "bg-signal-soft" : "bg-transparent",
              )}
            >
              {/*
                role="option" 은 <li> 에 두고 <a> 는 링크 역할 그대로 남긴다.

                실측(2026-08-26, 이 구조를 그대로 옮긴 Playwright 픽스처):
                  getByRole("dialog", { exact "사이트 검색" }) → 1
                  다이얼로그 안 getByRole("link")             → 2   (첫 href=/blog/rag/first/)
                  다이얼로그 안 getByRole("option")           → 2
                  locator('[role="dialog"]')                  → 2   (숨은 드로어가 함께 잡힌다)
                즉 ARIA children-presentational 규칙이 Chromium/Playwright 의
                option → a 에는 적용되지 않아 링크 역할이 살아 있다. T6 의
                「다이얼로그 안 첫 link 의 href」 검사는 이 구조로 통과한다.
                (`<a>` 자체에 role="option" 을 주는 안은 그 링크 역할을 지운다.)

                tabIndex={-1} 인 이유는 이동 모델을 하나로 묶기 위해서다.
                aria-activedescendant(포커스는 입력 고정)와 Tab 으로 닿는 링크 8개를
                동시에 두면 화살표와 Tab 중 무엇이 맞는지 알 수 없다.

                평범한 좌클릭만 가로채고 수식키·보조 버튼 클릭은 브라우저에 넘긴다 —
                새 탭으로 열기가 살아 있어야 한다.
              */}
              <a
                href={hit.url}
                tabIndex={-1}
                onMouseEnter={() => setSel(index)}
                /* 클릭으로 포커스가 옮겨 갔을 때 선택과 어긋나지 않게 한다. */
                onFocus={() => setSel(index)}
                onClick={(event) => {
                  if (
                    event.defaultPrevented ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  ) {
                    return;
                  }
                  event.preventDefault();
                  go(hit.url);
                }}
                className={cn("block rounded-md px-3 py-2.5", FOCUS_RING)}
              >
                <span className="block break-keep text-card-title text-n9">
                  {hit.meta && hit.meta.title ? hit.meta.title : hit.url}
                </span>
                {/*
                  excerpt 는 pagefind 가 일치부를 <mark> 로 감싸 준 우리 콘텐츠다.
                  다만 원본 코드블록의 평문화 때문에 원시 태그가 섞여 들어온다 —
                  조각 242개 전수 inflate 실측: <td> 9 · <id> 9 · <FINISHED> 7 · <img 3.
                  (<script·onerror=·javascript:·<iframe 은 0건.) 오늘 XSS 는 없지만
                  깨진 렌더는 오늘도 재현되고, 그런 예제를 담은 글 한 편이면 열린다.
                  safeExcerpt 가 <mark> 만 남기고 나머지를 무해화한다.
                */}
                <span
                  className="mt-1 block break-keep text-body text-n6 [&_mark]:bg-signal-soft [&_mark]:font-semibold [&_mark]:text-n9"
                  dangerouslySetInnerHTML={{ __html: safeExcerpt(hit.excerpt) }}
                />
              </a>
            </li>
          ))}
        </ul>

        {showAlt ? (
          <div className="border-t border-n4 p-2">
            {/*
              반드시 <button> 이다. <a> 로 만들면 T6 의 「다이얼로그 안 첫 link 의 href 가
              /blog/ 로 시작」 검사가 이 요소를 먼저 집어 깨진다.
            */}
            <button
              type="button"
              onClick={() => {
                if (alt) setQuery(alt);
                const input = inputRef.current;
                if (input) input.focus();
              }}
              className={cn(
                "block w-full break-keep rounded-md px-3 py-2.5 text-left text-body text-n7 hover:bg-n3",
                FOCUS_RING,
              )}
            >
              <span className="font-semibold text-n9">{alt}</span>
              {euro(alt || "")} 더 넓게 찾기 — {altCount}건
            </button>
          </div>
        ) : null}

        {trimmed.length > 0 && trimmed.length < 2 ? (
          <p className="break-keep px-4 py-6 text-body text-n6">
            두 글자 이상 입력하세요.
          </p>
        ) : null}

        {busy && hits.length === 0 && trimmed.length >= 2 ? (
          <p className="break-keep px-4 py-6 text-body text-n6">검색 중…</p>
        ) : null}

        {showEmpty ? (
          <p className="break-keep px-4 py-6 text-body text-n6">
            결과가 없습니다. 조사를 떼고 낱말만 넣어 보세요.
          </p>
        ) : null}
      </div>
    </div>
  );
}
