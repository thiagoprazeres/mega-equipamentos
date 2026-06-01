import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  CalendarRange,
  ClipboardList,
  Download,
  Eye,
  FileCheck,
  FileText,
  LogOut,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  X,
  LucideAngularModule,
} from 'lucide-angular';

import type { CompanyProfile } from '../../interfaces/company-profile';
import type {
  RentalBillingPeriod,
  RentalContract,
  RentalContractStatus,
} from '../../interfaces/rental-contract';
import { AuthService } from '../../services/auth.service';
import { CompanyProfileService } from '../../services/company-profile.service';
import {
  type RentalContractDateMode,
  RentalContractService,
} from '../../services/rental-contract.service';
import {
  exportDeliveryReceiptPdf,
  exportInvoicePdf,
  exportQuotePdf,
  exportRentalContractPdf,
  exportReturnReceiptPdf,
} from '../../utils/rental-contract-pdf';
import { formatCurrencyCents } from '../../utils/prices';
import { matchesSearchQuery } from '../../utils/search';

const CONTRACTS_LOAD_TIMEOUT_MS = 6500;
type SortDirection = 'asc' | 'desc';
type ContractSortKey = 'number' | 'customer' | 'seller' | 'period' | 'items' | 'total' | 'status';

@Component({
  selector: 'app-gestor-contratos',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-contratos.html',
})
export class GestorContratosPage implements OnInit {
  protected readonly CalendarRange = CalendarRange;
  protected readonly ClipboardList = ClipboardList;
  protected readonly Download = Download;
  protected readonly Eye = Eye;
  protected readonly FileCheck = FileCheck;
  protected readonly FileText = FileText;
  protected readonly LogOut = LogOut;
  protected readonly Pencil = Pencil;
  protected readonly Plus = Plus;
  protected readonly ReceiptText = ReceiptText;
  protected readonly RotateCcw = RotateCcw;
  protected readonly Search = Search;
  protected readonly X = X;
  protected readonly periodOptions: Array<{ value: RentalBillingPeriod; label: string }> = [
    { value: 'daily', label: 'Diária' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'fortnightly', label: 'Quinzenal' },
    { value: 'monthly', label: 'Mensal' },
  ];
  protected readonly statusOptions: Array<{ value: RentalContractStatus; label: string }> = [
    { value: 'draft', label: 'Rascunho' },
    { value: 'active', label: 'Ativo' },
    { value: 'closed', label: 'Encerrado' },
    { value: 'returned', label: 'Devolvido' },
    { value: 'cancelled', label: 'Cancelado' },
  ];
  protected readonly dateModeOptions: Array<{ value: RentalContractDateMode; label: string }> = [
    { value: 'overlap', label: 'Início ou término' },
    { value: 'start', label: 'Data de início' },
    { value: 'end', label: 'Data de término' },
  ];

