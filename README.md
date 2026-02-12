# Griddle

Schema-driven pivot + data-entry tooling (Milestone 1 focuses on the pivot view).

## Dev

```bash
npm install
npm run dev
```

## Import / Export

- Use **Import JSON** to load a DatasetFileV1 JSON from disk.
- Use **Export JSON** to download the current dataset.
- If the imported file has issues, the UI will show an error (fatal) or warnings (non-fatal).

JSON format docs: `docs/dataset-json-format.md`

## Fast entry (Milestone 5)

1) Click a pivot cell.
2) The **Entry** panel opens on the right.
3) The tape shows a ledger of existing records contributing to the cell.
4) New entry is a shaded row at the bottom of the tape:
   - Type into the measure field(s).
   - **Enter** moves to the next measure.
   - **Enter on the last measure** submits the record.
   - After submit: inputs clear and focus returns to the first measure.
5) Metadata (flag) checkboxes:
   - In the shaded new-entry row, flags apply to the record you’re about to submit (default false).
   - In tape rows, flags are editable per record.
   - In **Bulk flags**, checking/unchecking sets that flag for *all* records contributing to the selected cell.

All row/col/slicer dimensions are implied from the selected cell; fast entry edits **measures + flags only**.

## What exists (Milestone 1 + 2)

### Milestone 1 (pivot structure)

- Dataset/schema/record types (`src/domain/types.ts`)
- Pivot compute (`src/domain/pivot.ts`)
  - distinct row/col tuples
  - SUM aggregation for selected measure
  - contributing `recordIds[]` per cell
- Pivot UI:
  - multi-row column headers
  - multi-column row headers
  - row/col selectors + measure selector
- Unit tests for pivot compute: `npm test`

### Milestone 2 (usable pivot demo)

- Dummy dataset wired in (`src/sample/sampleDataset.ts`)
- Click a pivot cell to open the **Selection Inspector** panel:
  - aggregated value
  - selected row+column dimension values
  - contributing record IDs + expandable JSON for each record
- Basic pivot UX polish:
  - sticky headers
  - hover highlight
  - strong selected-cell styling

## Schema editor (Milestone 3)

Click **Edit schema** to toggle the schema editor.

You can:
- add/delete fields
- edit field label/key/type
- toggle roles (`rowDim`, `colDim`, `slicer`, `measure`, `flag`)
- set `enum` options for string fields (one per line)

Schema changes apply live to the pivot controls and grid.

## Filters + Views (Milestone 8)

- **Filters**: Click **Filters** in the ribbon to open an Excel-style filter popup.
  - Filters apply per-dimension (include/exclude + multiselect).
  - Multiple dimensions can be filtered at once.
- **Views**: Use the **Views** dropdown to save/recall named filter sets.
  - Views persist inside the dataset JSON (`views[]`) and therefore persist in `.griddle` files too.

## Current limitations

- Filtering is exact-match on the stringified value (no numeric range filters yet).
- Pivot aggregation is SUM-only (for the selected measure).
- Date bucketing/grouping isn’t implemented yet.
