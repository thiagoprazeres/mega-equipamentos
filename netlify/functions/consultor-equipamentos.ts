import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Handler } from '@netlify/functions';
import { GoogleGenAI, Type, Schema } from '@google/genai';

import {
  buildConsultorAiPromptPayload,
  createConsultorRequest,
  isConsultorRequestPayload,
  normalizeConsultorResponse,
} from '../../src/app/features/consultor-equipamentos/consultor-equipamentos';
import type {
  ConsultorEquipamentosRequest,
  ConsultorEquipamentosResponse,
} from '../../src/app/features/consultor-equipamentos/consultor-equipamentos.types';

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING },
    selectedEquipmentIds: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
    },
    itemReasons: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          equipmentId: { type: Type.INTEGER },
          reason: { type: Type.STRING },
        },
        required: ['equipmentId', 'reason'],
      },
    },
    followUpQuestion: {
      type: Type.STRING,
      nullable: true,
    },
    showQuoteCta: { type: Type.BOOLEAN },
    whatsappPrefill: { type: Type.STRING },
  },
  required: [
    'answer',
    'selectedEquipmentIds',
    'itemReasons',
    'showQuoteCta',
    'whatsappPrefill',
  ],
};

const DEVELOPER_PROMPT = `Você é o consultor virtual da Mega Equipamentos, empresa de locação de equipamentos para obras em Caruaru e região.

Objetivo:
- Conduzir toda a conversa de forma natural, útil e consultiva.
- Entender a necessidade da obra antes de recomendar.
- Captar nome, WhatsApp, cidade e contexto da obra ao longo do chat, sem checklist robotizada.
- Recomendar apenas itens do catálogo recebido no contexto JSON.
- Responder sempre em português do Brasil.

Regras obrigatórias:
- Você sempre receberá o catálogo completo no campo "catalog" do JSON da última mensagem do usuário.
- Nunca invente produtos, categorias ou informações fora do catálogo recebido.
- Se recomendar produtos, cite os nomes exatamente como aparecem no catálogo e preencha selectedEquipmentIds com os ids correspondentes.
- Todo item em selectedEquipmentIds deve aparecer nominalmente no texto da resposta.
- Se ainda faltar contexto para indicar produto com segurança, não recomende: use selectedEquipmentIds vazio, itemReasons vazio e showQuoteCta false.
- Faça no máximo uma pergunta curta por resposta.
- Quando a demanda não tiver aderência real ao catálogo, diga isso com honestidade e ofereça continuidade pelo WhatsApp, sem inventar solução.
- Se o cliente responder só com confirmação curta como "sim", "quero", "pode mandar" ou equivalente, trate isso como continuidade do contexto anterior.
- Não mencione ids internos, JSON, schema, payload, catálogo estruturado ou qualquer termo técnico para o cliente.
- Mantenha a resposta objetiva e comercial, mas humana.

Formato:
- "answer" traz a resposta principal ao cliente.
- "followUpQuestion" só deve ser preenchido se houver uma pergunta curta complementar que ajude a avançar.
- "showQuoteCta" só deve ser true quando houver recomendação concreta ou quando fizer sentido encaminhar o cliente para continuidade no WhatsApp.
- "whatsappPrefill" deve vir pronto para o vendedor continuar o atendimento.`;

loadLocalEnvForDevelopment();

export const handler: Handler = async (event) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const origin = event.headers.origin || event.headers.referer || '';

  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (allowedOrigin && !origin.includes(allowedOrigin) && !origin.includes('localhost')) {
    return jsonResponse({ error: 'Unauthorized request origin' }, 403);
  }

  const payload = parsePayload(event.body);

  if (!payload) {
    return jsonResponse({ error: 'Invalid request payload' }, 400);
  }

  const request = createConsultorRequest(payload.message, payload.history, payload.context);

  if (!request.message) {
    return jsonResponse({ error: 'Invalid request payload' }, 400);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return jsonResponse({ error: 'A chave da API de Inteligência Artificial não está configurada.' }, 503);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const contents = [
      ...request.history.map((message) => ({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }],
      })),
      {
        role: 'user',
        parts: [{ text: JSON.stringify(buildConsultorAiPromptPayload(request)) }],
      },
    ];

    const generatePromise = ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: DEVELOPER_PROMPT,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('NETLIFY_TIMEOUT')), 8500);
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const parsedResponse = parseModelOutput(response.text);
    const normalizedResponse = normalizeConsultorResponse(parsedResponse, request);

    if (!normalizedResponse) {
      return jsonResponse({ error: 'A IA retornou uma resposta inválida.' }, 502);
    }

    return jsonResponse(normalizedResponse, 200, allowedOrigin);
  } catch (error: any) {
    console.error('consultor-equipamentos function failed', error);
    
    if (error.message === 'NETLIFY_TIMEOUT') {
      return jsonResponse({ error: 'A análise da IA demorou muito e foi interrompida (Timeout). Tente simplificar a requisição.' }, 504, allowedOrigin);
    }
    
    return jsonResponse(
      { error: 'A IA ficou indisponível no momento. Tente novamente em instantes.' },
      502,
      allowedOrigin
    );
  }
};

function loadLocalEnvForDevelopment() {
  if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
    return;
  }

  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const processWithEnvLoader = process as NodeJS.Process & {
    loadEnvFile?: (path?: string) => void;
  };

  try {
    processWithEnvLoader.loadEnvFile?.(envPath);
  } catch (error) {
    console.warn('consultor-equipamentos could not load local .env file', error);
  }
}

function parsePayload(rawBody: string | null): ConsultorEquipamentosRequest | null {
  if (!rawBody) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return isConsultorRequestPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseModelOutput(outputText: string): Partial<ConsultorEquipamentosResponse> {
  if (!outputText?.trim()) {
    return {};
  }

  try {
    return JSON.parse(outputText) as Partial<ConsultorEquipamentosResponse>;
  } catch {
    return {};
  }
}

function jsonResponse(body: object, statusCode = 200, allowedOrigin?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
  
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
}
