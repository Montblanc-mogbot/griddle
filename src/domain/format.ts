export function formatNumber(value: number, opts?: { decimals?: number }): string {
  const decimals = opts?.decimals ?? 2;
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(decimals);
}
