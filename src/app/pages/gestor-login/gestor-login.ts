import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ArrowLeft, KeyRound, LucideAngularModule, ShieldCheck } from 'lucide-angular';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-gestor-login',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-login.html',
})
export class GestorLoginPage implements OnInit {
  protected loading = false;
  protected errorMessage = '';
  protected readonly ArrowLeft = ArrowLeft;
  protected readonly KeyRound = KeyRound;
  protected readonly ShieldCheck = ShieldCheck;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    this.errorMessage = '';
    const hasOAuthCallback = this.hasOAuthCallbackParams();
    this.loading = hasOAuthCallback;

    try {
      const session = hasOAuthCallback
        ? await this.authService.handleOAuthRedirect()
        : await withTimeout(this.authService.handleOAuthRedirect(), 3500);

      if (session) {
        void this.router.navigateByUrl('/gestor/equipamentos');
        return;
      }

      this.loading = false;
    } catch (error) {
      if (error instanceof Error && error.message === 'LOGIN_SESSION_CHECK_TIMEOUT') {
        return;
      }

      this.errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível concluir o login com Google. Tente novamente.';
      this.loading = false;
    }
  }

  protected async signInWithGoogle() {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await withTimeout(this.authService.signInWithGoogle(), 10000);
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message && error.message !== 'LOGIN_SESSION_CHECK_TIMEOUT'
          ? error.message
          : 'Não foi possível entrar com Google. Tente novamente.';
      this.loading = false;
    }
  }

  private hasOAuthCallbackParams(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const url = new URL(window.location.href);

    return (
      url.searchParams.has('code') ||
      url.searchParams.has('error') ||
      url.searchParams.has('error_code') ||
      url.searchParams.has('error_description')
    );
  }
}

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('LOGIN_SESSION_CHECK_TIMEOUT'));
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
