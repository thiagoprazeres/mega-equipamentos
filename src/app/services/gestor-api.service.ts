import { Injectable, inject } from '@angular/core';

import { SupabaseClientService } from './supabase-client.service';

interface GestorApiRequestOptions {
  method?: string;
  body?: unknown;
}

@Injectable({ providedIn: 'root' })
export class GestorApiService {
  private readonly supabase = inject(SupabaseClientService);

  async request<T>(path: string, options: GestorApiRequestOptions = {}): Promise<T> {
    const token = await this.accessToken();

    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    return this.fetchJson<T>(path, token, options);
  }

  async optionalRequest<T>(path: string, options: GestorApiRequestOptions = {}): Promise<T | null> {
    const token = await this.accessToken();

    if (!token) {
      return null;
    }

    return this.fetchJson<T>(path, token, options);
  }

  private async fetchJson<T>(
    path: string,
    token: string,
    options: GestorApiRequestOptions
  ): Promise<T> {
    const response = await fetch(`/.netlify/functions/gestor-api${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      const message = await response
        .json()
        .then((body: Partial<{ error: string }>) => body.error)
        .catch(() => null);
      throw new Error(message || `API gestora respondeu ${response.status}.`);
    }

    return (await response.json()) as T;
  }

  private async accessToken(): Promise<string | null> {
    const client = await this.supabase.getClient();

    if (!client) {
      return null;
    }

    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
  }
}
