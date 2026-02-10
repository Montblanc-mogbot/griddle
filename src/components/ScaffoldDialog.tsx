import { useMemo, useState } from 'react';
import type { DatasetFileV1 } from '../domain/types';
import { upsertRecords } from '../domain/records';
import styles from './scaffoldDialog.module.css';

interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
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

  const [dateField, setDateField] = useState(dateFields[0]?.key ?? '');
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' });
  const [includeWeekends, setIncludeWeekends] = useState(true);

  const previewCount = useMemo(() => {
    if (!dateField || !dateRange.start || !dateRange.end) {
      return 0;
    }
    return Array.from(generateDates(
      dateRange.start,
      dateRange.end,
      includeWeekends,
    )).length;
  }, [dateField, dateRange, includeWeekends]);

  const handleGenerate = () => {
    const dates = Array.from(generateDates(dateRange.start, dateRange.end, includeWeekends));
    const now = new Date().toISOString();

    const newRecords = dates.map((date, idx) => ({
      id: `scaffold-${now}-${idx}`,
      createdAt: now,
      updatedAt: now,
      data: {
        [dateField]: date,
      },
    }));

    onDatasetChange(upsertRecords(dataset, newRecords));
    onClose();
  };

  if (dateFields.length === 0) {
    return (
      <div className={styles.overlay}>
        <div className={styles.dialog}>
          <div className={styles.header}>
            <h3>Pre-populate Dates</h3>
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
          <h3>Pre-populate Dates</h3>
          <button onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>
            Generate placeholder records for every date in a range. 
            Records will contain only the date field.
          </p>

          <div className={styles.formGroup}>
            <label>Date field</label>
            <select
              value={dateField}
              onChange={(e) => setDateField(e.target.value)}
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
                value={dateRange.start}
                onChange={(e) => setDateRange(r => ({ ...r, start: e.target.value }))}
              />
            </div>
            <div className={styles.formGroup}>
              <label>End date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(r => ({ ...r, end: e.target.value }))}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={includeWeekends}
                onChange={(e) => setIncludeWeekends(e.target.checked)}
              />
              Include weekends
            </label>
          </div>

          <div className={styles.preview}>
            <strong>Preview:</strong> Will create {previewCount.toLocaleString()} date-only records
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
