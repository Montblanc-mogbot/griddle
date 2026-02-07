import { useEffect, useMemo, useRef, useState } from 'react';
import { CompactSelection, type GridSelection } from '@glideapps/glide-data-grid';
import './App.css';
import { PivotControls } from './components/PivotControls';
import { GlidePivotGrid } from './components/GlidePivotGrid';
import { GlidePivotHeader } from './components/GlidePivotHeader';
import { StartScreen } from './components/StartScreen';
import { EntryPanel } from './components/EntryPanel';
import { MenuBar } from './components/MenuBar';
import { FullRecordsPanel } from './components/FullRecordsPanel';
import { MetadataStyleEditor } from './components/MetadataStyleEditor';
import { BulkRangePanel } from './components/BulkRangePanel';
import { SchemaEditor } from './components/SchemaEditor';
import { Modal } from './components/Modal';
import { computePivot } from './domain/pivot';
import { bulkSetMetadata, createRecordFromSelection, getRecordsForCell, upsertRecords, updateRecordMetadata } from './domain/records';
import type { DatasetFileV1, DatasetSchema, PivotConfig, SelectedCell, Tuple } from './domain/types';
import styles from './AppLayout.module.css';
import { migrateDatasetOnSchemaChange } from './domain/schemaMigration';
import { ensureDefaultFlagRules } from './domain/metadataStyling';
import { ensureDefaultFastEntry } from './domain/entryDefaults';
import { getRecordIdsForGridSelection } from './domain/gridSelection';
import { buildGriddleFile, parseGriddleJson, serializeGriddleFile } from './domain/griddleIo';
import { loadLastFile, saveLastFile } from './domain/localState';
import { parseDatasetJson, serializeDataset } from './domain/datasetIo';
import { setRecordField } from './domain/updateRecord';

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
    rowFilters: Object.fromEntries(
      Object.entries(prev.rowFilters ?? {}).filter(([k]) => keys.has(k)),
    ),
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
  const [dataset, setDataset] = useState<DatasetFileV1 | null>(null);
  const fileOpenRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const defaultMeasure =
    dataset?.schema.fields.find((f) => f.roles.includes('measure'))?.key ??
    dataset?.schema.fields.find((f) => f.type === 'number')?.key ??
    '';

  const [config, setConfig] = useState<PivotConfig>({
    rowKeys: ['location', 'vendor', 'material'],
    colKeys: ['date'],
    rowFilters: {},
    slicerKeys: [],
    slicers: {},
    measureKey: defaultMeasure,
  });

  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);
  const [showPivotLayout, setShowPivotLayout] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [glideHeaderTx, setGlideHeaderTx] = useState(0);
  const [panelMode, setPanelMode] = useState<'entry' | 'fullRecords'>('entry');
  const [showStyleEditor, setShowStyleEditor] = useState(false);

  const [gridSelection, setGridSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  });

  const pivot = useMemo(
    () => (dataset ? computePivot(dataset.records, dataset.schema, config) : { rowTuples: [], colTuples: [], cells: {} }),
    [dataset, config],
  );

  const bulkSel = (() => {
    const { recordIds, cellCount } = getRecordIdsForGridSelection({ pivot, config, selection: gridSelection });
    const ranges = gridSelection.current ? [gridSelection.current.range, ...gridSelection.current.rangeStack] : [];
    const hasMulti = ranges.some((r) => r.width * r.height > 1) || (gridSelection.current?.rangeStack.length ?? 0) > 0;
    return { recordIds, cellCount, hasMulti };
  })();

  // After data changes, refresh selected.cell.recordIds/value so the tape stays in sync.
  useEffect(() => {
    if (!selected || !dataset) return;

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

    setSelected({ ...selected, rowIndex: ri, colIndex: ci, cell: nextCell });
  }, [dataset?.records, pivot, config.colKeys, config.rowKeys, selected, dataset]);

  function applySchema(nextSchema: DatasetSchema) {
    setSelected(null);

    setDataset((prevDataset) => {
      if (!prevDataset) return prevDataset;

      // Note: this call also migrates record data keys (best-effort rename + drop removed fields)
      const { dataset: nextDataset, pivotConfig: nextPivot } = migrateDatasetOnSchemaChange({
        dataset: prevDataset,
        nextSchema,
        pivotConfig: config,
      });

      // Update pivot config alongside dataset.
      setConfig(reconcilePivotConfig(nextSchema, nextPivot));

      return {
        ...nextDataset,
        schema: ensureDefaultFastEntry(ensureDefaultFlagRules(nextDataset.schema)),
      };
    });
  }

  function applyImportedDataset(next: DatasetFileV1, nextPivot?: PivotConfig) {
    setSelected(null);
    setShowSchemaEditor(false);
    setImportError(null);

    const normalized = { ...next, schema: ensureDefaultFastEntry(ensureDefaultFlagRules(next.schema)) };
    setDataset(normalized);
    setConfig((prev) => reconcilePivotConfig(normalized.schema, nextPivot ?? prev));
  }

  async function handleOpenFile(file: File) {
    setImportError(null);

    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.griddle')) {
        const gf = parseGriddleJson(text);
        // validateDataset(gf.dataset) available if we want to surface warnings
        applyImportedDataset(gf.dataset, gf.pivotConfig);
      } else {
        const ds = parseDatasetJson(text);
        // validateDataset(ds) available if we want to surface warnings
        applyImportedDataset(ds);
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Open failed');
    }
  }

  // Persistence: keep a local draft of the last-opened griddle.
  useEffect(() => {
    if (!dataset) return;
    saveLastFile(buildGriddleFile({ dataset, pivotConfig: config }));
  }, [dataset, config]);

  // On boot, if we have a last session, preload it (still allows opening a real file).
  useEffect(() => {
    if (dataset) return;
    const last = loadLastFile();
    if (!last) return;
    applyImportedDataset(last.dataset, last.pivotConfig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!dataset) {
    return (
      <>
        <input
          ref={fileOpenRef}
          type="file"
          accept="application/json,.json,.griddle"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void handleOpenFile(file);
            e.currentTarget.value = '';
          }}
        />
        <StartScreen onOpen={() => fileOpenRef.current?.click()} />
        {importError ? (
          <div
            style={{
              position: 'fixed',
              left: 16,
              bottom: 16,
              color: '#c00',
              background: '#fff',
              border: '1px solid #f1f1f1',
              padding: 10,
              borderRadius: 10,
            }}
          >
            Open error: {importError}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className={styles.app}>
      <input
        ref={fileOpenRef}
        type="file"
        accept="application/json,.json,.griddle"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void handleOpenFile(file);
          e.currentTarget.value = '';
        }}
      />

      <div className={styles.toolbar} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 900 }}>Griddle</div>
          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <MenuBar
              onOpenFile={() => fileOpenRef.current?.click()}
              onSaveGriddle={() => {
                const gf = buildGriddleFile({ dataset, pivotConfig: config });
                downloadTextFile(`${dataset.name || 'dataset'}.griddle`, serializeGriddleFile(gf));
              }}
              onExportDataset={() => {
                downloadTextFile(`${dataset.name || 'dataset'}.json`, serializeDataset(dataset));
              }}
              onShowPivotLayout={() => setShowPivotLayout(true)}
              onShowFilters={() => setShowFilters(true)}
              onClearSelection={() => {
                setSelected(null);
                setGridSelection({ columns: CompactSelection.empty(), rows: CompactSelection.empty() });
              }}
              onShowSchema={() => setShowSchemaEditor(true)}
              onShowStyles={() => setShowStyleEditor(true)}
            />
          </div>
        </div>

        {/* Toolbar row (sterile) */}
        <div style={{ display: 'flex', gap: 8, padding: '8px 10px', borderTop: '1px solid #eee' }}>
          <button onClick={() => fileOpenRef.current?.click()} style={{ padding: '6px 10px', fontSize: 12 }}>
            Open…
          </button>
          <button
            onClick={() => {
              const gf = buildGriddleFile({ dataset, pivotConfig: config });
              downloadTextFile(`${dataset.name || 'dataset'}.griddle`, serializeGriddleFile(gf));
            }}
            style={{ padding: '6px 10px', fontSize: 12 }}
          >
            Save
          </button>
          <button onClick={() => setShowPivotLayout(true)} style={{ padding: '6px 10px', fontSize: 12 }}>
            Pivot layout…
          </button>
          <button onClick={() => setShowFilters(true)} style={{ padding: '6px 10px', fontSize: 12 }}>
            Filters…
          </button>
          <button onClick={() => setShowStyleEditor(true)} style={{ padding: '6px 10px', fontSize: 12 }}>
            Styles…
          </button>
        </div>
      </div>

      {showSchemaEditor ? (
        <Modal title="Schema editor" onClose={() => setShowSchemaEditor(false)}>
          <SchemaEditor schema={dataset.schema} onChange={applySchema} />
        </Modal>
      ) : null}

      {showPivotLayout ? (
        <Modal title="Pivot layout" onClose={() => setShowPivotLayout(false)}>
          <PivotControls
            schema={dataset.schema}
            records={dataset.records}
            config={config}
            onChange={(cfg) => {
              setSelected(null);
              setConfig(cfg);
            }}
            showRowsColsMeasure
            showSlicers={false}
            showRowFilters={false}
          />
        </Modal>
      ) : null}

      {showFilters ? (
        <Modal title="Filters" onClose={() => setShowFilters(false)}>
          <PivotControls
            schema={dataset.schema}
            records={dataset.records}
            config={config}
            onChange={(cfg) => {
              setSelected(null);
              setConfig(cfg);
            }}
            showRowsColsMeasure={false}
            showSlicers
            showRowFilters
          />
        </Modal>
      ) : null}

      {showStyleEditor ? (
        <MetadataStyleEditor
          schema={dataset.schema}
          onChange={(nextSchema) => {
            setDataset((prev) => (prev ? { ...prev, schema: nextSchema } : prev));
          }}
          onClose={() => setShowStyleEditor(false)}
        />
      ) : null}

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
                    schema={dataset.schema}
                    config={config}
                    rowDimWidth={rowDimWidth}
                    valueColWidth={valueColWidth}
                    rowMarkersWidth={rowMarkersWidth}
                    selection={gridSelection}
                    onSelectionChange={(sel) => {
                      setGridSelection(sel);
                    }}
                    onScrollTx={setGlideHeaderTx}
                    onSingleValueCellSelected={(sel) => {
                      setSelected(sel);
                      setPanelMode('entry');
                    }}
                  />
                </div>
              </div>
            );
          })()}
        </div>

        {bulkSel.hasMulti ? (
          <div className={styles.drawer}>
            <BulkRangePanel
              dataset={dataset}
              selected={selected}
              recordIds={bulkSel.recordIds}
              cellCount={bulkSel.cellCount}
              onClose={() => {
                // keep selection, just close bulk panel
                setGridSelection({ columns: CompactSelection.empty(), rows: CompactSelection.empty() });
              }}
              onDatasetChange={(next) => setDataset(next)}
            />
          </div>
        ) : selected && panelMode === 'entry' ? (
          <div className={styles.drawer}>
            <EntryPanel
              dataset={dataset}
              config={config}
              selected={selected}
              onClose={() => {
                setSelected(null);
                setPanelMode('entry');
              }}
              onGoToFullRecords={() => setPanelMode('fullRecords')}
              onSubmit={({ measureValues, flags, details }) => {
                const record = createRecordFromSelection({
                  schema: dataset.schema,
                  config,
                  selected,
                  measureValues,
                  flags,
                  details,
                });
                setDataset((prev) => (prev ? upsertRecords(prev, [record]) : prev));
              }}
              onUpdateRecordField={(recordId, key, value) => {
                setDataset((prev) => {
                  if (!prev) return prev;
                  const rec = prev.records.find((r) => r.id === recordId);
                  if (!rec) return prev;
                  const updated = setRecordField(rec, key, value);
                  return upsertRecords(prev, [updated]);
                });
              }}
              onToggleFlag={(recordId, flagKey, value) => {
                setDataset((prev) => {
                  if (!prev) return prev;
                  const rec = prev.records.find((r) => r.id === recordId);
                  if (!rec) return prev;
                  return upsertRecords(prev, [updateRecordMetadata(rec, flagKey, value)]);
                });
              }}
              onBulkToggleFlag={(flagKey, value) => {
                setDataset((prev) => {
                  if (!prev) return prev;
                  const inCell = getRecordsForCell(prev, selected);
                  const updated = bulkSetMetadata(inCell, flagKey, value);
                  return upsertRecords(prev, updated);
                });
              }}
            />
          </div>
        ) : null}

        {selected && panelMode === 'fullRecords' ? (
          <FullRecordsPanel
            dataset={dataset}
            config={config}
            selected={selected}
            onClose={() => {
              setSelected(null);
              setPanelMode('entry');
            }}
            onDone={() => setPanelMode('entry')}
            onDatasetChange={(next) => setDataset(next)}
          />
        ) : null}
      </div>
    </div>
  );
}
