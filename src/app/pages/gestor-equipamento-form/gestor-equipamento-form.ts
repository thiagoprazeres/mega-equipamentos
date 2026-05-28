import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaskitoDirective } from '@maskito/angular';
import { maskitoUpdateElement, type MaskitoElement, type MaskitoOptions } from '@maskito/core';
import { maskitoEventHandler } from '@maskito/kit';
import {
  ArrowLeft,
  Camera,
  ImageUp,
  LogOut,
  Save,
  X,
  LucideAngularModule,
} from 'lucide-angular';

import { GestorNavComponent } from '../../components/gestor-nav/gestor-nav';
import type { Equipamento } from '../../interfaces/equipamento';
import type { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import { AuthService } from '../../services/auth.service';
import { CatalogService, EquipmentEditorInput } from '../../services/catalog.service';
import {
  centsToDecimalInput,
  digitsToCurrencyInput,
  parseCurrencyToCents,
} from '../../utils/prices';

const CATALOG_FORM_LOAD_TIMEOUT_MS = 6500;
const MAX_EQUIPMENT_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_EQUIPMENT_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const EMPTY_PRICE_INPUT = centsToDecimalInput(0);
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
  selector: 'app-gestor-equipamento-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    MaskitoDirective,
    GestorNavComponent,
  ],
  templateUrl: './gestor-equipamento-form.html',
})
export class GestorEquipamentoFormPage implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  @ViewChild('cameraVideo') private cameraVideo?: ElementRef<HTMLVideoElement>;

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Camera = Camera;
  protected readonly ImageUp = ImageUp;
  protected readonly LogOut = LogOut;
  protected readonly Save = Save;
  protected readonly X = X;
  protected readonly currencyMask: MaskitoOptions = CURRENCY_CENTS_MASK;

  protected categories: EquipamentoCategoria[] = [];
  protected equipments: Equipamento[] = [];
  protected loading = true;
  protected loadFailed = false;
  protected saving = false;
  protected uploadingImage = false;
  protected cameraOpen = false;
  protected cameraStarting = false;
  protected cameraErrorMessage = '';
  protected slugTouched = false;
  protected imagePreviewUrl = '';
  protected editingEquipment: Equipamento | null = null;
  protected errorMessage = '';
  protected successMessage = '';
  private cameraStream: MediaStream | null = null;

  protected readonly form = this.formBuilder.nonNullable.group({
    categoryId: [0, [Validators.required, Validators.min(1)]],
    codigo: [''],
    nome: ['', Validators.required],
    nomeTecnico: [''],
    slug: ['', Validators.required],
    avatar: [''],
    video: [''],
    descricao: ['', Validators.required],
    aplicacao: ['', Validators.required],
    tipoDeServico: ['', Validators.required],
    periodoDeLocacao: ['Diária, Semanal, Quinzenal e Mensal.', Validators.required],
    diferenciais: ['', Validators.required],
    assetValue: [EMPTY_PRICE_INPUT],
    totalInvested: [EMPTY_PRICE_INPUT],
    notes: [''],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    dailyPrice: [EMPTY_PRICE_INPUT],
    weeklyPrice: [EMPTY_PRICE_INPUT],
    fortnightlyPrice: [EMPTY_PRICE_INPUT],
    monthlyPrice: [EMPTY_PRICE_INPUT],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly catalogService: CatalogService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadPageData();
    }
  }

  ngOnDestroy() {
    this.closeCamera();
  }

  protected get pageTitle(): string {
    return this.editingEquipment ? `Editar equipamento ${this.editingEquipment.nome}` : 'Novo equipamento';
  }

  protected onAvatarInput() {
    this.imagePreviewUrl = this.form.controls.avatar.value.trim();
  }

  protected async handleImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    await this.uploadEquipmentImageFile(file);
  }

  protected async openCamera() {
    if (!isBrowserRuntime()) {
      return;
    }

    if (this.uploadingImage || this.cameraStarting) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorMessage = 'Este navegador não permite abrir a câmera por aqui.';
      return;
    }

    this.cameraOpen = true;
    this.cameraStarting = true;
    this.cameraErrorMessage = '';
    this.errorMessage = '';
    this.changeDetector.detectChanges();

    try {
      this.stopCameraStream();
      const stream = await this.requestCameraStream();
      this.cameraStream = stream;
      await this.attachCameraStream(stream);
    } catch (error) {
      console.error('equipment camera open failed', error);
      this.stopCameraStream();
      this.cameraOpen = false;
      this.errorMessage =
        'Não foi possível abrir a câmera. Verifique a permissão do navegador e tente novamente.';
    } finally {
      this.cameraStarting = false;
      this.changeDetector.detectChanges();
    }
  }

  protected closeCamera() {
    this.stopCameraStream();
    this.cameraOpen = false;
    this.cameraStarting = false;
    this.cameraErrorMessage = '';
  }

  protected async captureCameraPhoto() {
    if (!isBrowserRuntime() || this.uploadingImage) {
      return;
    }

    const video = this.cameraVideo?.nativeElement;

    if (!video || !this.cameraStream || !video.videoWidth || !video.videoHeight) {
      this.cameraErrorMessage = 'A câmera ainda está iniciando. Tente novamente em alguns segundos.';
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      this.cameraErrorMessage = 'Não foi possível capturar a foto.';
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    );

    if (!blob) {
      this.cameraErrorMessage = 'Não foi possível gerar a foto.';
      return;
    }

    const slug = this.form.controls.slug.value || slugify(this.form.controls.nome.value) || 'equipamento';
    const file = new File([blob], `${slug}-${Date.now()}.jpg`, { type: 'image/jpeg' });
    this.closeCamera();
    await this.uploadEquipmentImageFile(file);
  }

  protected syncSlugFromName() {
    if (this.slugTouched) {
      return;
    }

    this.form.controls.slug.setValue(slugify(this.form.controls.nome.value));
  }

  protected markSlugTouched() {
    this.slugTouched = true;
  }

  protected selectedCategoryCode(): string {
    const categoryId = Number(this.form.controls.categoryId.value);
    return this.categories.find((category) => category.id === categoryId)?.codigo ?? '';
  }

  protected internalCodePreview(): string {
    const categoryCode = this.selectedCategoryCode();
    const equipmentCode = this.form.controls.codigo.value.trim();

    if (!categoryCode) {
      return equipmentCode || '-';
    }

    if (!equipmentCode) {
      return categoryCode;
    }

    if (equipmentCode.includes('/')) {
      return equipmentCode
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => `${categoryCode}.${part}`)
        .join(' / ');
    }

    return `${categoryCode}.${equipmentCode}`;
  }

  protected async saveEquipment() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.uploadingImage) {
      this.errorMessage = 'Aguarde o upload da foto terminar.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const value = this.form.getRawValue();
      const payload: EquipmentEditorInput = {
        id: this.editingEquipment?.id,
        categoryId: Number(value.categoryId),
        nome: value.nome,
        nomeTecnico: value.nomeTecnico,
        slug: slugify(value.slug),
        avatar: value.avatar,
        video: value.video,
        descricao: value.descricao,
        aplicacao: value.aplicacao,
        tipoDeServico: value.tipoDeServico,
        periodoDeLocacao: value.periodoDeLocacao,
        diferenciais: value.diferenciais,
        codigo: value.codigo,
        assetValueCents: parseCurrencyToCents(value.assetValue),
        totalInvestedCents: parseCurrencyToCents(value.totalInvested),
        notes: value.notes,
        stockQuantity: Number(value.stockQuantity),
        status: this.editingEquipment?.status ?? 'active',
        sortOrder: this.editingEquipment?.sortOrder ?? this.equipments.length + 1,
        precos: {
          dailyPriceCents: parseCurrencyToCents(value.dailyPrice),
          weeklyPriceCents: parseCurrencyToCents(value.weeklyPrice),
          fortnightlyPriceCents: parseCurrencyToCents(value.fortnightlyPrice),
          monthlyPriceCents: parseCurrencyToCents(value.monthlyPrice),
          currency: 'BRL',
        },
      };

      await this.catalogService.saveEquipment(payload);
      this.successMessage = 'Equipamento salvo com sucesso.';
      void this.router.navigateByUrl('/gestor/equipamentos');
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível salvar o equipamento.';
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
      [this.categories, this.equipments] = await withTimeout(
        Promise.all([
          this.catalogService.listCategories({ includeArchived: true }),
          this.catalogService.listEquipments({ includeArchived: true }),
        ]),
        CATALOG_FORM_LOAD_TIMEOUT_MS
      );

      const editingId = this.editingEquipmentId();

      if (editingId) {
        const equipment = this.equipments.find((item) => item.id === editingId) ?? null;

        if (!equipment) {
          this.loadFailed = true;
          this.errorMessage = 'Equipamento não encontrado.';
          return;
        }

        this.populateEditForm(equipment);
      } else {
        this.populateCreateForm();
      }
    } catch (error) {
      console.error('equipment form load failed', error);
      this.categories = this.catalogService.getLocalCategories({ includeArchived: true });
      this.equipments = this.catalogService.getLocalEquipments({ includeArchived: true });

      const editingId = this.editingEquipmentId();

      if (editingId) {
        const equipment = this.equipments.find((item) => item.id === editingId) ?? null;

        if (equipment) {
          this.populateEditForm(equipment);
          this.errorMessage = 'O Supabase demorou para responder. Mostrando o catálogo local.';
        } else {
          this.loadFailed = true;
          this.errorMessage = 'Não foi possível carregar o equipamento.';
        }
      } else {
        this.populateCreateForm();
        this.errorMessage = 'O Supabase demorou para responder. Mostrando o catálogo local.';
      }
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  private editingEquipmentId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private populateCreateForm() {
    this.editingEquipment = null;
    this.slugTouched = false;
    this.imagePreviewUrl = '';
    this.form.reset({
      categoryId: this.categories[0]?.id ?? 0,
      codigo: '',
      nome: '',
      nomeTecnico: '',
      slug: '',
      avatar: '',
      video: '',
      descricao: '',
      aplicacao: '',
      tipoDeServico: '',
      periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
      diferenciais: '',
      assetValue: EMPTY_PRICE_INPUT,
      totalInvested: EMPTY_PRICE_INPUT,
      notes: '',
      stockQuantity: 0,
      dailyPrice: EMPTY_PRICE_INPUT,
      weeklyPrice: EMPTY_PRICE_INPUT,
      fortnightlyPrice: EMPTY_PRICE_INPUT,
      monthlyPrice: EMPTY_PRICE_INPUT,
    });
  }

  private populateEditForm(equipment: Equipamento) {
    const prices = equipment.precos;
    this.editingEquipment = equipment;
    this.slugTouched = true;
    this.imagePreviewUrl = equipment.avatar ?? '';
    this.form.reset({
      categoryId: equipment.equipamentoCategoria.id,
      codigo: equipment.codigo ?? '',
      nome: equipment.nome,
      nomeTecnico: equipment.nomeTecnico ?? '',
      slug: equipment.slug,
      avatar: equipment.avatar ?? '',
      video: equipment.video ?? '',
      descricao: equipment.descricao,
      aplicacao: equipment.aplicacao,
      tipoDeServico: equipment.tipoDeServico,
      periodoDeLocacao: equipment.periodoDeLocacao,
      diferenciais: equipment.diferenciais,
      assetValue: centsToDecimalInput(equipment.assetValueCents ?? 0),
      totalInvested: centsToDecimalInput(equipment.totalInvestedCents ?? 0),
      notes: equipment.notes ?? '',
      stockQuantity: equipment.stockQuantity ?? 0,
      dailyPrice: centsToDecimalInput(prices?.dailyPriceCents ?? 0),
      weeklyPrice: centsToDecimalInput(prices?.weeklyPriceCents ?? 0),
      fortnightlyPrice: centsToDecimalInput(prices?.fortnightlyPriceCents ?? 0),
      monthlyPrice: centsToDecimalInput(prices?.monthlyPriceCents ?? 0),
    });
  }

  private async uploadEquipmentImageFile(file: File) {
    const imageType = file.type.toLowerCase();

    if (imageType && !imageType.startsWith('image/')) {
      this.errorMessage = 'Selecione uma imagem válida.';
      return;
    }

    if (imageType && !ACCEPTED_EQUIPMENT_IMAGE_TYPES.has(imageType)) {
      this.errorMessage = 'Use uma foto em JPG, PNG, WebP ou HEIC.';
      return;
    }

    if (file.size > MAX_EQUIPMENT_IMAGE_SIZE) {
      this.errorMessage = 'A foto deve ter até 5 MB.';
      return;
    }

    this.uploadingImage = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const slug = this.form.controls.slug.value || slugify(this.form.controls.nome.value) || 'equipamento';
      const publicUrl = await this.catalogService.uploadEquipmentImage(file, slug);
      this.form.controls.avatar.setValue(publicUrl);
      this.imagePreviewUrl = publicUrl;
      this.successMessage = 'Foto enviada com sucesso.';
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível enviar a foto.';
    } finally {
      this.uploadingImage = false;
      this.changeDetector.detectChanges();
    }
  }

  private async requestCameraStream(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
    } catch (error) {
      if (error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name)) {
        throw error;
      }

      return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    }
  }

  private async attachCameraStream(stream: MediaStream): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
    const video = this.cameraVideo?.nativeElement;

    if (!video) {
      throw new Error('Camera preview unavailable.');
    }

    video.srcObject = stream;
    await video.play();
  }

  private stopCameraStream() {
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream = null;

    if (this.cameraVideo?.nativeElement) {
      this.cameraVideo.nativeElement.srcObject = null;
    }
  }
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('CATALOG_FORM_LOAD_TIMEOUT'));
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

function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
