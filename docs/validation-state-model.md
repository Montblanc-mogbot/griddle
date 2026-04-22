# Validation state model

This note defines the **data contract** for validation issues before Griddle grows a full validation UI. It is intentionally implementation-oriented but doc-only.

The purpose is to keep future validation work consistent across:
- import-time validation
- edit-time validation
- issue navigation / jump-to-error
- inline highlights and summary panels

This note does **not** require a particular rendering strategy yet.

## Design goals

- Validation results should be stable enough to diff, cache, and navigate.
- The issue model should support both **record-local** problems and **dataset/global** problems.
- Issue targets should be precise enough for future UI routing, but not assume every issue can already open a specific surface.
- IDs should stay stable across re-renders and minor message wording changes whenever the underlying issue is the same.

## Canonical issue shape

Each validation issue should be represented as a plain object like this:

```ts
export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationIssueScope = 'record' | 'dataset';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  scope: ValidationIssueScope;

  rule: string;
  message: string;
  suggestion?: string;

  target: ValidationTarget;

  // Optional machine-readable payload for debugging, grouping, or later autofix work.
  meta?: Record<string, unknown>;
}
```

### Field meanings

- `id`
  - stable identifier for this issue instance
  - should be derived from normalized structural fields, not from array position in a rendered list
- `severity`
  - `error`: data is invalid or incomplete enough that the user likely needs to act
  - `warning`: suspicious, incomplete, or discouraged, but not necessarily blocking
  - `info`: non-blocking advisory issue; keep this in the contract even if the first UI hides it
- `scope`
  - `record`: issue applies to one specific record, even if it was discovered during aggregate validation
  - `dataset`: issue applies to the document/configuration as a whole, or spans multiple records without a single owning record
- `rule`
  - stable machine code, for example `required`, `enum.invalid`, `measure.missing`, `duplicate.id`, `pivot.measureKey.missing`
  - intended for grouping, filtering, tests, and analytics
- `message`
  - human-readable summary
  - should be understandable without reading raw JSON paths
- `suggestion`
  - optional next-step hint
  - should remain advisory; do not encode UI-specific button text here
- `target`
  - machine-readable location info for future navigation and highlighting
- `meta`
  - optional structured details for diagnostics or future richer UI

## Target model

A validation issue target needs more precision than a single free-form path string. Use a structured target with an optional canonical path string for display and indexing.

```ts
export type ValidationTarget = {
  path: string;
  kind: 'field' | 'record' | 'dataset' | 'schema' | 'view';

  // Present when the issue is tied to a concrete record.
  recordId?: string;

  // Present when the issue points to a specific field.
  fieldKey?: string;

  // Optional view/config linkage for dataset-level issues.
  viewId?: string;
};
```

### Why structured targets instead of path-only

A path string is useful, but path-only targeting is too weak for future interaction logic because Griddle often navigates by record identity, field key, and panel context rather than by raw JSON pointer lookup.

Examples:
- a record-local missing measure issue wants `recordId + fieldKey`
- a schema issue wants a schema/config path, but no record id
- a dataset-wide issue may refer to a missing pivot measure or duplicate view id with no direct record surface

The canonical `path` string is still useful for:
- stable sorting
- grouping by prefix
- readable debugging output
- future export/logging

## Canonical path conventions

Use a JSON-pointer-like path rooted at the dataset document.

Recommended shapes:

- Dataset field value on a record:
  - `/records/by-id/<recordId>/fields/<fieldKey>`
- Record-level issue not tied to one field:
  - `/records/by-id/<recordId>`
- Dataset/schema-level issue:
  - `/schema/fields/<fieldKey>`
  - `/config/measureKey`
  - `/views/by-id/<viewId>`
  - `/dataset`

### Why not array-index paths

Prefer record-id-based paths over index-based paths.

Good:
- `/records/by-id/rec_123/fields/tons`

Avoid when possible:
- `/records/17/values/tons`

Reason: array indexes are unstable after sorting, filtering, import normalization, or record insertion/deletion. Record ids are much more durable and map better to future navigation.

## Stable ID rules

`ValidationIssue.id` should be deterministic and based on the normalized identity of the issue.

Recommended formula:
- hash of: `scope + severity + rule + target.path + normalized key meta`

Where “normalized key meta” means only the pieces that define issue identity, not the full display message.

Examples:
- missing required field:
  - identity inputs: `record`, `error`, `required`, `/records/by-id/rec_123/fields/vendor`
- duplicate id conflict:
  - identity inputs: `dataset`, `error`, `duplicate.id`, `/dataset`, sorted duplicate ids list in `meta`
- invalid enum value:
  - identity inputs: `record`, `error`, `enum.invalid`, `/records/by-id/rec_123/fields/material`, invalid value in `meta`

