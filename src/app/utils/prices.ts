import type { EquipamentoPreco } from '../interfaces/equipamento';

export const RENTAL_PRICE_FIELDS = [
  { key: 'dailyPriceCents', label: 'Diária' },
  { key: 'weeklyPriceCents', label: 'Semanal' },
  { key: 'fortnightlyPriceCents', label: 'Quinzenal' },
  { key: 'monthlyPriceCents', label: 'Mensal' },
] as const;

export type RentalPriceField = (typeof RENTAL_PRICE_FIELDS)[number]['key'];

export function emptyEquipmentPrices(): EquipamentoPreco {
  return {
    dailyPriceCents: 0,
    weeklyPriceCents: 0,
    fortnightlyPriceCents: 0,
    monthlyPriceCents: 0,
    currency: 'BRL',
  };
}

export function hasAnyRentalPrice(prices?: EquipamentoPreco): boolean {
  return Boolean(
    prices &&
      RENTAL_PRICE_FIELDS.some(({ key }) => Number.isFinite(prices[key]) && prices[key] > 0)
  );
}

export function formatCurrencyCents(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((Number(value) || 0) / 100);
}

export function parseCurrencyToCents(value: unknown): number {
  if (typeof value === 'number') {
    return Math.max(0, Math.round(value * 100));
  }

  const normalized = String(value ?? '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
}

export function centsToDecimalInput(value: number): string {
  return `R$ ${((Number(value) || 0) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function digitsToCurrencyInput(value: unknown): string {
  const digits = String(value ?? '')
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '');
  const cents = Number.parseInt(digits, 10);

  return centsToDecimalInput(Number.isFinite(cents) ? cents : 0);
}
