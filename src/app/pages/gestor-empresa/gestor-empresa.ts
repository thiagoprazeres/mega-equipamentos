import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Building2, LogOut, Save, LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../services/auth.service';
import {
  CompanyProfileEditorInput,
  CompanyProfileService,
} from '../../services/company-profile.service';
import { normalizeContractTerms } from '../../utils/contract-terms';

const COMPANY_LOAD_TIMEOUT_MS = 4500;

@Component({
  selector: 'app-gestor-empresa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './gestor-empresa.html',
})
export class GestorEmpresaPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly Building2 = Building2;
  protected readonly LogOut = LogOut;
  protected readonly Save = Save;

  protected loading = false;
  protected saving = false;
  protected errorMessage = '';
  protected successMessage = '';

  protected readonly form = this.formBuilder.nonNullable.group({
    legalName: ['', Validators.required],
    tradeName: [''],
    document: [''],
    pixKey: [''],
    email: ['', Validators.email],
    gmailPassword: [''],
    phone: [''],
    whatsapp: [''],
    address: [''],
    city: [''],
    state: [''],
    zipCode: [''],
    instagramLogin: [''],
    instagramPassword: [''],
    contractTerms: [''],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly companyProfileService: CompanyProfileService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadCompanyProfile();
    }
  }

  protected async saveCompanyProfile() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const value = this.form.getRawValue();
      const payload: CompanyProfileEditorInput = {
        legalName: value.legalName,
        tradeName: value.tradeName,
        document: value.document,
        pixKey: value.pixKey,
        email: value.email,
        gmailPassword: value.gmailPassword,
        phone: value.phone,
        whatsapp: value.whatsapp,
        address: value.address,
        city: value.city,
        state: value.state,
        zipCode: value.zipCode,
        instagramLogin: value.instagramLogin,
        instagramPassword: value.instagramPassword,
        contractTerms: value.contractTerms,
      };

      await this.companyProfileService.saveCompanyProfile(payload);
      this.successMessage = 'Dados da empresa salvos com sucesso.';
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível salvar os dados da empresa.';
    } finally {
      this.saving = false;
      this.changeDetector.detectChanges();
    }
  }

  protected async signOut() {
    await this.authService.signOut();
    void this.router.navigateByUrl('/gestor/login');
  }

  private async loadCompanyProfile() {
    this.loading = true;
    this.errorMessage = '';

    try {
      const profile = await withTimeout(
        this.companyProfileService.getCompanyProfile(),
        COMPANY_LOAD_TIMEOUT_MS
      );

      this.form.reset({
        legalName: profile.legalName,
        tradeName: profile.tradeName ?? '',
        document: profile.document ?? '',
        pixKey: profile.pixKey ?? '',
        email: profile.email ?? '',
        gmailPassword: profile.gmailPassword ?? '',
        phone: profile.phone ?? '',
        whatsapp: profile.whatsapp ?? '',
        address: profile.address ?? '',
        city: profile.city ?? '',
        state: profile.state ?? '',
        zipCode: profile.zipCode ?? '',
        instagramLogin: profile.instagramLogin ?? '',
        instagramPassword: profile.instagramPassword ?? '',
        contractTerms: normalizeContractTerms(profile.contractTerms),
      });
    } catch (error) {
      console.error('company profile load failed', error);
      this.errorMessage = 'Não foi possível carregar os dados da empresa.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('COMPANY_LOAD_TIMEOUT'));
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
