import type { CatalogStatus } from './equipamento';

export type StaffUserRole = 'admin' | 'vendedor' | 'operador' | 'financeiro';

export interface StaffUser {
  id: number;
  authUserId?: string;
  nome: string;
  role: StaffUserRole;
  document?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  notes?: string;
  status?: CatalogStatus;
  createdAt?: string;
  updatedAt?: string;
}
