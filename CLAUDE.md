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

## Gates

Publishing rules live in checkers, not in prose. As of 2026-08-18 a full triage of the 105 accumulated
rules (`docs/superpowers/reports/2026-08-18-rule-triage.md`) split them four ways:

| Where a rule lives | What belongs there |
| --- | --- |
| Checkers (`scripts/`, `tests/blog/`) | Anything a machine can decide — schema, forbidden words, links, size, build output |
| `docs/superpowers/PUBLISHING-CHECKLIST.md` | Human judgement only — attribution, exhaustive assignment, deletion fallout, anonymisation, diagram evidence, link promises, tone |
| This file | How tools fail in this environment, and the code constraints the build does *not* enforce |
| Design docs `§11` (struck through) | Rules that expired with their batch. Kept, not deleted — other documents cite them by number |

**Do not copy a checker's criteria into a document.** That split is what produced the false-zero above.
Conversely, do not put a batch-scoped instruction ("not in scope this time", "only §4 of that file")
into a permanent rule list — a permanent rule has to be true in *every* batch. 14 of the 105 rules failed
that test and were struck through.

⚠️ **The `pre-commit` hook is not installed yet** (`.githooks/` does not exist and `core.hooksPath` is
unset). Until it lands, run the pre-publish checks above by hand whenever `content/blog/` changes.
Once it exists, `npm install` will wire it up via `prepare`; to do it manually,
`git config core.hooksPath .githooks`.

### Constraints the build does *not* catch

The build is not a substitute for these. Each one compiles and ships happily when violated:

- **No App Router.** `app/` conventions are not rejected by Next.js — they just break this project's assumptions.
- **Path alias.** Relative imports pass the build; use `@/lib/...`, `@/components/...`.
- **`tsconfig.json` is frozen.** Changing `target` re-emits the whole project and silently breaks the
  "existing pages unchanged" guarantee. Fix type errors at the call site instead.
- **`break-keep` on Korean body text**, and `dark:` variants on every new component.
- **Commit messages in Korean; never `git push` unless the user explicitly asks.**

## Tool traps in this environment

These are not rules about content — they are ways the tooling reports something false. Each one was hit
for real in this repo.

| Trap | What actually happens | What to do |
| --- | --- | --- |
| **Exit code after a pipe** | `$?` belongs to the *last* command, so `grep … \| sort \| uniq -c` is always 0 | Run any command whose exit code you intend to read **on its own** |
| **Korean first person** | grep fails in both directions: 「동시성 문**제가**」 and 「메이**저는**」 are false positives, 「**내** 검색 커리어」 is a false negative. Widening to `내 [가-힣]{2,6}` floods on 「인덱스 **내** 문서」 | Open the matching lines and read them. **Do not put first person in a checker** |
| **Markdown emphasis splits words** | `**IDOL**을` does not match `IDOL을`. Korean particles attach directly, so this happens structurally (English has a space, so it doesn't) | Also search a pattern with the emphasis stripped |
| **Locale hides Korean and emoji** | Without `LC_ALL=C`, emoji greps return a false 0. `LC_ALL=C grep -P '[\x{1F300}-\x{1FAFF}]'` then dies with "range out of order" — and no output looks like no findings | Pin `LC_ALL=C`; match emoji as UTF-8 byte patterns. Never append `\|\| echo "0건"` — that makes "file missing" and "zero found" the same string |
| **Substring hits inside words** | `grep -o '비용'` also counts 「대**비용**(對比用)」 | Open the hit lines and confirm the word is the word you meant |
| **Verbatim dup-scan has a blind spot** | `dup-scan.mjs` cannot see "same meaning, different words" | Check definitions by meaning as well, not only by string |
| **Heredoc eats one backslash layer** | Even quoted `<<'EOF'`, a regex's `\\` arrives as `\` and throws `SyntaxError`. Single escapes survive; only doubles are stripped. Shell quoting inside a heredoc can break the heredoc itself | Write those files with the `Write`/`Edit` tool, or build the character via `String.fromCharCode(92)` |
| **grep cannot detect CRLF** | It treats CR as a line end, so a file with 393 CRs was reported "LF only" | Count bytes with `tr -cd` |
| **`core.autocrlf=true` hides line-ending changes** | git normalises before diffing, so a wholly rewritten file shows a clean diff. This repo genuinely mixes CRLF and LF | A clean diff is not evidence nothing changed. Count CR/LF directly against a control file |
| **Subagents go idle without reporting** | `reviewer` and `scout` have no `Write` tool; `scout` and `verifier` have gone idle across three notifications with nothing delivered | Judge by the file, not the message: `ls -la <scratchpad>` on every idle notification, then pull the report with `SendMessage`. Re-send the **original question** verbatim — "as I asked before" loses the awkward items first |
| **`grep -r` scans `out/` and `node_modules`** | 120-second timeout | Use the `Grep` tool, or `--include` / an explicit path |

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
