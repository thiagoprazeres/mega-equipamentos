import { Injectable, inject } from '@angular/core';

import type { CatalogStatus } from '../interfaces/equipamento';
import type { StaffUser, StaffUserRole } from '../interfaces/staff-user';
import { GestorApiService } from './gestor-api.service';

export interface StaffUserEditorInput {
  id?: number;
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
}

@Injectable({ providedIn: 'root' })
export class StaffUserService {
  private readonly api = inject(GestorApiService);

  async listUsers(includeArchived = false): Promise<StaffUser[]> {
    return this.api.request<StaffUser[]>(`/staff-users${includeArchived ? '?includeArchived=1' : ''}`);
  }

  async listSellers(includeArchived = false): Promise<StaffUser[]> {
    const search = new URLSearchParams({ role: 'vendedor' });

    if (includeArchived) {
      search.set('includeArchived', '1');
    }

    return this.api.request<StaffUser[]>(`/staff-users?${search.toString()}`);
  }

  async saveUser(input: StaffUserEditorInput): Promise<StaffUser> {
    return this.api.request<StaffUser>('/staff-users', { method: 'POST', body: input });
  }

  async archiveUser(id: number): Promise<void> {
    await this.updateUserStatus(id, 'archived');
  }

  async restoreUser(id: number): Promise<void> {
    await this.updateUserStatus(id, 'active');
  }

  private async updateUserStatus(id: number, status: CatalogStatus): Promise<void> {
    await this.api.request(`/staff-users/${id}/status`, { method: 'PATCH', body: { status } });
  }
}
