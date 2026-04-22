# Workspace interaction model

This note documents the current interaction state in `src/App.tsx` so future panel/selection changes can be made against an explicit model instead of by accident.

## Core state

### `selected: SelectedCell | null`
- Represents the currently focused single grid cell.
- Contains row/column tuple context, row/column indexes, and the cell payload (`value`, `recordIds`).
- Drives the **entry** panel and any single-cell scoped actions.
- Is refreshed after dataset changes so the entry tape stays aligned with the latest pivoted value and contributing records.

### `gridSelection: GridSelection`
- Represents the glide-data-grid selection model.
- May contain a single current range or a stacked multi-range selection.
- Drives bulk selection behavior through `getRecordIdsForGridSelection(...)`.
- Is the source of truth for whether the current gesture/selection is effectively multi-cell.

### `panelMode: 'none' | 'entry' | 'bulk' | 'fullRecords'`
- Controls which workspace side panel is visible.
- `entry` means a single-cell editing flow.
- `bulk` means a multi-cell / multi-record range editing flow.
- `fullRecords` means the record-table view, entered either from a single cell or from a bulk selection.
- `none` means no side panel is visible.

### `pendingPanelMode: 'entry' | 'bulk' | null`
- Temporary queue used while a pointer gesture is still in progress.
- Prevents panels from opening mid-drag while a selection gesture is evolving.
- On pointer release, the queued mode is applied only if the final state still supports it.

### `fullRecordsRecordIds: string[] | null`
- Explicit working set for `FullRecordsPanel` when full-records mode is opened from **bulk** selection.
- Needed because bulk mode may not have a meaningful single `selected` cell to derive records from.
- Cleared when full-records mode closes or when top-level clear-selection actions run.

## Pointer gesture intent

The app distinguishes gestures that **start on the grid** from pointer activity that starts in other UI.

Tracked state:
- `pointerDown`
- `pointerDownRef`
- `pointerOriginRef: 'grid' | 'ui' | null`

Rules:
- On `pointerdown` / mouse fallback, the app records whether the gesture started inside `gridAreaRef`.
- While a pointer gesture that started on the grid is still active, side panels should **not** pop open.
- Instead, a target panel mode is queued into `pendingPanelMode` and only applied on release.
- Pointer gestures that started in other UI should not be treated as drag-select gestures.

## Derived bulk selection state

`bulkSel` is derived from `gridSelection` and contains:
- `recordIds`
- `cellCount`
- `hasMulti`

`hasMulti` becomes true when:
- any selected range is larger than one cell, or
- there is a stacked range selection.

This is the main switch between single-cell entry behavior and bulk-range behavior.

## Allowed transitions

### 1. No panel -> entry
Triggered by single-cell selection when not mid grid drag.

Path:
- `onSingleValueCellSelected(sel)`
- set `selected = sel`
- if not dragging from grid: `panelMode = 'entry'`
- if dragging from grid: `panelMode = 'none'`, `pendingPanelMode = 'entry'`

### 2. No panel / entry -> bulk
Triggered when the active grid selection becomes multi-cell.

Path:
- `bulkSel.hasMulti === true`
- if a grid drag is still active: queue `pendingPanelMode = 'bulk'`
- otherwise: `panelMode = 'bulk'`

Important behavior:
- while dragging on-grid, the app intentionally hides panels and waits for pointer release
- shift-click / non-drag multi selection can move directly into bulk mode

### 3. Bulk -> entry
Triggered when multi-selection collapses back to a single cell and full-records mode is not active.

Path:
- `bulkSel.hasMulti === false`
- if `panelMode === 'bulk'` and `selected` exists, switch to `panelMode = 'entry'`
- if `panelMode === 'bulk'` and `selected` is null, switch to `panelMode = 'none'`

### 4. Entry -> full records
Triggered from the entry panel's "Full records…" action.

Path:
- preserve current `selected`
- set `panelMode = 'fullRecords'`
- `FullRecordsPanel` derives records from `selected.cell.recordIds`

### 5. Bulk -> full records
Triggered from the bulk panel's "Full records…" action.

Path:
- copy `bulkSel.recordIds` into `fullRecordsRecordIds`
- set `panelMode = 'fullRecords'`
- `FullRecordsPanel` uses explicit record IDs instead of relying on `selected`

