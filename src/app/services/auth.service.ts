import { Injectable, inject } from '@angular/core';
import type { AuthChangeEvent, AuthError, Session } from '@supabase/supabase-js';

import { SupabaseClientService } from './supabase-client.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseClientService);

  async getSession(): Promise<Session | null> {
    const client = await this.supabase.getClient();

    if (!client) {
      return null;
    }

    const { data } = await client.auth.getSession();
    return data.session;
  }

  async getAdminSession(): Promise<Session | null> {
    return this.toAdminSession(await this.getSession());
  }

  async handleOAuthRedirect(): Promise<Session | null> {
    if (typeof window === 'undefined') {
      return this.getAdminSession();
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const authError = url.searchParams.get('error_description') ?? url.searchParams.get('error');

    if (authError) {
      this.cleanOAuthUrl(url);
      throw new Error(authError);
    }

    if (!code) {
      return this.getAdminSession();
    }

    const client = await this.supabase.requireClient();
    const { data, error } = await client.auth.exchangeCodeForSession(code);

    this.cleanOAuthUrl(url);

    if (data.session) {
      return this.toAdminSession(data.session);
    }

    const existingSession = await this.getSession();

    if (existingSession) {
      return this.toAdminSession(existingSession);
    }

    if (error) {
      throw this.toFriendlyAuthError(error);
    }

    return null;
  }

  async signInWithGoogle(): Promise<void> {
    const client = await this.supabase.requireClient();
    const redirectTo =
      typeof window === 'undefined' ? undefined : `${window.location.origin}/gestor/login`;
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      throw this.toFriendlyAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    const client = await this.supabase.requireClient();
    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }
  }

  async onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ): Promise<() => void> {
    const client = await this.supabase.requireClient();
    const { data } = client.auth.onAuthStateChange(callback);

    return () => data.subscription.unsubscribe();
  }

  isAdminEmail(email?: string | null): boolean {
    return Boolean(email?.trim());
  }

  private async toAdminSession(session: Session | null): Promise<Session | null> {
    if (!session) {
      return null;
    }

    if (await this.isAuthorizedStaffSession()) {
      return session;
    }

    await this.signOut();
    throw new Error('Este e-mail não está autorizado para a área gestora.');
  }

  private async isAuthorizedStaffSession(): Promise<boolean> {
    const client = await this.supabase.requireClient();
    const { data, error } = await client.rpc('is_catalog_admin');

    if (error) {
      console.error('staff authorization check failed', error);
      return false;
    }

    return data === true;
  }

  private cleanOAuthUrl(url: URL): void {
    url.searchParams.delete('code');
    url.searchParams.delete('error');
    url.searchParams.delete('error_code');
    url.searchParams.delete('error_description');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }

  private toFriendlyAuthError(error: AuthError): Error {
    if (error.code === 'bad_oauth_callback' || error.code === 'oauth_provider_not_supported') {
      return new Error('Não foi possível concluir o login com Google. Tente novamente.');
    }

    return error;
  }
}