  protected contracts: RentalContract[] = [];
  protected query = '';
  protected draftDateFrom = '';
  protected draftDateTo = '';
  protected draftDateMode: RentalContractDateMode = 'overlap';
  protected dateFrom = '';
  protected dateTo = '';
  protected dateMode: RentalContractDateMode = 'overlap';
  protected selectedStatus: RentalContractStatus | 'all' = 'all';
  protected selectedPeriod: RentalBillingPeriod | 'all' = 'all';
  protected loading = false;
  protected exportingContractId: number | null = null;
  protected exportingDeliveryReceiptId: number | null = null;
  protected exportingReturnReceiptId: number | null = null;
  protected exportingInvoiceId: number | null = null;
  protected exportingQuoteId: number | null = null;
  protected errorMessage = '';
  protected successMessage = '';
  protected sortKey: ContractSortKey = 'number';
  protected sortDirection: SortDirection = 'desc';

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly companyProfileService: CompanyProfileService,
    private readonly rentalContractService: RentalContractService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadPageData();
    }
  }

  protected filteredContracts(): RentalContract[] {
    const filtered = this.contracts.filter((contract) => {
      const matchesStatus = this.selectedStatus === 'all' || contract.status === this.selectedStatus;
      const matchesPeriod = this.selectedPeriod === 'all' || contract.billingPeriod === this.selectedPeriod;
      const matchesDateRange = contractMatchesDateRange(
        contract,
        this.dateFrom,
        this.dateTo,
        this.dateMode
      );
      const matchesQuery = matchesSearchQuery(this.query, [
        contract.id,
        contract.contractNumber,
        contract.previousContractNumber,
        contract.customerId,
        contract.customerName,
        contract.customerDocument,
        contract.customerEmail,
        contract.customerPhone,
        contract.customerAddress,
        contract.customerCity,
        contract.customerState,
        contract.sellerName,
        contract.sellerEmail,
        contract.sellerPhone,
        contract.deliveryAddress,
        contract.worksiteAddress,
        contract.startDate,
        contract.endDate,
        this.periodLabel(contract.billingPeriod),
        this.rentalDurationLabel(contract),
        this.statusLabel(contract.status),
        formatCurrencyCents(contract.totalCents),
        ...contract.items.map((item) => item.equipmentName),
      ]);

      return matchesStatus && matchesPeriod && matchesDateRange && matchesQuery;
    });

    return sortBy(filtered, (contract) => this.contractSortValue(contract), this.sortDirection);
  }

  protected filteredContractsCount(): number {
    return this.filteredContracts().length;
  }

  protected setSort(key: ContractSortKey) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortKey = key;
    this.sortDirection = key === 'number' ? 'desc' : 'asc';
  }

  protected sortIndicator(key: ContractSortKey): string {
    if (this.sortKey !== key) {
      return '';
    }

    return this.sortDirection === 'asc' ? '^' : 'v';
  }

  protected setStatus(status: RentalContractStatus | 'all') {
    this.selectedStatus = status;
  }

  protected setPeriod(period: RentalBillingPeriod | 'all') {
    this.selectedPeriod = period;
  }

  protected async applyDateRange() {
    if (this.draftDateFrom && this.draftDateTo && this.draftDateFrom > this.draftDateTo) {
      this.errorMessage = 'A data inicial não pode ser maior que a data final.';
      return;
    }

    this.dateFrom = this.draftDateFrom;
    this.dateTo = this.draftDateTo;
    this.dateMode = this.draftDateMode;
    await this.loadPageData();
  }

  protected async clearDateRange() {
    this.draftDateFrom = '';
    this.draftDateTo = '';
    this.draftDateMode = 'overlap';
    this.dateFrom = '';
    this.dateTo = '';
    this.dateMode = 'overlap';
    await this.loadPageData();
  }

  protected hasDateRange(): boolean {
    return Boolean(this.dateFrom || this.dateTo);
  }

  protected dateRangeLabel(): string {
    if (this.dateFrom && this.dateTo) {
      return `${this.dateModeLabel(this.dateMode)}: ${formatDate(this.dateFrom)} a ${formatDate(this.dateTo)}`;
    }

    if (this.dateFrom) {
      return `${this.dateModeLabel(this.dateMode)}: a partir de ${formatDate(this.dateFrom)}`;
    }

    if (this.dateTo) {
      return `${this.dateModeLabel(this.dateMode)}: até ${formatDate(this.dateTo)}`;
    }

    return 'Todos os períodos';
  }

  protected async exportPdf(contract: RentalContract) {
    this.exportingContractId = contract.id;

    try {
      await exportRentalContractPdf(contract, await this.getCompanyProfile());
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível exportar o PDF.';
    } finally {
      this.exportingContractId = null;
      this.changeDetector.detectChanges();
    }
  }

  protected async exportDeliveryReceipt(contract: RentalContract) {
    this.exportingDeliveryReceiptId = contract.id;

    try {
      await exportDeliveryReceiptPdf(contract, await this.getCompanyProfile());
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível exportar o comprovante de entrega.';
    } finally {
      this.exportingDeliveryReceiptId = null;
      this.changeDetector.detectChanges();
    }
  }

  protected async exportReturnReceipt(contract: RentalContract) {
    this.exportingReturnReceiptId = contract.id;

    try {
      await exportReturnReceiptPdf(contract, await this.getCompanyProfile());
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível exportar o comprovante de devolução.';
    } finally {
      this.exportingReturnReceiptId = null;
      this.changeDetector.detectChanges();
    }
  }

  protected async exportInvoice(contract: RentalContract) {
    this.exportingInvoiceId = contract.id;

    try {
      await exportInvoicePdf(contract, await this.getCompanyProfile());
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível exportar a fatura.';
    } finally {
      this.exportingInvoiceId = null;
      this.changeDetector.detectChanges();
    }
  }

  protected async exportQuote(contract: RentalContract) {
    this.exportingQuoteId = contract.id;

    try {
      await exportQuotePdf(contract, await this.getCompanyProfile());
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível exportar o orçamento.';
    } finally {
      this.exportingQuoteId = null;
      this.changeDetector.detectChanges();
    }
  }

  protected contractPeriod(contract: RentalContract): string {
    return contract.endDate
      ? `${formatDate(contract.startDate)} a ${formatDate(contract.endDate)}`
      : `A partir de ${formatDate(contract.startDate)}`;
  }

  protected periodLabel(period: RentalBillingPeriod): string {
    return this.periodOptions.find((option) => option.value === period)?.label ?? period;
  }

  protected dateModeLabel(mode: RentalContractDateMode): string {
    return this.dateModeOptions.find((option) => option.value === mode)?.label ?? mode;
  }

  protected rentalDurationLabel(contract: RentalContract): string {
    return formatRentalDuration(contract.billingPeriod, contract.rentalPeriodCount);
  }

  protected statusLabel(status: RentalContractStatus): string {
    return this.statusOptions.find((option) => option.value === status)?.label ?? status;
  }

  protected formatMoney(value: number): string {
    return formatCurrencyCents(value);
  }

  protected async signOut() {
    await this.authService.signOut();
    void this.router.navigateByUrl('/gestor/login');
  }

  private contractSortValue(contract: RentalContract): string | number {
    switch (this.sortKey) {
      case 'customer':
        return contract.customerName;
      case 'seller':
        return contract.sellerName ?? '';
      case 'period':
        return contract.startDate;
      case 'items':
        return contract.items.length;
      case 'total':
        return contract.totalCents;
      case 'status':
        return contract.status;
      case 'number':
      default:
        return contractNumberSortValue(contract.contractNumber);
    }
  }

  private async loadPageData() {
    this.loading = true;
    this.errorMessage = '';

    try {
      this.contracts = await withTimeout(
        this.rentalContractService.listContracts({
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
          dateMode: this.dateMode,
        }),
        CONTRACTS_LOAD_TIMEOUT_MS
      );
    } catch (error) {
      console.error('contracts manager load failed', error);
      this.errorMessage = 'Não foi possível carregar os contratos.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  private async getCompanyProfile(): Promise<CompanyProfile | undefined> {
    try {
      return await withTimeout(
        this.companyProfileService.getCompanyProfile(),
        CONTRACTS_LOAD_TIMEOUT_MS
      );
    } catch (error) {
      console.error('company profile for pdf failed', error);
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
      reject(new Error('CONTRACTS_LOAD_TIMEOUT'));
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

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function contractMatchesDateRange(
  contract: RentalContract,
  dateFrom: string,
  dateTo: string,
  dateMode: RentalContractDateMode
): boolean {
  if (!dateFrom && !dateTo) {
    return true;
  }

  const contractStart = contract.startDate;
  const contractEnd = contract.endDate || contract.startDate;

  if (dateMode === 'start') {
    return dateWithinRange(contractStart, dateFrom, dateTo);
  }

  if (dateMode === 'end') {
    return dateWithinRange(contractEnd, dateFrom, dateTo);
  }

  if (dateFrom && contractEnd < dateFrom) {
    return false;
  }

  if (dateTo && contractStart > dateTo) {
    return false;
  }

  return true;
}

function dateWithinRange(value: string, dateFrom: string, dateTo: string): boolean {
  if (dateFrom && value < dateFrom) {
    return false;
  }

  if (dateTo && value > dateTo) {
    return false;
  }

  return true;
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

function contractNumberSortValue(value: string): number | string {
  const numericValue = Number(value.replace(/\./g, ''));

  if (/^\d{1,3}(\.\d{3})*$/.test(value) && Number.isFinite(numericValue)) {
    return numericValue;
  }

  const megaMatch = value.match(/^MEGA-\d{4}-(\d+)$/);

  if (megaMatch) {
    return Number(megaMatch[1]);
  }

  return value;
}
