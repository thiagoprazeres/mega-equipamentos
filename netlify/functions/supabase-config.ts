import type { Handler } from '@netlify/functions';

export const handler: Handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();

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
