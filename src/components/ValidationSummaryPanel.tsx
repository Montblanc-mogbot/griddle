import type { ValidationIssue, ValidationIssueGroup, ValidationIssueSectionSummary } from '../domain/validationTargeting';
import styles from './validationSummaryPanel.module.css';

export type ValidationNavigationMode = 'entry' | 'full-records' | 'none';

export interface ValidationSummarySectionNavigationState {
  mode: ValidationNavigationMode;
  label: string;
}

export interface ValidationIssueNavigationState {
  mode: ValidationNavigationMode;
  label: string;
}

export function ValidationSummaryPanel(props: {
  totalCount: number;
  groups: ValidationIssueGroup[];
  summaries: ValidationIssueSectionSummary[];
  getSectionNavigationState: (group: ValidationIssueGroup) => ValidationSummarySectionNavigationState;
  getIssueNavigationState: (issue: ValidationIssue) => ValidationIssueNavigationState;
  onClose: () => void;
  onNavigateSection: (group: ValidationIssueGroup) => void;
  onNavigateIssue: (issue: ValidationIssue) => void;
}) {
  const {
    totalCount,
    groups,
    summaries,
    getSectionNavigationState,
    getIssueNavigationState,
    onClose,
    onNavigateSection,
    onNavigateIssue,
  } = props;

  return (
    <section className={styles.panel} aria-label="Validation summary">
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Validation summary</div>
          <div className={styles.subtitle}>{totalCount} issue{totalCount === 1 ? '' : 's'} in deterministic helper groups</div>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>

      {groups.length === 0 ? (
        <div className={styles.emptyState}>No validation issues to review.</div>
      ) : (
        <div className={styles.sections}>
          {groups.map((group) => {
            const summary = summaries.find((candidate) => candidate.key === group.key);
            const sectionNavigation = getSectionNavigationState(group);

            return (
              <section key={group.key} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div>
                    <div className={styles.sectionTitleRow}>
                      <span className={`${styles.severityBadge} ${styles[`severity_${group.severity}`]}`}>{group.severity}</span>
                      <span className={styles.sectionTitle}>{summary?.label ?? group.pathPrefix}</span>
                    </div>
                    <div className={styles.sectionMeta}>{summary?.count ?? group.issues.length} issue{(summary?.count ?? group.issues.length) === 1 ? '' : 's'}</div>
                  </div>
                  {sectionNavigation.mode === 'none' ? (
                    <span className={styles.inlineHint}>{sectionNavigation.label}</span>
                  ) : (
                    <button type="button" className={styles.navButton} onClick={() => onNavigateSection(group)}>
                      {sectionNavigation.label}
                    </button>
                  )}
                </div>

                <ul className={styles.issueList}>
                  {group.issues.map((issue) => {
                    const navigation = getIssueNavigationState(issue);
                    return (
                      <li key={issue.id} className={styles.issueRow}>
                        <div className={styles.issueCopy}>
                          <div className={styles.issueMessage}>{issue.message}</div>
                          <div className={styles.issueMeta}>{issue.rule} · {issue.target.path}</div>
                          {issue.suggestion ? <div className={styles.issueSuggestion}>{issue.suggestion}</div> : null}
                        </div>
                        {navigation.mode === 'none' ? (
                          <span className={styles.inlineHint}>{navigation.label}</span>
                        ) : (
                          <button type="button" className={styles.navButton} onClick={() => onNavigateIssue(issue)}>
                            {navigation.label}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
