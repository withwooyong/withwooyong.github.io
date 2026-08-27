import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n0";

/**
 * 헤더의 검색 진입점.
 *
 * ⚠️ 플랫폼 판별을 초기 state 에서 하면 안 된다. 서버 산출물에는 navigator 가 없어
 *    첫 클라이언트 렌더가 서버 HTML 과 달라지고 하이드레이션 불일치가 난다.
 *    그래서 useEffect 로 미룬다 — 첫 렌더는 서버와 같은 「Ctrl K」이고, 마운트 뒤에만 바뀐다.
 *
 * 이 판별은 **라벨을 그리는 데에만** 쓴다. 실제 단축키 판별은 CommandPalette 가
 * metaKey || ctrlKey 로 한다(설계서 §8.4) — 판별이 틀려도 단축키는 동작해야 하기 때문이다.
 */
export function SearchButton({ onOpen }: { onOpen: () => void }) {
  const [isApple, setIsApple] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    setIsApple(/Mac|iPhone|iPad|iPod/i.test(ua));
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="검색 열기"
      className={cn(
        "flex items-center gap-2 rounded-sm px-2 py-1.5 text-n6 transition-interactive hover:text-n9",
        FOCUS_RING,
      )}
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="hidden text-label sm:inline">검색</span>
      <kbd
        aria-hidden="true"
        className="hidden rounded border border-n4 bg-n3 px-1.5 py-0.5 text-label text-n6 md:inline-block"
      >
        {isApple ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
