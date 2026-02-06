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
3) Type into the measure field(s):
   - **Enter** moves to the next measure.
   - **Enter on the last measure** submits the record.
   - After submit: inputs clear and focus returns to the first measure.
4) Metadata (flag) checkboxes:
   - In **Fast entry**, flags apply to the record you’re about to submit (default false).
   - In **Records in cell**, flags are editable per record.
   - In **Bulk metadata**, checking/unchecking sets that flag for *all* records contributing to the selected cell.

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

## Current limitations

- Sample data is hardcoded (`src/sample/sampleDataset.ts`)
- No import/export yet
- Slicers UI not implemented (compute supports it, but no UI)
- No record editing/creation UI yet
- No date bucketing yet
