import type { AxisDomain } from './types';

function* generateDates(start: string, end: string, includeWeekends: boolean): Generator<string> {
  const startDate = new Date(start);
  const endDate = new Date(end);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

    yield d.toISOString().split('T')[0];
  }
}

export function axisDomainValues(domain: AxisDomain | undefined, enumValues?: string[]): string[] {
  if (!domain) return [];

  if (domain.kind === 'enum') return enumValues ?? [];
  if (domain.kind === 'list') return domain.values;
  if (domain.kind === 'dateRange') {
    if (!domain.start || !domain.end) return [];
    return Array.from(generateDates(domain.start, domain.end, domain.includeWeekends ?? true));
  }

  // exhaustive check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _never: any = domain;
  return _never;
}
