import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ArrowLeft, LogOut, Save, LucideAngularModule } from 'lucide-angular';

import type { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import {
  LEAD_ORIGIN_OPTIONS,
  type Lead,
  type LeadOrigin,
} from '../../interfaces/lead';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import { LeadEditorInput, LeadService } from '../../services/lead.service';

const LEAD_FORM_LOAD_TIMEOUT_MS = 6500;

@Component({
  selector: 'app-gestor-lead-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
  ],
  templateUrl: './gestor-lead-form.html',
})
export class GestorLeadFormPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly LogOut = LogOut;
  protected readonly Save = Save;
  protected readonly originOptions = LEAD_ORIGIN_OPTIONS;
  protected readonly stateOptions = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ];

  protected interestCategories: EquipamentoCategoria[] = [];
  protected loading = true;
  protected loadFailed = false;
  protected saving = false;
  protected editingLead: Lead | null = null;
  protected errorMessage = '';
  protected successMessage = '';

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', Validators.required],
    document: [''],
    email: ['', Validators.email],
    phone: [''],
    whatsapp: [''],
    zipCode: [''],
    address: [''],
    city: [''],
    state: ['PE'],
    origin: ['whatsapp' as LeadOrigin, Validators.required],
    interestCategoryId: [0],
    notes: [''],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly catalogService: CatalogService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly leadService: LeadService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadPageData();
    }
  }

  protected get pageTitle(): string {
    return this.editingLead ? `Editar lead ${this.editingLead.nome}` : 'Novo lead';
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
      void this.router.navigateByUrl('/gestor/leads');
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível salvar o lead.';
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
      const editingId = this.editingLeadId();
      const [categories, leads] = await withTimeout(
        Promise.all([
          this.catalogService.listCategories({ includeArchived: true }),
          editingId ? this.leadService.listLeads(true) : Promise.resolve([]),
        ]),
        LEAD_FORM_LOAD_TIMEOUT_MS
      );

      this.interestCategories = categories;

      if (editingId) {
        const lead = leads.find((item) => item.id === editingId) ?? null;

        if (!lead) {
          this.loadFailed = true;
          this.errorMessage = 'Lead não encontrado.';
          return;
        }

        this.populateEditForm(lead);
      } else {
        this.populateCreateForm();
      }
    } catch (error) {
      console.error('lead form load failed', error);
      this.loadFailed = true;
      this.errorMessage = 'Não foi possível carregar os dados do lead.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  private editingLeadId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private populateCreateForm() {
    this.editingLead = null;
    this.form.reset({
      nome: '',
      document: '',
      email: '',
      phone: '',
      whatsapp: '',
      zipCode: '',
      address: '',
      city: '',
      state: 'PE',
      origin: 'whatsapp',
      interestCategoryId: 0,
      notes: '',
    });
  }

  private populateEditForm(lead: Lead) {
    this.editingLead = lead;
    this.form.reset({
      nome: lead.nome,
      document: lead.document ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      whatsapp: lead.whatsapp ?? '',
      zipCode: lead.zipCode ?? '',
      address: lead.address ?? '',
      city: lead.city ?? '',
      state: lead.state || 'PE',
      origin: lead.origin,
      interestCategoryId: lead.interestCategoryId ?? 0,
      notes: lead.notes ?? '',
    });
  }
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('LEAD_FORM_LOAD_TIMEOUT'));
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
