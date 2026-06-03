export type FinancialEntryType = 'income' | 'expense';
export type FinancialEntryStatus = 'pending' | 'confirmed' | 'cancelled';
export type FinancialEntrySource = 'manual' | 'invoice_pix';

export interface FinancialEntry {
  id: number;
  entryId: string;
  type: FinancialEntryType;
  source: FinancialEntrySource;
  sourceId?: number;
  description: string;
  category?: string;
  amountCents: number;
  movementDate: string;
  status: FinancialEntryStatus;
  notes?: string;
  contractId?: number;
  contractNumber?: string;
  customerName?: string;
  customerDocument?: string;
  createdAt?: string;
  updatedAt?: string;
}
