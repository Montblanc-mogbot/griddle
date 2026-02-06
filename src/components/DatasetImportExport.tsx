import { useRef, useState } from 'react';
import type { DatasetFileV1 } from '../domain/types';
import { parseDatasetJson, serializeDataset, validateDataset } from '../domain/datasetIo';

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DatasetImportExport(props: {
  dataset: DatasetFileV1;
  onImport: (dataset: DatasetFileV1) => void;
}) {
  const { dataset, onImport } = props;

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  function handleExport() {
    setError(null);
    const content = serializeDataset(dataset);
    const filename = `${dataset.name || 'dataset'}.json`;
    downloadTextFile(filename, content);
  }

  async function handleImportFile(file: File) {
    setError(null);
    setWarnings([]);

    try {
      const text = await file.text();
      const next = parseDatasetJson(text);
      const w = validateDataset(next);
      setWarnings(w);
      onImport(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      setError(msg);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void handleImportFile(file);
          // allow importing same file twice
          e.currentTarget.value = '';
        }}
      />

      <button
        onClick={() => fileRef.current?.click()}
        style={{ cursor: 'pointer' }}
        title="Import a DatasetFileV1 JSON"
      >
        Import JSON
      </button>

      <button onClick={handleExport} style={{ cursor: 'pointer' }} title="Export current dataset as JSON">
        Export JSON
      </button>

      {error ? (
        <span style={{ color: '#c00', fontSize: 12 }}>Import error: {error}</span>
      ) : null}

      {warnings.length ? (
        <details style={{ fontSize: 12, color: '#666' }}>
          <summary style={{ cursor: 'pointer' }}>Warnings ({warnings.length})</summary>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
