export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationIssueScope = 'record' | 'dataset';

export interface ValidationTarget {
  path: string;
  kind: 'field' | 'record' | 'dataset' | 'schema' | 'view';
  recordId?: string;
  fieldKey?: string;
  viewId?: string;
}

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  scope: ValidationIssueScope;
  rule: string;
  message: string;
  suggestion?: string;
  target: ValidationTarget;
  meta?: Record<string, unknown>;
}

export type ValidationIssueTargetClass =
  | 'entry-eligible'
  | 'bulk-eligible'
  | 'full-records-eligible'
  | 'dataset-only'
  | 'unresolved';

export interface ValidationTargetingContext {
  hasUniqueVisibleCellTarget?: boolean;
  isBulkScopedIssue?: boolean;
  canOpenInFullRecords?: boolean;
}

/**
 * Conservative first-pass classification for validation navigation.
 *
 * This helper intentionally does not inspect UI state, filters, or pivot layout.
 * Instead, callers provide only the facts they can already prove, so the
 * classification stays honest and easy to replace when richer navigation logic lands.
 */
export function classifyValidationIssueTarget(
  issue: ValidationIssue,
  context: ValidationTargetingContext = {},
): ValidationIssueTargetClass {
  if (issue.scope === 'dataset') {
    return 'dataset-only';
  }

  if (context.isBulkScopedIssue) {
    return 'bulk-eligible';
  }

  const hasRecordId = Boolean(issue.target.recordId);
  const hasFieldKey = Boolean(issue.target.fieldKey);

  if (hasRecordId && hasFieldKey && context.hasUniqueVisibleCellTarget) {
    return 'entry-eligible';
  }

  if (hasRecordId && (context.canOpenInFullRecords ?? true)) {
    return 'full-records-eligible';
  }

  return 'unresolved';
}
