import { Injectable, inject } from '@angular/core';

import type { Lead } from '../interfaces/lead';
import type { StaffUser } from '../interfaces/staff-user';
import type { RentalBillingPeriod, RentalContract } from '../interfaces/rental-contract';
import type { RentalQuote, RentalQuoteItem, RentalQuoteStatus } from '../interfaces/rental-quote';
import { GestorApiService } from './gestor-api.service';

export interface RentalQuoteEditorInput {
  id?: number;
  lead: Lead;
  seller?: StaffUser | null;
  billingPeriod: RentalBillingPeriod;
  rentalPeriodCount: number;
  startDate: string;
  validUntil?: string;
  deliveryAddress?: string;
  worksiteAddress?: string;
  notes?: string;
  status: RentalQuoteStatus;
  items: RentalQuoteItem[];
  shippingCents?: number;
  discountCents?: number;
  surchargeCents?: number;
}

@Injectable({ providedIn: 'root' })
export class RentalQuoteService {
  private readonly api = inject(GestorApiService);

  async listQuotes(): Promise<RentalQuote[]> {
    return this.api.request<RentalQuote[]>('/rental-quotes');
  }

  async saveQuote(input: RentalQuoteEditorInput): Promise<RentalQuote> {
    return this.api.request<RentalQuote>('/rental-quotes', {
      method: 'POST',
      body: input,
    });
  }

  async convertToContract(id: number): Promise<RentalContract> {
    return this.api.request<RentalContract>(`/rental-quotes/${id}/convert-to-contract`, {
      method: 'POST',
    });
  }
}
