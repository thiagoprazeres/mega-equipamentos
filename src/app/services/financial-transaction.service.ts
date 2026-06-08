import { Injectable, inject } from '@angular/core';

import type {
  FinancialEntry,
  FinancialExpenseKind,
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialTransactionCategory,
  FinancialTransactionCategoryStatus,
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
  expenseKind?: FinancialExpenseKind;
  amountCents: number;
  movementDate: string;
  status: FinancialEntryStatus;
  notes?: string;
}

export interface FinancialCategoryListOptions {
  type?: FinancialEntryType | 'all';
  includeArchived?: boolean;
}

export interface FinancialCategoryInput {
  id?: number;
  type: FinancialEntryType;
  name: string;
  expenseKind?: FinancialExpenseKind;
  status: FinancialTransactionCategoryStatus;
  sortOrder?: number;
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

  async listCategories(
    options: FinancialCategoryListOptions = {}
  ): Promise<FinancialTransactionCategory[]> {
    const params = new URLSearchParams();

    if (options.type && options.type !== 'all') {
      params.set('type', options.type);
    }

    if (options.includeArchived) {
      params.set('includeArchived', '1');
    }

    return this.api.request<FinancialTransactionCategory[]>(
      `/financial-categories${params.size ? `?${params.toString()}` : ''}`
    );
  }

  async saveCategory(input: FinancialCategoryInput): Promise<FinancialTransactionCategory> {
    return this.api.request<FinancialTransactionCategory>('/financial-categories', {
      method: 'POST',
      body: input,
    });
  }

  async updateCategoryStatus(
    id: number,
    status: FinancialTransactionCategoryStatus
  ): Promise<void> {
    await this.api.request<{ ok: true }>(`/financial-categories/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  }

  async deleteCategory(id: number): Promise<void> {
    await this.api.request<{ ok: true }>(`/financial-categories/${id}`, {
      method: 'DELETE',
    });
  }
}
