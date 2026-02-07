import {
  CompactSelection,
  DataEditor,
  GridCellKind,
  type GridCell,
  type GridSelection,
  type Item,
} from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
import { useMemo, useState } from 'react';
import type { PivotConfig, PivotResult, SelectedCell } from '../domain/types';
import { formatNumber } from '../domain/format';

export function GlidePivotGrid(props: {
  pivot: PivotResult;
  config: PivotConfig;
  rowDimWidth: number;
  valueColWidth: number;
  rowMarkersWidth: number;
  onScrollTx: (tx: number) => void;
  onSingleValueCellSelected: (sel: SelectedCell) => void;
}) {
  const { pivot, config, rowDimWidth, valueColWidth, rowMarkersWidth, onScrollTx, onSingleValueCellSelected } = props;

  const [selection, setSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  });

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
    return {
      kind: GridCellKind.Number,
      data: v ?? 0,
      displayData: txt,
      allowOverlay: false,
    };
  }

  return (
    <DataEditor
      columns={columns}
      rows={rowCount}
      getCellContent={getCell}
      headerHeight={0}
      rowMarkers={{ kind: 'both', width: rowMarkersWidth }}
      rangeSelect="multi-rect"
      gridSelection={selection}
      onGridSelectionChange={(sel) => {
        setSelection(sel);

        const cur = sel.current;
        if (!cur) return;

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
