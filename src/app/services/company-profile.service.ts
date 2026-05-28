import { Injectable, inject } from '@angular/core';

import type { CompanyProfile } from '../interfaces/company-profile';
import { GestorApiService } from './gestor-api.service';

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
  private readonly api = inject(GestorApiService);

  async getCompanyProfile(): Promise<CompanyProfile> {
    return this.api.request<CompanyProfile>('/company-profile');
  }

  async saveCompanyProfile(input: CompanyProfileEditorInput): Promise<CompanyProfile> {
    return this.api.request<CompanyProfile>('/company-profile', { method: 'PUT', body: input });
  }
}
