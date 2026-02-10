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
  onSelectionChange: (sel: GridSelection) => void;
  onScrollTx: (tx: number) => void;
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
    onSelectionChange,
    onScrollTx,
    onSingleValueCellSelected,
  } = props;

  const columns = useMemo(
    () => [
      ...config.rowKeys.map((rk) => ({ title: rk, id: rk, width: rowDimWidth })),
      // Column titles are hidden (headerHeight=0). We still need stable ids + widths.
      ...pivot.colTuples.map((_ct, idx) => ({ title: '', id: `c${idx}`, width: valueColWidth })),
    ],
    [config.rowKeys, pivot.colTuples, rowDimWidth, valueColWidth],
  );

  const rowCount = pivot.rowTuples.length;

  function getCell([col, row]: Item): GridCell {
    // Row dims
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

    // Pivot values
    const ci = col - config.rowKeys.length;
    const cell = pivot.cells[`${row}:${ci}`];
    const v = cell?.value;
    const txt = typeof v === 'number' ? formatNumber(v) : '';

    const st = cell ? pickCellStyle(schema, cell) : {};

    return {
      kind: GridCellKind.Number,
      data: v ?? 0,
      displayData: txt,
      allowOverlay: false,
      themeOverride:
        st.bg || st.text
          ? {
              bgCell: st.bg ?? undefined,
              bgCellMedium: st.bg ?? undefined,
              textDark: st.text ?? undefined,
            }
          : undefined,
    };
  }

  const glideTheme = useMemo(() => {
    // Keep these in sync with src/index.css tokens.
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

  return (
    <DataEditor
      key={theme}
      theme={glideTheme}
      columns={columns}
      rows={rowCount}
      getCellContent={getCell}
      headerHeight={0}
      rowMarkers={{ kind: 'both', width: rowMarkersWidth }}
      rangeSelect="multi-rect"
      gridSelection={selection}
      onGridSelectionChange={(sel) => {
        onSelectionChange(sel);

        const cur = sel.current;
        if (!cur) return;

        // Only treat as "single-cell selection" if there is exactly one 1x1 range and no rangeStack.
        if (cur.range.width !== 1 || cur.range.height !== 1) return;
        if (cur.rangeStack.length > 0) return;

        const col = cur.cell[0];
        const row = cur.cell[1];

        // Only open Entry panel for value cells, not row-dimension cells.
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
      onVisibleRegionChanged={(_range, tx) => {
        onScrollTx(tx);
      }}
    />
  );
}
