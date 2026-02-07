import type { DatasetFileV1, PivotConfig } from './types';

export interface GriddleFileV1 {
  fileType: 'griddle';
  version: 1;
  dataset: DatasetFileV1;
  pivotConfig: PivotConfig;
}
