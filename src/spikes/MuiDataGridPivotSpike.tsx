import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { DatasetFileV1, PivotConfig, PivotResult } from '../domain/types';
import { formatNumber } from '../domain/format';

function colTupleLabel(config: PivotConfig, ct: Record<string, string>): string {
  if (config.colKeys.length === 0) return '';
  return config.colKeys.map((k) => ct[k] ?? '').join(' / ') || '(blank)';
}

export function MuiDataGridPivotSpike(props: {
  dataset: DatasetFileV1;
  pivot: PivotResult;
  config: PivotConfig;
}) {
  const { dataset, pivot, config } = props;

  const cols: GridColDef[] = [
    ...config.rowKeys.map((rk) => ({
      field: rk,
      headerName: rk,
      width: 140,
    })),
    ...pivot.colTuples.map((ct, ci) => ({
      field: `c${ci}`,
      headerName: colTupleLabel(config, ct),
      width: 140,
      valueFormatter: (v: unknown) => {
        if (typeof v === 'number' && Number.isFinite(v)) return formatNumber(v);
        return v ?? '';
      },
    })),
  ];

  const rows = pivot.rowTuples.map((rt, ri) => {
    const row: Record<string, unknown> = { id: `r${ri}` };
    for (const rk of config.rowKeys) row[rk] = rt[rk] ?? '';
    pivot.colTuples.forEach((_ct, ci) => {
      const cell = pivot.cells[`${ri}:${ci}`];
      row[`c${ci}`] = cell?.value ?? null;
    });
    return row;
  });

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 12, color: '#666' }}>
        MUI X DataGrid (community) spike. This is mainly to observe selection capabilities/limitations.
      </div>

      <div style={{ height: 560, width: '100%' }}>
        <DataGrid
          columns={cols}
          rows={rows}
          disableRowSelectionOnClick
          checkboxSelection
          onRowSelectionModelChange={(model) => {
            console.log('mui rowSelectionModel', model);
          }}
        />
      </div>

      <div style={{ fontSize: 12, color: '#666' }}>
        Dataset: <b>{dataset.name}</b> | Records: {dataset.records.length}
      </div>
    </div>
  );
}
