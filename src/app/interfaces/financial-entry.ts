export type FinancialEntryType = 'income' | 'expense';
export type FinancialEntryStatus = 'pending' | 'confirmed' | 'cancelled';
export type FinancialEntrySource = 'manual' | 'invoice_pix';
export type FinancialExpenseKind = 'fixed' | 'variable';
export type FinancialTransactionCategoryStatus = 'active' | 'archived';

export interface FinancialEntry {
  id: number;
  entryId: string;
  type: FinancialEntryType;
  source: FinancialEntrySource;
  sourceId?: number;
  description: string;
  category?: string;
  expenseKind?: FinancialExpenseKind;
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

export interface FinancialTransactionCategory {
  id: number;
  type: FinancialEntryType;
  name: string;
  expenseKind?: FinancialExpenseKind;
  status: FinancialTransactionCategoryStatus;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}
