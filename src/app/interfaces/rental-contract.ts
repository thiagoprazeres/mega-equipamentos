export type RentalBillingPeriod = 'daily' | 'weekly' | 'fortnightly' | 'monthly';
export type RentalContractStatus = 'draft' | 'active' | 'closed' | 'returned' | 'cancelled';
export type RentalFinancialStatus = 'pending' | 'paid' | 'overdue' | 'partial' | 'cancelled';
export type RentalOperationalCode = 'CR' | 'SR' | 'SR/C';
export type RentalPaymentMethod =
  | 'not_defined'
  | 'pix'
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'boleto'
  | 'courtesy'
  | 'other';

export interface RentalContractItem {
  id?: number;
  contractId?: number;
  equipmentId: number;
  equipmentName: string;
  equipmentCategoryName?: string;
  equipmentCategoryCode?: string;
  equipmentCode?: string;
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
  rentalPeriodCount: number;
  startDate: string;
  endDate?: string;
  dueDate?: string;
  paymentDate?: string;
  paymentMethod: RentalPaymentMethod;
  financialStatus: RentalFinancialStatus;
  deliveryAddress?: string;
  worksiteAddress?: string;
  notes?: string;
  terms?: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  surchargeCents: number;
  totalCents: number;
  status: RentalContractStatus;
  operationalCode: RentalOperationalCode;
  items: RentalContractItem[];
  createdAt?: string;
  updatedAt?: string;
}
