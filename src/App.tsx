import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { PivotControls } from './components/PivotControls';
import { GlidePivotGrid } from './components/GlidePivotGrid';
import { GlidePivotHeader } from './components/GlidePivotHeader';
import { DatasetImportExport } from './components/DatasetImportExport';
import { EntryPanel } from './components/EntryPanel';
import { SchemaEditor } from './components/SchemaEditor';
import { computePivot } from './domain/pivot';
import { bulkSetMetadata, createRecordFromSelection, getRecordsForCell, upsertRecords, updateRecordMetadata } from './domain/records';
import type { DatasetFileV1, DatasetSchema, PivotConfig, SelectedCell, Tuple } from './domain/types';
import styles from './AppLayout.module.css';
import { migrateDatasetOnSchemaChange } from './domain/schemaMigration';
import { sampleDataset } from './sample/sampleDataset';

function reconcilePivotConfig(schema: DatasetSchema, prev: PivotConfig): PivotConfig {
  const keys = new Set(schema.fields.map((f) => f.key));

  const rowDefaults = schema.fields.filter((f) => f.roles.includes('rowDim')).map((f) => f.key);
  const colDefaults = schema.fields.filter((f) => f.roles.includes('colDim')).map((f) => f.key);
  const measureKeys = schema.fields.filter((f) => f.roles.includes('measure')).map((f) => f.key);

  const defaultMeasure = measureKeys[0] ?? '';

  const next: PivotConfig = {
    ...prev,
    rowKeys: prev.rowKeys.filter((k) => keys.has(k)),
    colKeys: prev.colKeys.filter((k) => keys.has(k)),
    slicerKeys: prev.slicerKeys.filter((k) => keys.has(k)),
    slicers: Object.fromEntries(Object.entries(prev.slicers).filter(([k]) => keys.has(k))),
    measureKey: keys.has(prev.measureKey) ? prev.measureKey : defaultMeasure,
  };

  // If the user ends up with no dimensions selected (common after importing), choose sensible defaults.
  if (next.rowKeys.length === 0) next.rowKeys = rowDefaults.slice(0, 2);
  if (next.colKeys.length === 0) next.colKeys = colDefaults.slice(0, 2);
  if (next.measureKey === '' && defaultMeasure) next.measureKey = defaultMeasure;

  return next;
}

