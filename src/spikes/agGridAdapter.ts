import type { ColDef } from 'ag-grid-community';
import type { PivotConfig, PivotResult, Tuple } from '../domain/types';
import { formatNumber } from '../domain/format';

function colTupleId(colKeys: string[], tuple: Tuple): string {
  // stable-ish id; ok for spike
  return colKeys.map((k) => `${k}=${tuple[k] ?? ''}`).join('|');
}

export function makeAgGridTable(pivot: PivotResult, config: PivotConfig): {
  columnDefs: ColDef[];
  rowData: Array<Record<string, unknown>>;
} {
  const colIds = pivot.colTuples.map((ct) => colTupleId(config.colKeys, ct));

  const columnDefs: ColDef[] = [
    ...config.rowKeys.map((rk) => ({
      field: rk,
      headerName: rk,
      pinned: 'left' as const,
      sortable: true,
      filter: true,
    })),
    ...pivot.colTuples.map((ct, idx) => {
      const id = colIds[idx];
      const headerName = config.colKeys.map((k) => ct[k] ?? '').join(' / ') || '(blank)';
      return {
        field: id,
        headerName,
        editable: false,
        valueFormatter: (p) => {
          const v = p.value;
          if (typeof v === 'number' && Number.isFinite(v)) return formatNumber(v);
          return v ?? '';
        },
      } as ColDef;
    }),
  ];

  const rowData = pivot.rowTuples.map((rt, ri) => {
    const row: Record<string, unknown> = {};
    for (const rk of config.rowKeys) row[rk] = rt[rk] ?? '';

    pivot.colTuples.forEach((_ct, ci) => {
      const key = `${ri}:${ci}`;
      const cell = pivot.cells[key];
      const id = colIds[ci];
      row[id] = cell?.value ?? null;
    });

    return row;
  });

  return { columnDefs, rowData };
}
