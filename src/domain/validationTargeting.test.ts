import { describe, expect, it } from 'vitest';
import {
  classifyValidationIssueTarget,
  groupValidationIssues,
  type ValidationIssue,
} from './validationTargeting';

function makeIssue(overrides: Partial<ValidationIssue> = {}): ValidationIssue {
  return {
    id: 'issue-1',
    severity: 'error',
    scope: 'record',
    rule: 'required',
    message: 'Missing value',
    target: {
      path: '/records/by-id/r1/fields/tons',
      kind: 'field',
      recordId: 'r1',
      fieldKey: 'tons',
    },
    ...overrides,
  };
}

describe('classifyValidationIssueTarget', () => {
  it('classifies dataset-scope issues as dataset-only', () => {
    const issue = makeIssue({
      scope: 'dataset',
      target: {
        path: '/config/measureKey',
        kind: 'dataset',
      },
    });

    expect(classifyValidationIssueTarget(issue)).toBe('dataset-only');
  });

  it('classifies record field issues with a proven unique visible cell as entry-eligible', () => {
    const issue = makeIssue();

    expect(
      classifyValidationIssueTarget(issue, {
        hasUniqueVisibleCellTarget: true,
      }),
    ).toBe('entry-eligible');
  });

  it('classifies explicit working-set issues as bulk-eligible', () => {
    const issue = makeIssue();

    expect(
      classifyValidationIssueTarget(issue, {
        isBulkScopedIssue: true,
        hasUniqueVisibleCellTarget: true,
      }),
    ).toBe('bulk-eligible');
  });

  it('falls back to full-records when the record is known but entry is not safely proven', () => {
    const issue = makeIssue({
      target: {
        path: '/records/by-id/r1',
        kind: 'record',
        recordId: 'r1',
      },
    });

    expect(classifyValidationIssueTarget(issue)).toBe('full-records-eligible');
  });

  it('returns unresolved when there is no trustworthy record or dataset destination', () => {
    const issue = makeIssue({
      target: {
        path: '/schema/fields/tons',
        kind: 'schema',
      },
    });

    expect(classifyValidationIssueTarget(issue, { canOpenInFullRecords: false })).toBe(
      'unresolved',
    );
  });
});

describe('groupValidationIssues', () => {
  it('groups issues by severity and conservative top-level path prefix', () => {
    const issues: ValidationIssue[] = [
      makeIssue({
        id: 'warn-record',
        severity: 'warning',
        target: {
          path: '/records/by-id/r2/fields/vendor',
          kind: 'field',
          recordId: 'r2',
          fieldKey: 'vendor',
        },
      }),
      makeIssue({
        id: 'error-record-b',
        target: {
          path: '/records/by-id/r1/fields/zeta',
          kind: 'field',
          recordId: 'r1',
          fieldKey: 'zeta',
        },
      }),
      makeIssue({
        id: 'error-record-a',
        target: {
          path: '/records/by-id/r1/fields/alpha',
          kind: 'field',
          recordId: 'r1',
          fieldKey: 'alpha',
        },
      }),
      makeIssue({
        id: 'dataset-error',
        scope: 'dataset',
        target: {
          path: '/config/measureKey',
          kind: 'dataset',
        },
      }),
    ];

    const groups = groupValidationIssues(issues);

    expect(groups.map((group) => group.key)).toEqual([
      'error:/config/measureKey',
      'error:/records/by-id',
      'warning:/records/by-id',
    ]);
    expect(groups[1]?.issues.map((issue) => issue.id)).toEqual([
      'error-record-a',
      'error-record-b',
    ]);
  });

  it('returns an empty array for no issues', () => {
    expect(groupValidationIssues([])).toEqual([]);
  });
});
