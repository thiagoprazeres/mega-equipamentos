import { isValidE2EId, parseE2EId } from '@thiagoprazeres/parse-e2eid';
import {
  buildBrCodeRef,
  generateStaticBrCode,
  projectCity,
  projectReceiverName,
} from '@thiagoprazeres/pix-static-brcode';
import { getInstitution } from 'ispb-banks';
import QRCode from 'qrcode';

export type PixRiskBand = 'low' | 'medium' | 'high' | 'critical';
export type PixRiskVerdict = 'approved' | 'review' | 'rejected';

export interface GeneratedInvoicePixCharge {
  txid: string;
  brcode: string;
  qrCodeDataUrl: string;
  receiverName: string;
  receiverCity: string;
}

export interface ParsedPixEndToEndId {
  endToEndId: string;
  ispb: string;
  initiatedAt: string;
  bankName: string;
}

export interface PixReceiptRiskInput {
  txid: string;
  endToEndId: string;
  expectedAmountCents: number;
  paidAmountCents: number;
  paidAt: string;
  chargeCreatedAt: string;
  payerIspb: string;
  pixKey: string;
  knownEndToEndIds: string[];
  channel: 'manual' | 'api' | 'statement';
}

export interface PixReceiptRiskAnalysis {
  score: number;
  band: PixRiskBand;
  verdict: PixRiskVerdict;
  signals: Array<{ code: string; score: number; message: string }>;
  evidences: Array<{ type: string; value: unknown }>;
}

export async function buildInvoicePixCharge(input: {
  contractNumber: string;
  amountCents: number;
  pixKey: string;
  receiverName: string;
  receiverCity: string;
  description?: string;
}): Promise<GeneratedInvoicePixCharge> {
  const txid = buildInvoiceTxid(input.contractNumber);
  const receiverName = projectReceiverName(input.receiverName || 'MEGA EQUIPAMENTOS LTDA');
  const receiverCity = projectCity(input.receiverCity || 'CARUARU');
  const brcode = generateStaticBrCode({
    pixKey: input.pixKey,
    receiverName,
    receiverCity,
    referenceLabel: buildBrCodeRef(txid),
    amount: Math.max(0, input.amountCents) / 100,
    description: input.description,
  });
  const qrCodeDataUrl = await QRCode.toDataURL(brcode, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
  });

  return { txid, brcode, qrCodeDataUrl, receiverName, receiverCity };
}

export async function buildQrCodeDataUrl(brcode: string): Promise<string> {
  return QRCode.toDataURL(brcode, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
  });
}

export function parsePixReceiptEndToEndId(value: string): ParsedPixEndToEndId {
  const endToEndId = value.trim().toUpperCase();

  if (!isValidE2EId(endToEndId)) {
    throw new Error('EndToEndId inválido.');
  }

  const parsed = parseE2EId(endToEndId);
  const institution = getInstitution(parsed.ispb);

  return {
    endToEndId,
    ispb: parsed.ispb,
    initiatedAt: parsed.initiatedAt.toISOString(),
    bankName: institution?.shortName || institution?.name || 'Banco não identificado',
  };
}

export function analyzePixReceiptRisk(input: PixReceiptRiskInput): PixReceiptRiskAnalysis {
  const signals: PixReceiptRiskAnalysis['signals'] = [];
  const evidences: PixReceiptRiskAnalysis['evidences'] = [
    { type: 'txid', value: input.txid },
    { type: 'e2eid', value: input.endToEndId },
    { type: 'payer_ispb', value: input.payerIspb },
    { type: 'pix_key', value: input.pixKey },
  ];

  if (!isValidE2EId(input.endToEndId)) {
    signals.push({
      code: 'invalid_e2eid',
      score: 200,
      message: 'EndToEndId não segue o formato esperado do SPI.',
    });
  }

  const createdAtMs = Date.parse(input.chargeCreatedAt);
  const paidAtMs = Date.parse(input.paidAt);

  if (Number.isFinite(createdAtMs) && Number.isFinite(paidAtMs)) {
    const elapsedHours = Math.abs(paidAtMs - createdAtMs) / 36e5;
    evidences.push({ type: 'elapsed_hours', value: Number(elapsedHours.toFixed(2)) });

    if (elapsedHours > 24) {
      signals.push({
        code: 'temporal_mismatch',
        score: 150,
        message: 'Pagamento confirmado mais de 24h distante da criação da cobrança.',
      });
    }

    if (elapsedHours > 24 * 7) {
      signals.push({
        code: 'stale_charge',
        score: 100,
        message: 'Cobrança antiga confirmada manualmente.',
      });
    }

    const hour = new Date(paidAtMs).getHours();

    if (hour >= 0 && hour < 6) {
      signals.push({
        code: 'atypical_hour',
        score: 50,
        message: 'Confirmação em horário atípico.',
      });
    }
  }

  const expected = Math.max(0, input.expectedAmountCents);
  const paid = Math.max(0, input.paidAmountCents);
  const diff = Math.abs(expected - paid);
  const tolerance = Math.max(1, Math.round(expected * 0.01));
  evidences.push({ type: 'expected_amount_cents', value: expected });
  evidences.push({ type: 'paid_amount_cents', value: paid });

  if (diff > tolerance) {
    signals.push({
      code: 'amount_mismatch',
      score: 200,
      message: 'Valor recebido diverge mais de 1% do valor esperado.',
    });
  }

  if (input.knownEndToEndIds.includes(input.endToEndId)) {
    signals.push({
      code: 'e2eid_reuse',
      score: 400,
      message: 'EndToEndId já usado em outra conciliação.',
    });
  }

  const score = signals.reduce((total, signal) => total + signal.score, 0);
  const band = riskBand(score);
  const verdict = riskVerdict(band);

  return { score, band, verdict, signals, evidences };
}

function buildInvoiceTxid(contractNumber: string): string {
  const normalizedContract = contractNumber.replace(/[^a-zA-Z0-9]/g, '').slice(-10) || 'FATURA';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `MEGA${normalizedContract}${timestamp}${random}`.slice(0, 35);
}

function riskBand(score: number): PixRiskBand {
  if (score >= 601) {
    return 'critical';
  }

  if (score >= 351) {
    return 'high';
  }

  if (score >= 151) {
    return 'medium';
  }

  return 'low';
}

function riskVerdict(band: PixRiskBand): PixRiskVerdict {
  if (band === 'critical') {
    return 'rejected';
  }

  if (band === 'high') {
    return 'review';
  }

  return 'approved';
}
