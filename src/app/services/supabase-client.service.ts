import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseConfigService } from './supabase-config.service';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly configService = inject(SupabaseConfigService);
  private clientPromise: Promise<SupabaseClient | null> | null = null;
  private publicClientPromise: Promise<SupabaseClient | null> | null = null;

  getClient(): Promise<SupabaseClient | null> {
    this.clientPromise ??= this.createClient();
    return this.clientPromise;
  }

  getPublicClient(): Promise<SupabaseClient | null> {
    this.publicClientPromise ??= this.createPublicClient();
    return this.publicClientPromise;
  }

  async requireClient(): Promise<SupabaseClient> {
    const client = await this.getClient();

    if (!client) {
      throw new Error('Supabase não está configurado.');
    }

    return client;
  }

  private async createPublicClient(): Promise<SupabaseClient | null> {
    const config = await this.configService.getConfig();

    if (!config) {
      return null;
    }

    const { createClient } = await import('@supabase/supabase-js');

    return createClient(config.supabaseUrl, config.supabaseAnonKey, {
      accessToken: async () => null,
      db: { timeout: 15000 },
    });
  }

  private async createClient(): Promise<SupabaseClient | null> {
    const config = await this.configService.getConfig();

    if (!config) {
      return null;
    }

    const isBrowser = isPlatformBrowser(this.platformId);
    const { createClient } = await import('@supabase/supabase-js');
    const lock = async <Result>(
      _name: string,
      _acquireTimeout: number,
      fn: () => Promise<Result>
    ): Promise<Result> => fn();

    return createClient(config.supabaseUrl, config.supabaseAnonKey, {
      db: { timeout: 15000 },
      auth: {
        persistSession: isBrowser,
        autoRefreshToken: isBrowser,
        detectSessionInUrl: false,
        flowType: 'pkce',
        lock,
      },
    });
  }
}
