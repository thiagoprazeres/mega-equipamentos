import type { EquipamentoCategoria } from './equipamento-categoria';

export type CatalogStatus = 'active' | 'archived';

export interface EquipamentoPreco {
  dailyPriceCents: number;
  weeklyPriceCents: number;
  fortnightlyPriceCents: number;
  monthlyPriceCents: number;
  currency: 'BRL';
}

export interface Equipamento {
  id: number;
  nome: string;
  nomeTecnico?: string;
  avatar?: string;
  slug: string;
  video?: string;
  descricao: string;
  aplicacao: string;
  tipoDeServico: string;
  periodoDeLocacao: string;
  diferenciais: string;
  equipamentoCategoria: EquipamentoCategoria;
  codigo?: string;
  codigoInterno?: string;
  precos?: EquipamentoPreco;
  assetValueCents?: number;
  totalInvestedCents?: number;
  notes?: string;
  stockQuantity?: number;
  status?: CatalogStatus;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}
