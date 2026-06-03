import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArrowLeft, ClipboardList, Download, FilePenLine, FileText, LucideAngularModule } from 'lucide-angular';

import type { CompanyProfile } from '../../interfaces/company-profile';
import { leadOriginLabel } from '../../interfaces/lead';
import type { RentalBillingPeriod } from '../../interfaces/rental-contract';
import type { RentalQuote, RentalQuoteStatus } from '../../interfaces/rental-quote';
import { CompanyProfileService } from '../../services/company-profile.service';
import { RentalQuoteService } from '../../services/rental-quote.service';
import { formatCurrencyCents } from '../../utils/prices';
import { exportStandaloneQuotePdf } from '../../utils/rental-contract-pdf';

const PERIOD_LABELS: Record<RentalBillingPeriod, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  fortnightly: 'Quinzenal',
  monthly: 'Mensal',
};

const STATUS_LABELS: Record<RentalQuoteStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  approved: 'Aprovado',
  rejected: 'Recusado',
  expired: 'Expirado',
};

@Component({
  selector: 'app-gestor-orcamento-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-orcamento-detalhe.html',
})
export class GestorOrcamentoDetalhePage implements OnInit {
  protected readonly ArrowLeft = ArrowLeft;
  protected readonly ClipboardList = ClipboardList;
  protected readonly Download = Download;
  protected readonly FilePenLine = FilePenLine;
  protected readonly FileText = FileText;

  protected quote: RentalQuote | null = null;
  protected loading = true;
  protected exporting = false;
  protected converting = false;
  protected errorMessage = '';
  protected successMessage = '';

  constructor(
    private readonly changeDetector: ChangeDetectorRef,
    private readonly companyProfileService: CompanyProfileService,
    private readonly quoteService: RentalQuoteService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    try {
      const quotes = await this.quoteService.listQuotes();
      this.quote = quotes.find((item) => item.id === id) ?? null;

      if (!this.quote) {
        this.errorMessage = 'Orçamento não encontrado.';
      }
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível carregar o orçamento.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  protected async exportPdf() {
    if (!this.quote || this.exporting) {
      return;
    }

    this.exporting = true;
    this.errorMessage = '';

    try {
      await exportStandaloneQuotePdf(this.quote, await this.getCompanyProfile());
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível exportar o orçamento.';
    } finally {
      this.exporting = false;
      this.changeDetector.detectChanges();
    }
  }

  protected async convertToContract() {
    if (!this.quote || this.converting || !this.canConvertQuote(this.quote)) {
      return;
    }

    this.converting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const contract = await this.quoteService.convertToContract(this.quote.id);
      this.successMessage = `Orçamento ${this.quote.quoteNumber} transformado no contrato ${contract.contractNumber}.`;
      void this.router.navigate(['/gestor/contratos', contract.id, 'editar']);
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível transformar o orçamento em contrato.';
    } finally {
      this.converting = false;
      this.changeDetector.detectChanges();
    }
  }

  protected canConvertQuote(quote: RentalQuote): boolean {
    return Boolean(quote.leadName && quote.sellerId && quote.items.length);
  }

  protected formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  }

  protected formatMoney(value: number): string {
    return formatCurrencyCents(value);
  }

  protected periodLabel(period: RentalBillingPeriod): string {
    return PERIOD_LABELS[period];
  }

  protected rentalDurationLabel(quote: RentalQuote): string {
    return formatRentalDuration(quote.billingPeriod, quote.rentalPeriodCount);
  }

  protected statusLabel(status: RentalQuoteStatus): string {
    return STATUS_LABELS[status];
  }

  protected leadOrigin(value?: RentalQuote['leadOrigin']): string {
    return value ? leadOriginLabel(value) : '-';
  }

  protected value(value?: string | number | null): string {
    return value === undefined || value === null || value === '' ? '-' : String(value);
  }

  private async getCompanyProfile(): Promise<CompanyProfile | undefined> {
    try {
      return await this.companyProfileService.getCompanyProfile();
    } catch (error) {
      console.error('company profile for quote pdf failed', error);
      return undefined;
    }
  }
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
