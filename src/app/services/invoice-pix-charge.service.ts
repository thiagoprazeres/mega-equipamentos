import { Injectable, inject } from '@angular/core';

import type { InvoicePixCharge, InvoicePixChargeStatus } from '../interfaces/invoice-pix-charge';
import type { RentalPaymentMethod } from '../interfaces/rental-contract';
import { GestorApiService } from './gestor-api.service';

export interface CreateInvoicePixChargeInput {
  contractId: number;
  dueDate: string;
  additionalInfo?: string;
}

export interface ConfirmInvoicePixChargeInput {
  endToEndId?: string;
  paymentMethod?: RentalPaymentMethod;
  paidAmountCents: number;
  paidAt?: string;
  payerName?: string;
  payerDocument?: string;
}

export interface InvoicePixChargeListOptions {
  status?: InvoicePixChargeStatus | 'all';
  contractId?: number;
}

@Injectable({ providedIn: 'root' })
export class InvoicePixChargeService {
  private readonly api = inject(GestorApiService);

  async listCharges(options: InvoicePixChargeListOptions = {}): Promise<InvoicePixCharge[]> {
    const params = new URLSearchParams();

    if (options.status && options.status !== 'all') {
      params.set('status', options.status);
    }

    if (options.contractId) {
      params.set('contractId', String(options.contractId));
    }

    return this.api.request<InvoicePixCharge[]>(
      `/invoice-charges${params.size ? `?${params.toString()}` : ''}`
    );
  }

  async createCharge(input: CreateInvoicePixChargeInput): Promise<InvoicePixCharge> {
    return this.api.request<InvoicePixCharge>('/invoice-charges', {
      method: 'POST',
      body: input,
    });
  }

  async confirmCharge(id: number, input: ConfirmInvoicePixChargeInput): Promise<InvoicePixCharge> {
    return this.api.request<InvoicePixCharge>(`/invoice-charges/${id}/confirm`, {
      method: 'PATCH',
      body: input,
    });
  }
}
