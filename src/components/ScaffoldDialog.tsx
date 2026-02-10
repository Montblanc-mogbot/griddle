import { useMemo, useState } from 'react';
import type { DatasetFileV1, RecordEntity } from '../domain/types';
import { upsertRecords } from '../domain/records';
import styles from './scaffoldDialog.module.css';

interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

interface ScaffoldConfig {
  dateField: string;
  dateRange: DateRange;
  includeWeekends: boolean;
  otherDims: string[];
  minimal: boolean; // If true, only date field is set
}

function* generateDates(start: string, end: string, includeWeekends: boolean): Generator<string> {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
    
    yield d.toISOString().split('T')[0];
  }
}

function getDimValues(records: RecordEntity[], dimKey: string): string[] {
  const values = new Set<string>();
  for (const r of records) {
    const v = r.data[dimKey];
    if (v !== null && v !== undefined && v !== '') {
      values.add(String(v));
    }
  }
  return Array.from(values).sort();
}

function* cartesianProduct<T>(arrays: T[][]): Generator<T[]> {
  if (arrays.length === 0) {
    yield [];
    return;
  }
  if (arrays.length === 1) {
    for (const item of arrays[0]) {
      yield [item];
    }
    return;
  }
  const [first, ...rest] = arrays;
  for (const item of first) {
    for (const combination of cartesianProduct(rest)) {
      yield [item, ...combination];
    }
  }
}

function generateScaffoldRecords(
  config: ScaffoldConfig,
  dataset: DatasetFileV1,
): RecordEntity[] {
  const dates = Array.from(generateDates(
    config.dateRange.start,
    config.dateRange.end,
    config.includeWeekends,
  ));

  // Get distinct values for other dimensions
  const dimValues = config.otherDims.map((key) => getDimValues(dataset.records, key));
  
  // Create all combinations (or just dates if no other dims)
  const combinations = dimValues.length > 0 
    ? Array.from(cartesianProduct([dates, ...dimValues]))
    : dates.map(d => [d]);
  
  const now = new Date().toISOString();
  
  return combinations.map((combo, idx) => {
    const data: Record<string, unknown> = {
      [config.dateField]: combo[0],
    };
    
    // Add other dimension values (if any)
    for (let i = 0; i < config.otherDims.length; i++) {
      data[config.otherDims[i]] = combo[i + 1];
    }
    
    // In minimal mode, don't add measures or flags
    // Just the date (and any selected dimensions)
    
    const id = `scaffold-${now}-${idx}`;
    return {
      id,
      createdAt: now,
      updatedAt: now,
      data,
    };
  });
}

interface ScaffoldDialogProps {
  dataset: DatasetFileV1;
  onClose: () => void;
  onDatasetChange: (next: DatasetFileV1) => void;
}

export function ScaffoldDialog(props: ScaffoldDialogProps) {
  const { dataset, onClose, onDatasetChange } = props;
  
  const dateFields = useMemo(() => 
    dataset.schema.fields.filter((f) => f.type === 'date'),
    [dataset.schema],
  );
  
  const dimFields = useMemo(() => 
    dataset.schema.fields.filter((f) => 
      f.roles.includes('rowDim') || f.roles.includes('colDim'),
    ),
    [dataset.schema],
  );
  
  const [scaffoldConfig, setScaffoldConfig] = useState<ScaffoldConfig>(() => ({
    dateField: dateFields[0]?.key ?? '',
    dateRange: { start: '', end: '' },
    includeWeekends: true,
    otherDims: [],
    minimal: true, // Default to minimal
  }));
  
  const previewCount = useMemo(() => {
    if (!scaffoldConfig.dateField || !scaffoldConfig.dateRange.start || !scaffoldConfig.dateRange.end) {
      return 0;
    }
    const dates = Array.from(generateDates(
      scaffoldConfig.dateRange.start,
      scaffoldConfig.dateRange.end,
      scaffoldConfig.includeWeekends,
    )).length;
    
    if (scaffoldConfig.otherDims.length === 0) {
      return dates;
    }
    
    const combinations = scaffoldConfig.otherDims.reduce((acc, key) => {
      const values = getDimValues(dataset.records, key);
      return acc * Math.max(1, values.length);
    }, dates);
    
    return combinations;
  }, [scaffoldConfig, dataset.records]);
  
  const handleGenerate = () => {
    const newRecords = generateScaffoldRecords(scaffoldConfig, dataset);
    onDatasetChange(upsertRecords(dataset, newRecords));
    onClose();
  };
  
  if (dateFields.length === 0) {
    return (
      <div className={styles.overlay}>
        <div className={styles.dialog}>
          <div className={styles.header}>
            <h3>Pre-populate Date Range</h3>
            <button onClick={onClose}>×</button>
          </div>
          <div className={styles.content}>
            <p>No date fields found in schema. Add a date field first.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3>Pre-populate Date Range</h3>
          <button onClick={onClose}>×</button>
        </div>
        
        <div className={styles.content}>
          <p className={styles.description}>
            Generate placeholder records for every date in a range. This ensures all dates appear in the pivot, 
            even when no shipments occurred.
          </p>
          
          <div className={styles.formGroup}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={scaffoldConfig.minimal}
                onChange={(e) => setScaffoldConfig(c => ({ ...c, minimal: e.target.checked }))}
              />
              <strong>Minimal records (date only)</strong>
            </label>
            <p className={styles.hint}>
              When enabled, records contain only the date field (and any selected dimensions below).
              No measures or flags are set.
            </p>
          </div>
          
          <div className={styles.formGroup}>
            <label>Date field</label>
            <select
              value={scaffoldConfig.dateField}
              onChange={(e) => setScaffoldConfig(c => ({ ...c, dateField: e.target.value }))}
            >
              {dateFields.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Start date</label>
              <input
                type="date"
                value={scaffoldConfig.dateRange.start}
                onChange={(e) => setScaffoldConfig(c => ({
                  ...c,
                  dateRange: { ...c.dateRange, start: e.target.value },
                }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>End date</label>
              <input
                type="date"
                value={scaffoldConfig.dateRange.end}
                onChange={(e) => setScaffoldConfig(c => ({
                  ...c,
                  dateRange: { ...c.dateRange, end: e.target.value },
                }))}
              />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={scaffoldConfig.includeWeekends}
                onChange={(e) => setScaffoldConfig(c => ({ ...c, includeWeekends: e.target.checked }))}
              />
              Include weekends
            </label>
          </div>
          
          {dimFields.length > 0 && (
            <div className={styles.formGroup}>
              <label>Include dimension combinations (optional)</label>
              <div className={styles.checkboxGroup}>
                {dimFields.map((f) => (
                  <label key={f.key} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={scaffoldConfig.otherDims.includes(f.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setScaffoldConfig(c => ({ ...c, otherDims: [...c.otherDims, f.key] }));
                        } else {
                          setScaffoldConfig(c => ({ ...c, otherDims: c.otherDims.filter(k => k !== f.key) }));
                        }
                      }}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
              <p className={styles.hint}>
                Creates records for every combination of selected dimensions × dates. 
                Leave unchecked for date-only records.
              </p>
            </div>
          )}
          
          <div className={styles.preview}>
            <strong>Preview:</strong> Will create {previewCount.toLocaleString()} placeholder records
            {scaffoldConfig.minimal && ' (date field only)'}
          </div>
        </div>
        
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.secondary}>Cancel</button>
          <button 
            onClick={handleGenerate}
            disabled={previewCount === 0}
            className={styles.primary}
          >
            Generate Records
          </button>
        </div>
      </div>
    </div>
  );
}
