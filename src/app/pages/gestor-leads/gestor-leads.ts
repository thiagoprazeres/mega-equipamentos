import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  Archive,
  Eye,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  UserRound,
  X,
  LucideAngularModule,
} from 'lucide-angular';

import type { CatalogStatus } from '../../interfaces/equipamento';
import type { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import {
  LEAD_ORIGIN_OPTIONS,
  leadOriginLabel,
  type Lead,
  type LeadOrigin,
} from '../../interfaces/lead';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { LeadEditorInput, LeadService } from '../../services/lead.service';
import { matchesSearchQuery } from '../../utils/search';

const LEADS_LOAD_TIMEOUT_MS = 6500;
type SortDirection = 'asc' | 'desc';
type LeadSortKey = 'createdAt' | 'code' | 'name' | 'origin' | 'interest' | 'contact' | 'status';

@Component({
  selector: 'app-gestor-leads',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
  ],
  templateUrl: './gestor-leads.html',
})
export class GestorLeadsPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly Archive = Archive;
  protected readonly Eye = Eye;
  protected readonly LogOut = LogOut;
  protected readonly Pencil = Pencil;
  protected readonly Plus = Plus;
  protected readonly RotateCcw = RotateCcw;
  protected readonly Save = Save;
  protected readonly Search = Search;
  protected readonly UserRound = UserRound;
  protected readonly X = X;
  protected readonly originOptions = LEAD_ORIGIN_OPTIONS;

  protected leads: Lead[] = [];
  protected interestCategories: EquipamentoCategoria[] = [];
  protected query = '';
  protected activeStatus: CatalogStatus | 'all' = 'active';
  protected loading = false;
  protected saving = false;
  protected modalOpen = false;
  protected editingLead: Lead | null = null;
  protected errorMessage = '';
  protected successMessage = '';
  protected sortKey: LeadSortKey = 'createdAt';
  protected sortDirection: SortDirection = 'desc';

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', Validators.required],
    document: [''],
    email: ['', Validators.email],
    phone: [''],
    whatsapp: [''],
    zipCode: [''],
    address: [''],
    city: [''],
    state: [''],
    origin: ['whatsapp' as LeadOrigin, Validators.required],
    interestCategoryId: [0],
    notes: [''],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly catalogService: CatalogService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly leadService: LeadService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadPageData();
    }
  }

  protected filteredLeads(): Lead[] {
    const filtered = this.leads.filter((lead) => {
      const matchesStatus = this.activeStatus === 'all' || (lead.status ?? 'active') === this.activeStatus;
      const matchesQuery = matchesSearchQuery(this.query, [
        lead.id,
        lead.nome,
        lead.document,
        lead.email,
        lead.phone,
        lead.whatsapp,
        lead.city,
        lead.state,
        this.leadContact(lead),
        this.leadInterestGroup(lead),
        this.leadOriginLabel(lead.origin),
      ]);

      return matchesStatus && matchesQuery;
    });

    return sortBy(filtered, (lead) => this.leadSortValue(lead), this.sortDirection);
  }

  protected filteredLeadsCount(): number {
    return this.filteredLeads().length;
  }

  protected setSort(key: LeadSortKey) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortKey = key;
    this.sortDirection = 'asc';
  }

  protected sortIndicator(key: LeadSortKey): string {
    if (this.sortKey !== key) {
      return '';
    }

    return this.sortDirection === 'asc' ? '^' : 'v';
  }

  protected setStatus(status: CatalogStatus | 'all') {
    this.activeStatus = status;
  }

  protected openCreateModal() {
    this.editingLead = null;
    this.errorMessage = '';
    this.form.reset({
      nome: '',
      document: '',
      email: '',
      phone: '',
      whatsapp: '',
      zipCode: '',
      address: '',
      city: '',
      state: '',
      origin: 'whatsapp',
      interestCategoryId: 0,
      notes: '',
    });
    this.modalOpen = true;
  }

  protected openEditModal(lead: Lead) {
    this.editingLead = lead;
    this.errorMessage = '';
    this.form.reset({
      nome: lead.nome,
      document: lead.document ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      whatsapp: lead.whatsapp ?? '',
      zipCode: lead.zipCode ?? '',
      address: lead.address ?? '',
      city: lead.city ?? '',
      state: lead.state ?? '',
      origin: lead.origin,
      interestCategoryId: lead.interestCategoryId ?? 0,
      notes: lead.notes ?? '',
    });
    this.modalOpen = true;
  }

  protected closeModal() {
    this.modalOpen = false;
    this.editingLead = null;
  }

  protected async saveLead() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const value = this.form.getRawValue();
      const interestCategoryId = Number(value.interestCategoryId);
      const payload: LeadEditorInput = {
        id: this.editingLead?.id,
        nome: value.nome,
        document: value.document,
        email: value.email,
        phone: value.phone,
        whatsapp: value.whatsapp,
        zipCode: value.zipCode,
        address: value.address,
        city: value.city,
        state: value.state,
        origin: value.origin,
        interestCategoryId: Number.isFinite(interestCategoryId) && interestCategoryId > 0
          ? interestCategoryId
          : null,
        notes: value.notes,
        customerId: this.editingLead?.customerId,
        status: this.editingLead?.status ?? 'active',
      };

      await this.leadService.saveLead(payload);
      this.successMessage = 'Lead salvo com sucesso.';
      this.closeModal();
      await this.loadPageData(false);
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível salvar o lead.';
    } finally {
      this.saving = false;
      this.changeDetector.detectChanges();
    }
  }

  protected async archive(lead: Lead) {
    if (!confirm(`Arquivar ${lead.nome}?`)) {
      return;
    }

    await this.leadService.archiveLead(lead.id);
    this.successMessage = 'Lead arquivado.';
    await this.loadPageData(false);
    this.changeDetector.detectChanges();
  }

  protected async restore(lead: Lead) {
    await this.leadService.restoreLead(lead.id);
    this.successMessage = 'Lead restaurado.';
    await this.loadPageData(false);
    this.changeDetector.detectChanges();
  }

  protected leadContact(lead: Lead): string {
    return lead.whatsapp || lead.phone || lead.email || 'Sem contato';
  }

  protected leadInterestGroup(lead: Lead): string {
    if (lead.interestCategoryName) {
      return lead.interestCategoryName;
    }

    const category = this.interestCategories.find((item) => item.id === lead.interestCategoryId);
    return category?.nome ?? 'Não informado';
  }

  protected leadOriginLabel(origin?: LeadOrigin): string {
    return leadOriginLabel(origin);
  }

  protected async signOut() {
    await this.authService.signOut();
    void this.router.navigateByUrl('/gestor/login');
  }

  private leadSortValue(lead: Lead): string | number {
    switch (this.sortKey) {
      case 'createdAt':
        return newestSortValue(lead.createdAt, lead.id);
      case 'code':
        return String(lead.id).padStart(8, '0');
      case 'origin':
        return this.leadOriginLabel(lead.origin);
      case 'interest':
        return this.leadInterestGroup(lead);
      case 'contact':
        return this.leadContact(lead);
      case 'status':
        return lead.status ?? 'active';
      case 'name':
      default:
        return lead.nome;
    }
  }

  private async loadPageData(showLoading = true) {
    if (showLoading) {
      this.loading = true;
    }

    this.errorMessage = '';

    try {
      const [leads, categories] = await withTimeout(
        Promise.all([
          this.leadService.listLeads(true),
          this.catalogService.listCategories({ includeArchived: true }),
        ]),
        LEADS_LOAD_TIMEOUT_MS
      );
      this.leads = leads;
      this.interestCategories = categories;
    } catch (error) {
      console.error('leads manager load failed', error);
      this.errorMessage = 'Não foi possível carregar os leads.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
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
      reject(new Error('LEADS_LOAD_TIMEOUT'));
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
