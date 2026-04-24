export function formatBRL(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPct(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return '0%';
  return `${v.toFixed(digits)}%`;
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return '–';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '–';
  try {
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '–';
  }
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '–';
  try {
    const d = typeof iso === 'string' ? new Date(iso) : iso;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '–';
  }
}

export function formatNumber(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '0';
  return v.toLocaleString('pt-BR');
}

export function truncate(text: string, max = 32): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}
