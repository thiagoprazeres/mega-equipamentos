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
import type { StaffUser } from '../../interfaces/staff-user';
import type {
  RentalBillingPeriod,
  RentalContract,
  RentalContractItem,
  RentalContractStatus,
} from '../../interfaces/rental-contract';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { CustomerService } from '../../services/customer.service';
import { CompanyProfileService } from '../../services/company-profile.service';
import {
  RentalContractEditorInput,
  RentalContractService,
} from '../../services/rental-contract.service';
import { StaffUserService } from '../../services/staff-user.service';
import { DEFAULT_CONTRACT_TERMS, normalizeContractTerms } from '../../utils/contract-terms';
import {
  formatCurrencyCents,
  centsToDecimalInput,
  parseCurrencyToCents,
  digitsToCurrencyInput,
} from '../../utils/prices';

const CONTRACT_FORM_LOAD_TIMEOUT_MS = 6500;
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
  selector: 'app-gestor-contrato-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    MaskitoDirective,
    GestorNavComponent,
  ],
  templateUrl: './gestor-contrato-form.html',
})
export class GestorContratoFormPage implements OnInit {
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
  protected readonly statusOptions: Array<{ value: RentalContractStatus; label: string }> = [
    { value: 'draft', label: 'Rascunho' },
    { value: 'active', label: 'Ativo' },
    { value: 'closed', label: 'Encerrado' },
    { value: 'returned', label: 'Devolvido' },
    { value: 'cancelled', label: 'Cancelado' },
  ];

  protected customers: Customer[] = [];
  protected sellers: StaffUser[] = [];
  protected equipments: Equipamento[] = [];
  protected contractItems: RentalContractItem[] = [];
  protected loading = true;
  protected loadFailed = false;
  protected saving = false;
  protected editingContract: RentalContract | null = null;
  protected worksiteAddressTouched = false;
  protected errorMessage = '';
  protected successMessage = '';

