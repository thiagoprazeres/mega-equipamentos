import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Banknote,
  CalendarRange,
  CheckCircle2,
  HandCoins,
  LogOut,
  Pencil,
  Plus,
  Search,
  X,
  LucideAngularModule,
} from 'lucide-angular';

import type {
  FinancialEntry,
  FinancialEntryStatus,
  FinancialEntryType,
} from '../../interfaces/financial-entry';
import { AuthService } from '../../services/auth.service';
import { FinancialTransactionService } from '../../services/financial-transaction.service';
import { centsToDecimalInput, formatCurrencyCents, parseCurrencyToCents } from '../../utils/prices';
import { matchesSearchQuery } from '../../utils/search';

const FINANCIAL_LOAD_TIMEOUT_MS = 6500;

@Component({
  selector: 'app-gestor-financeiro',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-financeiro.html',
})
export class GestorFinanceiroPage implements OnInit {
  protected readonly Banknote = Banknote;
  protected readonly CalendarRange = CalendarRange;
  protected readonly CheckCircle2 = CheckCircle2;
  protected readonly HandCoins = HandCoins;
  protected readonly LogOut = LogOut;
  protected readonly Pencil = Pencil;
  protected readonly Plus = Plus;
  protected readonly Search = Search;
  protected readonly X = X;
  protected readonly typeOptions: Array<{ value: FinancialEntryType | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'income', label: 'Entradas' },
    { value: 'expense', label: 'Saídas' },
  ];
  protected readonly statusOptions: Array<{ value: FinancialEntryStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'confirmed', label: 'Confirmados' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'cancelled', label: 'Cancelados' },
  ];

  protected entries: FinancialEntry[] = [];
  protected query = '';
  protected selectedType: FinancialEntryType | 'all' = 'all';
  protected selectedStatus: FinancialEntryStatus | 'all' = 'all';
  protected draftDateFrom = '';
  protected draftDateTo = '';
  protected dateFrom = '';
  protected dateTo = '';
  protected loading = false;
  protected saving = false;
  protected modalOpen = false;
  protected editingEntry: FinancialEntry | null = null;
  protected formType: FinancialEntryType = 'expense';
  protected formDescription = '';
  protected formCategory = '';
  protected formAmount = '';
  protected formMovementDate = '';
  protected formStatus: FinancialEntryStatus = 'confirmed';
  protected formNotes = '';
  protected errorMessage = '';
  protected successMessage = '';

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly financialTransactionService: FinancialTransactionService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadPageData();
    }
  }

  protected filteredEntries(): FinancialEntry[] {
    return this.entries.filter((entry) => {
      const matchesType = this.selectedType === 'all' || entry.type === this.selectedType;
      const matchesStatus = this.selectedStatus === 'all' || entry.status === this.selectedStatus;
      const matchesQuery = matchesSearchQuery(this.query, [
        entry.id,
        entry.description,
        entry.category,
        entry.notes,
        entry.contractNumber,
        entry.customerName,
        entry.customerDocument,
        entry.movementDate,
        this.typeLabel(entry.type),
        this.statusLabel(entry.status),
        formatCurrencyCents(entry.amountCents),
      ]);

      return matchesType && matchesStatus && matchesQuery;
    });
  }

  protected filteredEntriesCount(): number {
    return this.filteredEntries().length;
  }

  protected setType(type: FinancialEntryType | 'all') {
    this.selectedType = type;
  }

  protected setStatus(status: FinancialEntryStatus | 'all') {
    this.selectedStatus = status;
  }

  protected async applyDateRange() {
    if (this.draftDateFrom && this.draftDateTo && this.draftDateFrom > this.draftDateTo) {
      this.errorMessage = 'A data inicial não pode ser maior que a data final.';
      return;
    }

    this.dateFrom = this.draftDateFrom;
    this.dateTo = this.draftDateTo;
    await this.loadPageData();
  }

  protected async clearDateRange() {
    this.draftDateFrom = '';
    this.draftDateTo = '';
    this.dateFrom = '';
    this.dateTo = '';
    await this.loadPageData();
  }

  protected openCreateModal(type: FinancialEntryType = 'expense') {
    this.editingEntry = null;
    this.formType = type;
    this.formDescription = '';
    this.formCategory = '';
    this.formAmount = centsToDecimalInput(0);
    this.formMovementDate = todayInputValue();
    this.formStatus = 'confirmed';
    this.formNotes = '';
    this.errorMessage = '';
    this.modalOpen = true;
  }

  protected openEditModal(entry: FinancialEntry) {
    if (entry.source !== 'manual') {
      this.errorMessage = 'Entradas automáticas de fatura são editadas em Recebimentos.';
      return;
    }

    this.editingEntry = entry;
    this.formType = entry.type;
    this.formDescription = entry.description;
    this.formCategory = entry.category ?? '';
    this.formAmount = centsToDecimalInput(entry.amountCents);
    this.formMovementDate = entry.movementDate;
    this.formStatus = entry.status;
    this.formNotes = entry.notes ?? '';
    this.errorMessage = '';
    this.modalOpen = true;
  }

  protected closeModal() {
    if (this.saving) {
      return;
    }

    this.modalOpen = false;
    this.editingEntry = null;
  }

  protected async saveEntry() {
    if (this.saving) {
      return;
    }

    const amountCents = parseCurrencyToCents(this.formAmount);

    if (!this.formDescription.trim()) {
      this.errorMessage = 'Informe a descrição do lançamento.';
      return;
    }

    if (!this.formMovementDate) {
      this.errorMessage = 'Informe a data do lançamento.';
      return;
    }

    if (amountCents <= 0) {
      this.errorMessage = 'Informe um valor maior que zero.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const saved = await this.financialTransactionService.saveTransaction({
        id: this.editingEntry?.source === 'manual' ? this.editingEntry.id : undefined,
        type: this.formType,
        description: this.formDescription,
        category: this.formCategory,
        amountCents,
        movementDate: this.formMovementDate,
        status: this.formStatus,
        notes: this.formNotes,
      });
      const existing = this.entries.some((entry) => entry.entryId === saved.entryId);
      this.entries = existing
        ? this.entries.map((entry) => entry.entryId === saved.entryId ? saved : entry)
        : [saved, ...this.entries];
      this.successMessage = 'Lançamento financeiro salvo.';
      this.closeModal();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível salvar o lançamento.';
    } finally {
      this.saving = false;
      this.changeDetector.detectChanges();
    }
  }

  protected async confirmManualEntry(entry: FinancialEntry) {
    if (entry.source !== 'manual') {
      return;
    }

    await this.updateManualStatus(entry, 'confirmed');
  }

  protected async cancelManualEntry(entry: FinancialEntry) {
    if (entry.source !== 'manual') {
      return;
    }

    await this.updateManualStatus(entry, 'cancelled');
  }

  protected totalIncomeCents(): number {
    return this.confirmedEntries()
      .filter((entry) => entry.type === 'income')
      .reduce((total, entry) => total + entry.amountCents, 0);
  }

  protected totalExpenseCents(): number {
    return this.confirmedEntries()
      .filter((entry) => entry.type === 'expense')
      .reduce((total, entry) => total + entry.amountCents, 0);
  }

  protected balanceCents(): number {
    return this.totalIncomeCents() - this.totalExpenseCents();
  }

  protected pendingCents(): number {
    return this.entries
      .filter((entry) => entry.status === 'pending')
      .reduce((total, entry) => total + (entry.type === 'income' ? entry.amountCents : -entry.amountCents), 0);
  }

  protected formatMoney(value: number): string {
    return formatCurrencyCents(value);
  }

  protected formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const [year, month, day] = value.split('-').map(Number);
    return year && month && day
      ? new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day))
      : value;
  }

  protected typeLabel(type: FinancialEntryType): string {
    return type === 'expense' ? 'Saída' : 'Entrada';
  }

  protected statusLabel(status: FinancialEntryStatus): string {
    if (status === 'pending') {
      return 'Pendente';
    }

    if (status === 'cancelled') {
      return 'Cancelado';
    }

    return 'Confirmado';
  }

  protected statusBadgeClass(status: FinancialEntryStatus): string {
    if (status === 'confirmed') {
      return 'badge-success';
    }

    if (status === 'pending') {
      return 'badge-warning';
    }

    return 'badge-error';
  }

  protected async signOut() {
    await this.authService.signOut();
    await this.router.navigate(['/gestor/login']);
  }

  private confirmedEntries(): FinancialEntry[] {
    return this.entries.filter((entry) => entry.status === 'confirmed');
  }

  private async updateManualStatus(entry: FinancialEntry, status: FinancialEntryStatus) {
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.financialTransactionService.updateStatus(entry.id, status);
      this.entries = this.entries.map((item) =>
        item.entryId === entry.entryId ? { ...item, status } : item
      );
      this.successMessage = 'Status do lançamento atualizado.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível atualizar o lançamento.';
    } finally {
      this.changeDetector.detectChanges();
    }
  }

  private async loadPageData() {
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      this.entries = await withTimeout(
        this.financialTransactionService.listEntries({
          dateFrom: this.dateFrom,
          dateTo: this.dateTo,
        }),
        FINANCIAL_LOAD_TIMEOUT_MS
      );
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível carregar o financeiro.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }
}

function todayInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Tempo limite ao carregar financeiro.')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
