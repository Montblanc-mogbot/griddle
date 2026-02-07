import { useRef, useState } from 'react';
import type { DatasetFileV1, PivotConfig } from '../domain/types';
import { parseDatasetJson, serializeDataset, validateDataset } from '../domain/datasetIo';
import { buildGriddleFile, parseGriddleJson, serializeGriddleFile } from '../domain/griddleIo';

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
  pivotConfig: PivotConfig;
  onImport: (args: { dataset: DatasetFileV1; pivotConfig?: PivotConfig }) => void;
}) {
  const { dataset, pivotConfig, onImport } = props;

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  function handleExportDatasetJson() {
    setError(null);
    const content = serializeDataset(dataset);
    const filename = `${dataset.name || 'dataset'}.json`;
    downloadTextFile(filename, content);
  }

  function handleExportGriddle() {
    setError(null);
    const gf = buildGriddleFile({ dataset, pivotConfig });
    const content = serializeGriddleFile(gf);
    const filename = `${dataset.name || 'dataset'}.griddle`;
    downloadTextFile(filename, content);
  }

  async function handleImportFile(file: File) {
    setError(null);
    setWarnings([]);

    try {
      const text = await file.text();

      // Prefer .griddle if provided
      if (file.name.toLowerCase().endsWith('.griddle')) {
        const gf = parseGriddleJson(text);
        const w = validateDataset(gf.dataset);
        setWarnings(w);
        onImport({ dataset: gf.dataset, pivotConfig: gf.pivotConfig });
        return;
      }

      const next = parseDatasetJson(text);
      const w = validateDataset(next);
      setWarnings(w);
      onImport({ dataset: next });
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
        accept="application/json,.json,.griddle"
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
        title="Open a .griddle file (preferred) or dataset JSON"
      >
        Open…
      </button>

      <button onClick={handleExportGriddle} style={{ cursor: 'pointer' }} title="Save current griddle (.griddle)">
        Save .griddle
      </button>

      <button
        onClick={handleExportDatasetJson}
        style={{ cursor: 'pointer' }}
        title="Export dataset only as JSON (no UI state)"
      >
        Export dataset.json
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
