import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Clipboard,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Flag,
  LogOut,
  MoreVertical,
  Pencil,
  Plus,
  ReceiptText,
  QrCode,
  RotateCcw,
  Search,
  Truck,
  WalletCards,
  X,
  LucideAngularModule,
} from 'lucide-angular';

import type { CompanyProfile } from '../../interfaces/company-profile';
import type {
  RentalBillingPeriod,
  RentalContract,
  RentalContractStatus,
  RentalFinancialStatus,
  RentalOperationalCode,
} from '../../interfaces/rental-contract';
import type { InvoicePixCharge } from '../../interfaces/invoice-pix-charge';
import { AuthService } from '../../services/auth.service';
import { CompanyProfileService } from '../../services/company-profile.service';
import { InvoicePixChargeService } from '../../services/invoice-pix-charge.service';
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
type ContractSortKey =
  | 'category'
  | 'createdAt'
  | 'number'
  | 'customer'
  | 'period'
  | 'total'
  | 'startDate'
  | 'endDate'
  | 'dueDate'
  | 'paymentDate'
  | 'financialStatus'
  | 'rentalStatus'
  | 'operationalCode';
type SmartFilter =
  | 'all'
  | 'active'
  | 'due-soon'
  | 'overdue'
  | 'awaiting-collection'
  | 'renewed'
  | 'finalized';
type ColumnFilters = Record<
  | 'category'
  | 'contract'
  | 'customer'
  | 'period'
  | 'value'
  | 'startDate'
  | 'endDate'
  | 'dueDate'
  | 'paymentDate'
  | 'financialStatus'
  | 'rentalStatus'
  | 'operationalCode',
  string
>;

interface ContractIndicators {
  active: number;
  overdue: number;
  dueSoon: number;
  receivedThisMonthCents: number;
  receivableCents: number;
  awaitingCollection: number;
  renewed: number;
  finalized: number;
  topOpenCustomers: Array<{ name: string; totalCents: number }>;
}

interface ContractAlert {
  kind: 'warning' | 'error' | 'info' | 'success';
  label: string;
  count: number;
  description: string;
}

