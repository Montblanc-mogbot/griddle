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

export interface ValidationIssueGroup {
  key: string;
  severity: ValidationSeverity;
  pathPrefix: string;
  issues: ValidationIssue[];
}

function getTopLevelPathPrefix(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/';

  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  if (parts.length === 1) return `/${parts[0]}`;
  return `/${parts[0]}/${parts[1]}`;
}

/**
 * Groups issues for future panel presentation without depending on render state.
 *
 * Current rule: group by severity first, then by a conservative top-level path prefix
 * so dataset/config issues and record-local issues cluster predictably.
 */
export function groupValidationIssues(
  issues: ValidationIssue[],
): ValidationIssueGroup[] {
  const groups = new Map<string, ValidationIssueGroup>();

  for (const issue of issues) {
    const pathPrefix = getTopLevelPathPrefix(issue.target.path);
    const key = `${issue.severity}:${pathPrefix}`;
    const existing = groups.get(key);
    if (existing) {
      existing.issues.push(issue);
      continue;
    }

    groups.set(key, {
      key,
      severity: issue.severity,
      pathPrefix,
      issues: [issue],
    });
  }

  const severityOrder: Record<ValidationSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };

  return [...groups.values()]
    .map((group) => ({
      ...group,
      issues: [...group.issues].sort((a, b) =>
        a.target.path.localeCompare(b.target.path) || a.rule.localeCompare(b.rule) || a.id.localeCompare(b.id),
      ),
    }))
    .sort((a, b) => {
      const severityCmp = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityCmp !== 0) return severityCmp;
      return a.pathPrefix.localeCompare(b.pathPrefix);
    });
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
