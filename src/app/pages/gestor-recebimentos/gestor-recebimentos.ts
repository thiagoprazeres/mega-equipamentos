import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Banknote,
  CheckCircle2,
  Clipboard,
  FileText,
  LogOut,
  QrCode,
  Search,
  ShieldAlert,
  X,
  LucideAngularModule,
} from 'lucide-angular';

import type {
  InvoicePixCharge,
  InvoicePixChargeStatus,
} from '../../interfaces/invoice-pix-charge';
import { AuthService } from '../../services/auth.service';
import { InvoicePixChargeService } from '../../services/invoice-pix-charge.service';
import { centsToDecimalInput, formatCurrencyCents, parseCurrencyToCents } from '../../utils/prices';
import { matchesSearchQuery } from '../../utils/search';

const RECEIPTS_LOAD_TIMEOUT_MS = 6500;

@Component({
  selector: 'app-gestor-recebimentos',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-recebimentos.html',
})
export class GestorRecebimentosPage implements OnInit {
  protected readonly Banknote = Banknote;
  protected readonly CheckCircle2 = CheckCircle2;
  protected readonly Clipboard = Clipboard;
  protected readonly FileText = FileText;
  protected readonly LogOut = LogOut;
  protected readonly QrCode = QrCode;
  protected readonly Search = Search;
  protected readonly ShieldAlert = ShieldAlert;
  protected readonly X = X;
  protected readonly statusOptions: Array<{ value: InvoicePixChargeStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'paid', label: 'Pagos' },
    { value: 'review', label: 'Revisão' },
    { value: 'rejected', label: 'Rejeitados' },
    { value: 'cancelled', label: 'Cancelados' },
  ];

  protected charges: InvoicePixCharge[] = [];
  protected query = '';
  protected selectedStatus: InvoicePixChargeStatus | 'all' = 'all';
  protected loading = false;
  protected confirming = false;
  protected receiptDialogOpen = false;
  protected selectedCharge: InvoicePixCharge | null = null;
  protected receiptEndToEndId = '';
  protected receiptPaidAmount = '';
  protected receiptPaidAt = '';
  protected receiptPayerName = '';
  protected receiptPayerDocument = '';
  protected errorMessage = '';
  protected successMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly invoicePixChargeService: InvoicePixChargeService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadPageData();
    }
  }

  protected filteredCharges(): InvoicePixCharge[] {
    return this.charges.filter((charge) => {
      const matchesStatus = this.selectedStatus === 'all' || charge.status === this.selectedStatus;
      const matchesQuery = matchesSearchQuery(this.query, [
        charge.id,
        charge.invoiceNumber,
        charge.contractNumber,
        charge.txid,
        charge.endToEndId,
        charge.payerIspb,
        charge.payerBankName,
        charge.customerName,
        charge.customerDocument,
        charge.customerPhone,
        charge.status,
        this.statusLabel(charge.status),
        formatCurrencyCents(charge.amountCents),
      ]);

      return matchesStatus && matchesQuery;
    });
  }

  protected filteredChargesCount(): number {
    return this.filteredCharges().length;
  }

  protected setStatus(status: InvoicePixChargeStatus | 'all') {
    this.selectedStatus = status;
  }

  protected openReceiptDialog(charge: InvoicePixCharge) {
    this.selectedCharge = charge;
    this.receiptEndToEndId = charge.endToEndId ?? '';
    this.receiptPaidAmount = centsToDecimalInput(charge.paidAmountCents || charge.amountCents);
    this.receiptPaidAt = toDateTimeLocalInput(charge.paidAt ? new Date(charge.paidAt) : new Date());
    this.receiptPayerName = charge.payerName ?? '';
    this.receiptPayerDocument = charge.payerDocument ?? '';
    this.errorMessage = '';
    this.successMessage = '';
    this.receiptDialogOpen = true;
  }

  protected closeReceiptDialog() {
    if (this.confirming) {
      return;
    }

    this.receiptDialogOpen = false;
    this.selectedCharge = null;
  }

  protected async confirmReceipt() {
    const charge = this.selectedCharge;

    if (!charge || this.confirming) {
      return;
    }

    if (!this.receiptEndToEndId.trim()) {
      this.errorMessage = 'Informe o EndToEndId do PIX recebido.';
      return;
    }

    this.confirming = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const updated = await this.invoicePixChargeService.confirmCharge(charge.id, {
        endToEndId: this.receiptEndToEndId,
        paidAmountCents: parseCurrencyToCents(this.receiptPaidAmount),
        paidAt: this.receiptPaidAt,
        payerName: this.receiptPayerName,
        payerDocument: this.receiptPayerDocument,
      });
      this.charges = this.charges.map((item) => (item.id === updated.id ? updated : item));
      this.successMessage = updated.status === 'paid'
        ? 'Recebimento confirmado como pago.'
        : 'Recebimento registrado para revisão.';
      this.receiptDialogOpen = false;
      this.selectedCharge = null;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível confirmar o recebimento.';
    } finally {
      this.confirming = false;
      this.changeDetector.detectChanges();
    }
  }

  protected async copyPix(charge: InvoicePixCharge) {
    try {
      await navigator.clipboard.writeText(charge.brcode);
      this.successMessage = 'PIX copia e cola enviado para a área de transferência.';
    } catch {
      this.errorMessage = 'Não foi possível copiar o PIX copia e cola.';
    }
  }

  protected formatMoney(value: number): string {
    return formatCurrencyCents(value);
  }

  protected formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
      return value;
    }

    return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
  }

  protected formatDateTime(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }

  protected statusLabel(status: InvoicePixChargeStatus): string {
    const option = this.statusOptions.find((item) => item.value === status);
    return option?.label ?? status;
  }

  protected statusBadgeClass(status: InvoicePixChargeStatus): string {
    if (status === 'paid') {
      return 'badge-success';
    }

    if (status === 'review') {
      return 'badge-warning';
    }

    if (status === 'rejected' || status === 'cancelled') {
      return 'badge-error';
    }

    return 'badge-ghost';
  }

  protected riskLabel(charge: InvoicePixCharge): string {
    if (!charge.riskBand) {
      return 'Sem análise';
    }

    return `${charge.riskBand} | ${charge.riskScore}`;
  }

  protected async signOut() {
    await this.authService.signOut();
    await this.router.navigate(['/gestor/login']);
  }

  private async loadPageData() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      this.charges = await withTimeout(
        this.invoicePixChargeService.listCharges(),
        RECEIPTS_LOAD_TIMEOUT_MS
      );
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível carregar os recebimentos.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }
}

function toDateTimeLocalInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Tempo limite ao carregar recebimentos.')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
