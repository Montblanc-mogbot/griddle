import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import type { DatasetFileV1, PivotConfig, PivotResult } from '../domain/types';
import { makeAgGridTable } from './agGridAdapter';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

// AG Grid v35+ requires module registration.
ModuleRegistry.registerModules([AllCommunityModule]);

export function AgGridPivotSpike(props: {
  dataset: DatasetFileV1;
  pivot: PivotResult;
  config: PivotConfig;
}) {
  const { dataset, pivot, config } = props;

  const { columnDefs, rowData } = makeAgGridTable(pivot, config);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontSize: 12, color: '#666' }}>
        AG Grid spike (Community). Try click-drag to range select. Hold Ctrl/Cmd to attempt multi-range.
      </div>

      <div className="ag-theme-quartz" style={{ height: 520, width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{ resizable: true }}
          // v35+: use new cell selection API (replaces enableRangeSelection)
          cellSelection={{ suppressMultiRanges: false }}
          onRangeSelectionChanged={(e) => {
            const ranges = e.api.getCellRanges();
            console.log('rangeSelectionChanged', ranges);
          }}
          onCellClicked={(e) => {
            console.log('cellClicked', {
              rowIndex: e.rowIndex,
              colId: e.column?.getColId(),
              value: e.value,
            });
          }}
        />
      </div>

      <div style={{ fontSize: 12, color: '#666' }}>
        Dataset: <b>{dataset.name}</b> | Records: {dataset.records.length}
      </div>
    </div>
  );
}
