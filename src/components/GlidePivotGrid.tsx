import {
  DataEditor,
  GridCellKind,
  type GridCell,
  type GridSelection,
  type Item,
} from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import { useMemo } from 'react';
import type { DatasetSchema, PivotConfig, PivotResult, SelectedCell } from '../domain/types';
import { formatNumber } from '../domain/format';
import { pickCellStyle } from '../domain/metadataStyling';

export function GlidePivotGrid(props: {
  pivot: PivotResult;
  schema: DatasetSchema;
  config: PivotConfig;
  theme: 'light' | 'dark';
  rowDimWidth: number;
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
    config,
    theme,
    rowDimWidth,
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
      width: rowDimWidth,
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
  }, [config.rowKeys, config.colKeys, pivot.colTuples, rowDimWidth, valueColWidth]);

  const rowCount = pivot.rowTuples.length;

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
    const txt = typeof v === 'number' ? formatNumber(v) : '';
    const st = cell ? pickCellStyle(schema, cell) : {};

    const themeOverride = (() => {
      if (!st.bg && !st.text) return undefined;
      const out: Record<string, unknown> = {};
      if (st.bg) {
        out.bgCell = st.bg;
        out.bgCellMedium = st.bg;
      }
      if (st.text) {
        out.textDark = st.text;
      }
      return out;
    })();

    return {
      kind: GridCellKind.Number,
      data: v ?? 0,
      displayData: txt,
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
