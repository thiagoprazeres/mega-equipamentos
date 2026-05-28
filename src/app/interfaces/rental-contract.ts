export type RentalBillingPeriod = 'daily' | 'weekly' | 'fortnightly' | 'monthly';
export type RentalContractStatus = 'draft' | 'active' | 'closed' | 'returned' | 'cancelled';

export interface RentalContractItem {
  id?: number;
  contractId?: number;
  equipmentId: number;
  equipmentName: string;
  quantity: number;
  billingPeriod: RentalBillingPeriod;
  unitPriceCents: number;
  totalPriceCents: number;
  assetValueCents?: number;
  sortOrder?: number;
}

export interface RentalContract {
  id: number;
  contractNumber: string;
  previousContractNumber?: string;
  customerId: number;
  customerName: string;
  customerDocument?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerState?: string;
  sellerId?: number;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  billingPeriod: RentalBillingPeriod;
  startDate: string;
  endDate?: string;
  deliveryAddress?: string;
  worksiteAddress?: string;
  notes?: string;
  terms?: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  status: RentalContractStatus;
  items: RentalContractItem[];
  createdAt?: string;
  updatedAt?: string;
}
