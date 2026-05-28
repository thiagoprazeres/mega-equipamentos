import { Injectable, inject } from '@angular/core';

import type { Customer } from '../interfaces/customer';
import type { CatalogStatus } from '../interfaces/equipamento';
import { GestorApiService } from './gestor-api.service';

export interface CustomerEditorInput {
  id?: number;
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
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly api = inject(GestorApiService);

  async listCustomers(includeArchived = false): Promise<Customer[]> {
    return this.api.request<Customer[]>(`/customers${includeArchived ? '?includeArchived=1' : ''}`);
  }

  async saveCustomer(input: CustomerEditorInput): Promise<Customer> {
    return this.api.request<Customer>('/customers', { method: 'POST', body: input });
  }

  async archiveCustomer(id: number): Promise<void> {
    await this.updateCustomerStatus(id, 'archived');
  }

  async restoreCustomer(id: number): Promise<void> {
    await this.updateCustomerStatus(id, 'active');
  }

  private async updateCustomerStatus(id: number, status: CatalogStatus): Promise<void> {
    await this.api.request(`/customers/${id}/status`, { method: 'PATCH', body: { status } });
  }
}
