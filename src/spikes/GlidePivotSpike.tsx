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
import type { DatasetFileV1, PivotConfig, PivotResult } from '../domain/types';
import { formatNumber } from '../domain/format';

function colTupleLabel(config: PivotConfig, ct: Record<string, string>): string {
  if (config.colKeys.length === 0) return '';
  // Display all col dims; multi-row headers aren’t a built-in concept here.
  return config.colKeys.map((k) => ct[k] ?? '').join(' / ') || '(blank)';
}

export function GlidePivotSpike(props: {
  dataset: DatasetFileV1;
  pivot: PivotResult;
  config: PivotConfig;
}) {
  const { dataset, pivot, config } = props;

  // DataEditor becomes "controlled selection" when onGridSelectionChange is provided,
  // so we must also provide gridSelection to see selection UI.
  const [selection, setSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  });

  const columns = useMemo(
    () => [
      ...config.rowKeys.map((rk) => ({ title: rk, id: rk })),
      ...pivot.colTuples.map((ct, idx) => ({ title: colTupleLabel(config, ct), id: `c${idx}` })),
    ],
    [config, pivot.colTuples],
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
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 12, color: '#666' }}>
        Glide Data Grid spike. Drag to select a range; try Ctrl/Cmd to create another range.
      </div>

      <div style={{ height: 560 }}>
        <DataEditor
          columns={columns}
          rows={rowCount}
          getCellContent={getCell}
          rowMarkers="both"
          rangeSelect="multi-rect"
          gridSelection={selection}
          onGridSelectionChange={(sel) => {
            setSelection(sel);
            console.log('glide selection', sel);
          }}
        />
      </div>

      <div style={{ fontSize: 12, color: '#666' }}>
        Selected ranges: {selection.current ? 1 + selection.current.rangeStack.length : 0}
      </div>

      <div style={{ fontSize: 12, color: '#666' }}>
        Dataset: <b>{dataset.name}</b> | Records: {dataset.records.length}
      </div>
    </div>
  );
}