export default function App() {
  const [dataset, setDataset] = useState<DatasetFileV1>(sampleDataset);

  const defaultMeasure =
    dataset.schema.fields.find((f) => f.roles.includes('measure'))?.key ??
    dataset.schema.fields.find((f) => f.type === 'number')?.key ??
    '';

  const [config, setConfig] = useState<PivotConfig>({
    rowKeys: ['date', 'material'],
    colKeys: ['vendor', 'location'],
    slicerKeys: [],
    slicers: {},
    measureKey: defaultMeasure,
  });

  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [glideHeaderTx, setGlideHeaderTx] = useState(0);

  const pivot = useMemo(
    () => computePivot(dataset.records, dataset.schema, config),
    [dataset.records, dataset.schema, config],
  );

  // After data changes, refresh selected.cell.recordIds/value so the tape stays in sync.
  useEffect(() => {
    if (!selected) return;

    function tupleEq(a: Tuple, b: Tuple, keys: string[]): boolean {
      return keys.every((k) => (a[k] ?? '') === (b[k] ?? ''));
    }

    const ri = pivot.rowTuples.findIndex((rt) => tupleEq(rt, selected.row, config.rowKeys));
    const ci = pivot.colTuples.findIndex((ct) => tupleEq(ct, selected.col, config.colKeys));
    if (ri < 0 || ci < 0) return;

    const key = `${ri}:${ci}`;
    const nextCell = pivot.cells[key] ?? { value: null, recordIds: [] };

    // Avoid cascading renders if nothing changed.
    const sameIds =
      nextCell.recordIds.length === selected.cell.recordIds.length &&
      nextCell.recordIds.every((id, i) => id === selected.cell.recordIds[i]);

    if (sameIds && nextCell.value === selected.cell.value) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected({ ...selected, rowIndex: ri, colIndex: ci, cell: nextCell });
  }, [dataset.records, pivot, config.colKeys, config.rowKeys, selected]);

  function applySchema(nextSchema: DatasetSchema) {
    setSelected(null);

    setDataset((prevDataset) => {
      // Note: this call also migrates record data keys (best-effort rename + drop removed fields)
      const { dataset: nextDataset, pivotConfig: nextPivot } = migrateDatasetOnSchemaChange({
        dataset: prevDataset,
        nextSchema,
        pivotConfig: config,
      });

      // Update pivot config alongside dataset.
      setConfig(reconcilePivotConfig(nextSchema, nextPivot));

      return nextDataset;
    });
  }

  function applyImportedDataset(next: DatasetFileV1) {
    setSelected(null);
    setShowSchemaEditor(false);
    setDataset(next);
    setConfig((prev) => reconcilePivotConfig(next.schema, prev));
  }

  return (
    <div className={styles.app}>
      <div className={styles.toolbar}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontWeight: 800 }}>Griddle</div>
          <div style={{ color: '#666', fontSize: 12 }}>Schema-driven pivot</div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <PivotControls
            schema={dataset.schema}
            config={config}
            onChange={(cfg) => {
              setSelected(null);
              setConfig(cfg);
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <DatasetImportExport dataset={dataset} onImport={applyImportedDataset} />
          <button onClick={() => setShowSchemaEditor((s) => !s)} style={{ cursor: 'pointer' }}>
            {showSchemaEditor ? 'Hide schema editor' : 'Edit schema'}
          </button>
        </div>
      </div>

      {showSchemaEditor ? <SchemaEditor schema={dataset.schema} onChange={applySchema} /> : null}

      <div className={styles.main}>
        <div className={styles.gridArea}>
          {(() => {
            const rowDimWidth = 160;
            const valueColWidth = 120;
            const rowMarkersWidth = 44;

            return (
              <div
                style={{
                  height: '100%',
                  borderBottom: '1px solid #ddd',
                  overflow: 'hidden',
                  background: '#fff',
                  display: 'grid',
                  gridTemplateRows: 'auto 1fr',
                  gap: 0,
                }}
              >
                <GlidePivotHeader
                  pivot={pivot}
                  config={config}
                  scrollTx={glideHeaderTx}
                  rowDimWidth={rowDimWidth}
                  valueColWidth={valueColWidth}
                  rowMarkersWidth={rowMarkersWidth}
                />

                <div style={{ minHeight: 0 }}>
                  <GlidePivotGrid
                    pivot={pivot}
                    config={config}
                    rowDimWidth={rowDimWidth}
                    valueColWidth={valueColWidth}
                    rowMarkersWidth={rowMarkersWidth}
                    onScrollTx={setGlideHeaderTx}
                    onSingleValueCellSelected={(sel) => setSelected(sel)}
                  />
                </div>
              </div>
            );
          })()}
        </div>

        {selected ? (
          <div className={styles.drawer}>
            <EntryPanel
              dataset={dataset}
              config={config}
              selected={selected}
              onClose={() => setSelected(null)}
              onSubmit={({ measureValues, flags }) => {
                const record = createRecordFromSelection({
                  schema: dataset.schema,
                  config,
                  selected,
                  measureValues,
                  flags,
                });
                setDataset((prev) => upsertRecords(prev, [record]));
              }}
              onToggleFlag={(recordId, flagKey, value) => {
                setDataset((prev) => {
                  const rec = prev.records.find((r) => r.id === recordId);
                  if (!rec) return prev;
                  return upsertRecords(prev, [updateRecordMetadata(rec, flagKey, value)]);
                });
              }}
              onBulkToggleFlag={(flagKey, value) => {
                setDataset((prev) => {
                  const inCell = getRecordsForCell(prev, selected);
                  const updated = bulkSetMetadata(inCell, flagKey, value);
                  return upsertRecords(prev, updated);
                });
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
