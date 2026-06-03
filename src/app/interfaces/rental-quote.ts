import type { RentalBillingPeriod, RentalContractItem } from './rental-contract';
import type { LeadOrigin } from './lead';

export type RentalQuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface RentalQuoteItem extends RentalContractItem {
  quoteId?: number;
}

export interface RentalQuote {
  id: number;
  quoteNumber: string;
  leadId?: number;
  leadName: string;
  leadDocument?: string;
  leadEmail?: string;
  leadPhone?: string;
  leadAddress?: string;
  leadCity?: string;
  leadState?: string;
  leadOrigin?: LeadOrigin;
  leadInterestCategoryId?: number;
  leadInterestCategoryName?: string;
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
  rentalPeriodCount: number;
  startDate: string;
  validUntil?: string;
  deliveryAddress?: string;
  worksiteAddress?: string;
  notes?: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  surchargeCents: number;
  totalCents: number;
  status: RentalQuoteStatus;
  items: RentalQuoteItem[];
  createdAt?: string;
  updatedAt?: string;
}
