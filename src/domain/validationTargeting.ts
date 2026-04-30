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

export interface ValidationIssueSectionSummary {
  key: string;
  severity: ValidationSeverity;
  pathPrefix: string;
  label: string;
  count: number;
}

export type ValidationSummaryNavigationTarget =
  | 'entry-eligible'
  | 'full-records-eligible'
  | 'dataset-only'
  | 'unresolved';

export interface ValidationSummaryNavigationContext {
  canOpenInFullRecords?: boolean;
  hasUniqueVisibleFieldTarget?: boolean;
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

function makeValidationSectionLabel(
  severity: ValidationSeverity,
  pathPrefix: string,
): string {
  return `${severity}: ${pathPrefix}`;
}

export function summarizeValidationIssueGroups(
  groups: ValidationIssueGroup[],
): ValidationIssueSectionSummary[] {
  return groups.map((group) => ({
    key: group.key,
    severity: group.severity,
    pathPrefix: group.pathPrefix,
    label: makeValidationSectionLabel(group.severity, group.pathPrefix),
    count: group.issues.length,
  }));
}

/**
 * Conservative first-pass classification for grouped-summary navigation.
 *
 * Summary navigation must reuse the same honest fallbacks as individual issue targeting,
 * but without pretending that a section header can identify one exact visible cell.
 */
export function classifyValidationSummaryNavigationTarget(
  group: ValidationIssueGroup,
  context: ValidationSummaryNavigationContext = {},
): ValidationSummaryNavigationTarget {
  if (group.issues.length === 0) {
    return 'unresolved';
  }

  if (group.issues.some((issue) => issue.scope === 'dataset')) {
    return 'dataset-only';
  }

  const recordIds = new Set(
    group.issues.map((issue) => issue.target.recordId).filter((recordId): recordId is string => Boolean(recordId)),
  );
  const everyIssueTargetsAField = group.issues.every(
    (issue) => issue.target.kind === 'field' && Boolean(issue.target.recordId) && Boolean(issue.target.fieldKey),
  );

  if (
    recordIds.size === 1 &&
    everyIssueTargetsAField &&
    context.hasUniqueVisibleFieldTarget
  ) {
    return 'entry-eligible';
  }

  if (recordIds.size >= 1 && (context.canOpenInFullRecords ?? true)) {
    return 'full-records-eligible';
  }

  return 'unresolved';
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
