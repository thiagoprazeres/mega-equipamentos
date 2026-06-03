export type InvoicePixChargeStatus = 'pending' | 'paid' | 'review' | 'rejected' | 'cancelled';

export interface InvoicePixCharge {
  id: number;
  contractId: number;
  contractNumber?: string;
  invoiceNumber: string;
  txid: string;
  brcode: string;
  qrCodeDataUrl?: string;
  pixKey: string;
  receiverName: string;
  receiverCity: string;
  amountCents: number;
  dueDate: string;
  additionalInfo?: string;
  status: InvoicePixChargeStatus;
  endToEndId?: string;
  paidAmountCents: number;
  paidAt?: string;
  payerIspb?: string;
  payerBankName?: string;
  payerName?: string;
  payerDocument?: string;
  riskScore: number;
  riskBand?: string;
  riskVerdict?: string;
  riskSignals?: Array<{ code: string; score: number; message: string }>;
  riskEvidences?: Array<{ type: string; value: unknown }>;
  customerName?: string;
  customerDocument?: string;
  customerPhone?: string;
  createdAt?: string;
  updatedAt?: string;
}
