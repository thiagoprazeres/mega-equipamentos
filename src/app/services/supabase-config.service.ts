import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';

export interface PublicSupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseConfigService {
  private readonly platformId = inject(PLATFORM_ID);
  private configPromise: Promise<PublicSupabaseConfig | null> | null = null;

  getConfig(): Promise<PublicSupabaseConfig | null> {
    this.configPromise ??= this.resolveConfig();
    return this.configPromise;
  }

  private async resolveConfig(): Promise<PublicSupabaseConfig | null> {
    if (isPlatformServer(this.platformId)) {
      const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
        .process?.env;
      const supabaseUrl = env?.['SUPABASE_URL']?.trim();
      const supabaseAnonKey = env?.['SUPABASE_ANON_KEY']?.trim();

      return supabaseUrl && supabaseAnonKey ? { supabaseUrl, supabaseAnonKey } : null;
    }

    try {
      const response = await fetch('/.netlify/functions/supabase-config', {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return null;
      }

      const config = (await response.json()) as Partial<PublicSupabaseConfig>;

      return config.supabaseUrl && config.supabaseAnonKey
        ? { supabaseUrl: config.supabaseUrl, supabaseAnonKey: config.supabaseAnonKey }
        : null;
    } catch {
      return null;
    }
  }
}
