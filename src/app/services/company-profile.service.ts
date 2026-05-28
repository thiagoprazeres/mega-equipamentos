import { Injectable, inject } from '@angular/core';

import type { CompanyProfile } from '../interfaces/company-profile';
import { SupabaseClientService } from './supabase-client.service';

interface CompanyProfileRow {
  id: number;
  legal_name: string;
  trade_name: string;
  document: string;
  pix_key: string;
  email: string;
  gmail_password: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  instagram_login: string;
  instagram_password: string;
  contract_terms: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyProfileEditorInput {
  legalName: string;
  tradeName?: string;
  document?: string;
  pixKey?: string;
  email?: string;
  gmailPassword?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  instagramLogin?: string;
  instagramPassword?: string;
  contractTerms?: string;
}

@Injectable({ providedIn: 'root' })
export class CompanyProfileService {
  private readonly supabase = inject(SupabaseClientService);

  async getCompanyProfile(): Promise<CompanyProfile> {
    const client = await this.supabase.requireClient();
    const { data, error } = await client.from('company_profile').select('*').eq('id', 1).single();

    if (error || !data) {
      throw error ?? new Error('Não foi possível carregar os dados da empresa.');
    }

    return mapCompanyProfileRow(data as CompanyProfileRow);
  }

  async saveCompanyProfile(input: CompanyProfileEditorInput): Promise<CompanyProfile> {
    const client = await this.supabase.requireClient();
    const payload = {
      id: 1,
      legal_name: input.legalName.trim(),
      trade_name: normalizeTextInput(input.tradeName),
      document: normalizeTextInput(input.document),
      pix_key: normalizeTextInput(input.pixKey),
      email: normalizeTextInput(input.email).toLowerCase(),
      gmail_password: normalizeTextInput(input.gmailPassword),
      phone: normalizeTextInput(input.phone),
      whatsapp: normalizeTextInput(input.whatsapp),
      address: normalizeTextInput(input.address),
      city: normalizeTextInput(input.city),
      state: normalizeTextInput(input.state).toUpperCase(),
      zip_code: normalizeTextInput(input.zipCode),
      instagram_login: normalizeTextInput(input.instagramLogin),
      instagram_password: normalizeTextInput(input.instagramPassword),
      contract_terms: normalizeTextInput(input.contractTerms),
    };
    const { data, error } = await client
      .from('company_profile')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error || !data) {
      throw error ?? new Error('Não foi possível salvar os dados da empresa.');
    }

    return mapCompanyProfileRow(data as CompanyProfileRow);
  }
}

function mapCompanyProfileRow(row: CompanyProfileRow): CompanyProfile {
  return {
    id: row.id,
    legalName: row.legal_name,
    tradeName: row.trade_name || undefined,
    document: row.document || undefined,
    pixKey: row.pix_key || undefined,
    email: row.email || undefined,
    gmailPassword: row.gmail_password || undefined,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    address: row.address || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    zipCode: row.zip_code || undefined,
    instagramLogin: row.instagram_login || undefined,
    instagramPassword: row.instagram_password || undefined,
    contractTerms: row.contract_terms || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTextInput(value?: string | null): string {
  return value?.trim() ?? '';
}
