import { describe, expect, it } from 'vitest';
import {
  classifyValidationIssueTarget,
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
