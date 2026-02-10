import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CompactSelection, type GridSelection } from '@glideapps/glide-data-grid';
import './App.css';
import { PivotControls } from './components/PivotControls';
import { GlidePivotGrid } from './components/GlidePivotGrid';
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const t = localStorage.getItem('griddle:theme:v1');
    return t === 'dark' ? 'dark' : 'light';
  });

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
  const [panelMode, setPanelMode] = useState<'none' | 'entry' | 'fullRecords'>('entry');
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('griddle:theme:v1', theme);
  }, [theme]);

  // Keyboard shortcuts (Excel-ish)
  useEffect(() => {
    function isEditableTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if (t.isContentEditable) return true;
      return false;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const k = e.key.toLowerCase();

      // File
      if (k === 'o') {
        e.preventDefault();
        fileOpenRef.current?.click();
        return;
      }

      if (k === 's') {
        e.preventDefault();
        if (!dataset) return;
        const gf = buildGriddleFile({ dataset, pivotConfig: config });
        downloadTextFile(`${dataset.name || 'dataset'}.griddle`, serializeGriddleFile(gf));
        return;
      }

      // View dialogs
      if (k === 'l') {
        e.preventDefault();
        setShowPivotLayout(true);
        return;
      }

      if (k === 'f' && e.shiftKey) {
        e.preventDefault();
        setShowFilters(true);
        return;
      }

      // Panels
      if (k === '1') {
        e.preventDefault();
        setPanelMode((m) => (m === 'entry' ? 'none' : 'entry'));
        return;
      }

      if (k === '2') {
        e.preventDefault();
        setPanelMode((m) => (m === 'fullRecords' ? 'none' : 'fullRecords'));
        return;
      }

      // Theme
      if (k === 'd') {
        e.preventDefault();
        setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [config, dataset]);

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
              background: 'var(--surface)',
              border: '1px solid var(--border2)',
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

      <div
        className={styles.toolbar}
        style={{
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0,
          background: 'var(--ribbonBg)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 12,
            padding: '4px 6px',
          }}
        >
          {/* Menu bar (left-aligned, Excel-ish) */}
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
            onShowFields={() => setShowSchemaEditor(true)}
            onShowStyles={() => setShowStyleEditor(true)}
          />

          <div style={{ flex: 1 }} />

          <div style={{ fontWeight: 900, color: 'var(--muted)', fontSize: 13, paddingRight: 6 }}>Griddle</div>
        </div>

        {/* Ribbon row (grouped icons) */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '8px 10px',
            borderTop: '1px solid var(--border)',
            alignItems: 'stretch',
            flexWrap: 'wrap',
          }}
        >
          {(() => {
            function IconButton(props: {
              title: string;
              onClick: () => void;
              pressed?: boolean;
              children: ReactNode;
            }) {
              return (
                <button
                  onClick={props.onClick}
                  title={props.title}
                  aria-label={props.title}
                  aria-pressed={props.pressed}
                  style={{
                    width: 34,
                    height: 30,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: props.pressed ? 'var(--accentSoft)' : 'var(--surface)',
                    cursor: 'pointer',
                  }}
                >
                  {props.children}
                </button>
              );
            }

            function Icon(props: { d: string }) {
              return (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d={props.d} stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              );
            }

            function RibbonGroup(props: { label: string; children: ReactNode }) {
              return (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingRight: 12,
                    borderRight: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{props.children}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, paddingLeft: 2 }}>{props.label}</div>
                </div>
              );
            }

            const entryPressed = panelMode === 'entry';
            const fullPressed = panelMode === 'fullRecords';

            return (
              <>
                <RibbonGroup label="File">
                  <IconButton title="Open…" onClick={() => fileOpenRef.current?.click()}>
                    <Icon d="M4 20h16M12 3v12m0 0l4-4m-4 4l-4-4" />
                  </IconButton>

                  <IconButton
                    title="Save"
                    onClick={() => {
                      const gf = buildGriddleFile({ dataset, pivotConfig: config });
                      downloadTextFile(`${dataset.name || 'dataset'}.griddle`, serializeGriddleFile(gf));
                    }}
                  >
                    <Icon d="M5 3h12l2 2v16H5V3zm3 0v6h8V3M7 21v-8h10v8" />
                  </IconButton>

                  <IconButton
                    title="Export dataset.json"
                    onClick={() => {
                      downloadTextFile(`${dataset.name || 'dataset'}.json`, serializeDataset(dataset));
                    }}
                  >
                    <Icon d="M4 4h16v16H4V4zm8 3v7m0 0l3-3m-3 3l-3-3" />
                  </IconButton>
                </RibbonGroup>

                <RibbonGroup label="View">
                  <IconButton
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    pressed={theme === 'dark'}
                    onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                  >
                    <Icon d="M12 3a7 7 0 000 14 7 7 0 000-14zm0 0v-1m0 16v1m9-9h1M2 12H1m16.95 4.95l.7.7M6.35 6.35l-.7-.7m12 0l-.7.7M6.35 17.65l-.7.7" />
                  </IconButton>

                  <IconButton title="Pivot layout…" onClick={() => setShowPivotLayout(true)}>
                    <Icon d="M4 4h16v6H4V4zm0 10h7v6H4v-6zm9 0h7v6h-7v-6" />
                  </IconButton>

                  <IconButton title="Filters…" onClick={() => setShowFilters(true)}>
                    <Icon d="M4 5h16l-6 7v6l-4 2v-8L4 5z" />
                  </IconButton>

                  <IconButton
                    title={entryPressed ? 'Hide Entry panel' : 'Show Entry panel'}
                    pressed={entryPressed}
                    onClick={() => setPanelMode((m) => (m === 'entry' ? 'none' : 'entry'))}
                  >
                    <Icon d="M4 4h16v16H4V4zm10 0v16" />
                  </IconButton>

                  <IconButton
                    title={fullPressed ? 'Hide Full records' : 'Show Full records'}
                    pressed={fullPressed}
                    onClick={() => setPanelMode((m) => (m === 'fullRecords' ? 'none' : 'fullRecords'))}
                  >
                    <Icon d="M4 4h16v16H4V4zm0 11h16" />
                  </IconButton>
                </RibbonGroup>

                <RibbonGroup label="Format">
                  <IconButton title="Styles…" onClick={() => setShowStyleEditor(true)}>
                    <Icon d="M12 3l7 7-9 9H3v-7l9-9zm-1 2l-7 7v5h5l7-7-5-5z" />
                  </IconButton>
                </RibbonGroup>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <IconButton title="Fields…" onClick={() => setShowSchemaEditor(true)}>
                      <Icon d="M4 6h16M4 12h16M4 18h16" />
                    </IconButton>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, paddingLeft: 2 }}>Setup</div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {showSchemaEditor ? (
        <Modal title="Fields" onClose={() => setShowSchemaEditor(false)}>
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
                  borderBottom: '1px solid var(--border)',
                  overflow: 'hidden',
                  background: 'var(--surface)',
                }}
              >
                <GlidePivotGrid
                  pivot={pivot}
                  schema={dataset.schema}
                  config={config}
                  theme={theme}
                  rowDimWidth={rowDimWidth}
                  valueColWidth={valueColWidth}
                  rowMarkersWidth={rowMarkersWidth}
                  selection={gridSelection}
                  onSelectionChange={(sel) => {
                    setGridSelection(sel);
                  }}
                  onSingleValueCellSelected={(sel) => {
                    setSelected(sel);
                    setPanelMode('entry');
                  }}
                />
              </div>
            );
          })()}
        </div>

        {bulkSel.hasMulti ? (
          <div className={styles.drawer}>
            <BulkRangePanel
              dataset={dataset}
              config={config}
              selected={selected}
              recordIds={bulkSel.recordIds}
              cellCount={bulkSel.cellCount}
              onClose={() => {
                // keep selection, just close bulk panel
                setGridSelection({ columns: CompactSelection.empty(), rows: CompactSelection.empty() });
              }}
              onGoToFullRecords={() => setPanelMode('fullRecords')}
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
                setPanelMode('none');
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
            recordIds={bulkSel.hasMulti ? bulkSel.recordIds : undefined}
            onClose={() => {
              setSelected(null);
              setPanelMode('none');
            }}
            onDone={() => setPanelMode('entry')}
            onDatasetChange={(next) => setDataset(next)}
          />
        ) : null}
      </div>
    </div>
  );
}
