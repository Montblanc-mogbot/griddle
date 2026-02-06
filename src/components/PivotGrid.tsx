import type { PivotConfig, PivotResult, SelectedCell, Tuple } from '../domain/types';

function tupleEquals(keys: string[], a: Tuple, b: Tuple): boolean {
  return keys.every((k) => (a[k] ?? '') === (b[k] ?? ''));
}

function buildColHeaderRows(colKeys: string[], colTuples: Tuple[]) {
  // For each header row i, group consecutive columns by prefix [0..i]
  return colKeys.map((key, depth) => {
    const cells: Array<{ label: string; colSpan: number }> = [];

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

      cells.push({ label: base[key] ?? '', colSpan: i - start });
    }

    return { key, depth, cells };
  });
}

export function PivotGrid(props: {
  pivot: PivotResult;
  config: PivotConfig;
  selected?: SelectedCell | null;
  onSelect?: (sel: SelectedCell) => void;
}) {
  const { pivot, config, selected, onSelect } = props;

  const colHeaderRows = buildColHeaderRows(config.colKeys, pivot.colTuples);

  return (
    <div style={{ overflow: 'auto', border: '1px solid #ddd', borderRadius: 6 }}>
      <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
        <thead>
          {colHeaderRows.map((row) => (
            <tr key={row.key}>
              {/* top-left corner: blank cells to align row headers */}
              {config.rowKeys.map((rk) => (
                <th
                  key={`${row.key}-corner-${rk}`}
                  style={{
                    position: 'sticky',
                    left: 0,
                    top: 0,
                    background: '#fafafa',
                    borderBottom: '1px solid #ddd',
                    borderRight: '1px solid #ddd',
                    padding: '6px 8px',
                    textAlign: 'left',
                    zIndex: 4,
                    minWidth: 140,
                  }}
                >
                  {row.depth === colHeaderRows.length - 1 ? rk : ''}
                </th>
              ))}

              {row.cells.map((c, idx) => (
                <th
                  key={`${row.key}-${idx}`}
                  colSpan={c.colSpan}
                  style={{
                    position: 'sticky',
                    top: 0,
                    borderBottom: '1px solid #ddd',
                    borderRight: '1px solid #eee',
                    padding: '6px 8px',
                    background: '#fafafa',
                    textAlign: 'center',
                    fontWeight: 600,
                    zIndex: 3,
                  }}
                >
                  {c.label || '(blank)'}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {pivot.rowTuples.map((rt, ri) => (
            <tr key={ri}>
              {config.rowKeys.map((rk) => (
                <th
                  key={`${ri}-${rk}`}
                  style={{
                    position: 'sticky',
                    left: 0,
                    background: '#fff',
                    borderRight: '1px solid #ddd',
                    borderBottom: '1px solid #eee',
                    padding: '6px 8px',
                    textAlign: 'left',
                    zIndex: 2,
                    minWidth: 140,
                  }}
                >
                  {rt[rk] || '(blank)'}
                </th>
              ))}

              {pivot.colTuples.map((ct, ci) => {
                const key = `${ri}:${ci}`;
                const cell = pivot.cells[key] ?? { value: null, recordIds: [] };
                const isSelected =
                  selected &&
                  selected.rowIndex === ri &&
                  selected.colIndex === ci &&
                  tupleEquals(config.rowKeys, selected.row, rt) &&
                  tupleEquals(config.colKeys, selected.col, ct);

                return (
                  <td
                    key={key}
                    onClick={() =>
                      onSelect?.({
                        rowIndex: ri,
                        colIndex: ci,
                        row: rt,
                        col: ct,
                        cell,
                      })
                    }
                    style={{
                      borderBottom: '1px solid #eee',
                      borderRight: '1px solid #eee',
                      padding: '6px 8px',
                      textAlign: 'right',
                      cursor: 'pointer',
                      background: isSelected ? '#e6fffb' : '#fff',
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: 80,
                      userSelect: 'none',
                    }}
                  >
                    {cell.value === null ? '' : cell.value.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
