import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_SUPABASE_URL = 'https://uahrrptcjdxnuhvoruwp.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhaHJycHRjamR4bnVodm9ydXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyOTk0NzAsImV4cCI6MjA5NDg3NTQ3MH0.4Jhed4EkRuPhObqe0kvKxeeNHLC7CYe3u-dZDl3n2yk';

export function getSupabaseUrl(): string {
  return process.env['SUPABASE_URL']?.trim() || DEFAULT_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  return process.env['SUPABASE_ANON_KEY']?.trim() || DEFAULT_SUPABASE_ANON_KEY;
}

export function getDatabaseUrl(): string {
  const databaseUrl = process.env['DATABASE_URL']?.trim() || readRuntimeSecret('database-url');

  if (!databaseUrl) {
    throw new Error('DATABASE_URL não está configurada.');
  }

  return databaseUrl;
}

function readRuntimeSecret(name: string): string {
  const candidates = [
    join(process.cwd(), 'netlify/runtime-secrets', name),
    join(process.cwd(), 'runtime-secrets', name),
    process.env['LAMBDA_TASK_ROOT']
      ? join(process.env['LAMBDA_TASK_ROOT'], 'netlify/runtime-secrets', name)
      : '',
    process.env['LAMBDA_TASK_ROOT']
      ? join(process.env['LAMBDA_TASK_ROOT'], 'runtime-secrets', name)
      : '',
    join('/var/task', 'netlify/runtime-secrets', name),
    join('/var/task', 'runtime-secrets', name),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return readFileSync(candidate, 'utf8').trim();
    }
  }

  return '';
}
