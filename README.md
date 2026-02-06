# Griddle

Schema-driven pivot + data-entry tooling (Milestone 1 focuses on the pivot view).

## Dev

```bash
npm install
npm run dev
```

## What exists (Milestone 1 so far)

- Dataset/schema/record types (`src/domain/types.ts`)
- Pivot compute (`src/domain/pivot.ts`)
  - distinct row/col tuples
  - SUM aggregation for selected measure
  - contributing `recordIds[]` per cell
- Basic pivot UI:
  - multi-row column headers
  - multi-column row headers
  - row/col selectors + measure selector
  - cell selection debug panel
- Unit tests for pivot compute: `npm test`

## Current limitations

- Sample data is hardcoded (`src/sample/sampleDataset.ts`)
- No import/export yet
- Slicers/filters UI not implemented (compute supports basic slicers)
- No record editing/creation UI yet
- No date bucketing yet
