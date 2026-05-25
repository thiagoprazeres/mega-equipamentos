import type { CompanyProfile } from '../interfaces/company-profile';
import type { RentalContract, RentalContractItem, RentalBillingPeriod } from '../interfaces/rental-contract';
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
  const marginX = 48;
  let y = 52;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('COMPROVANTE DE ENTREGA', marginX, y);
  doc.setFontSize(11);
  doc.text(`Locação nº ${contract.contractNumber}`, marginX, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  drawCompanyHeader(doc, company, 370, y);
  y += 68;

  y = sectionTitle(doc, 'Entrega', marginX, y);
  y = paragraph(
    doc,
    [
      `Data de emissão: ${formatDateTime(new Date())}`,
      `Período da locação: ${PERIOD_LABELS[contract.billingPeriod]}`,
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
  const marginX = 48;
  let y = 52;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('COMPROVANTE DE DEVOLUÇÃO', marginX, y);
  doc.setFontSize(11);
  doc.text(`Locação nº ${contract.contractNumber}`, marginX, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  drawCompanyHeader(doc, company, 370, y);
  y += 68;

  y = sectionTitle(doc, 'Devolução', marginX, y);
  y = paragraph(
    doc,
    [
      `Data de emissão: ${formatDateTime(new Date())}`,
      `Período da locação: ${PERIOD_LABELS[contract.billingPeriod]}`,
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
  let y = 52;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FATURA', marginX, y);
  doc.setFontSize(11);
  doc.text(`FAT-${contract.contractNumber}`, marginX, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  drawCompanyHeader(doc, company, 370, y);
  y += 68;

  y = sectionTitle(doc, 'Dados da fatura', marginX, y);
  y = paragraph(
    doc,
    [
      `Locação nº: ${contract.contractNumber}`,
      `Emissão: ${formatDateTime(issuedAt)}`,
      `Vencimento: ${formatDateTime(issuedAt)}`,
      `Período da locação: ${PERIOD_LABELS[contract.billingPeriod]}`,
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

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Subtotal: ${formatCurrencyCents(contract.subtotalCents)}`, 390, y);
  y += 17;
  doc.text(`Total: ${formatCurrencyCents(contract.totalCents)}`, 410, y);
  y += 28;

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
      pdf.addImage(logoDataUrl, 'PNG', x + 38, 50, 72, 21);
    } catch {
      // The logo is decorative in the PDF; keep the document exportable if it cannot be embedded.
    }
  }

  pdf.setFontSize(10);
  drawWrappedText(pdf, company.legalName, x + 138, 40, 360, 12);
  drawWrappedText(pdf, formatCompanyAddress(company), x + 138, 52, 360, 12);
  drawWrappedText(pdf, `CNPJ: ${company.document || 'Não informado'}`, x + 138, 64, 360, 12);
  drawWrappedText(pdf, formatCompanyContact(company), x + 138, 76, 360, 12);

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
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  drawWrappedText(doc, `DATA: ${formatDate(contract.createdAt || contract.startDate)}`, leftX, y + 24, 250, 9);
  drawWrappedText(doc, `Nome/Empresa:${contract.customerName}`, leftX, y + 36, 260, 9);
  drawWrappedText(doc, `Endereço: ${formatCustomerAddress(contract)}`, leftX, y + 48, 260, 9);
  drawWrappedText(doc, `Cidade: ${formatCustomerCityState(contract)}`, leftX, y + 72, 250, 9);
  drawWrappedText(doc, `Entrega em: ${deliveryLocationLabel(contract)}`, leftX, y + 84, 250, 9);
  drawWrappedText(doc, `Endereço da Entrega: ${formatLegacyDeliveryAddress(contract)}`, leftX, y + 96, 512, 9, 2);

  drawWrappedText(doc, `CPF/CNPJ: ${contract.customerDocument || 'Não informado'}`, rightX, y + 24, 248, 9);
  drawWrappedText(doc, `Código do Cliente: ${padLegacyCode(contract.customerId)}`, rightX, y + 36, 248, 9);
  drawWrappedText(doc, `Telefones: ${contract.customerPhone || 'Não informado'}`, rightX, y + 58, 248, 9);
  drawWrappedText(doc, `CEP: ${extractZipCode(contract.customerAddress || contract.deliveryAddress) || '-'}`, rightX, y + 72, 248, 9);
  drawWrappedText(doc, `Vendedor: ${contract.sellerName || 'Não informado'}`, rightX, y + 84, 248, 9);
  drawWrappedText(
    doc,
    `Contato/Fone: ${contract.sellerPhone || contract.customerPhone || 'Não informado'}`,
    rightX,
    y + 96,
    248,
    9
  );
}

function drawLegacyPeriodBox(doc: LegacyPdfDoc, contract: RentalContract, x: number, y: number, width: number): void {
  const rowHeight = 18;
  const colWidth = width / 3;
  doc.rect(x, y, width, rowHeight * 2);
  doc.line(x, y + rowHeight, x + width, y + rowHeight);
  doc.line(x + colWidth, y, x + colWidth, y + rowHeight * 2);
  doc.line(x + colWidth * 2, y, x + colWidth * 2, y + rowHeight * 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  centerCellText(doc, `Início do contrato: ${formatDate(contract.startDate)}`, x, y + 12, colWidth);
  centerCellText(doc, `Nº contrato: ${contract.contractNumber}`, x + colWidth, y + 12, colWidth);
  centerCellText(
    doc,
    `Previsão de término: ${contract.endDate ? formatDate(contract.endDate) : '-'}`,
    x + colWidth * 2,
    y + 12,
    colWidth
  );
  centerCellText(
    doc,
    `Período de cobrança: ${PERIOD_LABELS[contract.billingPeriod]}`,
    x,
    y + rowHeight + 12,
    colWidth,
    true
  );
  centerCellText(
    doc,
    `Valor da locação por período (${PERIOD_LABELS[contract.billingPeriod]}): ${formatCurrencyCents(contract.subtotalCents || contract.totalCents)}`,
    x + colWidth,
    y + rowHeight + 12,
    colWidth,
    true
  );
  centerCellText(doc, `Valor frete: ${formatCurrencyCents(contract.shippingCents ?? 0)}`, x + colWidth * 2, y + rowHeight + 12, colWidth, true);
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
  centerCellText(doc, 'Valor da Locação/Período', x + 450, y + 10, 93);
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
        },
      ];
  let rowY = y + 45;

  doc.setFontSize(7.2);
  for (const item of items) {
    doc.text(String(item.quantity), x + 29, rowY, { align: 'right' });
    drawWrappedText(doc, item.equipmentName, x + 98, rowY, 228, 8, 2);
    centerCellText(doc, '-', x + 332, rowY, 24);
    doc.text('-', x + 398, rowY, { align: 'right' });
    doc.text('-', x + 445, rowY, { align: 'right' });
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
  doc.rect(x, y, width, 118);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('NOTA PROMISSÓRIA', x + 2, y + 11);
  doc.text(`Nº: ${contract.contractNumber}`, x + width - 90, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Nº: ${contract.contractNumber}`, x + 2, y + 23);
  doc.text(`Valor: ${formatCurrencyCents(contract.totalCents)}`, x + width - 90, y + 23);
  drawWrappedText(
    doc,
    `Pagarei por essa Nota Promissória à ${company.legalName}, CNPJ: ${company.document || 'Não informado'} ou a sua ordem, a quantia de ${formatCurrencyCents(contract.totalCents)} em moeda corrente deste país, pagável em ${company.city || 'Caruaru'}/${company.state || 'PE'}, caso não haja a devolução do bem locado ao término do contrato ou manifestação a fim de prorrogação deste contrato.`,
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

function drawLegacyContractTermsPage(doc: unknown, contract: RentalContract): void {
  const pdf = doc as LegacyPdfDoc;
  const x = 28;
  let y = 38;
  const clauses = contract.terms?.trim()
    ? contract.terms.trim()
    : '1.0 - Do objeto da locação: o objeto do presente contrato é a locação dos equipamentos descritos neste instrumento.\n\n2.0 - Da guarda, uso e conservação dos equipamentos: durante todo o período da locação, o(a) LOCATÁRIO(A) ficará responsável pela guarda, conservação e manutenção dos equipamentos, desde a retirada ou entrega até a efetiva devolução.\n\n2.1 - O(A) LOCATÁRIO(A), após vistoriar o equipamento e constatar que se encontra em perfeito estado de conservação, limpeza e apto ao uso, responsabiliza-se por qualquer dano ou perda total ou parcial, inclusive por furto, roubo, incêndio, acidente, uso indevido ou qualquer outra causa.\n\n2.2 - O(s) equipamento(s) descrito(s) no contrato será(ão) utilizado(s) única e exclusivamente na obra descrita e caracterizada neste contrato, ficando o(a) LOCATÁRIO(A) responsável por montagem, desmontagem, uso adequado e segurança da operação.\n\n2.3 - Fica proibida a utilização dos equipamentos por terceiros estranhos ao presente contrato, bem como sublocação, transferência ou cessão sem consentimento da LOCADORA, sob pena de rescisão.\n\n2.4 - O(A) LOCATÁRIO(A) assume responsabilidade pelas condições de uso, providenciando equipamentos de segurança necessários e indispensáveis, tais como cintos, capacetes, cordas e demais EPIs aplicáveis.\n\n2.5 - Em contratos superiores a 30 dias, o(a) LOCATÁRIO(A) poderá ficar sujeito à cobrança de manutenção, conforme estado do equipamento após perícia da LOCADORA.\n\n3.0 - Do prazo de locação: o prazo inicia-se na data de retirada ou entrega dos equipamentos e termina na data pactuada para devolução.\n\n3.1 - Findo o período de vigência, o contrato poderá ser prorrogado desde que a LOCADORA consinta expressamente, com emissão de novo contrato ou aditivo aplicável.\n\n3.2 - Caso o contrato não seja renovado e o(a) LOCATÁRIO(A) permaneça na posse dos equipamentos após o prazo, pagará aluguel conforme pactuado, sem prejuízo de multas e demais cobranças cabíveis.\n\n4.0 - Do foro: as partes elegem o foro de Caruaru/PE para dirimir questões oriundas deste contrato, com renúncia a qualquer outro por mais privilegiado que seja.\n\nOBS.: DECLARO TER LIDO O PRESENTE CONTRATO E ACEITO TODAS AS CLÁUSULAS NELE CONTIDAS.';

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
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  rect: (x: number, y: number, width: number, height: number) => void;
  setFont: (font: string, style?: string) => void;
  setFontSize: (size: number) => void;
  splitTextToSize?: (text: string, maxWidth: number) => string[];
  text: (text: string | string[], x: number, y: number, options?: Record<string, unknown>) => void;
};

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
  pdf.text('Unitário', columns[2], y);
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
  width: number,
  boldValue = false
): void {
  if (!boldValue) {
    doc.text(text, x + width / 2, y, { align: 'center' });
    return;
  }

  const [label, ...valueParts] = text.split(': ');
  const value = valueParts.join(': ');

  if (!value) {
    doc.text(text, x + width / 2, y, { align: 'center' });
    return;
  }

  doc.text(`${label}:`, x + width / 2 - Math.min(width / 3, label.length * 2.3), y, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + width / 2 + Math.min(width / 5, value.length * 1.6), y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
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
