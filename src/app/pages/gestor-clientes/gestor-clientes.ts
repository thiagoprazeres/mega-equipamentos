import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MaskitoDirective } from '@maskito/angular';
import { maskitoUpdateElement, type MaskitoElement, type MaskitoOptions } from '@maskito/core';
import { maskitoEventHandler } from '@maskito/kit';
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
  UsersRound,
  X,
  LucideAngularModule,
} from 'lucide-angular';

import type { Customer } from '../../interfaces/customer';
import type { CatalogStatus } from '../../interfaces/equipamento';
import { AuthService } from '../../services/auth.service';
import { CustomerService, CustomerEditorInput } from '../../services/customer.service';
import { matchesSearchQuery } from '../../utils/search';

const CUSTOMERS_LOAD_TIMEOUT_MS = 4500;
const formattingMaskedElements = new WeakSet<MaskitoElement>();
const BRAZILIAN_STATES = [
  { value: 'AC', label: 'AC - Acre' },
  { value: 'AL', label: 'AL - Alagoas' },
  { value: 'AP', label: 'AP - Amapá' },
  { value: 'AM', label: 'AM - Amazonas' },
  { value: 'BA', label: 'BA - Bahia' },
  { value: 'CE', label: 'CE - Ceará' },
  { value: 'DF', label: 'DF - Distrito Federal' },
  { value: 'ES', label: 'ES - Espírito Santo' },
  { value: 'GO', label: 'GO - Goiás' },
  { value: 'MA', label: 'MA - Maranhão' },
  { value: 'MT', label: 'MT - Mato Grosso' },
  { value: 'MS', label: 'MS - Mato Grosso do Sul' },
  { value: 'MG', label: 'MG - Minas Gerais' },
  { value: 'PA', label: 'PA - Pará' },
  { value: 'PB', label: 'PB - Paraíba' },
  { value: 'PR', label: 'PR - Paraná' },
  { value: 'PE', label: 'PE - Pernambuco' },
  { value: 'PI', label: 'PI - Piauí' },
  { value: 'RJ', label: 'RJ - Rio de Janeiro' },
  { value: 'RN', label: 'RN - Rio Grande do Norte' },
  { value: 'RS', label: 'RS - Rio Grande do Sul' },
  { value: 'RO', label: 'RO - Rondônia' },
  { value: 'RR', label: 'RR - Roraima' },
  { value: 'SC', label: 'SC - Santa Catarina' },
  { value: 'SP', label: 'SP - São Paulo' },
  { value: 'SE', label: 'SE - Sergipe' },
  { value: 'TO', label: 'TO - Tocantins' },
] as const;
const DOCUMENT_MASK = createFormatterMask(formatCpfCnpj);
const PHONE_MASK = createFormatterMask(formatPhone);
const ZIP_CODE_MASK = createFormatterMask(formatZipCode);
type SortDirection = 'asc' | 'desc';
type CustomerSortKey = 'code' | 'name' | 'contact' | 'document' | 'city' | 'status';

@Component({
  selector: 'app-gestor-clientes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    MaskitoDirective,
  ],
  templateUrl: './gestor-clientes.html',
})
export class GestorClientesPage implements OnInit {
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
  protected readonly UsersRound = UsersRound;
  protected readonly X = X;
  protected readonly brazilianStates = BRAZILIAN_STATES;
  protected readonly documentMask = DOCUMENT_MASK;
  protected readonly phoneMask = PHONE_MASK;
  protected readonly zipCodeMask = ZIP_CODE_MASK;

