import type { RentalBillingPeriod, RentalContractItem } from './rental-contract';

export type RentalQuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface RentalQuoteItem extends RentalContractItem {
  quoteId?: number;
}

export interface RentalQuote {
  id: number;
  quoteNumber: string;
  customerId?: number;
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
  validUntil?: string;
  deliveryAddress?: string;
  worksiteAddress?: string;
  notes?: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  status: RentalQuoteStatus;
  items: RentalQuoteItem[];
  createdAt?: string;
  updatedAt?: string;
}
