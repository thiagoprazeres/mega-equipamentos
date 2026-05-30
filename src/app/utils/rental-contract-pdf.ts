import type { CompanyProfile } from '../interfaces/company-profile';
import type { RentalContract, RentalContractItem, RentalBillingPeriod } from '../interfaces/rental-contract';
import type { RentalQuote } from '../interfaces/rental-quote';
import { markdownToContractText } from './contract-terms';
import { formatCurrencyCents } from './prices';

const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  id: 1,
  legalName: 'MEGA EQUIPAMENTOS LTDA',
  tradeName: 'Mega Equipamentos',
  document: '58.471.366/0001-29',
  pixKey: '58.471.366/0001-29',
  email: 'megaequipamentospe@gmail.com',
  phone: '(81) 98555-5943',
  whatsapp: '(81) 98555-5943',
  address: 'Av. Zé Tatú, 11B - Jardim Boa Vista',
  city: 'Caruaru',
  state: 'PE',
  zipCode: '55038-220',
};

const PERIOD_LABELS: Record<RentalBillingPeriod, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  fortnightly: 'Quinzenal',
  monthly: 'Mensal',
};

function rentalDurationLabel(value: Pick<RentalContract, 'billingPeriod' | 'rentalPeriodCount'>): string {
  return formatRentalDuration(value.billingPeriod, value.rentalPeriodCount);
}

function formatRentalDuration(period: RentalBillingPeriod, countValue: unknown): string {
  const count = normalizeRentalPeriodCount(countValue);
  const units: Record<RentalBillingPeriod, [string, string]> = {
    daily: ['diária', 'diárias'],
    weekly: ['semana', 'semanas'],
    fortnightly: ['quinzena', 'quinzenas'],
    monthly: ['mês', 'meses'],
  };
  const [singular, plural] = units[period];

  return `${count} ${count === 1 ? singular : plural}`;
}

function normalizeRentalPeriodCount(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(1, Math.trunc(numberValue)) : 1;
}

export async function exportRentalContractPdf(
  contract: RentalContract,
  companyProfile?: CompanyProfile
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const company = companyProfile ?? DEFAULT_COMPANY_PROFILE;
  const logoDataUrl = await loadImageDataUrl('/logo-mega-equipamentos-preto.png');

  drawLegacyContractFirstPage(doc, contract, company, logoDataUrl);
  doc.addPage();
  drawLegacyContractTermsPage(doc, contract);

  doc.save(`${sanitizeFileName(contract.contractNumber)}.pdf`);
}

export async function exportDeliveryReceiptPdf(
  contract: RentalContract,
  companyProfile?: CompanyProfile
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const company = companyProfile ?? DEFAULT_COMPANY_PROFILE;
  const logoDataUrl = await loadImageDataUrl('/logo-mega-equipamentos-preto.png');
  const marginX = 48;
  let y = drawOperationalHeader(
    doc,
    'COMPROVANTE DE ENTREGA',
    `Locação nº ${contract.contractNumber}`,
    company,
    logoDataUrl
  );

  y = sectionTitle(doc, 'Entrega', marginX, y);
  y = paragraph(
    doc,
    [
      `Data de emissão: ${formatDateTime(new Date())}`,
      `Período da locação: ${rentalDurationLabel(contract)}`,
      `Data de início da locação: ${formatDate(contract.startDate)}`,
      `Local de entrega/uso: ${contract.deliveryAddress || 'A combinar'}`,
      `Endereço da obra: ${formatWorksiteAddress(contract)}`,
      `Vendedor: ${contract.sellerName || 'Não informado'}${contract.sellerPhone ? ` | ${contract.sellerPhone}` : ''}`,
      `Total da locação: ${formatCurrencyCents(contract.totalCents)}`,
    ],
    marginX,
    y
  );

  y = sectionTitle(doc, 'Recebedor', marginX, y + 10);
  y = paragraph(
    doc,
    [
      `Cliente: ${contract.customerName}`,
      `CPF/CNPJ: ${contract.customerDocument || 'Não informado'}`,
      `Contato: ${contract.customerPhone || contract.customerEmail || 'Não informado'}`,
      `Endereço: ${formatCustomerAddress(contract)}`,
    ],
    marginX,
    y
  );

  y = sectionTitle(doc, 'Equipamentos entregues', marginX, y + 10);
  y = drawDeliveryItemsTable(doc, contract.items, marginX, y);

  y += 16;
  y = paragraph(
    doc,
    splitText(
      'Declaro que recebi os equipamentos relacionados acima, em quantidade conferida e em condições aparentes de uso, ficando ciente de que a utilização, guarda e devolução seguem as condições da locação.'
    ),
    marginX,
    y
  );

  y = Math.max(y + 44, 650);
  doc.line(marginX, y, 250, y);
  doc.line(345, y, 547, y);
  doc.setFontSize(9);
  doc.text('Responsável pela entrega', marginX + 48, y + 16);
  doc.text('Recebedor', 345 + 78, y + 16);

  y += 48;
  doc.setFont('helvetica', 'normal');
  doc.text('Nome legível do recebedor: _______________________________________________', marginX, y);
  doc.text('CPF/RG: _______________________________  Data: ____/____/________', marginX, y + 20);

  doc.save(`${sanitizeFileName(contract.contractNumber)}-comprovante-entrega.pdf`);
}

