import type { ColDef, ColGroupDef } from 'ag-grid-community';
import type { PivotConfig, PivotResult, Tuple } from '../domain/types';
import { formatNumber } from '../domain/format';

function colTupleId(colKeys: string[], tuple: Tuple): string {
  // stable-ish id; ok for spike
  return colKeys.map((k) => `${k}=${tuple[k] ?? ''}`).join('|');
}

export function makeAgGridTable(pivot: PivotResult, config: PivotConfig): {
  columnDefs: Array<ColDef | ColGroupDef>;
  rowData: Array<Record<string, unknown>>;
} {
  const colIds = pivot.colTuples.map((ct) => colTupleId(config.colKeys, ct));

  const rowDimDefs: ColDef[] = config.rowKeys.map((rk) => ({
    field: rk,
    headerName: rk,
    pinned: 'left' as const,
    sortable: true,
    filter: true,
  }));

  const leafCols: ColDef[] = pivot.colTuples.map((ct, idx) => {
    const id = colIds[idx];
    const headerName = (config.colKeys.at(-1) && ct[config.colKeys.at(-1)!]) || '';
    return {
      field: id,
      headerName: headerName || '(blank)',
      editable: false,
      valueFormatter: (p) => {
        const v = p.value;
        if (typeof v === 'number' && Number.isFinite(v)) return formatNumber(v);
        return v ?? '';
      },
    } as ColDef;
  });

  function buildColGroups(depth: number, tupleIdxs: number[]): Array<ColDef | ColGroupDef> {
    const key = config.colKeys[depth];
    if (!key) return [];

    // If last key, return leaf columns in that order
    if (depth === config.colKeys.length - 1) {
      return tupleIdxs.map((i) => leafCols[i]);
    }

    const groups = new Map<string, number[]>();
    for (const i of tupleIdxs) {
      const label = pivot.colTuples[i]?.[key] ?? '';
      groups.set(label, [...(groups.get(label) ?? []), i]);
    }

    return Array.from(groups.entries()).map(([label, idxs]) => ({
      headerName: label || '(blank)',
      children: buildColGroups(depth + 1, idxs),
    }));
  }

  const colDimDefs: Array<ColDef | ColGroupDef> =
    config.colKeys.length <= 1
      ? leafCols.map((c, i) => ({ ...c, headerName: config.colKeys.length ? pivot.colTuples[i]?.[config.colKeys[0]] ?? '(blank)' : c.headerName }))
      : buildColGroups(0, pivot.colTuples.map((_t, i) => i));

  const columnDefs: Array<ColDef | ColGroupDef> = [...rowDimDefs, ...colDimDefs];

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
