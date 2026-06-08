import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Archive,
  Banknote,
  CalendarRange,
  CheckCircle2,
  HandCoins,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Tags,
  Trash2,
  X,
  LucideAngularModule,
} from 'lucide-angular';

import type {
  FinancialEntry,
  FinancialExpenseKind,
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialTransactionCategory,
  FinancialTransactionCategoryStatus,
} from '../../interfaces/financial-entry';
import { AuthService } from '../../services/auth.service';
import { FinancialTransactionService } from '../../services/financial-transaction.service';
import { centsToDecimalInput, formatCurrencyCents, parseCurrencyToCents } from '../../utils/prices';
import { matchesSearchQuery } from '../../utils/search';

const FINANCIAL_LOAD_TIMEOUT_MS = 6500;
type FinanceViewMode = 'entries' | 'categories';

@Component({
  selector: 'app-gestor-financeiro',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-financeiro.html',
})
export class GestorFinanceiroPage implements OnInit {
  protected readonly Archive = Archive;
  protected readonly Banknote = Banknote;
  protected readonly CalendarRange = CalendarRange;
  protected readonly CheckCircle2 = CheckCircle2;
  protected readonly HandCoins = HandCoins;
  protected readonly LogOut = LogOut;
  protected readonly Pencil = Pencil;
  protected readonly Plus = Plus;
  protected readonly RotateCcw = RotateCcw;
  protected readonly Search = Search;
  protected readonly Tags = Tags;
  protected readonly Trash2 = Trash2;
  protected readonly X = X;
  protected readonly typeOptions: Array<{ value: FinancialEntryType | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'income', label: 'Recebimentos' },
    { value: 'expense', label: 'Despesas' },
  ];
  protected readonly entryTypeOptions: Array<{ value: FinancialEntryType; label: string }> = [
    { value: 'income', label: 'Recebimento' },
    { value: 'expense', label: 'Despesa' },
  ];
  protected readonly expenseKindOptions: Array<{ value: FinancialExpenseKind; label: string }> = [
    { value: 'fixed', label: 'Fixo' },
    { value: 'variable', label: 'Variável' },
  ];
  protected readonly statusOptions: Array<{ value: FinancialEntryStatus | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'confirmed', label: 'Confirmados' },
    { value: 'pending', label: 'Pendentes' },
    { value: 'cancelled', label: 'Cancelados' },
  ];

  protected entries: FinancialEntry[] = [];
  protected categories: FinancialTransactionCategory[] = [];
  protected viewMode: FinanceViewMode = 'entries';
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
  protected formExpenseKind: FinancialExpenseKind = 'variable';
  protected formDescription = '';
  protected formCategory = '';
  protected formAmount = '';
  protected formMovementDate = '';
  protected formStatus: FinancialEntryStatus = 'confirmed';
  protected formNotes = '';
  protected categoryModalOpen = false;
  protected categorySaving = false;
  protected editingCategory: FinancialTransactionCategory | null = null;
  protected categoryFormType: FinancialEntryType = 'expense';
  protected categoryFormExpenseKind: FinancialExpenseKind = 'variable';
  protected categoryFormName = '';
  protected categoryFormStatus: FinancialTransactionCategoryStatus = 'active';
  protected categoryFormSortOrder = 0;
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

  protected filteredCategories(): FinancialTransactionCategory[] {
    return this.categories
      .filter((category) => matchesSearchQuery(this.query, [
        category.id,
        category.name,
        this.typeLabel(category.type),
        category.type,
        category.expenseKind ? this.expenseKindLabel(category.expenseKind) : '',
        category.status === 'active' ? 'Ativa' : 'Arquivada',
      ]))
      .sort(compareFinancialCategories);
  }

  protected filteredCategoriesCount(): number {
    return this.filteredCategories().length;
  }

  protected setViewMode(viewMode: FinanceViewMode) {
    this.viewMode = viewMode;
    this.query = '';
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
    this.setFormType(type);
    this.formDescription = '';
    this.formCategory = '';
    this.formExpenseKind = 'variable';
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
    this.setFormType(entry.type);
    this.formDescription = entry.description;
    this.formCategory = entry.category ?? '';
    this.formExpenseKind = entry.expenseKind ?? this.categoryExpenseKind(entry.category) ?? 'variable';
    this.formAmount = centsToDecimalInput(entry.amountCents);
    this.formMovementDate = entry.movementDate;
    this.formStatus = entry.status;
    this.formNotes = entry.notes ?? '';
    this.errorMessage = '';
    this.modalOpen = true;
  }

  protected setFormType(type: FinancialEntryType) {
    const changed = this.formType !== type;
    this.formType = type;

    if (type === 'income') {
      this.formExpenseKind = 'variable';
    }

    if (changed) {
      this.formCategory = '';
    }
  }

  protected setFormCategory(categoryName: string) {
    this.formCategory = categoryName;

    const category = this.categories.find(
      (item) => item.type === this.formType && item.name === categoryName
    );

    if (this.formType === 'expense' && category?.expenseKind) {
      this.formExpenseKind = category.expenseKind;
    }
  }

  protected activeCategoriesForType(type: FinancialEntryType): FinancialTransactionCategory[] {
    return this.categories
      .filter((category) => category.type === type && category.status === 'active')
      .sort(compareFinancialCategories);
  }

  protected currentCategoryOptions(): FinancialTransactionCategory[] {
    const active = this.activeCategoriesForType(this.formType);

    if (!this.formCategory || active.some((category) => category.name === this.formCategory)) {
      return active;
    }

    return [
      ...active,
      {
        id: 0,
        type: this.formType,
        name: this.formCategory,
        expenseKind: this.formType === 'expense' ? this.formExpenseKind : undefined,
        status: 'archived',
      },
    ];
  }

  protected closeModal() {
    if (this.saving) {
      return;
    }

    this.modalOpen = false;
    this.editingEntry = null;
  }

  protected openCreateCategoryModal(type: FinancialEntryType = 'expense') {
    this.editingCategory = null;
    this.categoryFormType = type;
    this.categoryFormExpenseKind = 'variable';
    this.categoryFormName = '';
    this.categoryFormStatus = 'active';
    this.categoryFormSortOrder = this.nextCategorySortOrder(type);
    this.errorMessage = '';
    this.categoryModalOpen = true;
  }

  protected openEditCategoryModal(category: FinancialTransactionCategory) {
    this.editingCategory = category;
    this.categoryFormType = category.type;
    this.categoryFormExpenseKind = category.expenseKind ?? 'variable';
    this.categoryFormName = category.name;
    this.categoryFormStatus = category.status;
    this.categoryFormSortOrder = category.sortOrder ?? 0;
    this.errorMessage = '';
    this.categoryModalOpen = true;
  }

  protected closeCategoryModal() {
    if (this.categorySaving) {
      return;
    }

    this.categoryModalOpen = false;
    this.editingCategory = null;
  }

  protected setCategoryFormType(type: FinancialEntryType) {
    this.categoryFormType = type;

    if (type === 'income') {
      this.categoryFormExpenseKind = 'variable';
    }
  }

  protected async saveCategory() {
    if (this.categorySaving) {
      return;
    }

    if (!this.categoryFormName.trim()) {
      this.errorMessage = 'Informe o nome da categoria.';
      return;
    }

    this.categorySaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const saved = await this.financialTransactionService.saveCategory({
        id: this.editingCategory?.id,
        type: this.categoryFormType,
        name: this.categoryFormName,
        expenseKind: this.categoryFormType === 'expense' ? this.categoryFormExpenseKind : undefined,
        status: this.categoryFormStatus,
        sortOrder: this.categoryFormSortOrder,
      });
      const exists = this.categories.some((category) => category.id === saved.id);
      this.categories = exists
        ? this.categories.map((category) => category.id === saved.id ? saved : category)
        : [...this.categories, saved];
      this.successMessage = 'Categoria salva.';
      this.closeCategoryModal();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível salvar a categoria.';
    } finally {
      this.categorySaving = false;
      this.changeDetector.detectChanges();
    }
  }

  protected async updateCategoryStatus(
    category: FinancialTransactionCategory,
    status: FinancialTransactionCategoryStatus
  ) {
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.financialTransactionService.updateCategoryStatus(category.id, status);
      this.categories = this.categories.map((item) =>
        item.id === category.id ? { ...item, status } : item
      );
      this.successMessage = status === 'active' ? 'Categoria restaurada.' : 'Categoria arquivada.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível atualizar a categoria.';
    } finally {
      this.changeDetector.detectChanges();
    }
  }

  protected async deleteCategory(category: FinancialTransactionCategory) {
    this.errorMessage = '';
    this.successMessage = '';

    try {
      await this.financialTransactionService.deleteCategory(category.id);
      this.categories = this.categories.filter((item) => item.id !== category.id);
      this.successMessage = 'Categoria excluída.';
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Não foi possível excluir a categoria.';
    } finally {
      this.changeDetector.detectChanges();
    }
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

    if (!this.formCategory.trim()) {
      this.errorMessage = 'Informe a categoria do lançamento.';
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
        expenseKind: this.formType === 'expense' ? this.formExpenseKind : undefined,
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
    return type === 'expense' ? 'Despesa' : 'Recebimento';
  }

  protected expenseKindLabel(kind?: FinancialExpenseKind): string {
    return kind === 'fixed' ? 'Fixo' : 'Variável';
  }

  protected categoryStatusLabel(status: FinancialTransactionCategoryStatus): string {
    return status === 'active' ? 'Ativa' : 'Arquivada';
  }

  protected categoryStatusBadgeClass(status: FinancialTransactionCategoryStatus): string {
    return status === 'active' ? 'badge-success' : 'badge-ghost';
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

  private categoryExpenseKind(categoryName?: string): FinancialExpenseKind | undefined {
    if (!categoryName) {
      return undefined;
    }

    return this.categories.find(
      (category) => category.type === 'expense' && category.name === categoryName
    )?.expenseKind;
  }

  private nextCategorySortOrder(type: FinancialEntryType): number {
    const highest = this.categories
      .filter((category) => category.type === type)
      .reduce((max, category) => Math.max(max, category.sortOrder ?? 0), 0);

    return highest + 10;
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
      const [entries, categories] = await withTimeout(
        Promise.all([
          this.financialTransactionService.listEntries({
            dateFrom: this.dateFrom,
            dateTo: this.dateTo,
          }),
          this.financialTransactionService.listCategories({ includeArchived: true }),
        ]),
        FINANCIAL_LOAD_TIMEOUT_MS
      );
      this.entries = entries;
      this.categories = categories;
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

function compareFinancialCategories(
  left: FinancialTransactionCategory,
  right: FinancialTransactionCategory
): number {
  const typeComparison = left.type.localeCompare(right.type);

  if (typeComparison !== 0) {
    return typeComparison;
  }

  const orderComparison = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);

  if (orderComparison !== 0) {
    return orderComparison;
  }

  return left.name.localeCompare(right.name, 'pt-BR');
}
