# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the dev server at http://localhost:3000
- `npm run build` — produce the static export into `out/` (Next.js `output: "export"` runs at build time, so there is no separate `next export` step; the README's mention of `npm run export` is outdated)
- `npm run start` — serve the production build (rarely needed since this site is statically exported)
- `npm test` — Vitest. The scope is `vitest.config.ts`'s `include` (`tests/**/*.test.ts`), not just `tests/blog/`. Vitest strips types with esbuild rather than checking them, so run `npx tsc --noEmit` as a **separate** step.
- `npm run lint` — `next lint`.
- `npm run e2e` — Playwright over `e2e/`. It serves the **built** `out/`, not a dev server, so run `npm run build` first; `e2e/global-setup.ts` refuses to start (exit 1) when `out/` is older than the sources rather than testing yesterday's artifact. **That refusal exits 1 without running a single test, which looks exactly like a real failure** — read the first line, not `$?`. Note `scripts/` counts as a source, so adding any script invalidates `out/`. Right now it is **expected to fail with 2** — the shell is attached to no page, so the `/atlas/` sentinels (desktop·mobile) are red on purpose and 16 gated tests are skipped. It joins CI in the prior plan's T14, not before.
- `npm run check-pagefind` / `:verify` — proves the Pagefind index is non-empty. `npm run build` now ends with `npx pagefind --site out`, and pagefind **exits 0 even when it indexes nothing**. Runs in CI right after the build.
- `npm run probe-search` / `:verify` — fires 13 Korean queries at the real index through Playwright (the gate from the design doc §8.5). Needs a fresh `out/`. Not in CI; run it when search behaviour might have changed.

### Pre-publish checks (run these whenever `content/blog/` changes)

| Command | What it checks |
| --- | --- |
| `npm run check-forbidden:verify` | **Run this first.** Proves the forbidden-word scanner actually catches things. It prints how many cases ran — the count lives in the code, not here, so it can't go stale. |
| `npm run check-forbidden` | Scans `content/blog`. Must report **HARD 0** before publishing; exits 1 otherwise. |
| `npm run check-forbidden:built` | Scans the **built output** (`out/blog` plus the matching `_next/data` JSON). Run it after `npm run build`. A clean source does not prove a clean page — the template injects `og:image` and titles too, which is how `Ted_yanadoo.png` sat in 366 places while the source scan kept reporting zero. Exits 2 when `out/blog` is missing rather than reporting a false zero. |
| `npm run dup-scan:verify` → `npm run dup-scan -- --category <slug>` | Verbatim-duplication scan. Same order: prove, then scan. It needs a target — a bare `npm run dup-scan` exits 1 with 「대상이 없다」. Passing a whole batch at once is safe as of 2026-08-18: each target is compared against **everything but itself**, targets included. Before that fix the scanner removed *all* targets from the comparison set, so handing it a fresh batch — the case that needs it most — returned a silent 0. Self-test cases ⑤ and ⑥ now hold that behaviour down. |

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

The `pre-commit` hook at `.githooks/pre-commit` runs the source checks whenever a commit touches
`content/blog/`; commits that don't touch it pass straight through. `npm install` wires the hook up
via the `prepare` script — to do it by hand, `git config core.hooksPath .githooks`. Checks that need
a build run in CI instead.

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
| **Korean sentence endings never sit at line end** | 「…있습니다.」 ends with a period, so `습니다$` matches **nothing** and reports a structural 0. A brief that says 「~로 끝나는 줄」 makes the agent write exactly that pattern | Count the ending as a **substring**, not an anchored match. Count occurrences, not lines — one line can hold two. Then sanity-check against a section with a known non-zero count |
| **Markdown emphasis splits words** | `**IDOL**을` does not match `IDOL을`. Korean particles attach directly, so this happens structurally (English has a space, so it doesn't) | Also search a pattern with the emphasis stripped |
| **Locale hides Korean and emoji** | Without `LC_ALL=C`, emoji greps return a false 0. `LC_ALL=C grep -P '[\x{1F300}-\x{1FAFF}]'` then dies with "range out of order" — and no output looks like no findings | Pin `LC_ALL=C`; match emoji as UTF-8 byte patterns. Never append `\|\| echo "0건"` — that makes "file missing" and "zero found" the same string |
| **Substring hits inside words** | `grep -o '비용'` also counts 「대**비용**(對比用)」 | Open the hit lines and confirm the word is the word you meant |
| **Verbatim dup-scan has a blind spot** | `dup-scan.mjs` cannot see "same meaning, different words" | Check definitions by meaning as well, not only by string |
| **Heredoc eats one backslash layer** | Even quoted `<<'EOF'`, a regex's `\\` arrives as `\` and throws `SyntaxError`. Single escapes survive; only doubles are stripped. Shell quoting inside a heredoc can break the heredoc itself | Write those files with the `Write`/`Edit` tool, or build the character via `String.fromCharCode(92)` |
| **grep cannot detect CRLF** | It treats CR as a line end, so a file with 393 CRs was reported "LF only" | Count bytes with `tr -cd` |
| **`core.autocrlf=true` hides line-ending changes** | git normalises before diffing, so a wholly rewritten file shows a clean diff. This repo genuinely mixes CRLF and LF | A clean diff is not evidence nothing changed. Count CR/LF directly against a control file |
| **Subagents go idle without reporting** | `reviewer` and `scout` have no `Write` tool; `scout` and `verifier` have gone idle across three notifications with nothing delivered | Judge by the file, not the message: `ls -la <scratchpad>` on every idle notification, then pull the report with `SendMessage`. Re-send the **original question** verbatim — "as I asked before" loses the awkward items first |
| **`grep -r` scans `out/` and `node_modules`** | 120-second timeout | Use the `Grep` tool, or `--include` / an explicit path |
| **Tailwind scans comments too** | The class extractor is a regex over raw file text — it does not parse comments out. A Tailwind arbitrary-value class written *inside a code comment* is emitted as real CSS. An example `bg-[url('./${logo}')]` left in a comment produced a rule PostCSS then tried to resolve, and the build died with `Cannot find module './${logo}'` — an error naming a file nobody imported | Never put bracket-arbitrary-value classes in comments. Write the example in prose, or name the field instead of showing the class. Hit for real in T1 of the site renewal |
| **`sed -i` in Git Bash strips every CR** | It rewrites the file with LF endings. On a CRLF file that silently destroys all 531 CRs — and because `core.autocrlf=true` normalises before diffing, `git diff` still shows a clean one-line change. The corruption is invisible to every git-based check. Hit for real in T4 of the site renewal | Do not use `sed -i` on a CRLF file. Use the `Edit` tool (partial replacement preserves the surrounding CRs) or read/write via Node — **not `Write`, see the next row**. Verify with a byte count (`tr -cd '\r' \| wc -c`), never with `git diff` or `cat -A` — MSYS's `sed \| cat -A` strips the CR too, so it reports LF-only either way |
| **Tailwind variant classes carry a literal backslash in the built CSS** | A variant class is emitted as `.focus-visible\:ring-signal{…}` — the `\` is part of the selector text, not an escape. Grepping it with a mis-escaped pattern returns **0 and exit 1**, which reads exactly like "Tailwind never emitted the class." Measured: `grep -c 'focus-visible\\:ring-signal'` → 0, while `grep -cF 'focus-visible\:ring-signal'` → 1 on the same file. Hit for real when a task brief handed the implementer the double-backslash form | Grep built CSS selectors with `-F` and a single backslash. Never conclude "the class was not emitted" from a zero you did not prove — search a class you *know* exists as a control first |
| **The `Write` tool drops CRLF on a full-file replace** | It writes the string it is given verbatim, and there is no practical way to put CR characters into that string — so every full-file write lands as LF. Measured on a 3-line CRLF probe: after `Edit`, CR 3 / LF 3; after `Write`, CR **0** / LF 3. This is worse than it sounds because the row above used to name `Write` as the safe alternative to `sed -i` — half the recommended remedy carried the same defect. Hit for real on `components/theme-toggle.tsx` (52 CRs → 0) during the T6 fix round | Check the file's endings first (`tr -cd '\r' \| wc -c`). On an LF file `Write` is fine. On a CRLF file use `Edit`, or write via Node when the whole file must change. Always count CRs afterwards — `git diff` cannot show you this |
| **`next/head` re-inserts head tags at hydration, so DOM assertions cannot see a missing one** | Deleting `<link rel="canonical">` outright from `out/blog/index.html` left the E2E check **green** — Next's head manager put it back on hydration, and the locator only ever saw the restored DOM. The tag was genuinely absent from the shipped bytes, which is what Slack/KakaoTalk unfurls and most crawlers read. Same shape as the `check-forbidden:built` story: clean source ≠ clean artifact, and here clean *DOM* ≠ clean artifact. Hit for real in T8 | Assert against the **raw response** (`page.request.get(path)` + regex over the text), not only the DOM. Check the DOM too — but as a second, separate measurement. `e2e/raw-html.ts` holds the helpers |
| **React discards hand-injected markup inside `#__next` during hydration** | Injecting a probe `<div>` into `out/index.html` under `#__next` to test a selector produced **zero matches** — hydration reconciled the tree and dropped it. The experiment reads as "the check is broken" when the check was fine. Hit for real in T8 while proving the E2E shell gate | Mutate outside React's territory: an attribute on `<body>`, or a `<head>` node. Re-running the same probe on `<body data-site-shell>` flipped the gate exactly as designed |
| **Playwright's exit code lies in both directions** | `-g` with a pattern that matches nothing exits **1** with `No tests found` — indistinguishable from a real failure at a glance (hit for real: `-g "다크 기본"` when no title contained that phrase). In the other direction, `retries: 1` makes a test that passes on the second try count as `flaky` and the run exits **0** (measured: same spec, `CI` unset → exit 1, `CI=true` → `1 flaky`, exit 0). Separately, the `list` reporter never prints a `test.skip` reason, so a gated suite looks like unexplained silence | Read the summary line, not just `$?`. Keep `retries: 0` — `playwright.config.ts` says why. Put the gate state in the `describe` title so skips explain themselves in the console |
| **`npm ci --dry-run` deletes `node_modules` anyway** | It is not a simulation. npm removes the tree *before* it decides to stop, so a "dry run" leaves the repo with **0** installed packages (measured: 590 → 0). Every tool that runs afterwards fails with a message about the tool, not about npm — a parallel agent reading `npm test` at that moment got `'vitest' is not recognized` and reported it as "vitest is not installed". Hit for real while trying to prove a Linux-only dependency would install in CI | Never use `npm ci --dry-run` to inspect what *would* install. Read `package-lock.json` instead (`os`/`cpu`/`optional` fields carry the platform matrix). If you already ran it, `npm ci` restores the tree — check with `ls node_modules \| wc -l` before trusting any later failure |
| **Pagefind fragments are gzip, so grepping `out/` is structurally blind** | `npx pagefind --site out` writes 242 `.pf_fragment` blobs that begin `\037\213\b`. `grep -a` over them returns 0 for a string that is provably inside — the control (`url`) also returns 0, so the zero means "cannot read", not "not present". `check-forbidden:built` scans `out/blog` and therefore never sees these files at all: the shipped bytes now include a body-text copy that no checker reads. Verified once by hand (all 242 inflated to 3,992,070 bytes, then scanned — **no leak today**) | Inflate before scanning: `for f in out/pagefind/fragment/*.pf_fragment; do gzip -dc "$f"; done > /tmp/frag.txt`. Always grep a control string you know is there first — a zero on compressed input is not evidence |

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
