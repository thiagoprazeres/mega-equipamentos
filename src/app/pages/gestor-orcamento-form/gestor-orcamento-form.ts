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

import type { Equipamento } from '../../interfaces/equipamento';
import type { Lead } from '../../interfaces/lead';
import type { RentalBillingPeriod } from '../../interfaces/rental-contract';
import type { RentalQuote, RentalQuoteItem, RentalQuoteStatus } from '../../interfaces/rental-quote';
import type { StaffUser } from '../../interfaces/staff-user';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { LeadService } from '../../services/lead.service';
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
import { matchesSearchQuery } from '../../utils/search';

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

  protected leads: Lead[] = [];
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
    leadId: [0, [Validators.required, Validators.min(1)]],
    sellerId: [0],
    billingPeriod: ['daily' as RentalBillingPeriod, Validators.required],
    rentalPeriodCount: [1, [Validators.required, Validators.min(1)]],
    startDate: [todayInputValue(), Validators.required],
    validUntil: [dateInputValue(addDays(new Date(), 7))],
    deliveryAddress: [''],
    worksiteAddress: [''],
    shipping: [centsToDecimalInput(0), Validators.required],
    discount: [centsToDecimalInput(0), Validators.required],
    surcharge: [centsToDecimalInput(0), Validators.required],
    notes: [''],
    status: ['draft' as RentalQuoteStatus, Validators.required],
  });
  protected readonly itemForm = this.formBuilder.nonNullable.group({
    equipmentQuery: [''],
    equipmentId: [0, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly catalogService: CatalogService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly leadService: LeadService,
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

  protected changeQuoteRentalPeriodCount() {
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
    const rentalPeriodCount = this.currentRentalPeriodCount();
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
        totalPriceCents: quantity * unitPriceCents * rentalPeriodCount,
        assetValueCents,
        sortOrder: this.quoteItems.length + 1,
      },
    ];
    this.errorMessage = '';
    this.itemForm.reset({
      equipmentQuery: '',
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

  protected filteredEquipmentOptions(): Equipamento[] {
    const query = this.itemForm.controls.equipmentQuery.value;
    return [...this.equipments]
      .filter((equipment) =>
        matchesSearchQuery(query, [
          equipment.codigoInterno,
          equipment.codigo,
          equipment.equipamentoCategoria.codigo,
          equipment.equipamentoCategoria.nome,
          equipment.nome,
          equipment.nomeTecnico,
          equipment.slug,
        ])
      )
      .sort(compareEquipmentByInternalCode);
  }

  protected equipmentOptionLabel(equipment: Equipamento): string {
    const code = equipment.codigoInterno || equipment.codigo || String(equipment.id);
    const category = equipment.equipamentoCategoria.codigo
      ? ` | ${equipment.equipamentoCategoria.codigo} - ${equipment.equipamentoCategoria.nome}`
      : '';

    return `${code} - ${equipment.nome}${category}`;
  }

  protected periodLabel(period: RentalBillingPeriod): string {
    return this.periodOptions.find((option) => option.value === period)?.label ?? period;
  }

  protected rentalDurationLabel(): string {
    return formatRentalDuration(
      this.form.controls.billingPeriod.value,
      this.currentRentalPeriodCount()
    );
  }

  protected formatMoney(value: number): string {
    return formatCurrencyCents(value);
  }

  protected quoteSubtotal(): number {
    return this.quoteItems.reduce((total, item) => total + item.totalPriceCents, 0);
  }

  protected quoteTotal(): number {
    return rentalTotalCents(
      this.quoteSubtotal(),
      this.quoteShipping(),
      this.quoteDiscount(),
      this.quoteSurcharge()
    );
  }

  protected quoteShipping(): number {
    return parseCurrencyToCents(this.form.controls.shipping.value);
  }

  protected quoteDiscount(): number {
    return parseCurrencyToCents(this.form.controls.discount.value);
  }

  protected quoteSurcharge(): number {
    return parseCurrencyToCents(this.form.controls.surcharge.value);
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
    const lead = this.leads.find((item) => item.id === Number(value.leadId)) ?? null;
    const seller = this.sellers.find((item) => item.id === Number(value.sellerId)) ?? null;

    if (!lead) {
      this.errorMessage = 'Selecione um lead/interessado para o orçamento.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const payload: RentalQuoteEditorInput = {
        id: this.editingQuote?.id,
        lead,
        seller,
        billingPeriod: value.billingPeriod,
        rentalPeriodCount: normalizeRentalPeriodCount(value.rentalPeriodCount),
        startDate: value.startDate,
        validUntil: value.validUntil,
        deliveryAddress: value.deliveryAddress,
        worksiteAddress: value.worksiteAddress,
        notes: value.notes,
        status: value.status,
        items: this.itemsForQuoteBillingPeriod(value.billingPeriod),
        shippingCents: parseCurrencyToCents(value.shipping),
        discountCents: parseCurrencyToCents(value.discount),
        surchargeCents: parseCurrencyToCents(value.surcharge),
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
      const [leads, sellers, equipments, quotes] = await withTimeout(
        Promise.all([
          this.leadService.listLeads(),
          this.staffUserService.listSellers(),
          this.catalogService.listEquipments(),
          editingId ? this.quoteService.listQuotes() : Promise.resolve([]),
        ]),
        QUOTE_FORM_LOAD_TIMEOUT_MS
      );

      this.leads = leads;
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
      leadId: 0,
      sellerId: this.sellers[0]?.id ?? 0,
      billingPeriod: 'daily',
      rentalPeriodCount: 1,
      startDate: todayInputValue(),
      validUntil: dateInputValue(addDays(new Date(), 7)),
      deliveryAddress: '',
      worksiteAddress: '',
      shipping: centsToDecimalInput(0),
      discount: centsToDecimalInput(0),
      surcharge: centsToDecimalInput(0),
      notes: '',
      status: 'draft',
    });
    this.itemForm.reset({
      equipmentQuery: '',
      equipmentId: 0,
      quantity: 1,
    });
  }

  private populateEditForm(quote: RentalQuote) {
    this.editingQuote = quote;
    this.quoteItems = quote.items;
    this.form.reset({
      leadId: quote.leadId ?? 0,
      sellerId: quote.sellerId ?? 0,
      billingPeriod: quote.billingPeriod,
      rentalPeriodCount: normalizeRentalPeriodCount(quote.rentalPeriodCount),
      startDate: quote.startDate,
      validUntil: quote.validUntil ?? '',
      deliveryAddress: quote.deliveryAddress ?? '',
      worksiteAddress: quote.worksiteAddress ?? '',
      shipping: centsToDecimalInput(quote.shippingCents),
      discount: centsToDecimalInput(quote.discountCents ?? 0),
      surcharge: centsToDecimalInput(quote.surchargeCents ?? 0),
      notes: quote.notes ?? '',
      status: quote.status,
    });
    this.itemForm.reset({
      equipmentQuery: '',
      equipmentId: 0,
      quantity: 1,
    });
  }

  private repriceQuoteItemsForBillingPeriod(billingPeriod: RentalBillingPeriod) {
    this.quoteItems = this.itemsForQuoteBillingPeriod(billingPeriod);
  }

  private itemsForQuoteBillingPeriod(billingPeriod: RentalBillingPeriod): RentalQuoteItem[] {
    const rentalPeriodCount = this.currentRentalPeriodCount();
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
        totalPriceCents: unitPriceCents * quantity * rentalPeriodCount,
        sortOrder: index + 1,
      };
    });
  }

  private currentRentalPeriodCount(): number {
    return normalizeRentalPeriodCount(this.form.controls.rentalPeriodCount.value);
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

function rentalTotalCents(
  subtotalCents: number,
  shippingCents: number,
  discountCents: number,
  surchargeCents: number
): number {
  return Math.max(0, subtotalCents + shippingCents - discountCents + surchargeCents);
}

function normalizeRentalPeriodCount(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(1, Math.trunc(numberValue)) : 1;
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

function compareEquipmentByInternalCode(left: Equipamento, right: Equipamento): number {
  return equipmentCodeSortValue(left).localeCompare(equipmentCodeSortValue(right), 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  });
}

function equipmentCodeSortValue(equipment: Equipamento): string {
  const categoryCode = equipment.equipamentoCategoria.codigo;
  const equipmentCode = equipment.codigo;

  if (categoryCode && equipmentCode) {
    return `${categoryCode}.${equipmentCode}`;
  }

  return equipment.codigoInterno || equipmentCode || equipment.nome;
}

function dateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
