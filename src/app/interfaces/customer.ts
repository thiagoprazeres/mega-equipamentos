import type { CatalogStatus } from './equipamento';

export interface Customer {
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
  notes?: string;
  status?: CatalogStatus;
  createdAt?: string;
  updatedAt?: string;
}
