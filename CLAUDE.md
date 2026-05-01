# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server at http://localhost:3000
- `npm run build` — produce the static export into `out/` (Next.js `output: "export"` runs at build time, so there is no separate `next export` step; the README's mention of `npm run export` is outdated)
- `npm run start` — serve the production build (rarely needed since this site is statically exported)

There are no test or lint scripts wired up. ESLint and `eslint-config-next` are installed but only invoked implicitly by `next build`.

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
