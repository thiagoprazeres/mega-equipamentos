import type { CatalogStatus } from './equipamento';

export type LeadOrigin =
  | 'indicacao'
  | 'google'
  | 'instagram'
  | 'facebook'
  | 'visita_comercial'
  | 'ligacao_comercial'
  | 'cliente'
  | 'loja'
  | 'whatsapp';

export interface Lead {
  id: number;
  nome: string;
  document?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  zipCode?: string;
  address?: string;
  city?: string;
  state?: string;
  origin: LeadOrigin;
  interestCategoryId?: number;
  interestCategoryName?: string;
  notes?: string;
  customerId?: number;
  status?: CatalogStatus;
  createdAt?: string;
  updatedAt?: string;
}

export const LEAD_ORIGIN_OPTIONS: Array<{ value: LeadOrigin; label: string }> = [
  { value: 'indicacao', label: 'INDICAÇÃO' },
  { value: 'google', label: 'GOOGLE' },
  { value: 'instagram', label: 'INSTAGRAM' },
  { value: 'facebook', label: 'FACEBOOK' },
  { value: 'visita_comercial', label: 'VISITA COMERCIAL' },
  { value: 'ligacao_comercial', label: 'LIGAÇÃO COMERCIAL' },
  { value: 'cliente', label: 'CLIENTE' },
  { value: 'loja', label: 'LOJA' },
  { value: 'whatsapp', label: 'WHATSAPP' },
];

export function leadOriginLabel(origin?: LeadOrigin): string {
  return LEAD_ORIGIN_OPTIONS.find((option) => option.value === origin)?.label ?? 'WHATSAPP';
}
