import type { CatalogStatus } from './equipamento';

export interface EquipamentoCategoria {
  id: number;
  codigo: string;
  nome: string;
  slug: string;
  name: string;
  icone: string;
  avatar: string;
  avatarHero?: string;
  avatarCard?: string;
  video?: string;
  objetivo: string;
  status?: CatalogStatus;
  sortOrder?: number;
}
