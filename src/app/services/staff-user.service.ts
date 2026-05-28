import { Injectable, inject } from '@angular/core';

import type { CatalogStatus } from '../interfaces/equipamento';
import type { StaffUser, StaffUserRole } from '../interfaces/staff-user';
import { SupabaseClientService } from './supabase-client.service';

interface StaffUserRow {
  id: number;
  auth_user_id: string | null;
  nome: string;
  role: StaffUserRole;
  document: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  notes: string;
  status: CatalogStatus;
  created_at: string;
  updated_at: string;
}

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
  private readonly supabase = inject(SupabaseClientService);

  async listUsers(includeArchived = false): Promise<StaffUser[]> {
    const client = await this.supabase.requireClient();
    let query = client
      .from('staff_users')
      .select('*')
      .order('nome', { ascending: true })
      .order('id', { ascending: true });

    if (!includeArchived) {
      query = query.eq('status', 'active');
    }

    const { data, error } = await query;

    if (error || !data) {
      throw error ?? new Error('Não foi possível carregar os usuários.');
    }

    return (data as StaffUserRow[]).map(mapStaffUserRow);
  }

  async listSellers(includeArchived = false): Promise<StaffUser[]> {
    const users = await this.listUsers(includeArchived);
    return users.filter((user) => user.role === 'vendedor');
  }

  async saveUser(input: StaffUserEditorInput): Promise<StaffUser> {
    const client = await this.supabase.requireClient();
    const userPayload = {
      auth_user_id: normalizeNullableTextInput(input.authUserId),
      nome: input.nome.trim(),
      role: input.role,
      document: normalizeTextInput(input.document),
      email: normalizeTextInput(input.email).toLowerCase(),
      phone: normalizeTextInput(input.phone),
      whatsapp: normalizeTextInput(input.whatsapp),
      address: normalizeTextInput(input.address),
      notes: normalizeTextInput(input.notes),
      status: input.status ?? 'active',
    };
    const response = input.id
      ? await client.from('staff_users').update(userPayload).eq('id', input.id).select('*').single()
      : await client.from('staff_users').insert(userPayload).select('*').single();

    if (response.error || !response.data) {
      throw response.error ?? new Error('Não foi possível salvar o usuário.');
    }

    return mapStaffUserRow(response.data as StaffUserRow);
  }

  async archiveUser(id: number): Promise<void> {
    await this.updateUserStatus(id, 'archived');
  }

  async restoreUser(id: number): Promise<void> {
    await this.updateUserStatus(id, 'active');
  }

  private async updateUserStatus(id: number, status: CatalogStatus): Promise<void> {
    const client = await this.supabase.requireClient();
    const { error } = await client.from('staff_users').update({ status }).eq('id', id);

    if (error) {
      throw error;
    }
  }
}

function mapStaffUserRow(row: StaffUserRow): StaffUser {
  return {
    id: row.id,
    authUserId: row.auth_user_id ?? undefined,
    nome: row.nome,
    role: normalizeStaffUserRole(row.role),
    document: row.document || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    address: row.address || undefined,
    notes: row.notes || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTextInput(value?: string | null): string {
  return value?.trim() ?? '';
}

function normalizeNullableTextInput(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function normalizeStaffUserRole(value: string | null | undefined): StaffUserRole {
  return value === 'admin' || value === 'operador' || value === 'financeiro' ? value : 'vendedor';
}
