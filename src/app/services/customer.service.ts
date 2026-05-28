import { Injectable, inject } from '@angular/core';

import type { Customer } from '../interfaces/customer';
import type { CatalogStatus } from '../interfaces/equipamento';
import { SupabaseClientService } from './supabase-client.service';

interface CustomerRow {
  id: number;
  nome: string;
  document: string;
  email: string;
  phone: string;
  whatsapp: string;
  zip_code: string;
  address: string;
  city: string;
  state: string;
  notes: string;
  status: CatalogStatus;
  created_at: string;
  updated_at: string;
}

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
  private readonly supabase = inject(SupabaseClientService);

  async listCustomers(includeArchived = false): Promise<Customer[]> {
    const client = await this.supabase.requireClient();
    let query = client
      .from('customers')
      .select('*')
      .order('nome', { ascending: true })
      .order('id', { ascending: true });

    if (!includeArchived) {
      query = query.eq('status', 'active');
    }

    const { data, error } = await query;

    if (error || !data) {
      throw error ?? new Error('Não foi possível carregar os clientes.');
    }

    return (data as CustomerRow[]).map(mapCustomerRow);
  }

  async saveCustomer(input: CustomerEditorInput): Promise<Customer> {
    const client = await this.supabase.requireClient();
    const customerPayload = {
      nome: input.nome.trim(),
      document: normalizeTextInput(input.document),
      email: normalizeTextInput(input.email).toLowerCase(),
      phone: normalizeTextInput(input.phone),
      whatsapp: normalizeTextInput(input.whatsapp),
      zip_code: normalizeTextInput(input.zipCode),
      address: normalizeTextInput(input.address),
      city: normalizeTextInput(input.city),
      state: normalizeTextInput(input.state).toUpperCase(),
      notes: normalizeTextInput(input.notes),
      status: input.status ?? 'active',
    };
    const response = input.id
      ? await client.from('customers').update(customerPayload).eq('id', input.id).select('*').single()
      : await client.from('customers').insert(customerPayload).select('*').single();

    if (response.error || !response.data) {
      throw response.error ?? new Error('Não foi possível salvar o cliente.');
    }

    return mapCustomerRow(response.data as CustomerRow);
  }

  async archiveCustomer(id: number): Promise<void> {
    await this.updateCustomerStatus(id, 'archived');
  }

  async restoreCustomer(id: number): Promise<void> {
    await this.updateCustomerStatus(id, 'active');
  }

  private async updateCustomerStatus(id: number, status: CatalogStatus): Promise<void> {
    const client = await this.supabase.requireClient();
    const { error } = await client.from('customers').update({ status }).eq('id', id);

    if (error) {
      throw error;
    }
  }
}

function mapCustomerRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    nome: row.nome,
    document: row.document || undefined,
    email: row.email || undefined,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    zipCode: row.zip_code || undefined,
    address: row.address || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    notes: row.notes || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTextInput(value?: string | null): string {
  return value?.trim() ?? '';
}
