# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server at http://localhost:3000
- `npm run build` — produce the static export into `out/` (Next.js `output: "export"` runs at build time, so there is no separate `next export` step; the README's mention of `npm run export` is outdated)
- `npm run start` — serve the production build (rarely needed since this site is statically exported)
- `npm test` — Vitest over `tests/blog/`. Vitest strips types with esbuild rather than checking them, so run `npx tsc --noEmit` as a **separate** step.
- `npm run lint` — `next lint`.

### Pre-publish checks (run these whenever `content/blog/` changes)

| Command | What it checks |
| --- | --- |
| `npm run check-forbidden:verify` | **Run this first.** Proves the forbidden-word scanner actually catches things (15 self-test cases). |
| `npm run check-forbidden` | Scans `content/blog`. Must report **HARD 0** before publishing; exits 1 otherwise. |
| `npm run check-forbidden:built` | Scans the **built output** (`out/blog` plus the matching `_next/data` JSON). Run it after `npm run build`. A clean source does not prove a clean page — the template injects `og:image` and titles too, which is how `Ted_yanadoo.png` sat in 366 places while the source scan kept reporting zero. Exits 2 when `out/blog` is missing rather than reporting a false zero. |
| `npm run dup-scan:verify` → `npm run dup-scan --category <slug>` | Verbatim-duplication scan. Same order: prove, then scan. It needs a target — a bare `npm run dup-scan` exits 1 with 「대상이 없다」. |

Both scanners follow the same rule: **run the self-test before trusting a zero.** A "0 findings" result that was never proven is indistinguishable from a false negative — this actually happened here. The forbidden-word list held only Latin spellings (`FASTCAMPUS`, `teddynote`) and silently missed the Korean ones (「패스트캠퍼스」, 「테디노트」), so a false zero was recorded in CHANGELOG as fact (fixed 2026-08-18).

The canonical forbidden-word list lives in `scripts/check-forbidden.mjs`, **not** in any document. Do not copy it into docs — that split is exactly what caused the failure above.

## Architecture

Single-page Korean-language portfolio (허우용 / Ted) deployed as a static site to GitHub Pages.

- **Framework**: Next.js 14 with the **Pages Router** (`pages/_app.tsx`, `pages/index.tsx`) — not the App Router. Do not introduce `app/` directory conventions.
- **Static export**: `next.config.js` sets `output: "export"`, `trailingSlash: true`, and `images.unoptimized: true`. Anything that requires a Node runtime (API routes, ISR, `next/image` loaders, server actions) will break the build — keep everything client-renderable.
- **Content**: nearly the entire site lives in `pages/index.tsx` (~760 lines). Sections (about / experience / projects / systems / skills / contact) are anchor-linked within that one file rather than split into routes.
- **UI primitives**: shadcn/ui ("new-york" style, neutral base) under `components/ui/` — `badge`, `button`, `card`, `dialog`. Add new shadcn components into the same directory; the project's `components.json` is already configured (`@/components`, `@/lib/utils`, CSS variables on, RSC off).
- **Styling**: Tailwind CSS with a custom `primary` palette in `tailwind.config.js` and Inter as the sans font. Global CSS in `styles/globals.css`. Use the `cn()` helper from `lib/utils.ts` (clsx + tailwind-merge) for conditional class composition.
- **Path alias**: `@/*` resolves to the repo root (see `tsconfig.json`). Prefer `@/components/...`, `@/lib/utils` over relative paths.
- **Static assets**: place files under `public/` (e.g. profile image at `public/images/Ted_yanadoo.png`, favicon at `public/favicon.svg`).

## Deployment

GitHub Actions workflow at `.github/workflows/deploy.yml` runs on every push to `main`: it executes `npm ci && npm run build`, uploads `./out` as a Pages artifact, and deploys via `actions/deploy-pages`. There is no preview environment — `main` is production. Don't push to `main` casually; verify the build locally first.
