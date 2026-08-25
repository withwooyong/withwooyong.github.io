import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useCallback } from "react";

const STORAGE_KEY = "portfolio-theme";

/**
 * 테마 토글 — 상태를 들고 있지 않다.
 *
 * 진실은 <html> 의 dark 클래스 하나뿐이고 그건 _document.tsx 의 THEME_SCRIPT 가
 * 첫 페인트 전에 정한다. 여기서 useState 로 같은 사실을 복제하면 하이드레이션
 * 전까지 두 값이 어긋나고, 그 사이 아이콘이 틀리게 나온다.
 *
 * 그래서 아이콘은 둘 다 렌더하고 어느 쪽을 보일지는 CSS 가 정한다.
 * CSS 는 하이드레이션을 기다리지 않으므로 첫 프레임부터 맞다.
 */
export function ThemeToggle() {
  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 사생활 보호 모드 등에서 막힌다. 이번 세션에만 적용하고 저장은 포기한다.
    }
  }, []);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="shrink-0 border-slate-200 dark:border-slate-600"
      onClick={toggle}
    >
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
      <span className="sr-only dark:hidden">다크 모드로 전환</span>
      <span className="sr-only hidden dark:inline">라이트 모드로 전환</span>
    </Button>
  );
}
