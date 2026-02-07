import type { DatasetSchema } from './types';

/**
 * Sane defaults for fast entry:
 * - measures and flags: show by default
 * - everything else: hidden by default
 */
export function ensureDefaultFastEntry(schema: DatasetSchema): DatasetSchema {
  const nextFields = schema.fields.map((f) => {
    const shouldShow = f.roles.includes('measure') || f.roles.includes('flag');
    const existing = f.entry?.showInFastEntry;
    if (existing !== undefined) return f;

    return {
      ...f,
      entry: {
        ...f.entry,
        showInFastEntry: shouldShow,
      },
    };
  });

  return { ...schema, fields: nextFields };
}
