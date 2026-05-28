import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ClipboardList,
  Download,
  FilePenLine,
  LogOut,
  Pencil,
  Plus,
  Search,
  LucideAngularModule,
} from 'lucide-angular';

import type { CompanyProfile } from '../../interfaces/company-profile';
import type { RentalBillingPeriod } from '../../interfaces/rental-contract';
import type { RentalQuote, RentalQuoteStatus } from '../../interfaces/rental-quote';
import { GestorNavComponent } from '../../components/gestor-nav/gestor-nav';
import { AuthService } from '../../services/auth.service';
import { CompanyProfileService } from '../../services/company-profile.service';
import { RentalQuoteService } from '../../services/rental-quote.service';
import { formatCurrencyCents } from '../../utils/prices';
import { exportStandaloneQuotePdf } from '../../utils/rental-contract-pdf';
import { matchesSearchQuery } from '../../utils/search';

const QUOTES_LOAD_TIMEOUT_MS = 6500;
type SortDirection = 'asc' | 'desc';
type QuoteSortKey = 'number' | 'customer' | 'seller' | 'period' | 'validUntil' | 'items' | 'total' | 'status';

@Component({
  selector: 'app-gestor-orcamentos',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, GestorNavComponent],
  templateUrl: './gestor-orcamentos.html',
})
export class GestorOrcamentosPage implements OnInit {
  protected readonly ClipboardList = ClipboardList;
  protected readonly Download = Download;
  protected readonly FilePenLine = FilePenLine;
  protected readonly LogOut = LogOut;
  protected readonly Pencil = Pencil;
  protected readonly Plus = Plus;
  protected readonly Search = Search;
  protected readonly periodOptions: Array<{ value: RentalBillingPeriod; label: string }> = [
    { value: 'daily', label: 'Diária' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'fortnightly', label: 'Quinzenal' },
    { value: 'monthly', label: 'Mensal' },
  ];
  protected readonly statusOptions: Array<{ value: RentalQuoteStatus; label: string }> = [
    { value: 'draft', label: 'Rascunho' },
    { value: 'sent', label: 'Enviado' },
    { value: 'approved', label: 'Aprovado' },
    { value: 'rejected', label: 'Recusado' },
    { value: 'expired', label: 'Expirado' },
  ];

  protected quotes: RentalQuote[] = [];
  protected query = '';
  protected selectedStatus: RentalQuoteStatus | 'all' = 'all';
  protected selectedPeriod: RentalBillingPeriod | 'all' = 'all';
  protected loading = false;
  protected exportingQuoteId: number | null = null;
  protected errorMessage = '';
  protected sortKey: QuoteSortKey = 'number';
  protected sortDirection: SortDirection = 'desc';

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly companyProfileService: CompanyProfileService,
    private readonly quoteService: RentalQuoteService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadQuotes();
    }
  }

  protected filteredQuotes(): RentalQuote[] {
    const filtered = this.quotes.filter((quote) => {
      const matchesStatus = this.selectedStatus === 'all' || quote.status === this.selectedStatus;
      const matchesPeriod = this.selectedPeriod === 'all' || quote.billingPeriod === this.selectedPeriod;
      const matchesQuery = matchesSearchQuery(this.query, [
        quote.id,
        quote.quoteNumber,
        quote.customerName,
        quote.customerDocument,
        quote.customerEmail,
        quote.customerPhone,
        quote.sellerName,
        quote.sellerEmail,
        quote.sellerPhone,
        quote.deliveryAddress,
        quote.worksiteAddress,
        quote.startDate,
        quote.validUntil,
        this.periodLabel(quote.billingPeriod),
        this.rentalDurationLabel(quote),
        this.statusLabel(quote.status),
        formatCurrencyCents(quote.totalCents),
        ...quote.items.map((item) => item.equipmentName),
      ]);

      return matchesStatus && matchesPeriod && matchesQuery;
    });

    return sortBy(filtered, (quote) => this.quoteSortValue(quote), this.sortDirection);
  }

  protected filteredQuotesCount(): number {
    return this.filteredQuotes().length;
  }

  protected setSort(key: QuoteSortKey) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortKey = key;
    this.sortDirection = key === 'number' ? 'desc' : 'asc';
  }

  protected sortIndicator(key: QuoteSortKey): string {
    if (this.sortKey !== key) {
      return '';
    }

    return this.sortDirection === 'asc' ? '^' : 'v';
  }

  protected setStatus(status: RentalQuoteStatus | 'all') {
    this.selectedStatus = status;
  }

  protected setPeriod(period: RentalBillingPeriod | 'all') {
    this.selectedPeriod = period;
  }

  protected async exportPdf(quote: RentalQuote) {
    this.exportingQuoteId = quote.id;

    try {
      await exportStandaloneQuotePdf(quote, await this.getCompanyProfile());
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível exportar o orçamento.';
    } finally {
      this.exportingQuoteId = null;
      this.changeDetector.detectChanges();
    }
  }

  protected periodLabel(period: RentalBillingPeriod): string {
    return this.periodOptions.find((option) => option.value === period)?.label ?? period;
  }

  protected rentalDurationLabel(quote: RentalQuote): string {
    return formatRentalDuration(quote.billingPeriod, quote.rentalPeriodCount);
  }

  protected statusLabel(status: RentalQuoteStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? status;
  }

  protected formatDate(value?: string): string {
    if (!value) {
      return 'Não informada';
    }

    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  }

  protected formatMoney(value: number): string {
    return formatCurrencyCents(value);
  }

  protected async signOut() {
    await this.authService.signOut();
    void this.router.navigateByUrl('/gestor/login');
  }

  private quoteSortValue(quote: RentalQuote): string | number {
    switch (this.sortKey) {
      case 'customer':
        return quote.customerName;
      case 'seller':
        return quote.sellerName ?? '';
      case 'period':
        return quote.startDate;
      case 'validUntil':
        return quote.validUntil ?? '';
      case 'items':
        return quote.items.length;
      case 'total':
        return quote.totalCents;
      case 'status':
        return quote.status;
      case 'number':
      default:
        return quoteNumberSortValue(quote.quoteNumber);
    }
  }

  private async loadQuotes() {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.quotes = await withTimeout(this.quoteService.listQuotes(), QUOTES_LOAD_TIMEOUT_MS);
    } catch (error) {
      console.error('quotes manager load failed', error);
      this.errorMessage = 'Não foi possível carregar os orçamentos.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  private async getCompanyProfile(): Promise<CompanyProfile | undefined> {
    try {
      return await withTimeout(this.companyProfileService.getCompanyProfile(), QUOTES_LOAD_TIMEOUT_MS);
    } catch (error) {
      console.error('company profile for quote pdf failed', error);
      return undefined;
    }
  }
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function sortBy<Item>(
  items: Item[],
  getValue: (item: Item) => string | number | undefined,
  direction: SortDirection
): Item[] {
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...items].sort((left, right) => {
    const leftValue = getValue(left) ?? '';
    const rightValue = getValue(right) ?? '';

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * multiplier;
    }

    return String(leftValue).localeCompare(String(rightValue), 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    }) * multiplier;
  });
}

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('QUOTES_LOAD_TIMEOUT'));
    }, timeoutMs);

    promise.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
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

function quoteNumberSortValue(value: string): number | string {
  const match = value.match(/^ORC-\d{4}-(\d+)$/);
  return match ? Number(match[1]) : value;
}
