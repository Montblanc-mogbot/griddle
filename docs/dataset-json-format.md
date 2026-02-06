# Dataset JSON format (DatasetFileV1)

Griddle reads/writes a single JSON document representing a dataset and its schema.

## Top-level shape

```jsonc
{
  "version": 1,
  "name": "Bills of Lading (sample)",
  "schema": { "version": 1, "fields": [/*...*/] },
  "records": [/*...*/]
}
```

### Versioning rules
- `version` is the **dataset file version**.
- Currently only `version: 1` is supported.
- If an unsupported version is imported, the app should show a clear error and not crash.

## `schema`

```jsonc
{
  "version": 1,
  "fields": [
    {
      "key": "date",
      "label": "Date",
      "type": "date",
      "roles": ["rowDim"],
      "enum": ["optional", "for", "string", "fields"]
    }
  ]
}
```

### FieldDef
- `key` (string): stable identifier used inside `record.data`.
- `label` (string): UI label.
- `type` (string): one of `"string" | "number" | "boolean" | "date"`.
- `roles` (array): any of:
  - `rowDim` / `colDim` / `slicer` (dimensions)
  - `measure` (numeric values aggregated into cells)
  - `flag` (boolean metadata; used for formatting later)
- `enum` (optional array of strings): suggested categorical options (used for pickers later).
- `measure` (optional): formatting hints.
- `flag` (optional): styling hints.

## `records`
Each record is a flat JSON object plus metadata.

```jsonc
{
  "id": "uuid-or-stable-id",
  "createdAt": "2026-02-01T00:00:00Z",
  "updatedAt": "2026-02-01T00:00:00Z",
  "data": {
    "date": "2026-02-01",
    "vendor": "Acme",
    "location": "North",
    "tons": 12.5,
    "isCorrection": false
  }
}
```

### Notes
- **Dates** are stored as date-only strings: `YYYY-MM-DD`.
- `data` is flexible; fields may be missing.
- Unknown keys may be dropped during schema edits (to keep datasets tidy).

## Minimal example

```json
{
  "version": 1,
  "name": "Example",
  "schema": {
    "version": 1,
    "fields": [
      { "key": "date", "label": "Date", "type": "date", "roles": ["rowDim"] },
      { "key": "plant", "label": "Plant", "type": "string", "roles": ["colDim"] },
      { "key": "tons", "label": "Tons", "type": "number", "roles": ["measure"] }
    ]
  },
  "records": [
    {
      "id": "r1",
      "createdAt": "2026-02-01T00:00:00Z",
      "updatedAt": "2026-02-01T00:00:00Z",
      "data": { "date": "2026-02-01", "plant": "A", "tons": 10 }
    }
  ]
}
```
