import {
  DataEditor,
  GridCellKind,
  type GridCell,
  type GridSelection,
  type Item,
} from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import { useMemo } from 'react';
import type { DatasetFileV1, DatasetSchema, PivotConfig, PivotResult, SelectedCell } from '../domain/types';
import { decimalPlacesForMeasureInContext, formatNumber } from '../domain/format';
import { pickCellStyle } from '../domain/metadataStyling';
import { findNoteFieldKey, recordNoteValue } from '../domain/noteField';
import { rgbaFromHex } from '../domain/colorUtil';
import type { UiPrefsV1 } from '../domain/uiPrefs';

export function GlidePivotGrid(props: {
  pivot: PivotResult;
  schema: DatasetSchema;
  dataset: DatasetFileV1;
  uiPrefs: UiPrefsV1;
  config: PivotConfig;
  theme: 'light' | 'dark';
  rowDimWidth: number;
  rowDimWidthByKey?: Record<string, number | undefined>;
  onRowDimWidthChange?: (key: string, width: number) => void;
  valueColWidth: number;
  rowMarkersWidth: number;
  selection: GridSelection;
  scrollOffsetX?: number;
  onScrollXChange?: (x: number) => void;
  onSelectionChange: (sel: GridSelection) => void;
  onSingleValueCellSelected: (sel: SelectedCell) => void;
}) {
  const {
    pivot,
    schema,
    dataset,
    uiPrefs,
    config,
    theme,
    rowDimWidth,
    rowDimWidthByKey,
    onRowDimWidthChange,
    valueColWidth,
    rowMarkersWidth,
    selection,
    scrollOffsetX,
    onScrollXChange,
    onSelectionChange,
    onSingleValueCellSelected,
  } = props;

  // Build columns with grouping using "/" separator
  const columns = useMemo(() => {
    const rowDimCols = config.rowKeys.map((rk) => ({
      title: rk,
      id: rk,
      width: rowDimWidthByKey?.[rk] ?? rowDimWidth,
      // Row dims don't have a group - they appear first
    }));

    const valueCols = pivot.colTuples.map((tuple, idx) => {
      // Build grouped title - only show the last dimension in the title since group shows the first
      const groupParts = config.colKeys.map((key) => tuple[key] ?? '');
      // Title: only the last dimension value (not the full path)
      const title = groupParts[groupParts.length - 1] ?? '';

      return {
        title,
        id: `c${idx}`,
        width: valueColWidth,
        // Group: first dimension for grouping
        group: config.colKeys.length > 1 ? groupParts[0] : undefined,
      };
    });

    return [...rowDimCols, ...valueCols];
  }, [config.rowKeys, config.colKeys, pivot.colTuples, rowDimWidth, rowDimWidthByKey, valueColWidth]);

  const rowCount = pivot.rowTuples.length;

  const noteKey = useMemo(() => findNoteFieldKey(schema), [schema]);
  const recordById = useMemo(() => Object.fromEntries(dataset.records.map((r) => [r.id, r] as const)), [dataset.records]);

  const activeMeasureField = useMemo(
    () => schema.fields.find((f) => f.key === config.measureKey),
    [schema.fields, config.measureKey],
  );

  const measureDecimals = useMemo(() => {
    const vals = Object.values(pivot.cells).map((c) => c.value);
    return decimalPlacesForMeasureInContext(activeMeasureField, vals);
  }, [activeMeasureField, pivot.cells]);

  function getCell([col, row]: Item): GridCell {
    if (col < config.rowKeys.length) {
      const rk = config.rowKeys[col];
      const v = pivot.rowTuples[row]?.[rk] ?? '';
      return {
        kind: GridCellKind.Text,
        data: String(v),
        displayData: String(v),
        allowOverlay: false,
      };
    }

    const ci = col - config.rowKeys.length;
    const cell = pivot.cells[`${row}:${ci}`];
    const v = cell?.value;
    const txt = typeof v === 'number' ? formatNumber(v, { decimals: measureDecimals }) : '';
    const st = cell ? pickCellStyle(schema, cell) : {};

    const hasNotes = (() => {
      if (!noteKey) return false;
      const ids = cell?.recordIds;
      if (!ids || ids.length === 0) return false;
      for (const id of ids) {
        const r = recordById[id];
        if (!r) continue;
        const note = recordNoteValue(r, noteKey);
        if (note) return true;
      }
      return false;
    })();

    const themeOverride = (() => {
      const out: Record<string, unknown> = {};

      // Metadata styling first.
      if (st.bg) {
        out.bgCell = st.bg;
        out.bgCellMedium = st.bg;
      }
      if (st.text) {
        out.textDark = st.text;
      }

      // Notes indicator: subtle background/border tint using user prefs.
      if (hasNotes) {
        const intensity = uiPrefs.noteIndicatorIntensity;
        const bgAlpha = (intensity * 0.3) / 100;
        const borderAlpha = (intensity * 0.6) / 100;

        // If no explicit background style, tint the cell.
        if (!st.bg) {
          out.bgCell = rgbaFromHex(uiPrefs.noteIndicatorColor, bgAlpha);
          out.bgCellMedium = rgbaFromHex(uiPrefs.noteIndicatorColor, bgAlpha);
        }

        // Try to add a border highlight as well (supported by glide theme override).
        out.borderColor = rgbaFromHex(uiPrefs.noteIndicatorColor, borderAlpha);
      }

      return Object.keys(out).length === 0 ? undefined : out;
    })();

    return {
      kind: GridCellKind.Number,
      data: v ?? 0,
      displayData: hasNotes ? `${txt} •` : txt,
      allowOverlay: false,
      themeOverride,
    };
  }

  const glideTheme = useMemo(() => {
    if (theme === 'dark') {
      return {
        bgIconHeader: '#1a2030',
        bgHeader: '#1a2030',
        bgHeaderHasFocus: '#1a2030',
        bgHeaderHovered: '#20283b',
        bgBubble: '#1a2030',
        bgCell: '#141821',
        bgCellMedium: '#141821',
        bgCellLight: '#141821',
        bgSearchResult: 'rgba(139,135,255,0.25)',
        borderColor: '#1f2637',
        textDark: '#e8ebf2',
        textMedium: '#a8b0c2',
        textLight: '#a8b0c2',
        accentColor: '#8b87ff',
      };
    }
    return {
      bgIconHeader: '#f6f6f6',
      bgHeader: '#f6f6f6',
      bgHeaderHasFocus: '#f6f6f6',
      bgHeaderHovered: '#f0f0f0',
      bgBubble: '#f6f6f6',
      bgCell: '#ffffff',
      bgCellMedium: '#ffffff',
      bgCellLight: '#ffffff',
      bgSearchResult: 'rgba(79,70,229,0.15)',
      borderColor: '#eeeeee',
      textDark: '#111111',
      textMedium: '#666666',
      textLight: '#666666',
      accentColor: '#4f46e5',
    };
  }, [theme]);

  const freezeColCount = config.rowKeys.length;

  return (
    <DataEditor
      key={theme}
      theme={glideTheme}
      columns={columns}
      rows={rowCount}
      width="100%"
      getCellContent={getCell}
      rowMarkers={{ kind: 'both', width: rowMarkersWidth }}
      rangeSelect="multi-rect"
      freezeColumns={freezeColCount}
      smoothScrollX
      scrollOffsetX={scrollOffsetX}
      onVisibleRegionChanged={(_range, tx) => {
        // tx is the horizontal scroll offset (px)
        if (onScrollXChange) onScrollXChange(tx);
      }}
      onColumnResize={(_column, newSize, colIndex) => {
        // Only row-dimension columns are resizable for now.
        if (!onRowDimWidthChange) return;
        if (colIndex < 0 || colIndex >= config.rowKeys.length) return;
        const key = config.rowKeys[colIndex];
        if (!key) return;
        onRowDimWidthChange(key, Math.max(60, Math.round(newSize)));
      }}
      gridSelection={selection}
      getGroupDetails={(g) => ({
        name: g,
        icon: undefined,
      })}
      onGridSelectionChange={(sel) => {
        onSelectionChange(sel);
        const cur = sel.current;
        if (!cur) return;
        if (cur.range.width !== 1 || cur.range.height !== 1) return;
        if (cur.rangeStack.length > 0) return;
        const col = cur.cell[0];
        const row = cur.cell[1];
        if (col < config.rowKeys.length) return;
        const ci = col - config.rowKeys.length;
        const key = `${row}:${ci}`;
        const pivotCell = pivot.cells[key] ?? { value: null, recordIds: [] };
        onSingleValueCellSelected({
          rowIndex: row,
          colIndex: ci,
          row: pivot.rowTuples[row] ?? {},
          col: pivot.colTuples[ci] ?? {},
          cell: pivotCell,
        });
      }}
    />
  );
}
