import { useEffect, useMemo, useRef, useState } from 'react';
import { CompactSelection, type GridSelection } from '@glideapps/glide-data-grid';
import './App.css';
import { GlidePivotGrid } from './components/GlidePivotGrid';
import { FilterPopup } from './components/FilterPopup';
// ViewsDropdown used inside TopChrome
import { PivotLayoutEditor } from './components/PivotLayoutEditor';
import { StartScreen } from './components/StartScreen';
import { NewGriddleWizard } from './components/NewGriddleWizard';
import { EntryPanel } from './components/EntryPanel';
import { TopChrome } from './components/TopChrome';
import { FullRecordsPanel } from './components/FullRecordsPanel';
import { MetadataStyleEditor } from './components/MetadataStyleEditor';
import { BulkRangePanel } from './components/BulkRangePanel';
import { SchemaEditor } from './components/SchemaEditor';
import { Modal } from './components/Modal';
import { computePivot } from './domain/pivot';
// (filterSetActiveCount no longer used)
import { bulkSetMetadata, createRecordFromSelection, getRecordsForCell, upsertRecords, updateRecordMetadata } from './domain/records';
import type { DatasetFileV1, DatasetSchema, FilterSet, PivotConfig, SelectedCell, Tuple, View } from './domain/types';
import styles from './AppLayout.module.css';
import { migrateDatasetOnSchemaChange } from './domain/schemaMigration';
import { ensureDefaultFlagRules } from './domain/metadataStyling';
import { ensureDefaultFastEntry } from './domain/entryDefaults';
import { getRecordIdsForGridSelection } from './domain/gridSelection';
import { buildGriddleFile, parseGriddleJson, serializeGriddleFile } from './domain/griddleIo';
import { exportDatasetRecordsCsv } from './domain/csvExport';
import {
  hasFileSystemAccessApi,
  openWithFileSystemAccess,
  saveAsWithFileSystemAccess,
  saveToHandle,
  type FileHandle,
} from './domain/fileAccess';
import { saveLastFile } from './domain/localState';
import { parseDatasetJson } from './domain/datasetIo';
import { findOrphanedRecords } from './domain/orphans';
import { ResizableDrawer } from './components/ResizableDrawer';
import { ScaffoldDialog } from './components/ScaffoldDialog';
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
  const [dirty, setDirty] = useState(false);
  const suppressDirtyRef = useRef(false);

  const [fileHandle, setFileHandle] = useState<FileHandle | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showNewWizard, setShowNewWizard] = useState(false);
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
  const [activeFilterSet, setActiveFilterSet] = useState<FilterSet>({ filters: [] });
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'none' | 'entry' | 'fullRecords'>('entry');
  const [fullRecordsRecordIds, setFullRecordsRecordIds] = useState<string[] | null>(null);
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [showScaffoldDialog, setShowScaffoldDialog] = useState(false);

  const [gridSelection, setGridSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  });

  // NOTE: @glideapps/glide-data-grid treats scrollOffsetX as an *externally controlled* value.
  // If we continuously feed it back via React state on every scroll event, it can fight user scrolling
  // (visible as “snapping back”). So we only use scrollOffsetX for initial restoration, then let the
  // grid manage its own scroll state.
  const [pivotScrollXRestore] = useState<number>(() => {
    const raw = localStorage.getItem('griddle:pivotScrollX:v1');
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  });
  const [enablePivotScrollRestore, setEnablePivotScrollRestore] = useState(true);
  const pivotScrollSaveRafRef = useRef<number | null>(null);
  const pivotScrollSaveLastRef = useRef<number>(pivotScrollXRestore);

  useEffect(() => {
    // disable external control after first paint/mount
    setEnablePivotScrollRestore(false);
  }, []);

  const pivot = useMemo(
    () =>
      dataset
        ? computePivot(dataset.records, dataset.schema, config, activeFilterSet)
        : { rowTuples: [], colTuples: [], cells: {} },
    [dataset, config, activeFilterSet],
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
    suppressDirtyRef.current = true;
    setDirty(false);
    setSelected(null);
    setShowSchemaEditor(false);
    setImportError(null);

    const normalized: DatasetFileV1 = {
      ...next,
      schema: ensureDefaultFastEntry(ensureDefaultFlagRules(next.schema)),
      views: next.views ?? [],
    };
    setDataset(normalized);
    setActiveViewId(null);
    setActiveFilterSet({ filters: [] });
    setConfig((prev) => reconcilePivotConfig(normalized.schema, nextPivot ?? prev));

    // allow subsequent edits to mark dirty
    window.setTimeout(() => {
      suppressDirtyRef.current = false;
    }, 0);
  }

  async function confirmIfDirty(action: string): Promise<boolean> {
    if (!dirty) return true;
    return window.confirm(`You have unsaved changes. ${action}?`);
  }

  async function openFileViaPicker() {
    if (!(await confirmIfDirty('Open anyway'))) return;
    setImportError(null);

    if (hasFileSystemAccessApi()) {
      try {
        const { handle, name, text } = await openWithFileSystemAccess();
        // parse like handleOpenFile does
        if (name.toLowerCase().endsWith('.griddle')) {
          const gf = parseGriddleJson(text);
          applyImportedDataset(gf.dataset, gf.pivotConfig);
        } else {
          const ds = parseDatasetJson(text);
          applyImportedDataset(ds);
        }
        setFileHandle(handle);
        setFileName(name);
        return;
      } catch (e) {
        // user cancel is fine
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setImportError(e instanceof Error ? e.message : 'Open failed');
        return;
      }
    }

    fileOpenRef.current?.click();
  }

  function downloadGriddle() {
    if (!dataset) return;
    const gf = buildGriddleFile({ dataset, pivotConfig: config });
    downloadTextFile(fileName ?? `${dataset.name || 'dataset'}.griddle`, serializeGriddleFile(gf));
  }

  async function saveAsGriddle() {
    if (!dataset) return;
    const gf = buildGriddleFile({ dataset, pivotConfig: config });
    const text = serializeGriddleFile(gf);
    const suggestedName = `${dataset.name || 'dataset'}.griddle`;

    if (hasFileSystemAccessApi()) {
      try {
        const { handle, name } = await saveAsWithFileSystemAccess({ suggestedName, contents: text });
        setFileHandle(handle);
        setFileName(name);
        setDirty(false);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        // fallback to download
      }
    }

    downloadTextFile(suggestedName, text);
    setDirty(false);
  }

  async function saveGriddle() {
    if (!dataset) return;
    const gf = buildGriddleFile({ dataset, pivotConfig: config });
    const text = serializeGriddleFile(gf);

    if (fileHandle && hasFileSystemAccessApi()) {
      try {
        await saveToHandle(fileHandle, text);
        setDirty(false);
        return;
      } catch {
        // if handle becomes invalid, fall through to save as
      }
    }

    await saveAsGriddle();
  }

  function beginNewWizard() {
    void (async () => {
      if (!(await confirmIfDirty('Create a new griddle'))) return;
      setShowNewWizard(true);
    })();
  }

  function exportExcelTable() {
    if (!dataset) return;
    // Excel-friendly: CSV of the underlying records (flat table).
    const csv = exportDatasetRecordsCsv(dataset);
    const filename = `${dataset.name || 'dataset'}.csv`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
      const editable = isEditableTarget(e.target);

      // Allow navigating the pivot with arrow keys even when side panels are open,
      // as long as the user isn't actively typing in an input.
      if (!editable && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        const cur = gridSelection.current;
        if (cur && cur.range.width === 1 && cur.range.height === 1 && cur.rangeStack.length === 0) {
          const maxCol = config.rowKeys.length + pivot.colTuples.length - 1;
          const maxRow = pivot.rowTuples.length - 1;
          if (maxCol >= 0 && maxRow >= 0) {
            let [col, row] = cur.cell;
            if (e.key === 'ArrowLeft') col = Math.max(0, col - 1);
            if (e.key === 'ArrowRight') col = Math.min(maxCol, col + 1);
            if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
            if (e.key === 'ArrowDown') row = Math.min(maxRow, row + 1);

            if (col !== cur.cell[0] || row !== cur.cell[1]) {
              e.preventDefault();
              setGridSelection({
                columns: CompactSelection.empty(),
                rows: CompactSelection.empty(),
                current: {
                  cell: [col, row],
                  range: { x: col, y: row, width: 1, height: 1 },
                  rangeStack: [],
                },
              });
            }
          }
        }
      }

      if (editable) return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const k = e.key.toLowerCase();

      // File
      if (k === 'n') {
        e.preventDefault();
        beginNewWizard();
        return;
      }

      if (k === 'o') {
        e.preventDefault();
        void openFileViaPicker();
        return;
      }

      if (k === 's' && e.shiftKey) {
        e.preventDefault();
        void saveAsGriddle();
        return;
      }

      if (k === 's') {
        e.preventDefault();
        void saveGriddle();
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
  }, [config, dataset, dirty]);

  // Persistence: keep a local draft of the last-opened griddle.
  useEffect(() => {
    if (!dataset) return;
    saveLastFile(buildGriddleFile({ dataset, pivotConfig: config }));
  }, [dataset, config]);

  // Dirty tracking
  useEffect(() => {
    if (!dataset) return;
    if (suppressDirtyRef.current) return;
    setDirty(true);
  }, [dataset, config, activeFilterSet]);

  // On boot: show the Start screen (New/Open). We keep last file as a draft in localStorage,
  // but we do NOT auto-load it.

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
        <StartScreen onNew={() => setShowNewWizard(true)} onOpen={() => void openFileViaPicker()} />
        {showNewWizard ? (
          <Modal title="New griddle" onClose={() => setShowNewWizard(false)}>
            <NewGriddleWizard
              onCancel={() => setShowNewWizard(false)}
              onCreate={(ds, pivotConfig) => {
                applyImportedDataset(ds, pivotConfig);
                setFileHandle(null);
                setFileName(null);
                setShowNewWizard(false);
              }}
            />
          </Modal>
        ) : null}
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

      <TopChrome
        docTitle={dataset.name || fileName || 'Untitled'}
        dirty={dirty}
        theme={theme}
        activeViewId={activeViewId}
        views={(dataset.views ?? []) as View[]}
        activeFilterSet={activeFilterSet}
        onDocTitleChange={(next) => {
          setDataset((prev) => (prev ? { ...prev, name: next } : prev));
          if (!fileHandle) setFileName(`${next}.griddle`);
          setDirty(true);
        }}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onNew={() => beginNewWizard()}
        onOpen={() => {
          void openFileViaPicker();
        }}
        onDownload={() => downloadGriddle()}
        onExport={() => exportExcelTable()}
        onSaveAs={() => {
          void saveAsGriddle();
        }}
        onSave={() => {
          void saveGriddle();
        }}
        onUndo={() => {
          // TODO: add undo stack
        }}
        onRedo={() => {
          // TODO: add undo stack
        }}
        onClearSelection={() => {
          setSelected(null);
          setFullRecordsRecordIds(null);
          setGridSelection({ columns: CompactSelection.empty(), rows: CompactSelection.empty() });
        }}
        onOrphans={() => {
          if (!dataset) return;
          const { recordIds, issues } = findOrphanedRecords({ dataset, config });
          if (recordIds.length === 0) {
            window.alert('No orphaned records found.');
            return;
          }

          // Summarize quickly; details are visible in Full Records.
          const missingMeasureCount = issues.filter((i) => i.kind === 'missingMeasure').length;
          const missingDimCount = issues.filter((i) => i.kind === 'missingDimension').length;
          window.alert(
            `Found ${recordIds.length} orphaned record(s).\n\n` +
              `Missing measure: ${missingMeasureCount}\n` +
              `Missing dimension: ${missingDimCount}\n\n` +
              `Opening Full Records…`,
          );

          setSelected(null);
          setFullRecordsRecordIds(recordIds);
          setPanelMode('fullRecords');
        }}
        onLayout={() => setShowPivotLayout(true)}
        onFilters={() => setShowFilters(true)}
        onStyles={() => setShowStyleEditor(true)}
        onFields={() => setShowSchemaEditor(true)}
        onViewsChange={(next) => setDataset((prev) => (prev ? { ...prev, views: next } : prev))}
        onLoadView={(viewId, fs) => {
          setSelected(null);
          setActiveViewId(viewId);
          setActiveFilterSet(fs);
        }}
      />

      {showNewWizard ? (
        <Modal title="New griddle" onClose={() => setShowNewWizard(false)}>
          <NewGriddleWizard
            onCancel={() => setShowNewWizard(false)}
            onCreate={(ds, pivotConfig) => {
              applyImportedDataset(ds, pivotConfig);
              setFileHandle(null);
              setFileName(null);
              setDirty(false);
              setShowNewWizard(false);
            }}
          />
        </Modal>
      ) : null}

      {showSchemaEditor ? (
        <Modal title="Fields" onClose={() => setShowSchemaEditor(false)}>
          <SchemaEditor schema={dataset.schema} onChange={applySchema} />
        </Modal>
      ) : null}

      {showPivotLayout ? (
        <Modal title="Pivot layout" onClose={() => setShowPivotLayout(false)}>
          <PivotLayoutEditor
            schema={dataset.schema}
            config={config}
            onChange={(cfg) => {
              setSelected(null);
              setConfig(cfg);
            }}
          />
        </Modal>
      ) : null}

      {showFilters ? (
        <Modal title="Filters" onClose={() => setShowFilters(false)}>
          <FilterPopup
            schema={dataset.schema}
            records={dataset.records}
            allowedDimensionKeys={[...new Set([...config.rowKeys, ...config.colKeys, ...config.slicerKeys])]}
            singleSelectDimensionKeys={config.slicerKeys}
            active={activeFilterSet}
            onApply={(next) => {
              setSelected(null);
              setActiveFilterSet(next);
              setActiveViewId(null);
            }}
            onClose={() => setShowFilters(false)}
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
                  scrollOffsetX={enablePivotScrollRestore ? pivotScrollXRestore : undefined}
                  onScrollXChange={(x) => {
                    // Save (throttled) but do NOT control the grid’s horizontal scroll continuously.
                    const xi = Math.max(0, Math.round(x));
                    if (Math.abs(xi - pivotScrollSaveLastRef.current) < 2) return;
                    pivotScrollSaveLastRef.current = xi;

                    if (pivotScrollSaveRafRef.current != null) return;
                    pivotScrollSaveRafRef.current = window.requestAnimationFrame(() => {
                      pivotScrollSaveRafRef.current = null;
                      localStorage.setItem('griddle:pivotScrollX:v1', String(pivotScrollSaveLastRef.current));
                    });
                  }}
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
          <ResizableDrawer storageKey="griddle:drawerWidth:bulk:v1">
            <BulkRangePanel
              dataset={dataset}
              config={config}
              selected={selected}
              recordIds={bulkSel.recordIds}
              cellCount={bulkSel.cellCount}
              onClose={() => {
                // Clear selection so user can click the same cell again.
                setSelected(null);
                setGridSelection({ columns: CompactSelection.empty(), rows: CompactSelection.empty() });
              }}
              onGoToFullRecords={() => setPanelMode('fullRecords')}
              onDatasetChange={(next) => setDataset(next)}
            />
          </ResizableDrawer>
        ) : selected && panelMode === 'entry' ? (
          <ResizableDrawer storageKey="griddle:drawerWidth:entry:v1">
            <EntryPanel
              dataset={dataset}
              config={config}
              selected={selected}
              onClose={() => {
                setSelected(null);
                // Clear grid selection so clicking the same cell re-triggers selection + opens panels.
                setGridSelection({ columns: CompactSelection.empty(), rows: CompactSelection.empty() });
                setPanelMode('none');
              }}
              onGoToFullRecords={() => setPanelMode('fullRecords')}
              onSubmit={({ measureValues, flags, details }) => {
                // Validation: never allow records with no measure value.
                const hasAnyMeasure = Object.values(measureValues).some((v) => typeof v === 'number' && Number.isFinite(v));
                if (!hasAnyMeasure) {
                  window.alert('Cannot create a record without at least one measure value.');
                  return;
                }

                const record = createRecordFromSelection({
                  schema: dataset.schema,
                  config,
                  selected,
                  activeFilterSet,
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
          </ResizableDrawer>
        ) : null}

        {(panelMode === 'fullRecords' && (selected || (fullRecordsRecordIds && fullRecordsRecordIds.length > 0))) ? (
          <ResizableDrawer storageKey="griddle:drawerWidth:fullRecords:v1">
            <FullRecordsPanel
              dataset={dataset}
              config={config}
              selected={selected}
              recordIds={fullRecordsRecordIds ?? (bulkSel.hasMulti ? bulkSel.recordIds : undefined)}
              onClose={() => {
                setSelected(null);
                setFullRecordsRecordIds(null);
                // Clear grid selection so clicking the same cell re-triggers selection + opens panels.
                setGridSelection({ columns: CompactSelection.empty(), rows: CompactSelection.empty() });
                setPanelMode('none');
              }}
              onDone={() => {
                setFullRecordsRecordIds(null);
                setPanelMode('entry');
              }}
              onDatasetChange={(next) => setDataset(next)}
            />
          </ResizableDrawer>
        ) : null}
      </div>

      {showScaffoldDialog ? (
        <ScaffoldDialog
          dataset={dataset}
          onClose={() => setShowScaffoldDialog(false)}
          onDatasetChange={(next) => setDataset(next)}
        />
      ) : null}
    </div>
  );
}
