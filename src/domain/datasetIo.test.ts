import { describe, expect, it } from 'vitest';
import { parseDatasetJson, serializeDataset } from './datasetIo';
import { sampleDataset } from '../sample/sampleDataset';

describe('datasetIo', () => {
  it('serialize + parse roundtrip preserves version/name/record count', () => {
    const json = serializeDataset(sampleDataset);
    const parsed = parseDatasetJson(json);
    expect(parsed.version).toBe(1);
    expect(parsed.name).toBe(sampleDataset.name);
    expect(parsed.records.length).toBe(sampleDataset.records.length);
    expect(parsed.schema.fields.length).toBe(sampleDataset.schema.fields.length);
  });

  it('invalid version yields a helpful error', () => {
    const bad = JSON.stringify({ version: 999, name: 'x', schema: { version: 1, fields: [] }, records: [] });
    expect(() => parseDatasetJson(bad)).toThrow(/Unsupported dataset version/);
  });
});
