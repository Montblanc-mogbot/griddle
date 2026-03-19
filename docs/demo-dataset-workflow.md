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

### 4) Edit + save round trip
1. Pick a visible record/cell and make a small edit (e.g., adjust a `tons` value).
2. Export/save the dataset.
3. Re-import the exported file.

**Pass criteria**
- Edit persists after reload.
- No schema/record loss (record count is stable, unless expected).

### 5) Validation UX quick check (when available)
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
