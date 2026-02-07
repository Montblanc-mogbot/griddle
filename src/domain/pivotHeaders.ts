import type { PivotConfig, Tuple } from './types';

export interface HeaderSpan {
  label: string;
  span: number; // number of leaf columns covered
}

export interface HeaderRow {
  key: string; // col dimension key
  spans: HeaderSpan[];
}

export function buildColumnHeaderRows(config: PivotConfig, colTuples: Tuple[]): HeaderRow[] {
  const colKeys = config.colKeys;

  return colKeys.map((key, depth) => {
    const spans: HeaderSpan[] = [];

    let i = 0;
    while (i < colTuples.length) {
      const start = i;
      const base = colTuples[i];

      i++;
      while (i < colTuples.length) {
        const samePrefix = colKeys
          .slice(0, depth)
          .every((k) => (colTuples[i][k] ?? '') === (base[k] ?? ''));
        const sameThis = (colTuples[i][key] ?? '') === (base[key] ?? '');
        if (!samePrefix || !sameThis) break;
        i++;
      }

      spans.push({ label: base[key] ?? '', span: i - start });
    }

    return { key, spans };
  });
}
