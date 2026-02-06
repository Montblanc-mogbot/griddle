# AG Grid Community spike (Milestone 6a)

## Goal
Confirm whether **multi-cell selection** (range selection / multi-range) is available in **AG Grid Community** and evaluate feasibility for Griddle.

## What was implemented
- Added deps: `ag-grid-community`, `ag-grid-react`
- Added spike view: `src/spikes/AgGridPivotSpike.tsx`
- Added pivot→AG Grid adapter: `src/spikes/agGridAdapter.ts`
- Added App toggle: **Show AG Grid spike**

## How to test
1) Run the app and click **Show AG Grid spike**.
2) Try click-drag to select a rectangular range of cells.
3) Try holding **Ctrl/Cmd** while selecting a second range (multi-range).
4) Open DevTools console and observe logs:
   - `rangeSelectionChanged` should print the current range list.

## Notes / caveats
- This spike enables:
  - `enableRangeSelection={true}`
  - `suppressMultiRangeSelection={false}`
- AG Grid behavior varies by version; if multi-range is not working, we should confirm whether it is gated behind Enterprise in the version we installed.

## Current limitation (verification)
I was not able to fully verify multi-range behavior via automated browser tooling in this environment.

Next step: have Matt confirm in the hosted demo whether Ctrl/Cmd+drag creates a second range and whether selection UX meets expectations.
