import { Injectable, inject } from '@angular/core';

import type { CatalogStatus } from '../interfaces/equipamento';
import type { Lead, LeadOrigin } from '../interfaces/lead';
import { GestorApiService } from './gestor-api.service';

export interface LeadEditorInput {
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
  origin: LeadOrigin;
  interestCategoryId?: number | null;
  notes?: string;
  customerId?: number;
  status?: CatalogStatus;
}

@Injectable({ providedIn: 'root' })
export class LeadService {
  private readonly api = inject(GestorApiService);

  async listLeads(includeArchived = false): Promise<Lead[]> {
    return this.api.request<Lead[]>(`/leads${includeArchived ? '?includeArchived=1' : ''}`);
  }

  async saveLead(input: LeadEditorInput): Promise<Lead> {
    return this.api.request<Lead>('/leads', { method: 'POST', body: input });
  }

  async archiveLead(id: number): Promise<void> {
    await this.updateLeadStatus(id, 'archived');
  }

  async restoreLead(id: number): Promise<void> {
    await this.updateLeadStatus(id, 'active');
  }

  private async updateLeadStatus(id: number, status: CatalogStatus): Promise<void> {
    await this.api.request(`/leads/${id}/status`, { method: 'PATCH', body: { status } });
  }
}
