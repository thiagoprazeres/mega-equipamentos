import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaskitoDirective } from '@maskito/angular';
import { type MaskitoOptions, type MaskitoElement, maskitoUpdateElement } from '@maskito/core';
import { maskitoEventHandler } from '@maskito/kit';
import {
  ArrowLeft,
  LogOut,
  Plus,
  Save,
  Trash2,
  LucideAngularModule,
} from 'lucide-angular';

import { GestorNavComponent } from '../../components/gestor-nav/gestor-nav';
import type { Customer } from '../../interfaces/customer';
import type { Equipamento } from '../../interfaces/equipamento';
import type { RentalBillingPeriod } from '../../interfaces/rental-contract';
import type { RentalQuote, RentalQuoteItem, RentalQuoteStatus } from '../../interfaces/rental-quote';
import type { StaffUser } from '../../interfaces/staff-user';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { CustomerService } from '../../services/customer.service';
import {
  RentalQuoteEditorInput,
  RentalQuoteService,
} from '../../services/rental-quote.service';
import { StaffUserService } from '../../services/staff-user.service';
import {
  centsToDecimalInput,
  digitsToCurrencyInput,
  formatCurrencyCents,
  parseCurrencyToCents,
} from '../../utils/prices';

const QUOTE_FORM_LOAD_TIMEOUT_MS = 6500;
type PriceCentsField =
  | 'dailyPriceCents'
  | 'weeklyPriceCents'
  | 'fortnightlyPriceCents'
  | 'monthlyPriceCents';
const PRICE_FIELD_BY_PERIOD: Record<RentalBillingPeriod, PriceCentsField> = {
  daily: 'dailyPriceCents',
  weekly: 'weeklyPriceCents',
  fortnightly: 'fortnightlyPriceCents',
  monthly: 'monthlyPriceCents',
};

const formattingCurrencyElements = new WeakSet<MaskitoElement>();
const CURRENCY_CENTS_MASK: MaskitoOptions = {
  mask: /^.*$/,
  plugins: [
    maskitoEventHandler('input', normalizeCurrencyCentsInput),
    maskitoEventHandler('blur', normalizeCurrencyCentsInput),
    maskitoEventHandler('focus', normalizeCurrencyCentsInput),
  ],
};

function normalizeCurrencyCentsInput(element: MaskitoElement): void {
  if (formattingCurrencyElements.has(element)) {
    return;
  }

  const formatted = digitsToCurrencyInput(element.value);

  if (element.value === formatted) {
    return;
  }

  formattingCurrencyElements.add(element);

  try {
    maskitoUpdateElement(element, {
      value: formatted,
      selection: [formatted.length, formatted.length],
    });
  } finally {
    formattingCurrencyElements.delete(element);
  }
}

