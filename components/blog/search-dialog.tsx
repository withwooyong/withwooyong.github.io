import { Dialog, DialogContent } from "@/components/ui/dialog";
import { search, type SearchHit, type SearchIndex } from "@/lib/blog/search";
import type { BlogTree } from "@/lib/blog/types";
import { cn } from "@/lib/utils";
import { Hash, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const INDEX_URL = "/blog/search-index.json";

type LoadState = "idle" | "loading" | "ready" | "failed";

/** 편과 헤딩을 한 줄씩 편 목록으로 편다. ↑↓ 이동이 이 배열의 인덱스를 움직인다 */
type Row = { href: string; label: string; kind: "post" | "heading" };

function toRows(hits: SearchHit[]): Row[] {
  const rows: Row[] = [];
  for (const hit of hits) {
    const base = `/blog/${hit.post.c}/${hit.post.s}/`;
    rows.push({ href: base, label: hit.post.t, kind: "post" });
    for (const heading of hit.headings) {
      rows.push({ href: `${base}#${heading.id}`, label: heading.text, kind: "heading" });
    }
  }
  return rows;
}

export function SearchDialog({ tree }: { tree: BlogTree }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<LoadState>("idle");
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 인덱스는 첫 Cmd+K 에만 가져온다. gzip 96 KB 라 첫 화면에 얹을 이유가 없다.
  const load = useCallback(() => {
    if (state !== "idle") return;
    setState("loading");
    fetch(INDEX_URL)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: SearchIndex) => {
        setIndex(json);
        setState("ready");
      })
      .catch(() => setState("failed"));
  }, [state]);

  const show = useCallback(() => {
    load();
    setOpen(true);
  }, [load]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const meta = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      // "/" 는 입력 중이 아닐 때만. 검색창 안에서 눌렀는데 다시 열리면 글자를 못 친다.
      const target = event.target as HTMLElement | null;
      const typing = !!target && /^(INPUT|TEXTAREA)$/.test(target.tagName);
      if (meta || (event.key === "/" && !typing)) {
        event.preventDefault();
        show();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  const hits = useMemo(() => (index ? search(index, query) : []), [index, query]);
  const rows = useMemo(() => toRows(hits), [hits]);

  useEffect(() => setCursor(0), [query]);

  function onInputKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (rows.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => (c + 1) % rows.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => (c - 1 + rows.length) % rows.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = rows[cursor];
      if (!target) return;
      setOpen(false);
      void router.push(target.href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-600 dark:hover:text-blue-400"
        aria-label="검색 열기"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">검색</span>
        <kbd className="hidden rounded border border-slate-200 px-1 text-xs sm:inline dark:border-slate-700">
          Cmd K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-24 max-w-xl translate-y-0 gap-0 p-0">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <Search className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="제목 · 태그 · 목차에서 찾기 (2자 이상)"
              aria-label="검색어"
              role="combobox"
              aria-expanded={rows.length > 0}
              aria-controls="search-dialog-listbox"
              aria-activedescendant={rows[cursor] ? `search-dialog-option-${cursor}` : undefined}
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {state === "failed" ? (
              <Fallback tree={tree} message="검색을 불러오지 못했습니다. 카테고리로 찾아보세요." />
            ) : state === "loading" ? (
              <p className="px-2 py-6 text-center text-sm break-keep text-slate-500 dark:text-slate-400">불러오는 중…</p>
            ) : rows.length > 0 ? (
              <ul id="search-dialog-listbox" role="listbox">
                {rows.map((row, i) => (
                  <li key={row.href} id={`search-dialog-option-${i}`} role="option" aria-selected={i === cursor}>
                    <a
                      href={row.href}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setCursor(i)}
                      className={cn(
                        "flex items-start gap-2 rounded-md px-2 py-2 text-sm leading-snug break-keep",
                        row.kind === "heading" ? "pl-7 text-slate-500 dark:text-slate-400" : "font-medium",
                        i === cursor ? "bg-blue-50 dark:bg-blue-950/50" : ""
                      )}
                    >
                      {row.kind === "heading" ? (
                        <Hash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                      ) : null}
                      <span className="min-w-0">{row.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : query.trim().length > 0 ? (
              <Fallback tree={tree} message={`「${query}」에 맞는 글이 없습니다.`} />
            ) : (
              <p className="px-2 py-6 text-center text-sm break-keep text-slate-500 dark:text-slate-400">
                제목 · 태그 · 목차를 찾습니다. ↑↓ 로 옮기고 Enter 로 엽니다.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * 빈 화면을 두지 않는다.
 *
 * 인덱스를 못 가져왔을 때(`npm run dev` 에는 인덱스가 없다)와 결과가 0건일 때 모두
 * 카테고리 목록을 그 자리에 보여 준다. 사이드바 트리가 이미 이 데이터를 들고 있으므로
 * 새로 가져올 것이 없다.
 */
function Fallback({ tree, message }: { tree: BlogTree; message: string }) {
  return (
    <div className="px-2 py-4">
      <p className="mb-3 text-sm break-keep text-slate-500 dark:text-slate-400">{message}</p>
      <ul className="space-y-1">
        {tree.categories.map((c) => (
          <li key={c.slug}>
            <a
              href={`/blog/${c.slug}/`}
              className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-sm break-keep hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="min-w-0">{c.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-slate-400 dark:text-slate-500">{c.count}</span>
            </a>
          </li>
        ))}
        <li>
          <Link href="/blog/tags/" className="block rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
            태그 전체
          </Link>
        </li>
      </ul>
    </div>
  );
}
