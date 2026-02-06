export type FieldRole = 'rowDim' | 'colDim' | 'slicer' | 'measure' | 'flag';

export type FieldType = 'string' | 'number' | 'boolean' | 'date';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  roles: FieldRole[];

  enum?: string[];

  measure?: {
    format?: 'decimal' | 'integer' | 'currency';
  };

  flag?: {
    style?: {
      cellClass?: string;
      priority?: number;
    };
  };
}

export interface DatasetSchema {
  version: 1;
  fields: FieldDef[];
}

export interface RecordEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

export interface DatasetFileV1 {
  version: 1;
  name: string;
  schema: DatasetSchema;
  records: RecordEntity[];
}

export type Tuple = Record<string, string>;

export interface PivotConfig {
  rowKeys: string[];
  colKeys: string[];
  slicerKeys: string[];
  slicers: Record<string, unknown>;
  measureKey: string;
}

export interface PivotCell {
  value: number | null;
  recordIds: string[];
  flagSummary?: Record<string, number>;
}

export interface PivotResult {
  rowTuples: Tuple[];
  colTuples: Tuple[];
  cells: Record<string, PivotCell>; // key: `${rowIndex}:${colIndex}`
}

export interface SelectedCell {
  rowIndex: number;
  colIndex: number;
  row: Tuple;
  col: Tuple;
  cell: PivotCell;
}
