import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaskitoDirective } from '@maskito/angular';
import { maskitoUpdateElement, type MaskitoElement, type MaskitoOptions } from '@maskito/core';
import { maskitoEventHandler } from '@maskito/kit';
import { ArrowLeft, LogOut, Save, LucideAngularModule } from 'lucide-angular';

import { GestorNavComponent } from '../../components/gestor-nav/gestor-nav';
import type { StaffUser, StaffUserRole } from '../../interfaces/staff-user';
import { AuthService } from '../../services/auth.service';
import { StaffUserEditorInput, StaffUserService } from '../../services/staff-user.service';

const USER_FORM_LOAD_TIMEOUT_MS = 6500;
const formattingMaskedElements = new WeakSet<MaskitoElement>();
const DOCUMENT_MASK = createFormatterMask(formatCpfCnpj);
const PHONE_MASK = createFormatterMask(formatPhone);

@Component({
  selector: 'app-gestor-usuario-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    MaskitoDirective,
    GestorNavComponent,
  ],
  templateUrl: './gestor-usuario-form.html',
})
export class GestorUsuarioFormPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly LogOut = LogOut;
  protected readonly Save = Save;
  protected readonly documentMask = DOCUMENT_MASK;
  protected readonly phoneMask = PHONE_MASK;
  protected readonly roleOptions: Array<{ value: StaffUserRole; label: string }> = [
    { value: 'admin', label: 'Admin' },
    { value: 'vendedor', label: 'Vendedor' },
    { value: 'operador', label: 'Operador' },
    { value: 'financeiro', label: 'Financeiro' },
  ];

  protected loading = true;
  protected loadFailed = false;
  protected saving = false;
  protected editingUser: StaffUser | null = null;
  protected errorMessage = '';
  protected successMessage = '';

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', Validators.required],
    role: ['vendedor' as StaffUserRole, Validators.required],
    document: [''],
    email: ['', Validators.email],
    phone: [''],
    whatsapp: [''],
    address: [''],
    notes: [''],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
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
    return this.editingUser ? `Editar usuário ${this.editingUser.nome}` : 'Novo usuário';
  }

  protected async saveUser() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const value = this.form.getRawValue();
      const payload: StaffUserEditorInput = {
        id: this.editingUser?.id,
        nome: value.nome,
        role: value.role,
        document: value.document,
        email: value.email,
        phone: value.phone,
        whatsapp: value.whatsapp,
        address: value.address,
        notes: value.notes,
        status: this.editingUser?.status ?? 'active',
      };

      await this.staffUserService.saveUser(payload);
      this.successMessage = 'Usuário salvo com sucesso.';
      void this.router.navigateByUrl('/gestor/usuarios');
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível salvar o usuário.';
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
      const editingId = this.editingUserId();

      if (editingId) {
        const users = await withTimeout(
          this.staffUserService.listUsers(true),
          USER_FORM_LOAD_TIMEOUT_MS
        );
        const user = users.find((item) => item.id === editingId) ?? null;

        if (!user) {
          this.loadFailed = true;
          this.errorMessage = 'Usuário não encontrado.';
          return;
        }

        this.populateEditForm(user);
      } else {
        this.populateCreateForm();
      }
    } catch (error) {
      console.error('user form load failed', error);
      this.loadFailed = true;
      this.errorMessage = 'Não foi possível carregar os dados do usuário.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  private editingUserId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private populateCreateForm() {
    this.editingUser = null;
    this.form.reset({
      nome: '',
      role: 'vendedor',
      document: '',
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      notes: '',
    });
  }

  private populateEditForm(user: StaffUser) {
    this.editingUser = user;
    this.form.reset({
      nome: user.nome,
      role: user.role,
      document: user.document ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      whatsapp: user.whatsapp ?? '',
      address: user.address ?? '',
      notes: user.notes ?? '',
    });
  }
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
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

  if (digits.length <= 11) {
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 9);
    const part4 = digits.slice(9, 11);

    return [part1, part2, part3]
      .filter(Boolean)
      .join('.')
      .concat(part4 ? `-${part4}` : '');
  }

  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 5);
  const part3 = digits.slice(5, 8);
  const part4 = digits.slice(8, 12);
  const part5 = digits.slice(12, 14);

  return `${part1}.${part2}.${part3}/${part4}${part5 ? `-${part5}` : ''}`;
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

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('SELLER_FORM_LOAD_TIMEOUT'));
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
