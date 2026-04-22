# Demo dataset + expected workflow (regression smoke test)

This is a tiny, repeatable “does Griddle still work?” checklist using the bundled sample datasets in `public/`.

## Datasets

- `public/sample-dataset-1month.json` — ~450 records (good for day-to-day testing)
- `public/sample-dataset-2w-15perms.json` — smaller dataset, quick load

## Expected workflow (5–10 min)

### 1) Load a sample dataset
1. Start the app.
2. Import/open `public/sample-dataset-1month.json`.

**Pass criteria**
- App does not crash.
- Dataset name displays: `Bills of Lading (1 month, ~450 records)`.
- Pivot grid renders.

### 2) Basic pivot sanity
Configure a simple pivot:
- Rows: `date`, then `material`
- Columns: `vendor`, then `location`
- Measure: `tons` (sum)

**Pass criteria**
- Grid updates within a reasonable time (no multi-second lockups).
- Row/column headers match the chosen fields.
- Measure cells show numeric values.

### 3) Filtering / slicers sanity
Add or use a slicer/filter (any one is fine):
- Filter `material` to a single value (e.g. `Stone`) OR
- Filter `vendor` to `Acme`

**Pass criteria**
- Grid updates and visibly reduces results.
- Clearing the filter restores the full view.

### 4) Selection / panel transition smoke checks
Use this section to guard the first `App.tsx` helper extraction pass. The goal is not exhaustive UI coverage; it is to verify the small but fragile transitions that are easy to break while refactoring selection and panel state.

#### 4a) Clear-selection behavior
1. Click a single value cell to open the entry panel.
2. Close the entry panel using its normal close affordance.
3. Click the **same** cell again.

**Pass criteria**
- Closing the panel clears enough selection state that the panel actually reopens.
- No stale highlight / dead-click behavior remains after the close.

#### 4b) Same-cell reselection
1. With the entry panel open for a single cell, switch focus elsewhere in the UI if needed.
2. Re-click the original cell.
3. Repeat after clearing selection from top chrome if that control is available.

**Pass criteria**
- Same-cell selection consistently re-triggers the expected entry state.
- No duplicate panel state or “already selected so nothing happens” regression appears.

#### 4c) Bulk → full-records open
1. Drag or shift-select a multi-cell range so the bulk panel opens.
2. Use the bulk panel action to open Full Records.

**Pass criteria**
- Full Records opens from the bulk flow without requiring a single-cell anchor.
- The working set matches the selected bulk range records.
- No unexpected fallback to entry mode occurs during the transition.

#### 4d) Full-records close back to entry
1. Start from a single-cell selection and open Full Records from the entry panel.
2. Use the normal “Done” / return action in Full Records.

**Pass criteria**
- The app returns to entry mode for the originating selection.
- The selected cell context is still usable for continued editing.
- No orphaned full-records working set remains after returning.

### 5) Edit + save round trip
1. Pick a visible record/cell and make a small edit (e.g., adjust a `tons` value).
2. Export/save the dataset.
3. Re-import the exported file.

**Pass criteria**
- Edit persists after reload.
- No schema/record loss (record count is stable, unless expected).

### 6) Validation UX quick check (when available)
This step is for validation regressions.

1. Create a known-invalid state in the editor (example: blank out a field that is marked required once required rules exist).
2. Confirm:
   - The invalid field is highlighted.
   - The validation panel lists the issue.
   - Clicking the issue jumps focus to the field.

**Pass criteria**
- Issues are discoverable (panel + inline cues).
- Jump-to-error focuses the correct field.

## Notes
- This is intentionally lightweight: it’s not a full test plan.
- If any step fails, capture:
  - screenshot/video
  - console error
  - dataset file used
