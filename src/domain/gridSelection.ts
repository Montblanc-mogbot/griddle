import type { GridSelection, Rectangle } from '@glideapps/glide-data-grid';
import type { PivotConfig, PivotResult } from './types';

export function allSelectedRanges(sel: GridSelection | null | undefined): Rectangle[] {
  if (!sel?.current) return [];
  return [sel.current.range, ...sel.current.rangeStack];
}

export function isSingleCellRange(r: Rectangle): boolean {
  return r.width === 1 && r.height === 1;
}

export function getRecordIdsForGridSelection(args: {
  pivot: PivotResult;
  config: PivotConfig;
  selection: GridSelection | null | undefined;
}): { recordIds: string[]; cellCount: number } {
  const { pivot, config, selection } = args;
  const ranges = allSelectedRanges(selection);
  const rowDimCols = config.rowKeys.length;

  const ids = new Set<string>();
  let cells = 0;

  for (const r of ranges) {
    for (let y = r.y; y < r.y + r.height; y++) {
      if (y < 0 || y >= pivot.rowTuples.length) continue;
      for (let x = r.x; x < r.x + r.width; x++) {
        if (x < rowDimCols) continue; // ignore row-dim columns
        const ci = x - rowDimCols;
        if (ci < 0 || ci >= pivot.colTuples.length) continue;
        const cell = pivot.cells[`${y}:${ci}`];
        if (!cell) continue;
        cells++;
        for (const id of cell.recordIds) ids.add(id);
      }
    }
  }

  return { recordIds: Array.from(ids), cellCount: cells };
}