### 6. Full records -> entry
Triggered by `FullRecordsPanel.onDone()`.

Path:
- clear `fullRecordsRecordIds`
- set `panelMode = 'entry'`

Important caveat:
- this assumes there is still a meaningful `selected` single-cell context to return to
- if future flows allow full-records without a single-cell anchor, this transition likely needs tightening

### 7. Any visible panel -> none
Triggered by close/clear actions.

Close behavior intentionally does more than hide the panel:
- clears `selected`
- clears `fullRecordsRecordIds` where relevant
- clears `gridSelection`
- sets `panelMode = 'none'`

Reason:
- this allows clicking the same cell again to reopen the expected panel cleanly
- without clearing selection state, same-cell reselection can fail to retrigger the desired UI

## Current invariants

These are the assumptions the current app tries to maintain:
- `entry` mode should only be shown when `selected` is non-null.
- `bulk` mode should only be shown when `bulkSel.hasMulti` is true.
- `fullRecords` mode can be driven by either:
  - a current `selected` cell, or
  - explicit `fullRecordsRecordIds`, or
  - a still-live bulk selection.
- During an on-grid pointer gesture, panel transitions are deferred through `pendingPanelMode`.
- Closing a panel should reset enough selection state that immediate reselection behaves predictably.

## Click-off containment boundaries for future side-panel UX polish

This section is intentionally **doc-only**. It defines the guardrails for any future click-off deselect behavior without claiming that the current app already supports it.

### What counts as the workspace
For click-off purposes, the **workspace** should mean the main editing region controlled by `App.tsx`, specifically:
- the pivot grid area (`gridAreaRef`)
- the currently active side panel (`entry`, `bulk`, or `fullRecords`)
- panel-adjacent controls that are part of the same editing flow

Why:
- these surfaces participate in the current selection / panel state machine
- clicks inside them should normally be interpreted as continuing the current editing context, not dismissing it

### What counts as top chrome
**Top chrome** should mean the app-level controls above the workspace, such as:
- document title / file actions
- layout / filter / fields / preferences buttons
- theme toggles and similar global controls
- view-loading / view-management controls

Why top chrome must be excluded from click-off deselect:
- those controls often open supporting UI for the current workspace state
- clicking them should not silently clear selection or collapse a side panel before the requested action runs
- otherwise the app can end up with misleading "outside click" behavior that feels like a race against the toolbar

### Which modal surfaces must be ignored
Any modal or overlay surface that temporarily sits above the workspace should be treated as **outside the click-off system entirely**.
This includes at minimum:
- Filters modal
- Pivot layout modal
- Fields / schema editor modal
- Preferences modal
- New griddle wizard
- any future dialog launched from top chrome or panel actions

Why modals must be ignored:
- modal interaction is not a signal that the user wants to abandon the underlying workspace selection
- modal clicks should be handled by the modal/dialog system, not by workspace deselect logic
- allowing modals to trigger click-off deselect would risk premature panel closure and invalid mixed UI states

### Why full-records interactions are explicitly out of scope
Future click-off deselect behavior should **not** apply inside the Full Records experience unless a separate, explicitly designed rule is added.

Reasons:
- Full Records can be entered from either a single-cell anchor or a bulk working set
- it owns a denser interaction surface with editing, draft/new-record handling, working-set behavior, and close/done transitions
- naïve outside-click handling could sever the selection context needed to return to entry mode cleanly
- this path already has known fragility around continuity and should not inherit generic side-panel deselect rules by accident

### Practical rule for any future implementation
If click-off deselect is added later, the default should be conservative:
- only clicks proven to be outside the workspace editing surface should qualify
- top chrome and modal surfaces should be ignored
- full-records interactions should remain excluded unless separately specified and tested

This keeps future UX polish reversible and scoped, rather than letting an "outside click" shortcut redefine the interaction model by accident.

## Known fragile spots / future refactor targets

The current behavior works, but the state transitions are spread across several effects and event handlers in `App.tsx`.

The most obvious consolidation candidates are:
- clear-selection behavior
- open-entry behavior
- open-bulk behavior
- open-full-records-from-entry
- open-full-records-from-bulk
- close-panel behavior
- post-dataset-refresh handling for `selected`

That is why the next stabilization step should centralize these transitions behind named helpers or a reducer-backed controller before further UX changes are attempted.