export async function exportReturnReceiptPdf(
  contract: RentalContract,
  companyProfile?: CompanyProfile
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const company = companyProfile ?? DEFAULT_COMPANY_PROFILE;
  const logoDataUrl = await loadImageDataUrl('/logo-mega-equipamentos-preto.png');
  const marginX = 48;
  let y = drawOperationalHeader(
    doc,
    'COMPROVANTE DE DEVOLUÇÃO',
    `Locação nº ${contract.contractNumber}`,
    company,
    logoDataUrl
  );

  y = sectionTitle(doc, 'Devolução', marginX, y);
  y = paragraph(
    doc,
    [
      `Data de emissão: ${formatDateTime(new Date())}`,
      `Período da locação: ${rentalDurationLabel(contract)}`,
      `Início da locação: ${formatDate(contract.startDate)}`,
      `Término previsto: ${contract.endDate ? formatDate(contract.endDate) : 'Não informado'}`,
      `Local de uso/retirada: ${contract.deliveryAddress || 'A combinar'}`,
      `Endereço da obra: ${formatWorksiteAddress(contract)}`,
      `Vendedor: ${contract.sellerName || 'Não informado'}${contract.sellerPhone ? ` | ${contract.sellerPhone}` : ''}`,
      `Total da locação: ${formatCurrencyCents(contract.totalCents)}`,
    ],
    marginX,
    y
  );

  y = sectionTitle(doc, 'Cliente', marginX, y + 10);
  y = paragraph(
    doc,
    [
      `Cliente: ${contract.customerName}`,
      `CPF/CNPJ: ${contract.customerDocument || 'Não informado'}`,
      `Contato: ${contract.customerPhone || contract.customerEmail || 'Não informado'}`,
      `Endereço: ${formatCustomerAddress(contract)}`,
    ],
    marginX,
    y
  );

  y = sectionTitle(doc, 'Equipamentos devolvidos', marginX, y + 10);
  y = drawReturnItemsTable(doc, contract.items, marginX, y);

  y += 16;
  y = paragraph(
    doc,
    splitText(
      'Declaro que os equipamentos relacionados acima foram devolvidos e conferidos. Eventuais avarias, peças faltantes, limpeza, atraso ou necessidade de manutenção poderão ser registradas neste comprovante e cobradas conforme as condições da locação.'
    ),
    marginX,
    y
  );

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Observações da devolução:', marginX, y);
  y += 18;
  doc.line(marginX, y, 547, y);
  doc.line(marginX, y + 24, 547, y + 24);
  doc.line(marginX, y + 48, 547, y + 48);

  y = Math.max(y + 96, 670);
  doc.line(marginX, y, 250, y);
  doc.line(345, y, 547, y);
  doc.setFontSize(9);
  doc.text('Responsável pela conferência', marginX + 40, y + 16);
  doc.text('Cliente/Responsável', 345 + 58, y + 16);

  doc.save(`${sanitizeFileName(contract.contractNumber)}-comprovante-devolucao.pdf`);
}

