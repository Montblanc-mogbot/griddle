import type { GriddleFileV1 } from './griddleFile';
import type { DatasetFileV1, PivotConfig } from './types';
import { DatasetIoError, ensureDatasetV1 } from './datasetIo';

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function asNumber(x: unknown, field: string): number {
  if (typeof x !== 'number' || !Number.isFinite(x)) throw new DatasetIoError(`Expected ${field} to be a number`);
  return x;
}

function asString(x: unknown, field: string): string {
  if (typeof x !== 'string') throw new DatasetIoError(`Expected ${field} to be a string`);
  return x;
}

function asArray(x: unknown, field: string): unknown[] {
  if (!Array.isArray(x)) throw new DatasetIoError(`Expected ${field} to be an array`);
  return x;
}

function ensurePivotConfig(input: unknown): PivotConfig {
  if (!isObject(input)) throw new DatasetIoError('Expected pivotConfig to be an object');

  const rowKeys = asArray(input.rowKeys, 'pivotConfig.rowKeys').map((x, i) => asString(x, `pivotConfig.rowKeys[${i}]`));
  const colKeys = asArray(input.colKeys, 'pivotConfig.colKeys').map((x, i) => asString(x, `pivotConfig.colKeys[${i}]`));

  const slicerKeys = asArray(input.slicerKeys ?? [], 'pivotConfig.slicerKeys').map((x, i) =>
    asString(x, `pivotConfig.slicerKeys[${i}]`),
  );

  const slicers = isObject(input.slicers) ? input.slicers : {};
  const measureKey = asString(input.measureKey ?? '', 'pivotConfig.measureKey');

  const rowFilters = isObject(input.rowFilters) ? (input.rowFilters as Record<string, unknown[]>) : {};

  return {
    rowKeys,
    colKeys,
    rowFilters,
    slicerKeys,
    slicers,
    measureKey,
  };
}

export function ensureGriddleFileV1(input: unknown): GriddleFileV1 {
  if (!isObject(input)) throw new DatasetIoError('Expected griddle file to be an object');

  const fileType = asString(input.fileType, 'fileType');
  if (fileType !== 'griddle') throw new DatasetIoError('Not a griddle file (missing fileType="griddle")');

  const version = asNumber(input.version, 'version');
  if (version !== 1) throw new DatasetIoError(`Unsupported griddle file version: ${version}`);

  const dataset = ensureDatasetV1(input.dataset);
  const pivotConfig = ensurePivotConfig(input.pivotConfig);

  return { fileType: 'griddle', version: 1, dataset, pivotConfig };
}

export function parseGriddleJson(text: string): GriddleFileV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DatasetIoError('Invalid JSON');
  }
  return ensureGriddleFileV1(parsed);
}

export function serializeGriddleFile(file: GriddleFileV1): string {
  return JSON.stringify(file, null, 2) + '\n';
}

export function buildGriddleFile(args: {
  dataset: DatasetFileV1;
  pivotConfig: PivotConfig;
}): GriddleFileV1 {
  const { dataset, pivotConfig } = args;
  return {
    fileType: 'griddle',
    version: 1,
    dataset,
    pivotConfig,
  };
}
