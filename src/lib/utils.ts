export type QueryResultRow = Record<string, unknown>;

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number, currency = 'RWF'): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calcMargin(cost: number, sell: number): number {
  if (sell <= 0) return 0;
  return ((sell - cost) / sell) * 100;
}

export function calcTax(amount: number, rate: number): number {
  return Math.round(amount * (rate / 100));
}
