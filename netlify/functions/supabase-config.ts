import type { Handler } from '@netlify/functions';

import { getSupabaseAnonKey, getSupabaseUrl } from '../../src/server/runtime-config';

export const handler: Handler = async () => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      statusCode: 503,
      headers: jsonHeaders(),
      body: JSON.stringify({ error: 'Supabase não está configurado.' }),
    };
  }

  return {
    statusCode: 200,
    headers: jsonHeaders(),
    body: JSON.stringify({ supabaseUrl, supabaseAnonKey }),
  };
};

function jsonHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
}