@Component({
  selector: 'app-gestor-contratos',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-contratos.html',
})
export class GestorContratosPage implements OnInit {
  protected readonly AlertTriangle = AlertTriangle;
  protected readonly CalendarRange = CalendarRange;
  protected readonly CheckCircle2 = CheckCircle2;
  protected readonly Clipboard = Clipboard;
  protected readonly ClipboardList = ClipboardList;
  protected readonly Clock3 = Clock3;
  protected readonly Download = Download;
  protected readonly Eye = Eye;
  protected readonly FileCheck = FileCheck;
  protected readonly FileText = FileText;
  protected readonly Filter = Filter;
  protected readonly Flag = Flag;
  protected readonly LogOut = LogOut;
  protected readonly MoreVertical = MoreVertical;
  protected readonly Pencil = Pencil;
  protected readonly Plus = Plus;
  protected readonly ReceiptText = ReceiptText;
  protected readonly QrCode = QrCode;
  protected readonly RotateCcw = RotateCcw;
  protected readonly Search = Search;
  protected readonly Truck = Truck;
  protected readonly WalletCards = WalletCards;
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
  protected readonly financialStatusOptions: Array<{ value: RentalFinancialStatus; label: string }> = [
    { value: 'pending', label: 'Pendente' },
    { value: 'paid', label: 'Pago' },
    { value: 'overdue', label: 'Atrasado' },
    { value: 'partial', label: 'Parcial' },
    { value: 'cancelled', label: 'Cancelado' },
  ];
  protected readonly smartFilterOptions: Array<{ value: SmartFilter; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'due-soon', label: 'A vencer' },
    { value: 'overdue', label: 'Vencidos' },
    { value: 'renewed', label: 'Renovados' },
    { value: 'awaiting-collection', label: 'Aguardando coleta' },
    { value: 'finalized', label: 'Finalizados' },
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
  protected selectedCategory = 'all';
  protected selectedFinancialStatus: RentalFinancialStatus | 'all' = 'all';
  protected selectedSmartFilter: SmartFilter = 'all';
  protected columnFilters: ColumnFilters = emptyColumnFilters();
  protected loading = false;
  protected exportingContractId: number | null = null;
  protected exportingDeliveryReceiptId: number | null = null;
  protected exportingReturnReceiptId: number | null = null;
  protected exportingInvoiceId: number | null = null;
  protected exportingQuoteId: number | null = null;
  protected updatingContractStatusId: number | null = null;
  protected invoiceDialogOpen = false;
  protected invoiceContract: RentalContract | null = null;
  protected invoicePixCharge: InvoicePixCharge | null = null;
  protected invoiceDueDate = '';
  protected invoiceAdditionalInfo = '';
  protected errorMessage = '';
  protected successMessage = '';
  protected sortKey: ContractSortKey = 'createdAt';
  protected sortDirection: SortDirection = 'desc';

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly companyProfileService: CompanyProfileService,
    private readonly invoicePixChargeService: InvoicePixChargeService,
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
      const matchesCategory =
        this.selectedCategory === 'all' ||
        this.contractCategories(contract).some((category) => category === this.selectedCategory);
      const matchesFinancialStatus =
        this.selectedFinancialStatus === 'all' ||
        this.effectiveFinancialStatus(contract) === this.selectedFinancialStatus;
      const matchesSmartFilter = this.contractMatchesSmartFilter(contract, this.selectedSmartFilter);
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
        contract.dueDate,
        contract.paymentDate,
        this.financialStatusLabel(this.effectiveFinancialStatus(contract)),
        contract.operationalCode,
        this.operationalCodeDescription(contract.operationalCode),
        contract.startDate,
        contract.endDate,
        this.periodLabel(contract.billingPeriod),
        this.rentalDurationLabel(contract),
        this.statusLabel(contract.status),
        formatCurrencyCents(contract.totalCents),
        ...this.contractCategories(contract),
        ...contract.items.flatMap((item) => [
          item.equipmentName,
          item.equipmentCategoryName,
          item.equipmentCategoryCode,
          item.equipmentCode,
        ]),
      ]);
      const matchesColumnFilters = this.contractMatchesColumnFilters(contract);

      return (
        matchesStatus &&
        matchesPeriod &&
        matchesCategory &&
        matchesFinancialStatus &&
        matchesSmartFilter &&
        matchesDateRange &&
        matchesQuery &&
        matchesColumnFilters
      );
    });

    return sortBy(filtered, (contract) => this.contractSortValue(contract), this.sortDirection);
  }

  protected filteredContractsCount(): number {
    return this.filteredContracts().length;
  }

  protected indicators(): ContractIndicators {
    const today = todayInputValue();
    const monthPrefix = today.slice(0, 7);
    const openTotalsByCustomer = new Map<string, number>();
    let active = 0;
    let overdue = 0;
    let dueSoon = 0;
    let receivedThisMonthCents = 0;
    let receivableCents = 0;
    let awaitingCollection = 0;
    let renewed = 0;
    let finalized = 0;

    for (const contract of this.contracts) {
      const financialStatus = this.effectiveFinancialStatus(contract);

      if (contract.status === 'active') {
        active += 1;
      }

      if (financialStatus === 'overdue') {
        overdue += 1;
      }

      if (this.isContractDueSoon(contract)) {
        dueSoon += 1;
      }

      if (financialStatus === 'paid' && (contract.paymentDate ?? '').startsWith(monthPrefix)) {
        receivedThisMonthCents += contract.totalCents;
      }

      if (this.isFinanciallyOpen(contract)) {
        receivableCents += contract.totalCents;
        openTotalsByCustomer.set(
          contract.customerName,
          (openTotalsByCustomer.get(contract.customerName) ?? 0) + contract.totalCents
        );
      }

      if (this.isAwaitingCollection(contract)) {
        awaitingCollection += 1;
      }

      if (contract.operationalCode === 'CR') {
        renewed += 1;
      }

      if (this.isFinalized(contract)) {
        finalized += 1;
      }
    }

    return {
      active,
      overdue,
      dueSoon,
      receivedThisMonthCents,
      receivableCents,
      awaitingCollection,
      renewed,
      finalized,
      topOpenCustomers: [...openTotalsByCustomer.entries()]
        .map(([name, totalCents]) => ({ name, totalCents }))
        .sort((left, right) => right.totalCents - left.totalCents)
        .slice(0, 3),
    };
  }

  protected contractAlerts(): ContractAlert[] {
    const dueSoon = this.contracts.filter((contract) => this.isContractDueSoon(contract)).length;
    const paymentOverdue = this.contracts.filter(
      (contract) => this.effectiveFinancialStatus(contract) === 'overdue'
    ).length;
    const expiredEndDate = this.contracts.filter((contract) => this.hasExpiredEndDate(contract)).length;
    const paidStillOpen = this.contracts.filter(
      (contract) =>
        this.effectiveFinancialStatus(contract) === 'paid' &&
        (contract.status === 'active' || contract.status === 'draft')
    ).length;
    const finalizedFinancialPending = this.contracts.filter(
      (contract) => this.isFinalized(contract) && this.isFinanciallyOpen(contract)
    ).length;

    const alerts: ContractAlert[] = [
      {
        kind: 'warning',
        label: 'Próximos do vencimento',
        count: dueSoon,
        description: 'Contratos com vencimento nos próximos 7 dias.',
      },
      {
        kind: 'error',
        label: 'Pagamentos atrasados',
        count: paymentOverdue,
        description: 'Contratos vencidos sem baixa financeira.',
      },
      {
        kind: 'error',
        label: 'Fim vencido',
        count: expiredEndDate,
        description: 'Data fim vencida e locação ainda aberta.',
      },
      {
        kind: 'info',
        label: 'Pago e aberto',
        count: paidStillOpen,
        description: 'Financeiro pago, mas operação ainda não finalizada.',
      },
      {
        kind: 'warning',
        label: 'Finalizado pendente',
        count: finalizedFinancialPending,
        description: 'Operação finalizada com financeiro em aberto.',
      },
    ];

    return alerts.filter((alert) => alert.count > 0);
  }

  protected categoryOptions(): string[] {
    return [...new Set(this.contracts.flatMap((contract) => this.contractCategories(contract)))]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, 'pt-BR', { sensitivity: 'base' }));
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

  protected setFinancialStatus(status: RentalFinancialStatus | 'all') {
    this.selectedFinancialStatus = status;
  }

  protected setSmartFilter(filter: SmartFilter) {
    this.selectedSmartFilter = filter;
  }

  protected setColumnFilter(key: keyof ColumnFilters, value: string) {
    this.columnFilters = {
      ...this.columnFilters,
      [key]: value,
    };
  }

  protected clearColumnFilters() {
    this.columnFilters = emptyColumnFilters();
  }

  protected hasColumnFilters(): boolean {
    return Object.values(this.columnFilters).some(Boolean);
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

  protected openInvoiceDialog(contract: RentalContract) {
    this.invoiceContract = contract;
    this.invoicePixCharge = null;
    this.invoiceDueDate = todayInputValue();
    this.invoiceAdditionalInfo = contract.notes ?? '';
    this.invoiceDialogOpen = true;
    this.errorMessage = '';
  }

  protected closeInvoiceDialog() {
    if (this.exportingInvoiceId) {
      return;
    }

    this.invoiceDialogOpen = false;
    this.invoiceContract = null;
    this.invoicePixCharge = null;
    this.invoiceDueDate = '';
    this.invoiceAdditionalInfo = '';
  }

  protected updateInvoiceDueDate(value: string) {
    this.invoiceDueDate = value;
    this.invoicePixCharge = null;
  }

  protected updateInvoiceAdditionalInfo(value: string) {
    this.invoiceAdditionalInfo = value;
    this.invoicePixCharge = null;
  }

  protected async generateInvoicePixCharge() {
    const contract = this.invoiceContract;

    if (!contract || !this.invoiceDueDate) {
      this.errorMessage = 'Informe a data de vencimento da cobrança.';
      return;
    }

    this.exportingInvoiceId = contract.id;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      this.invoicePixCharge = await this.invoicePixChargeService.createCharge({
        contractId: contract.id,
        dueDate: this.invoiceDueDate,
        additionalInfo: this.invoiceAdditionalInfo,
      });
      this.successMessage = 'Cobrança PIX gerada para a fatura.';
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível gerar a cobrança PIX.';
    } finally {
      this.exportingInvoiceId = null;
      this.changeDetector.detectChanges();
    }
  }

  protected async exportInvoice() {
    const contract = this.invoiceContract;

    if (!contract || !this.invoiceDueDate) {
      this.errorMessage = 'Informe a data de vencimento da fatura.';
      return;
    }

    this.exportingInvoiceId = contract.id;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const pixCharge = this.invoicePixCharge ?? await this.invoicePixChargeService.createCharge({
        contractId: contract.id,
        dueDate: this.invoiceDueDate,
        additionalInfo: this.invoiceAdditionalInfo,
      });
      this.invoicePixCharge = pixCharge;
      await exportInvoicePdf(contract, await this.getCompanyProfile(), {
        dueDate: dateInputToLocalDate(this.invoiceDueDate),
        additionalInfo: this.invoiceAdditionalInfo,
        pixCharge,
      });
      this.exportingInvoiceId = null;
      this.closeInvoiceDialog();
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível exportar a fatura.';
    } finally {
      this.exportingInvoiceId = null;
      this.changeDetector.detectChanges();
    }
  }

  protected async copyInvoicePix() {
    if (!this.invoicePixCharge) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.invoicePixCharge.brcode);
      this.successMessage = 'PIX copia e cola enviado para a área de transferência.';
    } catch {
      this.errorMessage = 'Não foi possível copiar o PIX copia e cola.';
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

  protected async cancelContract(contract: RentalContract) {
    if (contract.status === 'cancelled') {
      return;
    }

    const confirmed = window.confirm(
      `Cancelar o contrato ${contract.contractNumber}? Esta ação muda o status para Cancelado.`
    );

    if (!confirmed) {
      return;
    }

    this.updatingContractStatusId = contract.id;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.rentalContractService.updateStatus(contract.id, 'cancelled');
      this.contracts = this.contracts.map((item) =>
        item.id === contract.id ? { ...item, status: 'cancelled' } : item
      );
      this.successMessage = `Contrato ${contract.contractNumber} cancelado.`;
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível cancelar o contrato.';
    } finally {
      this.updatingContractStatusId = null;
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

  protected financialStatusLabel(status: RentalFinancialStatus): string {
    return this.financialStatusOptions.find((option) => option.value === status)?.label ?? status;
  }

  protected operationalCodeDescription(code: RentalOperationalCode): string {
    const descriptions: Record<RentalOperationalCode, string> = {
      CR: 'Contrato renovado',
      SR: 'Sem renovação',
      'SR/C': 'Sem renovação/coletado',
    };

    return descriptions[code];
  }

  protected contractCategories(contract: RentalContract): string[] {
    const categories = contract.items
      .map((item) => item.equipmentCategoryName || item.equipmentCategoryCode || '')
      .filter(Boolean);

    return categories.length ? [...new Set(categories)] : ['Sem categoria'];
  }

  protected contractCategoryLabel(contract: RentalContract): string {
    const categories = this.contractCategories(contract);

    if (categories.length <= 2) {
      return categories.join(', ');
    }

    return `${categories.slice(0, 2).join(', ')} +${categories.length - 2}`;
  }

  protected effectiveFinancialStatus(contract: RentalContract): RentalFinancialStatus {
    if (contract.financialStatus === 'pending' && this.isDateBefore(contract.dueDate, todayInputValue())) {
      return 'overdue';
    }

    return contract.financialStatus;
  }

  protected isFinanciallyOpen(contract: RentalContract): boolean {
    const status = this.effectiveFinancialStatus(contract);
    return status !== 'paid' && status !== 'cancelled' && contract.status !== 'cancelled';
  }

  protected isContractDueSoon(contract: RentalContract): boolean {
    if (!this.isFinanciallyOpen(contract) || !contract.dueDate) {
      return false;
    }

    const today = todayInputValue();
    const nextWeek = addDaysInput(today, 7);

    return contract.dueDate >= today && contract.dueDate <= nextWeek;
  }

  protected isAwaitingCollection(contract: RentalContract): boolean {
    if (contract.operationalCode === 'SR/C' || this.isFinalized(contract)) {
      return false;
    }

    return contract.operationalCode === 'SR' && this.hasExpiredEndDate(contract);
  }

  protected isFinalized(contract: RentalContract): boolean {
    return (
      contract.status === 'closed' ||
      contract.status === 'returned' ||
      contract.status === 'cancelled' ||
      contract.operationalCode === 'SR/C'
    );
  }

  protected hasExpiredEndDate(contract: RentalContract): boolean {
    return (
      Boolean(contract.endDate) &&
      this.isDateBefore(contract.endDate, todayInputValue()) &&
      contract.status !== 'closed' &&
      contract.status !== 'returned' &&
      contract.status !== 'cancelled'
    );
  }

  protected alertClass(kind: ContractAlert['kind']): string {
    const classes: Record<ContractAlert['kind'], string> = {
      error: 'border-error/25 bg-error/10 text-error',
      warning: 'border-warning/25 bg-warning/10 text-warning',
      info: 'border-info/25 bg-info/10 text-info',
      success: 'border-success/25 bg-success/10 text-success',
    };

    return classes[kind];
  }

  protected formatDate(value?: string): string {
    return value ? formatDate(value) : '-';
  }

  protected formatMoney(value: number): string {
    return formatCurrencyCents(value);
  }

  protected exportCsv() {
    const header = [
      'Categoria',
      'Nº do contrato',
      'Cliente',
      'Período',
      'Valor',
      'Data início',
      'Data fim',
      'Data vencimento',
      'Data pagamento',
      'Status financeiro',
      'Status locação',
      'Código operacional',
    ];
    const rows = this.filteredContracts().map((contract) => [
      this.contractCategoryLabel(contract),
      contract.contractNumber,
      contract.customerName,
      this.rentalDurationLabel(contract),
      formatCurrencyCents(contract.totalCents),
      this.formatDate(contract.startDate),
      this.formatDate(contract.endDate),
      this.formatDate(contract.dueDate),
      this.formatDate(contract.paymentDate),
      this.financialStatusLabel(this.effectiveFinancialStatus(contract)),
      this.statusLabel(contract.status),
      contract.operationalCode,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `contratos-mega-gestor-${todayInputValue()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected async signOut() {
    await this.authService.signOut();
    void this.router.navigateByUrl('/gestor/login');
  }

  private contractSortValue(contract: RentalContract): string | number {
    switch (this.sortKey) {
      case 'category':
        return this.contractCategoryLabel(contract);
      case 'createdAt':
        return newestSortValue(contract.createdAt, contract.id);
      case 'customer':
        return contract.customerName;
      case 'period':
        return contract.startDate;
      case 'total':
        return contract.totalCents;
      case 'startDate':
        return contract.startDate;
      case 'endDate':
        return contract.endDate ?? '';
      case 'dueDate':
        return contract.dueDate ?? '';
      case 'paymentDate':
        return contract.paymentDate ?? '';
      case 'financialStatus':
        return this.effectiveFinancialStatus(contract);
      case 'rentalStatus':
        return contract.status;
      case 'operationalCode':
        return contract.operationalCode;
      case 'number':
      default:
        return contractNumberSortValue(contract.contractNumber);
    }
  }

  private contractMatchesColumnFilters(contract: RentalContract): boolean {
    const filters = this.columnFilters;
    const fields: Record<keyof ColumnFilters, Array<string | number | null | undefined>> = {
      category: this.contractCategories(contract),
      contract: [contract.contractNumber, contract.previousContractNumber],
      customer: [contract.customerName, contract.customerDocument, contract.customerPhone],
      period: [this.periodLabel(contract.billingPeriod), this.rentalDurationLabel(contract)],
      value: [formatCurrencyCents(contract.totalCents), contract.totalCents],
      startDate: [contract.startDate, this.formatDate(contract.startDate)],
      endDate: [contract.endDate, this.formatDate(contract.endDate)],
      dueDate: [contract.dueDate, this.formatDate(contract.dueDate)],
      paymentDate: [contract.paymentDate, this.formatDate(contract.paymentDate)],
      financialStatus: [
        this.financialStatusLabel(this.effectiveFinancialStatus(contract)),
        this.effectiveFinancialStatus(contract),
      ],
      rentalStatus: [this.statusLabel(contract.status), contract.status],
      operationalCode: [contract.operationalCode, this.operationalCodeDescription(contract.operationalCode)],
    };

    return Object.entries(filters).every(([key, query]) =>
      matchesSearchQuery(query, fields[key as keyof ColumnFilters])
    );
  }

  private contractMatchesSmartFilter(contract: RentalContract, filter: SmartFilter): boolean {
    switch (filter) {
      case 'active':
        return contract.status === 'active';
      case 'due-soon':
        return this.isContractDueSoon(contract);
      case 'overdue':
        return this.effectiveFinancialStatus(contract) === 'overdue';
      case 'awaiting-collection':
        return this.isAwaitingCollection(contract);
      case 'renewed':
        return contract.operationalCode === 'CR';
      case 'finalized':
        return this.isFinalized(contract);
      case 'all':
      default:
        return true;
    }
  }

  private isDateBefore(value: string | undefined, reference: string): boolean {
    return Boolean(value && value < reference);
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

function newestSortValue(createdAt: string | undefined, id: number): number {
  const timestamp = createdAt ? Date.parse(createdAt) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp + id / 1_000_000 : id;
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

function todayInputValue(): string {
  const now = new Date();
  return dateToInputValue(now);
}

function addDaysInput(value: string, days: number): string {
  const [year, month, day] = value.split('-').map((part) => Number(part));

  if (!year || !month || !day) {
    return value;
  }

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return dateToInputValue(date);
}

function dateToInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateInputToLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number(part));

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
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

function emptyColumnFilters(): ColumnFilters {
  return {
    category: '',
    contract: '',
    customer: '',
    period: '',
    value: '',
    startDate: '',
    endDate: '',
    dueDate: '',
    paymentDate: '',
    financialStatus: '',
    rentalStatus: '',
    operationalCode: '',
  };
}

function csvCell(value: unknown): string {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}