export async function exportInvoicePdf(
  contract: RentalContract,
  companyProfile?: CompanyProfile
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const company = companyProfile ?? DEFAULT_COMPANY_PROFILE;
  const marginX = 48;
  const issuedAt = new Date();
  const logoDataUrl = await loadImageDataUrl('/logo-mega-equipamentos-preto.png');
  let y = drawOperationalHeader(doc, 'FATURA', `FAT-${contract.contractNumber}`, company, logoDataUrl);

  y = sectionTitle(doc, 'Dados da fatura', marginX, y);
  y = paragraph(
    doc,
    [
      `Locação nº: ${contract.contractNumber}`,
      `Emissão: ${formatDateTime(issuedAt)}`,
      `Vencimento: ${formatDateTime(issuedAt)}`,
      `Período da locação: ${rentalDurationLabel(contract)}`,
      `Vigência: ${formatContractPeriod(contract)}`,
      `Endereço da obra: ${formatWorksiteAddress(contract)}`,
      `Vendedor: ${contract.sellerName || 'Não informado'}${contract.sellerPhone ? ` | ${contract.sellerPhone}` : ''}`,
    ],
    marginX,
    y
  );

  y = sectionTitle(doc, 'Cliente', marginX, y + 10);
  y = paragraph(
    doc,
    [
      `Cliente: ${contract.customerName}`,
      `CPF/CNPJ: ${contract.customerDocument || 'Não informado'}`,
      `Contato: ${contract.customerPhone || contract.customerEmail || 'Não informado'}`,
      `Endereço: ${formatCustomerAddress(contract)}`,
    ],
    marginX,
    y
  );

  y = sectionTitle(doc, 'Itens faturados', marginX, y + 10);
  y = drawItemsTable(doc, contract.items, marginX, y);

  y = drawFinancialSummary(doc, contract, marginX, y + 12);

  y = sectionTitle(doc, 'Pagamento', marginX, y);
  y = paragraph(
    doc,
    [
      `Forma de pagamento: PIX`,
      `Chave PIX: ${company.pixKey || company.document || 'Não informada'}`,
      `Favorecido: ${company.legalName}`,
      `CNPJ: ${company.document || 'Não informado'}`,
    ],
    marginX,
    y
  );

  if (contract.notes) {
    y = sectionTitle(doc, 'Observações', marginX, y + 10);
    y = paragraph(doc, splitText(contract.notes), marginX, y);
  }

  y = Math.max(y + 40, 690);
  doc.line(marginX, y, 547, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Documento gerado eletronicamente pela Mega Equipamentos.', marginX, y + 16);

  doc.save(`${sanitizeFileName(contract.contractNumber)}-fatura.pdf`);
}

export async function exportQuotePdf(
  contract: RentalContract,
  companyProfile?: CompanyProfile
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const company = companyProfile ?? DEFAULT_COMPANY_PROFILE;
  const marginX = 48;
  const issuedAt = new Date();
  const validUntil = addDays(issuedAt, 7);
  const logoDataUrl = await loadImageDataUrl('/logo-mega-equipamentos-preto.png');
  let y = drawOperationalHeader(doc, 'ORÇAMENTO', `ORC-${contract.contractNumber}`, company, logoDataUrl);

  y = sectionTitle(doc, 'Dados do orçamento', marginX, y);
  y = paragraph(
    doc,
    [
      `Referência: Locação nº ${contract.contractNumber}`,
      `Emissão: ${formatDateTime(issuedAt)}`,
      `Validade: ${formatDateOnly(validUntil)}`,
      `Período da locação: ${rentalDurationLabel(contract)}`,
      `Vigência estimada: ${formatContractPeriod(contract)}`,
      `Local de entrega/uso: ${contract.deliveryAddress || 'A combinar'}`,
      `Endereço da obra: ${formatWorksiteAddress(contract)}`,
      `Vendedor: ${contract.sellerName || 'Não informado'}${contract.sellerPhone ? ` | ${contract.sellerPhone}` : ''}`,
    ],
    marginX,
    y
  );

  y = sectionTitle(doc, 'Cliente', marginX, y + 10);
  y = paragraph(
    doc,
    [
      `Cliente: ${contract.customerName}`,
      `CPF/CNPJ: ${contract.customerDocument || 'Não informado'}`,
      `Contato: ${contract.customerPhone || contract.customerEmail || 'Não informado'}`,
      `Endereço: ${formatCustomerAddress(contract)}`,
    ],
    marginX,
    y
  );

  y = sectionTitle(doc, 'Itens orçados', marginX, y + 10);
  y = drawItemsTable(doc, contract.items, marginX, y);

  y = drawFinancialSummary(doc, contract, marginX, y + 12);

  y = sectionTitle(doc, 'Condições comerciais', marginX, y);
  y = paragraph(
    doc,
    [
      'Orçamento sujeito à disponibilidade dos equipamentos na confirmação da locação.',
      'Valores calculados para o período informado e podem ser ajustados em caso de prorrogação, avarias, perdas ou alterações de escopo.',
      `Pagamento via PIX: ${company.pixKey || company.document || 'Não informado'}`,
    ],
    marginX,
    y
  );

  if (contract.notes) {
    y = sectionTitle(doc, 'Observações', marginX, y + 10);
    y = paragraph(doc, splitText(contract.notes), marginX, y);
  }

  y = Math.max(y + 44, 690);
  doc.line(marginX, y, 250, y);
  doc.line(345, y, 547, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Mega Equipamentos', marginX + 48, y + 16);
  doc.text('Cliente/Responsável', 345 + 58, y + 16);

  doc.save(`${sanitizeFileName(contract.contractNumber)}-orcamento.pdf`);
}

export async function exportStandaloneQuotePdf(
  quote: RentalQuote,
  companyProfile?: CompanyProfile
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const company = companyProfile ?? DEFAULT_COMPANY_PROFILE;
  const marginX = 48;
  const issuedAt = new Date();
  const logoDataUrl = await loadImageDataUrl('/logo-mega-equipamentos-preto.png');
  let y = drawOperationalHeader(doc, 'ORÇAMENTO', quote.quoteNumber, company, logoDataUrl);

  y = sectionTitle(doc, 'Dados do orçamento', marginX, y);
  y = paragraph(
    doc,
    [
      `Número: ${quote.quoteNumber}`,
      `Emissão: ${formatDateTime(issuedAt)}`,
      `Validade: ${quote.validUntil ? formatDate(quote.validUntil) : 'Não informada'}`,
      `Período da locação: ${rentalDurationLabel(quote)}`,
      `Início previsto: ${formatDate(quote.startDate)}`,
      `Local de entrega/uso: ${quote.deliveryAddress || 'A combinar'}`,
      `Endereço da obra: ${quote.worksiteAddress || quote.deliveryAddress || 'A combinar'}`,
      `Vendedor: ${quote.sellerName || 'Não informado'}${quote.sellerPhone ? ` | ${quote.sellerPhone}` : ''}`,
    ],
    marginX,
    y
  );

  y = sectionTitle(doc, 'Interessado', marginX, y + 10);
  y = paragraph(
    doc,
    [
      `Nome: ${quote.leadName || 'Não informado'}`,
      `CPF/CNPJ: ${quote.leadDocument || 'Não informado'}`,
      `Contato: ${quote.leadPhone || quote.leadEmail || 'Não informado'}`,
      `Endereço: ${formatQuoteLeadAddress(quote)}`,
    ],
    marginX,
    y
  );

  y = sectionTitle(doc, 'Itens orçados', marginX, y + 10);
  y = drawItemsTable(doc, quote.items, marginX, y);

  y = drawFinancialSummary(doc, quote, marginX, y + 12);

  y = sectionTitle(doc, 'Condições comerciais', marginX, y);
  y = paragraph(
    doc,
    [
      'Orçamento sujeito à disponibilidade dos equipamentos na confirmação da locação.',
      'Valores calculados para o período informado e podem ser ajustados em caso de prorrogação, avarias, perdas ou alterações de escopo.',
      `Pagamento via PIX: ${company.pixKey || company.document || 'Não informado'}`,
    ],
    marginX,
    y
  );

  if (quote.notes) {
    y = sectionTitle(doc, 'Observações', marginX, y + 10);
    y = paragraph(doc, splitText(quote.notes), marginX, y);
  }

  y = Math.max(y + 44, 690);
  doc.line(marginX, y, 250, y);
  doc.line(345, y, 547, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Mega Equipamentos', marginX + 48, y + 16);
  doc.text('Cliente/Responsável', 345 + 58, y + 16);

  doc.save(`${sanitizeFileName(quote.quoteNumber)}-orcamento.pdf`);
}

function drawLegacyContractFirstPage(
  doc: unknown,
  contract: RentalContract,
  company: CompanyProfile,
  logoDataUrl: string | null
): void {
  const pdf = doc as {
    addImage: (imageData: string, format: string, x: number, y: number, width: number, height: number) => void;
    line: (x1: number, y1: number, x2: number, y2: number) => void;
    rect: (x: number, y: number, width: number, height: number) => void;
    setFont: (font: string, style?: string) => void;
    setFontSize: (size: number) => void;
    text: (text: string | string[], x: number, y: number, options?: Record<string, unknown>) => void;
  };
  const x = 26;
  const width = 543;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.rect(x, 22, width, 64);

  if (logoDataUrl) {
    try {
      const logoWidth = 112;
      const logoHeight = logoWidth / 4.993;
      pdf.addImage(logoDataUrl, 'PNG', x + 30, 44, logoWidth, logoHeight);
    } catch {
      // The logo is decorative in the PDF; keep the document exportable if it cannot be embedded.
    }
  }

  pdf.setFontSize(9.6);
  drawFittedText(pdf, company.legalName, x + 150, 40, 375);
  drawFittedText(pdf, formatCompanyAddress(company), x + 150, 52, 375);
  drawFittedText(pdf, `CNPJ: ${company.document || 'Não informado'}`, x + 150, 64, 375);
  drawFittedText(pdf, formatCompanyContact(company), x + 150, 76, 375);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(
    `CONTRATO DE LOCAÇÃO DE BENS MÓVEIS - SEM OPERADOR - Nº: ${contract.contractNumber}`,
    x + width / 2,
    106,
    { align: 'center' }
  );

  drawLegacyCustomerBox(pdf, contract, x, 116, width);
  drawLegacyPeriodBox(pdf, contract, x, 222, width);
  drawLegacyNotesBox(pdf, contract, x, 278, width);
  drawLegacyItemsTable(pdf, contract, x, 330, width);
  drawLegacyDeclarationBox(pdf, contract, x, 502, width);
  drawLegacyPromissoryBox(pdf, contract, company, x, 710, width);
}

function drawLegacyCustomerBox(doc: LegacyPdfDoc, contract: RentalContract, x: number, y: number, width: number): void {
  doc.rect(x, y, width, 100);
  doc.line(x, y + 12, x + width, y + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Locatário', x + width / 2, y + 9, { align: 'center' });

  const leftX = x + 2;
  const rightX = x + 270;
  const leftWidth = 260;
  const rightWidth = 248;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  drawWrappedText(doc, `DATA: ${formatDate(contract.createdAt || contract.startDate)}`, leftX, y + 24, leftWidth, 9, 1);
  drawWrappedText(doc, `Nome/Empresa: ${contract.customerName}`, leftX, y + 36, leftWidth, 9, 1);
  drawWrappedText(doc, `Endereço: ${formatCustomerAddress(contract)}`, leftX, y + 48, leftWidth, 9, 2);
  drawWrappedText(doc, `Cidade: ${formatCustomerCityState(contract)}`, leftX, y + 72, leftWidth, 9, 1);
  drawWrappedText(doc, `Entrega em: ${deliveryLocationLabel(contract)}`, leftX, y + 84, leftWidth, 9, 1);
  drawWrappedText(doc, `Endereço da Entrega: ${formatLegacyDeliveryAddress(contract)}`, leftX, y + 96, leftWidth, 9, 1);

  drawWrappedText(doc, `CPF/CNPJ: ${contract.customerDocument || 'Não informado'}`, rightX, y + 24, rightWidth, 9, 1);
  drawWrappedText(doc, `Código do Cliente: ${padLegacyCode(contract.customerId)}`, rightX, y + 36, rightWidth, 9, 1);
  drawWrappedText(doc, `Telefones: ${contract.customerPhone || 'Não informado'}`, rightX, y + 58, rightWidth, 9, 1);
  drawWrappedText(doc, `CEP: ${extractZipCode(contract.customerAddress || contract.deliveryAddress) || '-'}`, rightX, y + 72, rightWidth, 9, 1);
  drawWrappedText(doc, `Vendedor: ${contract.sellerName || 'Não informado'}`, rightX, y + 84, rightWidth, 9, 1);
  drawWrappedText(
    doc,
    `Contato/Fone: ${contract.sellerPhone || contract.customerPhone || 'Não informado'}`,
    rightX,
    y + 96,
    rightWidth,
    9,
    1
  );
}

function drawLegacyPeriodBox(doc: LegacyPdfDoc, contract: RentalContract, x: number, y: number, width: number): void {
  const rowHeight = 20;
  const colWidth = width / 3;
  doc.rect(x, y, width, rowHeight * 2);
  doc.line(x, y + rowHeight, x + width, y + rowHeight);
  doc.line(x + colWidth, y, x + colWidth, y + rowHeight * 2);
  doc.line(x + colWidth * 2, y, x + colWidth * 2, y + rowHeight * 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  centerCellText(doc, `Início: ${formatDate(contract.startDate)}`, x, y + 13, colWidth);
  centerCellText(doc, `Nº contrato: ${contract.contractNumber}`, x + colWidth, y + 13, colWidth);
  centerCellText(
    doc,
    `Término: ${contract.endDate ? formatDate(contract.endDate) : '-'}`,
    x + colWidth * 2,
    y + 13,
    colWidth
  );
  centerCellText(
    doc,
    `Período: ${rentalDurationLabel(contract)}`,
    x,
    y + rowHeight + 13,
    colWidth
  );
  centerCellText(
    doc,
    `Locação (${rentalDurationLabel(contract)}): ${formatCurrencyCents(contract.subtotalCents || contract.totalCents)}`,
    x + colWidth,
    y + rowHeight + 13,
    colWidth
  );
  centerCellText(doc, `Frete: ${formatCurrencyCents(contract.shippingCents ?? 0)}`, x + colWidth * 2, y + rowHeight + 13, colWidth);
}

function drawLegacyNotesBox(doc: LegacyPdfDoc, contract: RentalContract, x: number, y: number, width: number): void {
  doc.rect(x, y, width, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  drawWrappedText(doc, `Observações: ${legacyObservationText(contract.notes) || '-'}`, x + 3, y + 12, width - 6, 9, 3);
}

function drawLegacyItemsTable(doc: LegacyPdfDoc, contract: RentalContract, x: number, y: number, width: number): void {
  const height = 148;
  const columns = [0, 32, 94, 332, 356, 450, 496, 543];
  doc.rect(x, y, width, height);
  doc.line(x, y + 22, x + width, y + 22);
  doc.line(x, y + 34, x + width, y + 34);

  for (const offset of columns.slice(1, -1)) {
    doc.line(x + offset, y, x + offset, y + height);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  centerCellText(doc, 'Qtde', x, y + 17, 32);
  centerCellText(doc, 'Patrimônio', x + 32, y + 17, 62);
  centerCellText(doc, 'Descrição dos Equipamentos', x + 94, y + 17, 238);
  centerCellText(doc, 'Aditivo', x + 332, y + 17, 24);
  centerCellText(doc, 'Valor do Equipamento', x + 356, y + 10, 94);
  centerCellText(doc, 'Valor da Locação', x + 450, y + 10, 93);
  centerCellText(doc, 'Unitário', x + 356, y + 29, 47);
  centerCellText(doc, 'Total', x + 403, y + 29, 47);
  centerCellText(doc, 'Unitário', x + 450, y + 29, 46);
  centerCellText(doc, 'Total', x + 496, y + 29, 47);

  const items = contract.items.length
    ? contract.items.slice(0, 7)
    : [
        {
          equipmentId: 0,
          equipmentName: 'Itens detalhados não informados na importação',
          quantity: 1,
          billingPeriod: contract.billingPeriod,
          unitPriceCents: contract.subtotalCents || contract.totalCents,
          totalPriceCents: contract.subtotalCents || contract.totalCents,
          assetValueCents: 0,
        },
      ];
  let rowY = y + 45;

  doc.setFontSize(7.2);
  for (const item of items) {
    const assetValueCents = item.assetValueCents ?? 0;
    const assetTotalCents = assetValueCents * item.quantity;

    doc.text(String(item.quantity), x + 29, rowY, { align: 'right' });
    drawWrappedText(doc, item.equipmentName, x + 98, rowY, 228, 8, 2);
    centerCellText(doc, '-', x + 332, rowY, 24);
    doc.text(formatCurrencyCents(assetValueCents).replace('R$ ', ''), x + 398, rowY, { align: 'right' });
    doc.text(formatCurrencyCents(assetTotalCents).replace('R$ ', ''), x + 445, rowY, { align: 'right' });
    doc.text(formatCurrencyCents(item.unitPriceCents).replace('R$ ', ''), x + 491, rowY, { align: 'right' });
    doc.text(formatCurrencyCents(item.totalPriceCents).replace('R$ ', ''), x + 538, rowY, { align: 'right' });
    rowY += 13;
  }

  if (contract.items.length > items.length) {
    drawWrappedText(doc, `+ ${contract.items.length - items.length} item(ns) no contrato`, x + 98, rowY, 228, 8, 1);
  }
}

function drawLegacyDeclarationBox(doc: LegacyPdfDoc, contract: RentalContract, x: number, y: number, width: number): void {
  doc.rect(x, y, width, 190);
  doc.line(x, y + 12, x + width, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('DECLARAÇÃO', x + width / 2, y + 9, { align: 'center' });

  const declaration =
    'O LOCATÁRIO recebe neste ato, ou na entrega, por si mesma ou seu preposto, o(s) bem(ns) móvel(is) referido(s) no presente instrumento, declarando tê-lo(s) testado(s) e aprovado(s) previamente e afirmando que o(s) mesmo(s) se acha(m) em perfeito estado de funcionamento, limpeza e segurança. O LOCATÁRIO declara que: (I) Reconhece detalhadamente sua correta utilização e funcionamento, pelo que se obriga a devolvê-lo(s) em idênticas condições de funcionamento, (II) Em caso de dano parcial ou total, bem como itens sujeitos a desgaste natural, irá imediatamente repor ou arcar com reparos necessários e demais despesas decorrentes. (III) Fará uso de todos os equipamentos de segurança (EPIs) necessários na utilização desse(s) bem(ns) móvel(is) alugado(s), bem como das normas de segurança pertinentes. (IV) Recebeu o(s) bem(ns) móvel(is) listado(s), bem como instruções de uso e segurança, e se compromete a repassá-las a quem for utilizar o(s) mesmo(s). (V) Tomou conhecimento prévio e concordou com as condições do contrato de locação de bens móveis sem operador.';
  drawWrappedText(doc, declaration, x + 2, y + 25, width - 4, 8.5, 13);

  const signatureY = y + 145;
  doc.line(x + 4, signatureY, x + 176, signatureY);
  doc.line(x + 230, signatureY, x + 400, signatureY);
  doc.line(x + 405, signatureY, x + 508, signatureY);
  doc.text(`LOCATÁRIO: ${truncate(contract.customerName, 46)}`, x + 4, signatureY + 11);
  doc.text('RECEBIDO POR:', x + 230, signatureY + 11);
  doc.text('CPF:', x + 405, signatureY + 11);

  doc.line(x + 4, signatureY + 40, x + 190, signatureY + 40);
  doc.line(x + 230, signatureY + 40, x + 510, signatureY + 40);
  doc.text('LOCADORA: Mega Equipamentos LTDA', x + 4, signatureY + 51);
  doc.text('FUNCIONÁRIO(A):', x + 230, signatureY + 51);
}

function drawLegacyPromissoryBox(
  doc: LegacyPdfDoc,
  contract: RentalContract,
  company: CompanyProfile,
  x: number,
  y: number,
  width: number
): void {
  const assetTotalCents = contractAssetTotalCents(contract);

  doc.rect(x, y, width, 118);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('NOTA PROMISSÓRIA', x + 2, y + 11);
  doc.text(`Nº: ${contract.contractNumber}`, x + width - 90, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Nº: ${contract.contractNumber}`, x + 2, y + 23);
  doc.text(`Valor: ${formatCurrencyCents(assetTotalCents)}`, x + width - 90, y + 23);
  drawWrappedText(
    doc,
    `Pagarei por essa Nota Promissória à ${company.legalName}, CNPJ: ${company.document || 'Não informado'} ou a sua ordem, a quantia de ${formatCurrencyCents(assetTotalCents)} em moeda corrente deste país, pagável em ${company.city || 'Caruaru'}/${company.state || 'PE'}, caso não haja a devolução do bem locado ao término do contrato ou manifestação a fim de prorrogação deste contrato.`,
    x + 2,
    y + 48,
    width - 4,
    9,
    4
  );
  doc.text(`EMITENTE: ${truncate(contract.customerName, 76)}`, x + 2, y + 83);
  doc.text(`CPF/CNPJ: ${contract.customerDocument || 'Não informado'}`, x + 2, y + 95);
  doc.text(`ENDEREÇO: ${truncate(formatCustomerAddress(contract), 86)}`, x + 2, y + 107);
  doc.line(x + width - 90, y + 96, x + width, y + 96);
}

function contractAssetTotalCents(contract: RentalContract): number {
  return contract.items.reduce((total, item) => {
    const assetValueCents = Math.max(0, Math.trunc(Number(item.assetValueCents) || 0));
    const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
    return total + assetValueCents * quantity;
  }, 0);
}

function drawLegacyContractTermsPage(doc: unknown, contract: RentalContract): void {
  const pdf = doc as LegacyPdfDoc;
  const x = 28;
  let y = 38;
  const rawClauses = contract.terms?.trim()
    ? contract.terms.trim()
    : '1.0 - Do objeto da locação: o objeto do presente contrato é a locação dos equipamentos descritos neste instrumento.\n\n2.0 - Da guarda, uso e conservação dos equipamentos: durante todo o período da locação, o(a) LOCATÁRIO(A) ficará responsável pela guarda, conservação e manutenção dos equipamentos, desde a retirada ou entrega até a efetiva devolução.\n\n2.1 - O(A) LOCATÁRIO(A), após vistoriar o equipamento e constatar que se encontra em perfeito estado de conservação, limpeza e apto ao uso, responsabiliza-se por qualquer dano ou perda total ou parcial, inclusive por furto, roubo, incêndio, acidente, uso indevido ou qualquer outra causa.\n\n2.2 - O(s) equipamento(s) descrito(s) no contrato será(ão) utilizado(s) única e exclusivamente na obra descrita e caracterizada neste contrato, ficando o(a) LOCATÁRIO(A) responsável por montagem, desmontagem, uso adequado e segurança da operação.\n\n2.3 - Fica proibida a utilização dos equipamentos por terceiros estranhos ao presente contrato, bem como sublocação, transferência ou cessão sem consentimento da LOCADORA, sob pena de rescisão.\n\n2.4 - O(A) LOCATÁRIO(A) assume responsabilidade pelas condições de uso, providenciando equipamentos de segurança necessários e indispensáveis, tais como cintos, capacetes, cordas e demais EPIs aplicáveis.\n\n2.5 - Em contratos superiores a 30 dias, o(a) LOCATÁRIO(A) poderá ficar sujeito à cobrança de manutenção, conforme estado do equipamento após perícia da LOCADORA.\n\n3.0 - Do prazo de locação: o prazo inicia-se na data de retirada ou entrega dos equipamentos e termina na data pactuada para devolução.\n\n3.1 - Findo o período de vigência, o contrato poderá ser prorrogado desde que a LOCADORA consinta expressamente, com emissão de novo contrato ou aditivo aplicável.\n\n3.2 - Caso o contrato não seja renovado e o(a) LOCATÁRIO(A) permaneça na posse dos equipamentos após o prazo, pagará aluguel conforme pactuado, sem prejuízo de multas e demais cobranças cabíveis.\n\n4.0 - Do foro: as partes elegem o foro de Caruaru/PE para dirimir questões oriundas deste contrato, com renúncia a qualquer outro por mais privilegiado que seja.\n\nOBS.: DECLARO TER LIDO O PRESENTE CONTRATO E ACEITO TODAS AS CLÁUSULAS NELE CONTIDAS.';
  const clauses = markdownToContractText(rawClauses);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.2);
  for (const paragraphText of clauses.split(/\n+/)) {
    if (!paragraphText.trim()) {
      y += 5;
      continue;
    }

    const nextY = drawWrappedText(pdf, paragraphText, x, y, 538, 9.2);
    y = nextY + 4;
  }

  y = Math.max(y + 24, 775);
  pdf.line(x, y, x + 170, y);
  pdf.setFontSize(8);
  pdf.text('LOCATÁRIO - PROCURADOR(ES)', x, y + 13);
  pdf.text(truncate(contract.customerName, 78), x, y + 25);
}

type LegacyPdfDoc = {
  getTextWidth?: (text: string) => number;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  rect: (x: number, y: number, width: number, height: number) => void;
  setFont: (font: string, style?: string) => void;
  setFontSize: (size: number) => void;
  splitTextToSize?: (text: string, maxWidth: number) => string[];
  text: (text: string | string[], x: number, y: number, options?: Record<string, unknown>) => void;
};

type FinancialDocument = {
  subtotalCents: number;
  shippingCents?: number;
  discountCents?: number;
  surchargeCents?: number;
  totalCents: number;
};

function drawOperationalHeader(
  doc: unknown,
  title: string,
  reference: string,
  company: CompanyProfile,
  logoDataUrl: string | null
): number {
  const pdf = doc as LegacyPdfDoc & {
    addImage?: (imageData: string, format: string, x: number, y: number, width: number, height: number) => void;
  };
  const x = 48;
  const y = 38;
  const width = 499;

  pdf.rect(x, y, width, 74);

  if (logoDataUrl && pdf.addImage) {
    try {
      const logoWidth = 118;
      const logoHeight = logoWidth / 4.993;
      pdf.addImage(logoDataUrl, 'PNG', x + 16, y + 26, logoWidth, logoHeight);
    } catch {
      // Keep the document exportable if the logo cannot be embedded.
    }
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text(title, x, y + 104);
  pdf.setFontSize(10);
  pdf.text(reference, x, y + 120);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  drawFittedText(pdf, company.legalName || company.tradeName || 'Mega Equipamentos', x + 152, y + 22, 330);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.2);
  drawFittedText(pdf, formatCompanyAddress(company), x + 152, y + 36, 330);
  drawFittedText(pdf, `CNPJ: ${company.document || 'Não informado'}`, x + 152, y + 50, 330);
  drawFittedText(pdf, formatCompanyContact(company), x + 152, y + 64, 330);

  return y + 144;
}

function drawFinancialSummary(doc: unknown, values: FinancialDocument, x: number, y: number): number {
  const pdf = doc as {
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
    text: (text: string, x: number, y: number, options?: Record<string, unknown>) => void;
    line: (x1: number, y1: number, x2: number, y2: number) => void;
  };
  const labelX = 360;
  const valueX = 547;
  const rows = [
    ['Subtotal', values.subtotalCents],
    ['Frete', values.shippingCents ?? 0],
    ['Desconto', -(values.discountCents ?? 0)],
    ['Acréscimo', values.surchargeCents ?? 0],
  ] as const;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  for (const [label, amount] of rows) {
    pdf.text(`${label}:`, labelX, y);
    const formatted = amount < 0
      ? `- ${formatCurrencyCents(Math.abs(amount))}`
      : formatCurrencyCents(amount);
    pdf.text(formatted, valueX, y, { align: 'right' });
    y += 15;
  }

  pdf.line(x, y - 5, valueX, y - 5);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Total:', labelX, y + 10);
  pdf.text(formatCurrencyCents(values.totalCents), valueX, y + 10, { align: 'right' });

  return y + 36;
}

function sectionTitle(doc: unknown, title: string, x: number, y: number): number {
  const pdf = doc as {
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
    text: (text: string, x: number, y: number) => void;
    line: (x1: number, y1: number, x2: number, y2: number) => void;
  };
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(title, x, y);
  pdf.line(x, y + 6, 547, y + 6);
  return y + 22;
}

function drawCompanyHeader(doc: unknown, company: CompanyProfile, x: number, y: number): void {
  const pdf = doc as {
    text: (text: string, x: number, y: number) => void;
  };
  const cityState = [company.city, company.state].filter(Boolean).join(' - ');
  const phone = company.phone || company.whatsapp || '';
  const document = company.document ? `CNPJ: ${company.document}` : '';
  const pix = company.pixKey ? `PIX: ${company.pixKey}` : '';
  const address = [company.address, cityState].filter(Boolean).join(' | ');
  const contact = [phone, company.email].filter(Boolean).join(' | ');

  pdf.text(company.tradeName || company.legalName, x, y);
  pdf.text([document, pix].filter(Boolean).join(' | ') || 'Dados fiscais não informados', x, y + 14);
  pdf.text(address || 'Endereço não informado', x, y + 28);

  if (contact) {
    pdf.text(contact, x, y + 42);
  }
}

function paragraph(doc: unknown, lines: string[], x: number, y: number): number {
  const pdf = doc as {
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
    text: (text: string | string[], x: number, y: number) => void;
  };
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  for (const line of lines) {
    pdf.text(line, x, y);
    y += 15;
  }

  return y;
}

function drawItemsTable(doc: unknown, items: RentalContractItem[], x: number, y: number): number {
  const pdf = doc as {
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
    text: (text: string, x: number, y: number) => void;
    line: (x1: number, y1: number, x2: number, y2: number) => void;
  };
  const columns = [x, x + 295, x + 360, x + 455];

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Equipamento', columns[0], y);
  pdf.text('Qtd.', columns[1], y);
  pdf.text('Unit./período', columns[2], y);
  pdf.text('Total', columns[3], y);
  y += 8;
  pdf.line(x, y, 547, y);
  y += 16;
  pdf.setFont('helvetica', 'normal');

  for (const item of items) {
    pdf.text(truncate(item.equipmentName, 50), columns[0], y);
    pdf.text(String(item.quantity), columns[1], y);
    pdf.text(formatCurrencyCents(item.unitPriceCents), columns[2], y);
    pdf.text(formatCurrencyCents(item.totalPriceCents), columns[3], y);
    y += 16;
  }

  return y;
}

function drawDeliveryItemsTable(doc: unknown, items: RentalContractItem[], x: number, y: number): number {
  const pdf = doc as {
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
    text: (text: string, x: number, y: number) => void;
    line: (x1: number, y1: number, x2: number, y2: number) => void;
  };
  const columns = [x, x + 380, x + 462];

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Equipamento', columns[0], y);
  pdf.text('Qtd.', columns[1], y);
  pdf.text('Conferência', columns[2], y);
  y += 8;
  pdf.line(x, y, 547, y);
  y += 16;
  pdf.setFont('helvetica', 'normal');

  for (const item of items) {
    pdf.text(truncate(item.equipmentName, 66), columns[0], y);
    pdf.text(String(item.quantity), columns[1], y);
    pdf.text('(   ) OK', columns[2], y);
    y += 16;
  }

  return y;
}

function drawReturnItemsTable(doc: unknown, items: RentalContractItem[], x: number, y: number): number {
  const pdf = doc as {
    setFont: (font: string, style: string) => void;
    setFontSize: (size: number) => void;
    text: (text: string, x: number, y: number) => void;
    line: (x1: number, y1: number, x2: number, y2: number) => void;
  };
  const columns = [x, x + 315, x + 375, x + 460];

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Equipamento', columns[0], y);
  pdf.text('Qtd.', columns[1], y);
  pdf.text('Estado', columns[2], y);
  pdf.text('Pendência', columns[3], y);
  y += 8;
  pdf.line(x, y, 547, y);
  y += 16;
  pdf.setFont('helvetica', 'normal');

  for (const item of items) {
    pdf.text(truncate(item.equipmentName, 56), columns[0], y);
    pdf.text(String(item.quantity), columns[1], y);
    pdf.text('(   ) OK', columns[2], y);
    pdf.text('(   ) Sim  (   ) Não', columns[3], y);
    y += 16;
  }

  return y;
}

async function loadImageDataUrl(path: string): Promise<string | null> {
  if (typeof fetch === 'undefined' || typeof FileReader === 'undefined') {
    return null;
  }

  try {
    const response = await fetch(path);

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        resolve(typeof reader.result === 'string' ? reader.result : null);
      });
      reader.addEventListener('error', () => resolve(null));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function centerCellText(
  doc: LegacyPdfDoc,
  text: string,
  x: number,
  y: number,
  width: number
): void {
  drawFittedText(doc, text, x + width / 2, y, width - 6, 'center');
}

function drawFittedText(
  doc: LegacyPdfDoc,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  align: 'left' | 'center' | 'right' = 'left'
): void {
  doc.text(fitTextToWidth(doc, text, maxWidth), x, y, { align });
}

function fitTextToWidth(doc: LegacyPdfDoc, text: string, maxWidth: number): string {
  if (!doc.getTextWidth) {
    const maxChars = Math.max(8, Math.floor(maxWidth / 3.8));
    return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
  }

  if (doc.getTextWidth(text) <= maxWidth) {
    return text;
  }

  let fitted = text;

  while (fitted.length > 3 && doc.getTextWidth(`${fitted}...`) > maxWidth) {
    fitted = fitted.slice(0, -1);
  }

  return `${fitted.trimEnd()}...`;
}

function drawWrappedText(
  doc: LegacyPdfDoc,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = Number.POSITIVE_INFINITY
): number {
  const lines = (doc.splitTextToSize ? doc.splitTextToSize(text, maxWidth) : splitText(text)).slice(0, maxLines);

  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight;
  }

  return y;
}

function formatCustomerAddress(contract: RentalContract): string {
  const city = [contract.customerCity, contract.customerState].filter(Boolean).join(' / ');
  return [contract.customerAddress, city].filter(Boolean).join(' - ') || 'Não informado';
}

function formatQuoteLeadAddress(quote: RentalQuote): string {
  const city = [quote.leadCity, quote.leadState].filter(Boolean).join(' / ');
  return [quote.leadAddress, city].filter(Boolean).join(' - ') || 'Não informado';
}

function formatCustomerCityState(contract: RentalContract): string {
  return [contract.customerCity, contract.customerState].filter(Boolean).join('/') || '-';
}

function formatCompanyAddress(company: CompanyProfile): string {
  const cityState = [company.city, company.state].filter(Boolean).join('/');
  return [company.address, cityState].filter(Boolean).join(' - ') || 'Endereço não informado';
}

function formatCompanyContact(company: CompanyProfile): string {
  return [company.phone || company.whatsapp, company.email].filter(Boolean).join(' - ') || 'Contato não informado';
}

function formatWorksiteAddress(contract: RentalContract): string {
  return contract.worksiteAddress || contract.deliveryAddress || 'A combinar';
}

function formatLegacyDeliveryAddress(contract: RentalContract): string {
  const address = contract.deliveryAddress || contract.worksiteAddress || 'A combinar';
  return address.replace(/^Principal\s*-\s*/i, '');
}

function deliveryLocationLabel(contract: RentalContract): string {
  const deliveryAddress = contract.deliveryAddress?.trim();

  if (!deliveryAddress) {
    return 'A combinar';
  }

  const [firstPart] = deliveryAddress.split(' - ');
  return firstPart.length <= 24 ? firstPart : 'Principal';
}

function padLegacyCode(value: number): string {
  return String(value).padStart(6, '0');
}

function extractZipCode(value?: string): string {
  return value?.match(/\d{5}-?\d{3}/)?.[0] ?? '';
}

function legacyObservationText(notes?: string): string {
  if (!notes) {
    return '';
  }

  const match = notes.match(/Observação original:\s*(.+?)(?:\n|$)/i);
  return (match?.[1] || notes.split('\n')[0] || '').trim();
}

function extractLegacyMoneyCents(notes: string | undefined, label: string): number | null {
  const match = notes?.match(new RegExp(`${label}:\\s*R\\$\\s*([\\d.]+,\\d{2})`, 'i'));

  if (!match?.[1]) {
    return null;
  }

  const numeric = match[1].replace(/\./g, '').replace(',', '.');
  const value = Number(numeric);

  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value);
}

function formatDateOnly(value: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(value);
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function formatContractPeriod(contract: RentalContract): string {
  return contract.endDate
    ? `${formatDate(contract.startDate)} a ${formatDate(contract.endDate)}`
    : `A partir de ${formatDate(contract.startDate)}`;
}

function statusLabel(status: RentalContract['status']): string {
  const labels: Record<RentalContract['status'], string> = {
    draft: 'Rascunho',
    active: 'Ativo',
    closed: 'Encerrado',
    returned: 'Devolvido',
    cancelled: 'Cancelado',
  };

  return labels[status];
}

function splitText(value: string): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = `${currentLine} ${word}`.trim();

    if (candidate.length > 95) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function sanitizeFileName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
