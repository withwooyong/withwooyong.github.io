import { FlowDiagram } from "@/components/flow-diagram";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { flowSpecs } from "@/data/diagrams";
import type { DiagramItem } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function SystemDiagramCard({ item }: { item: DiagramItem }) {
  const spec = flowSpecs[item.specId];
  const [tab, setTab] = useState<"flow" | "original">("flow");

  if (!spec) return null;

  return (
    <Card className="dark:border-slate-700">
      <CardHeader className="flex flex-col items-start gap-4 space-y-0 sm:flex-row sm:justify-between">
        <div>
          <CardTitle className="text-slate-900 dark:text-slate-100">{item.title}</CardTitle>
          <CardDescription className="mt-1">{item.summary}</CardDescription>
        </div>
        <Badge variant="secondary" className="shrink-0">
          {item.role}
        </Badge>
      </CardHeader>
      <CardContent>
        <FlowDiagram spec={spec} />

        <div className="mt-4 flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setTab("flow")}>
                <Maximize2 className="mr-1.5 h-4 w-4" aria-hidden />
                크게 보기
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto p-4">
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription className="sr-only">
                닫기 버튼으로 돌아갈 수 있습니다.
              </DialogDescription>

              {item.originalSrc ? (
                <div
                  role="tablist"
                  aria-label="자료 종류"
                  className="mt-2 inline-flex rounded-md border border-slate-200 p-0.5 dark:border-slate-700"
                >
                  <TabButton active={tab === "flow"} onClick={() => setTab("flow")}>
                    흐름도
                  </TabButton>
                  <TabButton active={tab === "original"} onClick={() => setTab("original")}>
                    원본 자료
                  </TabButton>
                </div>
              ) : null}

              <div className="mt-4">
                {tab === "flow" || !item.originalSrc ? (
                  <FlowDiagram spec={spec} />
                ) : (
                  <Image
                    src={item.originalSrc}
                    alt={item.originalAlt ?? `${item.title} 원본 자료`}
                    width={1600}
                    height={1200}
                    className="mx-auto h-auto w-full rounded-md bg-white object-contain"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
      )}
    >
      {children}
    </button>
  );
}
