export type FieldRole = 'rowDim' | 'colDim' | 'slicer' | 'measure' | 'flag';

export type FieldType = 'string' | 'number' | 'boolean' | 'date';

export type AxisDomain =
  | { kind: 'enum' }
  | { kind: 'list'; values: string[] }
  | { kind: 'dateRange'; start: string; end: string; includeWeekends?: boolean };

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  roles: FieldRole[];

  enum?: string[];

  /**
   * Entry UI preferences.
   * "Fast entry" is the right-side Entry drawer.
   */
  entry?: {
    showInFastEntry?: boolean;
    order?: number;
  };

  measure?: {
    format?: 'decimal' | 'integer' | 'currency';
  };

  flag?: {
    style?: {
      cellClass?: string;
      priority?: number;
    };
    styleRules?: {
      bg?: {
        enabled: boolean;
        some?: string;
        all?: string;
      };
      text?: {
        enabled: boolean;
        some?: string;
        all?: string;
      };
    };
  };

  pivot?: {
    /**
     * If enabled, axis tuple building will include the full domain even if no records
     * are present for some members (Excel: "show items with no data").
     */
    includeEmptyAxisItems?: boolean;
    axisDomain?: AxisDomain;
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

export interface DimensionFilter {
  dimensionKey: string;
  mode: 'include' | 'exclude';
  values: string[];
}

export interface FilterSet {
  name?: string;
  filters: DimensionFilter[];
}

export interface View {
  id: string;
  name: string;
  filterSet: FilterSet;
  createdAt: string;
}

export interface DatasetFileV1 {
  version: 1;
  name: string;
  schema: DatasetSchema;
  records: RecordEntity[];
  views?: View[];
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