### Stability requirements

The same issue should keep the same id when:
- the UI rerenders
- nearby unrelated fields change
- the displayed message wording is slightly improved

The id should change when:
- the issue moves to a different target
- severity changes in a meaningful way
- the violated rule changes
- the conflicting data that defines the issue identity changes

## Severity guidance

The first implementation should keep severity simple:

### `error`
Use for problems that mean the current state is invalid, incomplete, or cannot safely be treated as correct.

Examples:
- required measure missing
- invalid enum value
- field type mismatch that cannot be interpreted safely
- duplicate record identity when uniqueness is required
- broken config references (missing active measure key, missing referenced field)

### `warning`
Use for suspicious or degraded states that still allow meaningful work.

Examples:
- deprecated field usage
- incomplete metadata that is allowed but risky
- field value coercion that succeeded but may be surprising
- orphan-like situations that can still be inspected and fixed

### `info`
Use sparingly for advisory states.

Examples:
- optional field left blank where completion is recommended
- import normalization note that did not change semantic meaning

If the first UI does not expose `info`, keep it in the contract anyway so the model does not need to churn later.

## Record-local vs dataset/global issues

This distinction matters because not every issue should route the user into the same editing surface.

### Record-local issues

A record-local issue belongs to a single record and usually one field.

Examples:
- record `r1` has no value for active measure field `tons`
- record `r9` has an invalid enum value in `vendor`
- record `r3` has malformed date text in `shipDate`

Expected target shape:
- `scope: 'record'`
- `target.recordId` present
- `target.fieldKey` usually present for field issues
- `target.path` usually under `/records/by-id/...`

### Dataset/global issues

A dataset/global issue either:
- affects the whole document/configuration, or
- spans multiple records without a single obvious owner

Examples:
- pivot config references a missing measure key
- duplicate ids exist across multiple records
- a view references deleted schema fields
- schema definition is internally inconsistent

Expected target shape:
- `scope: 'dataset'`
- `target.kind` often `dataset`, `schema`, or `view`
- `target.recordId` absent unless there is a designated primary record for navigation

### Rule of thumb

If a user can reasonably “fix this by editing one record right now,” make it `scope: 'record'`.
If resolution requires changing config/schema, reconciling multiple records, or making a document-wide decision, make it `scope: 'dataset'`.

## Grouping / indexing recommendations

Validation state should be easy to derive into grouped views without changing the base issue contract.

Useful derived indexes:
- by `id`
- by `severity`
- by `rule`
- by `target.path`
- by `target.recordId`
- by `target.fieldKey`
- by `scope`

This keeps the base model small while supporting future panels, counts, and jump ordering.

## Ordering recommendations

The canonical issue list should be stable and deterministic.

Suggested default sort:
1. severity (`error` before `warning` before `info`)
2. scope (`record` before `dataset`, or vice versa—pick one and keep it stable)
3. target path (lexicographic)
4. rule
5. id

The specific sort can evolve, but it should not depend on transient render order.

## Relationship to current Griddle concepts

The current code already has examples of issue-like structures, such as orphan detection in `src/domain/orphans.ts`.
That existing shape is useful as prior art, but it is narrower than the future validation contract because it does not yet standardize:
- severity
- stable ids
- structured targets
- dataset-vs-record scope

The future validation contract should absorb those narrower issue producers rather than forcing each feature to invent its own shape.

## Non-goals for this note

This note deliberately does **not** define:
- exact panel UI layout
- exact keyboard shortcuts
- whether navigation auto-switches views or asks first
- virtualization/rendering details
- inline highlight styling

Those belong in separate targeting/navigation and UI notes.

## Example issues

### Record-local missing measure

```ts
{
  id: 'val_7b8d...',
  severity: 'error',
  scope: 'record',
  rule: 'measure.missing',
  message: 'Record is missing a value for the active measure field "tons".',
  suggestion: 'Enter a measure value or change the active measure.',
  target: {
    kind: 'field',
    path: '/records/by-id/r1/fields/tons',
    recordId: 'r1',
    fieldKey: 'tons',
  },
}
```

### Dataset-level broken pivot config

```ts
{
  id: 'val_1ac2...',
  severity: 'error',
  scope: 'dataset',
  rule: 'pivot.measureKey.missing',
  message: 'The active pivot measure key does not exist in the current schema.',
  suggestion: 'Choose a valid measure field or update the schema.',
  target: {
    kind: 'dataset',
    path: '/config/measureKey',
  },
}
```

### Dataset-level duplicate record ids

```ts
{
  id: 'val_9f44...',
  severity: 'error',
  scope: 'dataset',
  rule: 'duplicate.id',
  message: 'Multiple records share the same id.',
  suggestion: 'Assign unique ids before saving or importing.',
  target: {
    kind: 'dataset',
    path: '/dataset',
  },
  meta: {
    duplicateIds: ['r12', 'r18'],
  },
}
```

