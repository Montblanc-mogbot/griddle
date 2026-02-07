# Multi-cell selection grid spike (Milestone 6c)

## Goal
Compare selection UX and spreadsheet-feel for:
- **Glide Data Grid**
- **MUI X DataGrid (community)**

Under current project stack (React 19 + Vite).

## How to test
In the app toolbar, use **Spike view** selector:
- `Glide`
- `MUI DataGrid`

Open DevTools console to see selection logging.

## Glide Data Grid
### What works
- Designed for cell-based interaction.
- Provides a selection model via `onGridSelectionChange`.
- Virtualized and generally feels spreadsheet-like.

### Notes / caveats
- Package peer deps may lag React 19; installed with `--legacy-peer-deps`.
- Needed additional dependencies to build cleanly under Vite:
  - `lodash`
  - `marked`
  - `react-responsive-carousel`
- Multi-level column headers are not a native concept; we flatten labels ("a / b") in the spike.

### Things to verify
- Drag range selection behavior.
- Ctrl/Cmd multi-range selection behavior.

## MUI X DataGrid (community)
### What it is good at
- Strong general-purpose data grid (sorting, paging, column sizing).
- Row selection UX (checkbox selection) is solid.

### Likely limitation
- Community edition is not a spreadsheet engine. Expect:
  - row selection
  - cell focus
  - but not full spreadsheet-like multi-cell/range selection.

### Things to verify
- Whether any true multi-cell/range selection exists in the community tier.

## Recommendation (pending test)
- If Glide provides reliable range + multi-range selection and keyboard nav, it is the best match.
- If it does not, we should evaluate other spreadsheet-focused engines (e.g. RevoGrid / Univer) next.
