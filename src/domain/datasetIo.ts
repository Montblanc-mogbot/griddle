import type { DatasetFileV1, DatasetSchema, FieldDef, FieldRole, FieldType, RecordEntity } from './types';

export class DatasetIoError extends Error {
  name = 'DatasetIoError';
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function asString(x: unknown, field: string): string {
  if (typeof x !== 'string') throw new DatasetIoError(`Expected ${field} to be a string`);
  return x;
}

function asNumber(x: unknown, field: string): number {
  if (typeof x !== 'number' || !Number.isFinite(x))
    throw new DatasetIoError(`Expected ${field} to be a finite number`);
  return x;
}

function asArray(x: unknown, field: string): unknown[] {
  if (!Array.isArray(x)) throw new DatasetIoError(`Expected ${field} to be an array`);
  return x;
}

function asFieldType(x: unknown, field: string): FieldType {
  if (x === 'string' || x === 'number' || x === 'boolean' || x === 'date') return x;
  throw new DatasetIoError(`Expected ${field} to be one of string|number|boolean|date`);
}

function asFieldRole(x: unknown, field: string): FieldRole {
  if (x === 'rowDim' || x === 'colDim' || x === 'slicer' || x === 'measure' || x === 'flag') return x;
  throw new DatasetIoError(`Expected ${field} roles to be one of rowDim|colDim|slicer|measure|flag`);
}

function ensureFieldDef(input: unknown, idx: number): FieldDef {
  if (!isObject(input)) throw new DatasetIoError(`Expected schema.fields[${idx}] to be an object`);
  const key = asString(input.key, `schema.fields[${idx}].key`);
  const label = asString(input.label, `schema.fields[${idx}].label`);
  const type = asFieldType(input.type, `schema.fields[${idx}].type`);
  const rolesRaw = asArray(input.roles, `schema.fields[${idx}].roles`);
  const roles = rolesRaw.map((r, ri) => asFieldRole(r, `schema.fields[${idx}].roles[${ri}]`));

  const fd: FieldDef = { key, label, type, roles };

  if (input.enum !== undefined) {
    const enumRaw = asArray(input.enum, `schema.fields[${idx}].enum`);
    fd.enum = enumRaw.map((v, vi) => asString(v, `schema.fields[${idx}].enum[${vi}]`));
  }

  // entry/measure/flag blocks are optional and left largely unchecked for now
  if (input.entry !== undefined && isObject(input.entry)) {
    fd.entry = {
      showInFastEntry:
        typeof input.entry.showInFastEntry === 'boolean' ? input.entry.showInFastEntry : undefined,
      order: typeof input.entry.order === 'number' ? input.entry.order : undefined,
    };
  }

  if (input.measure !== undefined && isObject(input.measure)) {
    fd.measure = {
      format:
        input.measure.format === 'decimal' ||
        input.measure.format === 'integer' ||
        input.measure.format === 'currency'
          ? input.measure.format
          : undefined,
    };
  }

  if (input.flag !== undefined && isObject(input.flag)) {
    const style = isObject(input.flag.style)
      ? {
          cellClass:
            typeof input.flag.style.cellClass === 'string' ? input.flag.style.cellClass : undefined,
          priority: typeof input.flag.style.priority === 'number' ? input.flag.style.priority : undefined,
        }
      : undefined;

    const styleRules = isObject(input.flag.styleRules)
      ? {
          bg: isObject(input.flag.styleRules.bg)
            ? {
                enabled: input.flag.styleRules.bg.enabled === true,
                some: typeof input.flag.styleRules.bg.some === 'string' ? input.flag.styleRules.bg.some : undefined,
                all: typeof input.flag.styleRules.bg.all === 'string' ? input.flag.styleRules.bg.all : undefined,
              }
            : undefined,
          text: isObject(input.flag.styleRules.text)
            ? {
                enabled: input.flag.styleRules.text.enabled === true,
                some: typeof input.flag.styleRules.text.some === 'string' ? input.flag.styleRules.text.some : undefined,
                all: typeof input.flag.styleRules.text.all === 'string' ? input.flag.styleRules.text.all : undefined,
              }
            : undefined,
        }
      : undefined;

    fd.flag = {
      style,
      styleRules,
    };
  }

  return fd;
}

function ensureSchema(input: unknown): DatasetSchema {
  if (!isObject(input)) throw new DatasetIoError('Expected schema to be an object');
  const version = asNumber(input.version, 'schema.version');
  if (version !== 1) throw new DatasetIoError(`Unsupported schema.version: ${version}`);
  const fieldsRaw = asArray(input.fields, 'schema.fields');
  const fields = fieldsRaw.map((f, i) => ensureFieldDef(f, i));
  return { version: 1, fields };
}

function ensureRecord(input: unknown, idx: number): RecordEntity {
  if (!isObject(input)) throw new DatasetIoError(`Expected records[${idx}] to be an object`);
  const id = asString(input.id, `records[${idx}].id`);
  const createdAt = asString(input.createdAt, `records[${idx}].createdAt`);
  const updatedAt = asString(input.updatedAt, `records[${idx}].updatedAt`);
  if (!isObject(input.data)) throw new DatasetIoError(`Expected records[${idx}].data to be an object`);

  return { id, createdAt, updatedAt, data: input.data };
}

export function ensureDatasetV1(input: unknown): DatasetFileV1 {
  if (!isObject(input)) throw new DatasetIoError('Expected dataset JSON to be an object');

  const version = asNumber(input.version, 'version');
  if (version !== 1) throw new DatasetIoError(`Unsupported dataset version: ${version}`);

  const name = asString(input.name, 'name');
  const schema = ensureSchema(input.schema);
  const recordsRaw = asArray(input.records, 'records');
  const records = recordsRaw.map((r, i) => ensureRecord(r, i));

  return { version: 1, name, schema, records };
}

export function parseDatasetJson(text: string): DatasetFileV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DatasetIoError('Invalid JSON');
  }
  return ensureDatasetV1(parsed);
}

export function serializeDataset(dataset: DatasetFileV1): string {
  return JSON.stringify(dataset, null, 2) + '\n';
}

export function validateDataset(dataset: DatasetFileV1): string[] {
  const warnings: string[] = [];

  const keys = dataset.schema.fields.map((f) => f.key);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  if (dupes.length) warnings.push(`Duplicate field keys in schema: ${Array.from(new Set(dupes)).join(', ')}`);

  const measureKeys = dataset.schema.fields.filter((f) => f.roles.includes('measure')).map((f) => f.key);
  if (measureKeys.length === 0) warnings.push('Schema has no measure fields (role=measure).');

  // Record health (shallow)
  for (const r of dataset.records) {
    if (!r.id) warnings.push('Record with missing id');
    if (!isObject(r.data)) warnings.push(`Record ${r.id} has non-object data`);
  }

  return warnings;
}
