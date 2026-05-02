import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";

type SystemDiagramCardProps = {
  title: string;
  description: string;
  imageSrc: string;
  alt: string;
  caption: string;
  Icon: LucideIcon;
  iconClassName: string;
};

export function SystemDiagramCard({ title, description, imageSrc, alt, caption, Icon, iconClassName }: SystemDiagramCardProps) {
  return (
    <Card className="dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Icon className={`h-5 w-5 shrink-0 ${iconClassName}`} aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="aspect-video w-full rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
              aria-label={`${title} 구성도 크게 보기`}
            >
              <Image src={imageSrc} alt={alt} width={400} height={300} className="w-full h-full object-cover" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] p-4 overflow-auto">
            <DialogTitle className="sr-only">{title} 구성도 확대 보기</DialogTitle>
            <DialogDescription className="sr-only">닫기 버튼으로 돌아갈 수 있습니다.</DialogDescription>
            <Image src={imageSrc} alt={alt} width={1200} height={900} className="w-full h-auto object-contain mx-auto" />
          </DialogContent>
        </Dialog>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-4">{caption}</p>
      </CardContent>
    </Card>
  );
}