## Issue-targeting rules for the current interaction model

This section defines how a `ValidationIssue` should map onto the **current** Griddle interaction model documented in `docs/workspace-interaction-model.md`.
It is still doc-only and intentionally conservative: it should describe only routing behavior that the current panel/selection model can plausibly support.

### Targeting goals

- Prefer the smallest editing surface that can resolve the issue clearly.
- Do not force a user out of their current context unless the current surface cannot represent the target.
- Keep record/cell navigation rules explicit so future helpers can classify issues without guessing.
- Treat filtered-out or otherwise hidden targets as a first-class case, not as a silent failure.

## Navigation surfaces available today

Under the current interaction model, validation navigation can only sensibly target these surfaces:

### 1. Entry panel
Use when the issue can be resolved within a **single selected pivot cell** and the target record/field meaningfully belongs to that single-cell context.

Characteristics:
- requires a concrete selected cell
- best for one-record / one-field editing that is already consistent with the current cell selection
- should preserve the existing single-cell interaction model rather than inventing record-jump behavior that Entry does not yet support

### 2. Bulk panel
Use only for issues that are genuinely about a **multi-record working set** and do not require opening one specific record row.

Characteristics:
- tied to a current multi-cell / multi-record selection
- appropriate for range-level warnings or batch-fix framing later
- not appropriate as the default landing surface for a record-specific field error

### 3. Full Records panel
Use when the issue is record-specific but cannot be resolved cleanly inside Entry.

Characteristics:
- supports direct record-row inspection/editing
- can be entered from a single-cell anchor or from a bulk working set
- should be the fallback target when a record is known but a single-cell mapping is ambiguous, unavailable, or hidden by the current view

### 4. Dataset-only / unresolved
Use when the issue is about schema, config, views, or other document-level state that does not map cleanly to Entry, Bulk, or Full Records.

Characteristics:
- may require a future validation panel, settings surface, schema editor, or config prompt
- should not pretend there is a valid cell/record navigation target when there is not one

## Core routing rules

### Rule 1: dataset-scope issues do not auto-route into Entry or Bulk
If `issue.scope === 'dataset'`, default classification should be **dataset-only / unresolved** unless a later rule explicitly names a better target.

Examples:
- missing pivot measure key
- broken view reference
- schema inconsistency
- duplicate-id issue that spans multiple records with no designated primary record

Why:
- these issues are not owned by one current pivot cell
- forcing them into Entry/Bulk would create misleading UI state
- the current app has no dedicated validation panel yet, so unresolved is the honest state

### Rule 2: record + field issues are Entry-eligible only when a single-cell mapping is unambiguous
A record-scoped field issue may target **Entry** only when all of the following are true:
- the issue has `target.recordId`
- the issue has `target.fieldKey`
- the record can be located in the current dataset
- the record can be associated with one visible pivot cell under the active config/filter state
- opening that cell would not require picking among multiple equally plausible cells

Why:
- Entry is driven by `selected: SelectedCell`, not by free-floating `recordId`
- Entry works best when the navigation target is the same single-cell context the user would get by clicking naturally in the grid
- if the record/cell relationship is ambiguous, Full Records is safer than fabricating a cell jump

Examples that are usually Entry-eligible:
- a missing measure on a record that contributes to exactly one visible pivot cell
- an invalid enum on a detail field for a record whose row/column tuple is uniquely represented in the current view

### Rule 3: record issues fall back to Full Records when Entry is ambiguous or insufficient
A record-scoped issue should target **Full Records** instead of Entry when any of the following are true:
- the target record is known, but the correct pivot cell is ambiguous
- the issue is record-level rather than field-level
- the target field is not a good fit for Entry-first resolution
- the current view/filter state hides the relevant cell but the record itself is still a valid editing target
- multiple records need to be compared or reconciled around the same issue

Examples:
- malformed record that needs multiple fields inspected together
- record-level issue with no single owning field
- hidden/filtered record that cannot be navigated to as a visible grid cell without changing view state first

Why Full Records is the safer fallback:
- it can represent known record ids directly
- it avoids stale assumptions that every record problem has a stable visible cell target
- it keeps navigation honest when current grid visibility is not enough

### Rule 4: Bulk is opt-in, not the default fallback for record errors
Do **not** route record-specific validation issues into Bulk merely because multiple records are affected.
Use Bulk only when the issue is explicitly about the selected working set as a set.

Examples that may become Bulk-eligible later:
- a warning that every selected record is missing the same optional flag
- a future batch-fix suggestion over the current range

