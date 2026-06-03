import { Injectable, inject } from '@angular/core';

import type {
  FinancialEntry,
  FinancialEntryStatus,
  FinancialEntryType,
} from '../interfaces/financial-entry';
import { GestorApiService } from './gestor-api.service';

export interface FinancialEntryListOptions {
  type?: FinancialEntryType | 'all';
  status?: FinancialEntryStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
}

export interface FinancialTransactionInput {
  id?: number;
  type: FinancialEntryType;
  description: string;
  category?: string;
  amountCents: number;
  movementDate: string;
  status: FinancialEntryStatus;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class FinancialTransactionService {
  private readonly api = inject(GestorApiService);

  async listEntries(options: FinancialEntryListOptions = {}): Promise<FinancialEntry[]> {
    const params = new URLSearchParams();

    if (options.type && options.type !== 'all') {
      params.set('type', options.type);
    }

    if (options.status && options.status !== 'all') {
      params.set('status', options.status);
    }

    if (options.dateFrom) {
      params.set('dateFrom', options.dateFrom);
    }

    if (options.dateTo) {
      params.set('dateTo', options.dateTo);
    }

    return this.api.request<FinancialEntry[]>(
      `/financial-transactions${params.size ? `?${params.toString()}` : ''}`
    );
  }

  async saveTransaction(input: FinancialTransactionInput): Promise<FinancialEntry> {
    return this.api.request<FinancialEntry>('/financial-transactions', {
      method: 'POST',
      body: input,
    });
  }

  async updateStatus(id: number, status: FinancialEntryStatus): Promise<void> {
    await this.api.request<{ ok: true }>(`/financial-transactions/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  }
}
