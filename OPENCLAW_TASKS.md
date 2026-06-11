# OPENCLAW_TASKS.md

## Project
Griddle (Structured JSON Editor)

## Branch / remote
- Branch: `stabilization-pass-1`
- Push target: `fork/stabilization-pass-1`
- Do not treat upstream `origin/master` as the working branch for new changes.

## Validation loop
- `npm run lint`
- `npm test`
- `npm run build`

## Execute next
- [x] Validate the current working tree on `stabilization-pass-1` and commit/push if green. Scope: inspect the current uncommitted validation-summary changes, run `npm run lint`, `npm test`, and `npm run build`, commit only if the tree is coherent and validation passes, then push to `fork/stabilization-pass-1` and update this task with evidence. Acceptance: either (a) committed + pushed with validation evidence, or (b) task updated with the exact blocker preventing commit.
  - Evidence: validation-summary slice is coherent on `stabilization-pass-1`: it adds a top-chrome validation badge + summary drawer, keeps navigation honest by only advertising Entry when a concrete visible-cell selection exists, and falls back to Full Records / non-navigation copy otherwise; supporting docs and repo-local `openclaw.md` were added alongside the UI files.
  - Validation: `npm run lint` ✅ (existing `src/App.tsx` hook-dependency warnings only at lines 406/422/455); `npm test` ✅ (24 tests); `npm run build` ✅ (existing Vite/Rollup chunk-size and `/*#__PURE__*/` upstream dependency warnings only).
  - Git: committed as `f9e1f26` (`Add validation summary surface`) and pushed to `fork/stabilization-pass-1`.
- [x] Collect the current validation-UX prep work into a concise implementation checkpoint in repo docs: what pure helpers now exist, what problem they solve, and what the first real UI-facing validation task should be. Acceptance: a new developer can read one short doc section and understand the completed domain groundwork plus the next UI-facing task.
- [x] Design the first bounded UI-facing validation task using the existing domain helpers, without overcommitting to a full panel rewrite. Acceptance: the task is concrete enough to implement next and names the exact files, validation loop, and success criteria.
- [x] Implement a small validation-summary affordance that exposes the existing validation-targeting helpers without a full panel rewrite. Scope: add a lightweight validation entry point in `src/components/TopChrome.tsx`, wire grouped issue + summary derivation in `src/App.tsx`, and render a focused `src/components/ValidationSummaryPanel.tsx` (or equivalently named small surface) that lists grouped sections and issue rows from `src/domain/validationTargeting.ts`. Navigation must reuse the existing targeting classifications (`classifyValidationIssueTarget` / `classifyValidationSummaryNavigationTarget`), open Entry only when the caller can already prove a unique visible cell target, fall back to Full Records when a record is known but Entry would be brittle, and show honest non-navigation copy for dataset-only/unresolved issues instead of faking a jump target. Validation: `npm run lint`, `npm test`, `npm run build`. Acceptance: a developer can launch the app, open the temporary validation summary surface, see deterministic grouped issue sections derived from the helper outputs, and trigger the conservative navigation behavior without changing filters/views behind the user's back. Evidence: added `ValidationSummaryPanel`, wired grouped helper-derived issues in `App.tsx`, and ran `npm run lint` (existing hook warnings only), `npm test`, and `npm run build` successfully.
- [x] Review `src/App.tsx` and the panel/selection transition helpers to identify the next small stabilization slice after the recent cleanup work. Acceptance: produce one concrete implementation task that is smaller than a broad “refactor App.tsx” request and tied to an observable interaction issue. Evidence: the current validation-summary "Open Entry" path can advertise entry navigation based on `gridSelection`, but `onNavigateIssue` / `onNavigateSection` only succeeds when `selected` already matches the same record, so the UI can surface a dead button instead of opening anything.
- [x] Fix validation-summary entry navigation so it never presents a dead "Open Entry" action. Scope: wire the summary navigation state and click handlers around the same actionable selection source, either by deriving/opening the targeted visible cell directly or by honestly degrading to Full Records / non-navigation when Entry cannot actually open. Touch the current validation-summary flow in `src/App.tsx` plus the smallest necessary workspace-selection helper(s); do not broaden this into a general App.tsx refactor. Acceptance: whenever the validation summary renders an "Open Entry" button, clicking it opens Entry for the intended issue/section instead of silently doing nothing; otherwise the UI shows an honest fallback label/action. Validation: `npm run lint`, `npm test`, `npm run build`. Done: summary navigation now derives a concrete visible-cell `SelectedCell` before advertising/triggering Entry, and validated with `npm run lint` (existing App.tsx hook warnings only), `npm test`, and `npm run build`.

## Blocked
- Waiting on Matt for top 3 current pain points can remain as a separate future input, but it should not block bounded local stabilization work.
- Deferred non-local follow-up: review the current `stabilization-pass-1` working tree and post a concise code-review summary to Discord `#automation-log` once channel-posting capability is available in the active runtime. Keep the scope evidence-based: inspect uncommitted Griddle changes, call out correctness/regression risks, note missing validation or follow-up checks, and say explicitly if the diff looks safe/no-issue.

## Context files
- Workspace summary: `/home/montblanc/.openclaw/workspace/Projects/griddle/project.md`
- Agent context: `/home/montblanc/.openclaw/workspace/Projects/griddle/context.md`