@Component({
  selector: 'app-gestor-orcamento-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    MaskitoDirective,
    GestorNavComponent,
  ],
  templateUrl: './gestor-orcamento-form.html',
})
export class GestorOrcamentoFormPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly LogOut = LogOut;
  protected readonly Plus = Plus;
  protected readonly Save = Save;
  protected readonly Trash2 = Trash2;
  protected readonly currencyMask: MaskitoOptions = CURRENCY_CENTS_MASK;
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

  protected customers: Customer[] = [];
  protected sellers: StaffUser[] = [];
  protected equipments: Equipamento[] = [];
  protected quoteItems: RentalQuoteItem[] = [];
  protected loading = true;
  protected loadFailed = false;
  protected saving = false;
  protected editingQuote: RentalQuote | null = null;
  protected errorMessage = '';
  protected successMessage = '';

  protected readonly form = this.formBuilder.nonNullable.group({
    customerId: [0],
    sellerId: [0],
    billingPeriod: ['daily' as RentalBillingPeriod, Validators.required],
    startDate: [todayInputValue(), Validators.required],
    validUntil: [dateInputValue(addDays(new Date(), 7))],
    deliveryAddress: [''],
    worksiteAddress: [''],
    shipping: [centsToDecimalInput(0), Validators.required],
    notes: [''],
    status: ['draft' as RentalQuoteStatus, Validators.required],
  });
  protected readonly itemForm = this.formBuilder.nonNullable.group({
    equipmentId: [0, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly catalogService: CatalogService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly customerService: CustomerService,
    private readonly quoteService: RentalQuoteService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly staffUserService: StaffUserService
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadPageData();
    }
  }

  protected get pageTitle(): string {
    return this.editingQuote ? `Editar orçamento ${this.editingQuote.quoteNumber}` : 'Novo orçamento';
  }

  protected changeQuoteBillingPeriod() {
    this.repriceQuoteItemsForBillingPeriod(this.form.controls.billingPeriod.value);
  }

  protected addItem() {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    const value = this.itemForm.getRawValue();
    const equipment = this.equipments.find((item) => item.id === Number(value.equipmentId));

    if (!equipment) {
      this.errorMessage = 'Selecione um equipamento válido.';
      return;
    }

    const quantity = Math.max(1, Math.trunc(Number(value.quantity) || 1));
    const stockQuantity = equipment.stockQuantity ?? 0;

    if (stockQuantity > 0 && quantity > stockQuantity) {
      this.errorMessage = `Estoque disponível para ${equipment.nome}: ${stockQuantity} un.`;
      return;
    }

    const billingPeriod = this.form.controls.billingPeriod.value;
    const unitPriceCents = equipment.precos?.[PRICE_FIELD_BY_PERIOD[billingPeriod]] ?? 0;
    const assetValueCents = Math.max(0, Math.trunc(Number(equipment.assetValueCents) || 0));
    this.quoteItems = [
      ...this.quoteItems,
      {
        equipmentId: equipment.id,
        equipmentName: equipment.nome,
        quantity,
        billingPeriod,
        unitPriceCents,
        totalPriceCents: quantity * unitPriceCents,
        assetValueCents,
        sortOrder: this.quoteItems.length + 1,
      },
    ];
    this.errorMessage = '';
    this.itemForm.reset({
      equipmentId: 0,
      quantity: 1,
    });
  }

  protected removeItem(index: number) {
    this.quoteItems = this.quoteItems.filter((_, itemIndex) => itemIndex !== index);
  }

  protected selectedEquipmentStockLabel(): string {
    const equipmentId = Number(this.itemForm.controls.equipmentId.value);
    const equipment = this.equipments.find((item) => item.id === equipmentId);

    return equipment ? `${equipment.stockQuantity ?? 0} un. em estoque` : 'Selecione um equipamento';
  }

  protected selectedEquipmentPriceLabel(): string {
    const equipmentId = Number(this.itemForm.controls.equipmentId.value);
    const equipment = this.equipments.find((item) => item.id === equipmentId);

    if (!equipment?.precos) {
      return formatCurrencyCents(0);
    }

    const period = this.form.controls.billingPeriod.value;
    return formatCurrencyCents(equipment.precos[PRICE_FIELD_BY_PERIOD[period]] ?? 0);
  }

  protected periodLabel(period: RentalBillingPeriod): string {
    return this.periodOptions.find((option) => option.value === period)?.label ?? period;
  }

  protected formatMoney(value: number): string {
    return formatCurrencyCents(value);
  }

  protected quoteSubtotal(): number {
    return this.quoteItems.reduce((total, item) => total + item.totalPriceCents, 0);
  }

  protected quoteTotal(): number {
    return this.quoteSubtotal() + this.quoteShipping();
  }

  protected quoteShipping(): number {
    return parseCurrencyToCents(this.form.controls.shipping.value);
  }

  protected async saveQuote() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.quoteItems.length) {
      this.errorMessage = 'Adicione pelo menos um equipamento ao orçamento.';
      return;
    }

    const value = this.form.getRawValue();
    const customer = this.customers.find((item) => item.id === Number(value.customerId)) ?? null;
    const seller = this.sellers.find((item) => item.id === Number(value.sellerId)) ?? null;

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const payload: RentalQuoteEditorInput = {
        id: this.editingQuote?.id,
        customer,
        seller,
        billingPeriod: value.billingPeriod,
        startDate: value.startDate,
        validUntil: value.validUntil,
        deliveryAddress: value.deliveryAddress,
        worksiteAddress: value.worksiteAddress,
        notes: value.notes,
        status: value.status,
        items: this.itemsForQuoteBillingPeriod(value.billingPeriod),
        shippingCents: parseCurrencyToCents(value.shipping),
      };

      await this.quoteService.saveQuote(payload);
      this.successMessage = 'Orçamento salvo com sucesso.';
      void this.router.navigateByUrl('/gestor/orcamentos');
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível salvar o orçamento.';
    } finally {
      this.saving = false;
      this.changeDetector.detectChanges();
    }
  }

  protected async signOut() {
    await this.authService.signOut();
    void this.router.navigateByUrl('/gestor/login');
  }

  private async loadPageData() {
    this.loading = true;
    this.loadFailed = false;
    this.errorMessage = '';

    try {
      const editingId = this.editingQuoteId();
      const [customers, sellers, equipments, quotes] = await withTimeout(
        Promise.all([
          this.customerService.listCustomers(),
          this.staffUserService.listSellers(),
          this.catalogService.listEquipments(),
          editingId ? this.quoteService.listQuotes() : Promise.resolve([]),
        ]),
        QUOTE_FORM_LOAD_TIMEOUT_MS
      );

      this.customers = customers;
      this.sellers = sellers;
      this.equipments = equipments;

      if (editingId) {
        const quote = quotes.find((item) => item.id === editingId) ?? null;

        if (!quote) {
          this.loadFailed = true;
          this.errorMessage = 'Orçamento não encontrado.';
          return;
        }

        this.populateEditForm(quote);
      } else {
        this.populateCreateForm();
      }
    } catch (error) {
      console.error('quote form load failed', error);
      this.loadFailed = true;
      this.errorMessage = 'Não foi possível carregar os dados do orçamento.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  private editingQuoteId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private populateCreateForm() {
    this.editingQuote = null;
    this.quoteItems = [];
    this.form.reset({
      customerId: 0,
      sellerId: this.sellers[0]?.id ?? 0,
      billingPeriod: 'daily',
      startDate: todayInputValue(),
      validUntil: dateInputValue(addDays(new Date(), 7)),
      deliveryAddress: '',
      worksiteAddress: '',
      shipping: centsToDecimalInput(0),
      notes: '',
      status: 'draft',
    });
  }

  private populateEditForm(quote: RentalQuote) {
    this.editingQuote = quote;
    this.quoteItems = quote.items;
    this.form.reset({
      customerId: quote.customerId ?? 0,
      sellerId: quote.sellerId ?? 0,
      billingPeriod: quote.billingPeriod,
      startDate: quote.startDate,
      validUntil: quote.validUntil ?? '',
      deliveryAddress: quote.deliveryAddress ?? '',
      worksiteAddress: quote.worksiteAddress ?? '',
      shipping: centsToDecimalInput(quote.shippingCents),
      notes: quote.notes ?? '',
      status: quote.status,
    });
  }

  private repriceQuoteItemsForBillingPeriod(billingPeriod: RentalBillingPeriod) {
    this.quoteItems = this.itemsForQuoteBillingPeriod(billingPeriod);
  }

  private itemsForQuoteBillingPeriod(billingPeriod: RentalBillingPeriod): RentalQuoteItem[] {
    return this.quoteItems.map((item, index) => {
      const equipment = this.equipments.find((candidate) => candidate.id === item.equipmentId);
      const unitPriceCents =
        equipment?.precos?.[PRICE_FIELD_BY_PERIOD[billingPeriod]] ?? item.unitPriceCents;
      const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));

      return {
        ...item,
        billingPeriod,
        quantity,
        unitPriceCents,
        totalPriceCents: unitPriceCents * quantity,
        sortOrder: index + 1,
      };
    });
  }
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('QUOTE_FORM_LOAD_TIMEOUT'));
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

function todayInputValue(): string {
  return dateInputValue(new Date());
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function dateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