Examples that should still prefer Full Records or unresolved:
- duplicate ids across scattered records
- one invalid field value per record across many unrelated cells
- a required-field error for a single identified record

Why:
- Bulk is currently a range-edit surface, not a generic issue browser
- using it as a catch-all would blur the distinction between batch operations and record inspection

## Preserve-vs-open rules

### Preserve current context when the active surface already matches the issue target
If the user is already on the correct surface and the target is still valid, navigation should prefer **preserving context** over tearing it down and reopening it.

Examples:
- already in Entry for the exact selected cell that owns the issue
- already in Full Records with the target record visible in the working set
- already in Bulk for a future bulk-scoped issue

Why:
- unnecessary panel churn makes validation navigation feel jumpy
- preserving context reduces stale-selection races in the current interaction model

### Open a different surface only when the current one cannot represent the target
Navigation should switch surfaces only when the existing panel state is insufficient.

Examples:
- move from Entry to Full Records when the record is known but the single-cell target is ambiguous
- move from no panel to Entry when a unique cell target exists
- stay unresolved for dataset-only issues instead of opening an unrelated panel

## Filtered-out / hidden / out-of-view targets

This is the most important edge case to define up front.

### Case A: record is known, but the corresponding cell is filtered out or not visible in the current pivot view
Default behavior: **do not silently mutate filters or layout.**
Instead, classify as one of:
- **Full Records** if the record itself can still be edited meaningfully there
- **unresolved with a prompt/reason** if later UX wants explicit confirmation before changing the current view

Why:
- the current docs intentionally do not commit to auto-switching views
- silent filter/layout mutation can destroy the user's working context
- Full Records is often the least surprising fallback when a record exists but the grid cannot currently show its cell

### Case B: target field exists, but the current surface does not expose that field cleanly
Default behavior:
- if Full Records can expose/edit the field, prefer Full Records
- otherwise classify as unresolved

Examples:
- issue points to a field not shown in current fast-entry assumptions
- issue is tied to record data that Entry summarizes poorly but Full Records can still show in-row

### Case C: dataset-level issue references a missing/deleted object
Default behavior: unresolved

Examples:
- missing schema field referenced by config
- deleted view id still referenced somewhere
- missing active measure key

Why:
- there may be no real target to open
- pretending the issue has a record/cell destination would mask the real problem

## Recommended classification vocabulary for future helpers

A future pure helper should classify each issue target into one of these buckets:
- `entry-eligible`
- `bulk-eligible`
- `full-records-eligible`
- `dataset-only`
- `unresolved`

### Meaning of `unresolved`
`unresolved` does **not** mean the issue is bad data or that navigation failed.
It means the current interaction model does not provide a trustworthy direct jump target without extra user choice or future UI.

Typical unresolved cases:
- dataset-wide issues
- hidden references with no edit surface yet
- ambiguous record-to-cell mappings
- config/schema problems that need a future dedicated destination

## Anti-rules / guardrails

To keep future implementation honest, the targeting layer should **not** assume any of the following unless a later slice explicitly adds them:
- auto-switching views without confirmation
- auto-clearing filters as part of jump-to-error
- auto-opening Entry from only `recordId` without a verified selected-cell target
- using Bulk as a generic fallback for every multi-record problem
- treating dataset/config issues as if they belonged to an arbitrary cell

## Examples

### Example 1: missing measure on one record with a unique visible cell
Classification: `entry-eligible`

Reason:
- record-local field issue
- concrete `recordId` + `fieldKey`
- unique visible cell mapping exists

### Example 2: invalid enum on a record that is filtered out of the current view
Classification: `full-records-eligible`

Reason:
- record is still known
- Entry jump would require implicit filter/view mutation
- Full Records can inspect the record without silently changing workspace context

### Example 3: duplicate ids across multiple records
Classification: `dataset-only` or `unresolved`

Reason:
- spans multiple records
- no single owning cell
- better handled by future validation panel / dedicated resolution flow

### Example 4: broken pivot measure key
Classification: `dataset-only`

Reason:
- config-level problem
- cannot honestly map to Entry/Bulk/Full Records under the current model

## Relationship to the current interaction model

These targeting rules are intentionally aligned with the current interaction model:
- Entry depends on a real `selected` cell
- Bulk depends on a real multi-selection working set
- Full Records can anchor to explicit record ids when a cell mapping is weak or unavailable
- panel switches should be conservative to avoid stale-selection and focus-jump regressions

That means the targeting layer should prefer **honest fallbacks** over clever but brittle jumps.

## Proposed next note

The next validation-prep slice should turn these rules into a tiny pure helper (or typed stub) that classifies issue targets without rendering UI.
That helper should consume the existing `ValidationIssue` contract and these routing rules, and stay additive/reversible.