  protected customers: Customer[] = [];
  protected query = '';
  protected activeStatus: CatalogStatus | 'all' = 'active';
  protected loading = false;
  protected saving = false;
  protected modalOpen = false;
  protected editingCustomer: Customer | null = null;
  protected errorMessage = '';
  protected successMessage = '';
  protected sortKey: CustomerSortKey = 'name';
  protected sortDirection: SortDirection = 'asc';

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
    notes: [''],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly customerService: CustomerService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadCustomers();
    }
  }

  protected filteredCustomers(): Customer[] {
    const filtered = this.customers.filter((customer) => {
      const matchesStatus =
        this.activeStatus === 'all' || (customer.status ?? 'active') === this.activeStatus;
      const matchesQuery = matchesSearchQuery(this.query, [
        customer.id,
        customer.nome,
        customer.document,
        customer.email,
        customer.phone,
        customer.whatsapp,
        customer.zipCode,
        customer.address,
        customer.city,
        customer.state,
        this.customerLocation(customer),
        this.customerContact(customer),
      ]);

      return matchesStatus && matchesQuery;
    });

    return sortBy(filtered, (customer) => this.customerSortValue(customer), this.sortDirection);
  }

  protected filteredCustomersCount(): number {
    return this.filteredCustomers().length;
  }

  protected setSort(key: CustomerSortKey) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortKey = key;
    this.sortDirection = 'asc';
  }

  protected sortIndicator(key: CustomerSortKey): string {
    if (this.sortKey !== key) {
      return '';
    }

    return this.sortDirection === 'asc' ? '^' : 'v';
  }

  protected setStatus(status: CatalogStatus | 'all') {
    this.activeStatus = status;
  }

  protected openCreateModal() {
    this.editingCustomer = null;
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
      notes: '',
    });
    this.modalOpen = true;
  }

  protected openEditModal(customer: Customer) {
    this.editingCustomer = customer;
    this.errorMessage = '';
    this.form.reset({
      nome: customer.nome,
      document: customer.document ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      whatsapp: customer.whatsapp ?? '',
      zipCode: customer.zipCode ?? '',
      address: customer.address ?? '',
      city: customer.city ?? '',
      state: customer.state ?? '',
      notes: customer.notes ?? '',
    });
    this.modalOpen = true;
  }

  protected closeModal() {
    this.modalOpen = false;
    this.editingCustomer = null;
  }

  protected async saveCustomer() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const value = this.form.getRawValue();
      const payload: CustomerEditorInput = {
        id: this.editingCustomer?.id,
        nome: value.nome,
        document: value.document,
        email: value.email,
        phone: value.phone,
        whatsapp: value.whatsapp,
        zipCode: value.zipCode,
        address: value.address,
        city: value.city,
        state: value.state,
        notes: value.notes,
        status: this.editingCustomer?.status ?? 'active',
      };

      await this.customerService.saveCustomer(payload);
      this.successMessage = 'Cliente salvo com sucesso.';
      this.closeModal();
      await this.loadCustomers(false);
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível salvar o cliente.';
    } finally {
      this.saving = false;
      this.changeDetector.detectChanges();
    }
  }

  protected async archive(customer: Customer) {
    if (!confirm(`Arquivar ${customer.nome}?`)) {
      return;
    }

    await this.customerService.archiveCustomer(customer.id);
    this.successMessage = 'Cliente arquivado.';
    await this.loadCustomers(false);
    this.changeDetector.detectChanges();
  }

  protected async restore(customer: Customer) {
    await this.customerService.restoreCustomer(customer.id);
    this.successMessage = 'Cliente restaurado.';
    await this.loadCustomers(false);
    this.changeDetector.detectChanges();
  }

  protected customerLocation(customer: Customer): string {
    const parts = [customer.city, customer.state].filter(Boolean);
    return parts.length ? parts.join(' / ') : 'Não informado';
  }

  protected customerContact(customer: Customer): string {
    return customer.whatsapp || customer.phone || customer.email || 'Sem contato';
  }

  private customerSortValue(customer: Customer): string {
    switch (this.sortKey) {
      case 'code':
        return String(customer.id).padStart(8, '0');
      case 'contact':
        return this.customerContact(customer);
      case 'document':
        return customer.document ?? '';
      case 'city':
        return this.customerLocation(customer);
      case 'status':
        return customer.status ?? 'active';
      case 'name':
      default:
        return customer.nome;
    }
  }

  protected async signOut() {
    await this.authService.signOut();
    void this.router.navigateByUrl('/gestor/login');
  }

  private async loadCustomers(showLoading = true) {
    if (showLoading) {
      this.loading = true;
    }

    this.errorMessage = '';

    try {
      this.customers = await withTimeout(
        this.customerService.listCustomers(true),
        CUSTOMERS_LOAD_TIMEOUT_MS
      );
    } catch (error) {
      console.error('customers manager load failed', error);
      this.errorMessage = 'Não foi possível carregar os clientes.';
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

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('CUSTOMERS_LOAD_TIMEOUT'));
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

function createFormatterMask(formatter: (value: unknown) => string): MaskitoOptions {
  const normalizeInput = (element: MaskitoElement): void => {
    if (formattingMaskedElements.has(element)) {
      return;
    }

    const formatted = formatter(element.value);

    if (element.value === formatted) {
      return;
    }

    formattingMaskedElements.add(element);

    try {
      maskitoUpdateElement(element, {
        value: formatted,
        selection: [formatted.length, formatted.length],
      });
    } finally {
      formattingMaskedElements.delete(element);
    }
  };

  return {
    mask: /^.*$/,
    plugins: [
      maskitoEventHandler('input', normalizeInput),
      maskitoEventHandler('blur', normalizeInput),
      maskitoEventHandler('focus', normalizeInput),
    ],
  };
}

function onlyDigits(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, maxLength);
}

function formatCpfCnpj(value: unknown): string {
  const digits = onlyDigits(value, 14);

  if (digits.length > 11) {
    return joinParts([
      digits.slice(0, 2),
      digits.slice(2, 5),
      digits.slice(5, 8),
      digits.slice(8, 12),
      digits.slice(12, 14),
    ], ['.', '.', '/', '-']);
  }

  return joinParts([
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 9),
    digits.slice(9, 11),
  ], ['.', '.', '-']);
}

function formatPhone(value: unknown): string {
  const digits = onlyDigits(value, 11);
  const areaCode = digits.slice(0, 2);
  const firstPartLength = digits.length > 10 ? 7 : 6;
  const firstPart = digits.slice(2, firstPartLength);
  const secondPart = digits.slice(firstPartLength, 11);

  if (!areaCode) {
    return '';
  }

  let formatted = `(${areaCode}`;

  if (areaCode.length === 2) {
    formatted += ')';
  }

  if (firstPart) {
    formatted += ` ${firstPart}`;
  }

  if (secondPart) {
    formatted += `-${secondPart}`;
  }

  return formatted;
}

function formatZipCode(value: unknown): string {
  const digits = onlyDigits(value, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function joinParts(parts: string[], separators: string[]): string {
  return parts.reduce((result, part, index) => {
    if (!part) {
      return result;
    }

    const separator = result && separators[index - 1] ? separators[index - 1] : '';
    return `${result}${separator}${part}`;
  }, '');
}
