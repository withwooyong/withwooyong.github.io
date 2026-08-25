import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { thesisSummaryNarration } from "@/data/portfolio";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const CHARS_PER_TICK = 2;
const TICK_MS = 14;

export function ThesisSummaryDialog() {
  const [open, setOpen] = useState(false);
  const [displayed, setDisplayed] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setDisplayed("");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const full = thesisSummaryNarration;
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setDisplayed(full);
      return;
    }

    setDisplayed("");
    let n = 0;
    timerRef.current = setInterval(() => {
      n = Math.min(n + CHARS_PER_TICK, full.length);
      setDisplayed(full.slice(0, n));
      if (n >= full.length && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, TICK_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [open]);

  const typing = open && displayed.length < thesisSummaryNarration.length;

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden />
        논문 요약
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(85vh,720px)] max-w-2xl gap-3 overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-left">
              <Sparkles className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" aria-hidden />
              논문 요약
            </DialogTitle>
            <DialogDescription className="text-left">
              아래는 학위논문을 바탕으로 한 요약입니다. (연출: 타이핑 효과 — 실시간 AI 호출 없음)
            </DialogDescription>
          </DialogHeader>
          <div
            className="rounded-md border border-n4 bg-n3 px-4 py-3 text-sm leading-relaxed text-foreground"
            aria-live="polite"
            aria-busy={typing}
          >
            <p className="whitespace-pre-wrap font-sans">
              {displayed}
              {typing ? (
                <span className="ml-0.5 inline-block w-2 animate-pulse align-text-bottom text-primary" aria-hidden>
                  ▍
                </span>
              ) : null}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
