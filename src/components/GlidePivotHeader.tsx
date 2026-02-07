import type { PivotConfig, PivotResult } from '../domain/types';
import { buildColumnHeaderRows } from '../domain/pivotHeaders';
import styles from './glidePivotHeader.module.css';

export function GlidePivotHeader(props: {
  pivot: PivotResult;
  config: PivotConfig;
  // DataEditor visible region translate-x (pixels). We use it to sync header scroll.
  scrollTx: number;
  // Widths
  rowDimWidth: number;
  valueColWidth: number;
  rowMarkersWidth: number;
}) {
  const { pivot, config, scrollTx, rowDimWidth, valueColWidth, rowMarkersWidth } = props;

  const headerRows = buildColumnHeaderRows(config, pivot.colTuples);

  const leftWidth = rowMarkersWidth + config.rowKeys.length * rowDimWidth;

  return (
    <div className={styles.wrap}>
      {headerRows.map((hr, rowIdx) => (
        <div key={hr.key} className={styles.row}>
          {/* left header area: row marker + row dimension column titles (only on last header row) */}
          <div className={styles.left} style={{ width: leftWidth }}>
            <div className={styles.rowMarkerStub} style={{ width: rowMarkersWidth }} />
            {rowIdx === headerRows.length - 1
              ? config.rowKeys.map((rk) => (
                  <div key={rk} className={styles.cellLeft} style={{ width: rowDimWidth }} title={rk}>
                    {rk}
                  </div>
                ))
              : config.rowKeys.map((rk) => (
                  <div key={rk} className={styles.leftStub} style={{ width: rowDimWidth }} />
                ))}
          </div>

          <div style={{ display: 'flex', transform: `translateX(${-scrollTx}px)` }}>
            {hr.spans.map((s, idx) => (
              <div
                key={idx}
                className={styles.cell}
                style={{ width: s.span * valueColWidth }}
                title={s.label || '(blank)'}
              >
                {s.label || '(blank)'}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