  protected readonly form = this.formBuilder.nonNullable.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    sellerId: [0, [Validators.required, Validators.min(1)]],
    billingPeriod: ['daily' as RentalBillingPeriod, Validators.required],
    startDate: [todayInputValue(), Validators.required],
    endDate: [''],
    deliveryAddress: [''],
    worksiteAddress: [''],
    shipping: [centsToDecimalInput(6000), Validators.required],
    notes: [''],
    terms: [DEFAULT_CONTRACT_TERMS],
    status: ['draft' as RentalContractStatus, Validators.required],
  });
  protected readonly itemForm = this.formBuilder.nonNullable.group({
    equipmentId: [0, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly catalogService: CatalogService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly companyProfileService: CompanyProfileService,
    private readonly customerService: CustomerService,
    private readonly rentalContractService: RentalContractService,
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
    return this.editingContract
      ? `Editar contrato ${this.editingContract.contractNumber}`
      : 'Novo contrato';
  }

  protected syncWorksiteAddressFromDelivery() {
    if (this.worksiteAddressTouched) {
      return;
    }

    this.form.controls.worksiteAddress.setValue(this.form.controls.deliveryAddress.value, {
      emitEvent: false,
    });
  }

  protected markWorksiteAddressTouched() {
    this.worksiteAddressTouched = true;
  }

  protected syncEndDateFromRentalPeriod() {
    this.form.controls.endDate.setValue(
      calculateRentalEndDate(this.form.controls.startDate.value, this.form.controls.billingPeriod.value)
    );
  }

  protected changeContractBillingPeriod() {
    this.repriceContractItemsForBillingPeriod(this.form.controls.billingPeriod.value);
    this.syncEndDateFromRentalPeriod();
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
    this.contractItems = [
      ...this.contractItems,
      {
        equipmentId: equipment.id,
        equipmentName: equipment.nome,
        quantity,
        billingPeriod,
        unitPriceCents,
        totalPriceCents: quantity * unitPriceCents,
        assetValueCents,
        sortOrder: this.contractItems.length + 1,
      },
    ];
    this.errorMessage = '';
    this.itemForm.reset({
      equipmentId: 0,
      quantity: 1,
    });
  }

  protected removeItem(index: number) {
    this.contractItems = this.contractItems.filter((_, itemIndex) => itemIndex !== index);
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

  protected contractSubtotal(): number {
    return this.contractItems.reduce((total, item) => total + item.totalPriceCents, 0);
  }

  protected contractTotal(): number {
    const subtotal = this.contractSubtotal();
    const shippingValue = parseCurrencyToCents(this.form.controls.shipping.value);
    return subtotal + shippingValue;
  }

  protected async saveContract() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.contractItems.length) {
      this.errorMessage = 'Adicione pelo menos um equipamento ao contrato.';
      return;
    }

    this.syncEndDateFromRentalPeriod();

    const value = this.form.getRawValue();
    const customer = this.customers.find((item) => item.id === Number(value.customerId));
    const seller = this.sellers.find((item) => item.id === Number(value.sellerId));

    if (!customer) {
      this.errorMessage = 'Selecione um cliente válido.';
      return;
    }

    if (!seller) {
      this.errorMessage = 'Selecione um vendedor válido.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const payload: RentalContractEditorInput = {
        id: this.editingContract?.id,
        customer,
        seller,
        billingPeriod: value.billingPeriod,
        startDate: value.startDate,
        endDate: value.endDate,
        deliveryAddress: value.deliveryAddress,
        worksiteAddress: value.worksiteAddress,
        notes: value.notes,
        terms: value.terms,
        status: value.status,
        items: this.itemsForContractBillingPeriod(value.billingPeriod),
        shippingCents: parseCurrencyToCents(value.shipping),
      };

      await this.rentalContractService.saveContract(payload);
      this.successMessage = 'Contrato salvo com sucesso.';
      void this.router.navigateByUrl('/gestor/contratos');
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível salvar o contrato.';
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
      const editingId = this.editingContractId();

      const [customers, sellers, equipments, contracts, companyProfile] = await withTimeout(
        Promise.all([
          this.customerService.listCustomers(),
          this.staffUserService.listSellers(),
          this.catalogService.listEquipments(),
          editingId ? this.rentalContractService.listContracts() : Promise.resolve([]),
          editingId
            ? Promise.resolve(null)
            : this.companyProfileService.getCompanyProfile().catch((error) => {
                console.error('company profile for contract terms failed', error);
                return null;
              }),
        ]),
        CONTRACT_FORM_LOAD_TIMEOUT_MS
      );

      this.customers = customers;
      this.sellers = sellers;
      this.equipments = equipments;

      if (editingId) {
        const contract = contracts.find((item) => item.id === editingId) ?? null;

        if (!contract) {
          this.loadFailed = true;
          this.errorMessage = 'Contrato não encontrado.';
          return;
        }

        this.populateEditForm(contract);
      } else {
        this.populateCreateForm(normalizeContractTerms(companyProfile?.contractTerms));
      }
    } catch (error) {
      console.error('contract form load failed', error);
      this.loadFailed = true;
      this.errorMessage = 'Não foi possível carregar os dados do contrato.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  private editingContractId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private populateCreateForm(contractTerms = DEFAULT_CONTRACT_TERMS) {
    this.editingContract = null;
    this.contractItems = [];
    this.worksiteAddressTouched = false;
    this.form.reset({
      customerId: 0,
      sellerId: 0,
      billingPeriod: 'daily',
      startDate: todayInputValue(),
      endDate: '',
      deliveryAddress: '',
      worksiteAddress: '',
      shipping: centsToDecimalInput(6000),
      notes: '',
      terms: normalizeContractTerms(contractTerms),
      status: 'draft',
    });
    this.itemForm.reset({
      equipmentId: 0,
      quantity: 1,
    });
    this.syncEndDateFromRentalPeriod();
  }

  private populateEditForm(contract: RentalContract) {
    this.editingContract = contract;
    this.contractItems = contract.items.map((item) => ({
      ...item,
      billingPeriod: contract.billingPeriod,
      assetValueCents: this.itemAssetValue(item),
    }));
    this.worksiteAddressTouched = Boolean(
      contract.worksiteAddress && contract.worksiteAddress !== (contract.deliveryAddress ?? '')
    );
    this.form.reset({
      customerId: contract.customerId,
      sellerId: contract.sellerId ?? 0,
      billingPeriod: contract.billingPeriod,
      startDate: contract.startDate,
      endDate: contract.endDate ?? '',
      deliveryAddress: contract.deliveryAddress ?? '',
      worksiteAddress: contract.worksiteAddress ?? contract.deliveryAddress ?? '',
      shipping: centsToDecimalInput(contract.shippingCents ?? 6000),
      notes: contract.notes ?? '',
      terms: contract.terms || DEFAULT_CONTRACT_TERMS,
      status: contract.status,
    });
    this.syncEndDateFromRentalPeriod();
    this.itemForm.reset({
      equipmentId: 0,
      quantity: 1,
    });
  }

  private repriceContractItemsForBillingPeriod(billingPeriod: RentalBillingPeriod) {
    this.contractItems = this.contractItems.map((item) => {
      const equipment = this.equipments.find((candidate) => candidate.id === item.equipmentId);
      const unitPriceCents = equipment?.precos?.[PRICE_FIELD_BY_PERIOD[billingPeriod]] ?? item.unitPriceCents;

      return {
        ...item,
        billingPeriod,
        unitPriceCents,
        totalPriceCents: item.quantity * unitPriceCents,
      };
    });
  }

  private itemsForContractBillingPeriod(billingPeriod: RentalBillingPeriod): RentalContractItem[] {
    return this.contractItems.map((item) => ({
      ...item,
      billingPeriod,
      assetValueCents: this.itemAssetValue(item),
      totalPriceCents: item.quantity * item.unitPriceCents,
    }));
  }

  private itemAssetValue(item: RentalContractItem): number {
    if ((item.assetValueCents ?? 0) > 0) {
      return item.assetValueCents ?? 0;
    }

    const equipment = this.equipments.find((candidate) => candidate.id === item.equipmentId);
    return Math.max(0, Math.trunc(Number(equipment?.assetValueCents) || 0));
  }
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('CONTRACT_FORM_LOAD_TIMEOUT'));
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
  return new Date().toISOString().slice(0, 10);
}

function calculateRentalEndDate(startDate: string, billingPeriod: RentalBillingPeriod): string {
  if (!startDate) {
    return '';
  }

  const [year, month, day] = startDate.split('-').map(Number);

  if (!year || !month || !day) {
    return '';
  }

  const date = new Date(year, month - 1, day);

  if (billingPeriod === 'monthly') {
    return addMonths(date, 1);
  }

  const daysByPeriod: Record<Exclude<RentalBillingPeriod, 'monthly'>, number> = {
    daily: 1,
    weekly: 7,
    fortnightly: 15,
  };
  date.setDate(date.getDate() + daysByPeriod[billingPeriod]);

  return dateInputValue(date);
}

function addMonths(date: Date, months: number): string {
  const targetYear = date.getFullYear();
  const targetMonth = date.getMonth() + months;
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const result = new Date(targetYear, targetMonth, Math.min(date.getDate(), daysInTargetMonth));

  return dateInputValue(result);
}

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
