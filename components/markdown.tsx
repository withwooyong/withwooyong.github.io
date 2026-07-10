import { Mermaid } from "@/components/mermaid";
import Link from "next/link";
import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

/** ```lang 코드블록에서 언어와 소스를 뽑는다. react-markdown v9는 inline prop을 주지 않는다. */
function readCodeBlock(children: ReactNode): { lang: string | null; code: string } | null {
  const only = Children.toArray(children)[0];
  if (!isValidElement(only)) return null;

  const props = only.props as { className?: string; children?: ReactNode };
  const lang = /language-([\w-]+)/.exec(props.className ?? "")?.[1] ?? null;
  return { lang, code: String(props.children ?? "").replace(/\n$/, "") };
}

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug]}
      components={{
        h2: ({ children, ...props }) => (
          <h2
            {...props}
            className="scroll-mt-20 mt-12 mb-4 border-b border-slate-200 pb-2 text-xl font-bold break-keep sm:mt-14 sm:text-2xl dark:border-slate-800"
          >
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 {...props} className="scroll-mt-20 mt-8 mb-3 text-base font-bold break-keep sm:mt-9 sm:text-lg">
            {children}
          </h3>
        ),
        h4: ({ children, ...props }) => (
          <h4 {...props} className="scroll-mt-24 mt-6 mb-2 font-semibold break-keep">
            {children}
          </h4>
        ),
        p: ({ children }) => <p className="my-4 leading-relaxed break-keep text-slate-700 dark:text-slate-300">{children}</p>,
        ul: ({ children }) => <ul className="my-4 list-disc space-y-1.5 pl-5 text-slate-700 dark:text-slate-300">{children}</ul>,
        ol: ({ children }) => <ol className="my-4 list-decimal space-y-1.5 pl-5 text-slate-700 dark:text-slate-300">{children}</ol>,
        li: ({ children }) => <li className="break-keep leading-relaxed">{children}</li>,

        blockquote: ({ children }) => (
          <blockquote className="my-5 rounded-r-lg border-l-4 border-blue-500 bg-blue-50/60 py-1 pl-4 pr-3 sm:pl-5 sm:pr-4 dark:bg-blue-950/25 [&>p]:text-slate-700 dark:[&>p]:text-slate-300">
            {children}
          </blockquote>
        ),

        a: ({ href, children }) => {
          if (!href) return <>{children}</>;
          const external = /^https?:\/\//.test(href);
          if (external) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
              >
                {children}
              </a>
            );
          }
          return (
            <Link href={href} className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400">
              {children}
            </Link>
          );
        },

        // 좁은 화면에서 표를 억지로 욱여넣으면 셀이 세로로 길어져 읽기 어렵다. 스크롤에 맡긴다.
        table: ({ children }) => (
          <div className="my-6 -mx-3 overflow-x-auto rounded-lg border border-slate-200 sm:mx-0 dark:border-slate-800">
            <table className="w-full min-w-[34rem] text-[13px] sm:text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-slate-50 dark:bg-slate-900">{children}</thead>,
        th: ({ children }) => (
          <th className="border-b border-slate-200 px-2.5 py-2.5 text-left font-semibold break-keep sm:px-3 dark:border-slate-700">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-slate-100 px-2.5 py-2.5 align-top break-keep text-slate-700 sm:px-3 dark:border-slate-800 dark:text-slate-300">
            {children}
          </td>
        ),

        hr: () => <hr className="my-10 border-slate-200 dark:border-slate-800" />,

        // 코드블록. mermaid면 도식으로, 아니면 스크롤되는 pre로.
        pre: ({ children }) => {
          const block = readCodeBlock(children);
          if (!block) return <pre>{children}</pre>;
          if (block.lang === "mermaid") return <Mermaid chart={block.code} />;

          return (
            <div className="my-5 -mx-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 sm:mx-0 dark:border-slate-800 dark:bg-slate-900">
              <pre className="p-3 text-[11px] leading-relaxed sm:p-4 sm:text-xs">
                <code className="text-slate-800 dark:text-slate-200">{block.code}</code>
              </pre>
            </div>
          );
        },

        // 인라인 코드만 여기로 온다 (블록은 pre가 가로챈다).
        code: ({ children, className }) => {
          if (className?.includes("language-")) return <code className={className}>{children}</code>;
          return (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.85em] font-medium text-rose-600 dark:bg-slate-800 dark:text-rose-400">
              {children}
            </code>
          );
        },

        strong: ({ children }) => <strong className="font-bold text-slate-900 dark:text-slate-100">{children}</strong>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
