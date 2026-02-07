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
    styleRules?: {
      none?: { bg?: string; text?: string };
      some?: { bg?: string; text?: string };
      all?: { bg?: string; text?: string };
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

  /**
   * Row filters constrain which row-dimension members are included.
   * Each key is a row dim key; the value is the allowed set (multi-select).
   * Empty/undefined means "all".
   */
  rowFilters?: Record<string, unknown[]>;

  slicerKeys: string[];
  /**
   * Slicer values are exact-match filters.
   * Each key may be set to a single value or an array of allowed values.
   */
  slicers: Record<string, unknown | unknown[]>;

  measureKey: string;
}

export interface PivotCell {
  value: number | null;
  recordIds: string[];
  /** counts of TRUE flags within this cell, keyed by field key */
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
