import { DataEditor, GridCellKind, type GridCell, type Item } from '@glideapps/glide-data-grid';
import '@glideapps/glide-data-grid/dist/index.css';
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

  const columns = [
    ...config.rowKeys.map((rk) => ({ title: rk, id: rk })),
    ...pivot.colTuples.map((ct, idx) => ({ title: colTupleLabel(config, ct), id: `c${idx}` })),
  ];

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
        Glide Data Grid spike. Try drag to select; try Ctrl/Cmd to multi-select. (Note: peer deps may lag
        React 19.)
      </div>

      <div style={{ height: 560 }}>
        <DataEditor
          columns={columns}
          rows={rowCount}
          getCellContent={getCell}
          rowMarkers="both"
          onGridSelectionChange={(sel) => {
            console.log('glide selection', sel);
          }}
        />
      </div>

      <div style={{ fontSize: 12, color: '#666' }}>
        Dataset: <b>{dataset.name}</b> | Records: {dataset.records.length}
      </div>
    </div>
  );
}
