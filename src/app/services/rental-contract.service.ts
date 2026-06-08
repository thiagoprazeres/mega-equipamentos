import { Injectable, inject } from '@angular/core';

import type { Customer } from '../interfaces/customer';
import type { StaffUser } from '../interfaces/staff-user';
import type {
  RentalBillingPeriod,
  RentalContract,
  RentalContractItem,
  RentalContractStatus,
  RentalFinancialStatus,
  RentalOperationalCode,
  RentalPaymentMethod,
} from '../interfaces/rental-contract';
import { GestorApiService } from './gestor-api.service';

export interface RentalContractEditorInput {
  id?: number;
  customer: Customer;
  seller: StaffUser;
  billingPeriod: RentalBillingPeriod;
  rentalPeriodCount: number;
  startDate: string;
  endDate?: string;
  dueDate?: string;
  paymentDate?: string;
  paymentMethod?: RentalPaymentMethod;
  financialStatus?: RentalFinancialStatus;
  deliveryAddress?: string;
  worksiteAddress?: string;
  notes?: string;
  terms?: string;
  status: RentalContractStatus;
  items: RentalContractItem[];
  shippingCents?: number;
  discountCents?: number;
  surchargeCents?: number;
  operationalCode?: RentalOperationalCode;
}

export interface RentalContractListOptions {
  dateFrom?: string;
  dateTo?: string;
  dateMode?: RentalContractDateMode;
}

export type RentalContractDateMode = 'overlap' | 'start' | 'end';

@Injectable({ providedIn: 'root' })
export class RentalContractService {
  private readonly api = inject(GestorApiService);

  async listContracts(options: RentalContractListOptions = {}): Promise<RentalContract[]> {
    const params = new URLSearchParams();

    if (options.dateFrom) {
      params.set('dateFrom', options.dateFrom);
    }

    if (options.dateTo) {
      params.set('dateTo', options.dateTo);
    }

    if (options.dateMode && options.dateMode !== 'overlap') {
      params.set('dateMode', options.dateMode);
    }

    return this.api.request<RentalContract[]>(
      `/rental-contracts${params.size ? `?${params.toString()}` : ''}`
    );
  }

  async saveContract(input: RentalContractEditorInput): Promise<RentalContract> {
    return this.api.request<RentalContract>('/rental-contracts', {
      method: 'POST',
      body: input,
    });
  }

  async updateStatus(id: number, status: RentalContractStatus): Promise<void> {
    await this.api.request<{ ok: true }>(`/rental-contracts/${id}/status`, {
      method: 'PATCH',
      body: { status },
    });
  }
}
