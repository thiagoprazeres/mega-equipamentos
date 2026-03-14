import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';

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

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    selectedEquipmentIds: {
      type: 'array',
      minItems: 0,
      maxItems: 5,
      items: { type: 'integer' },
    },
    itemReasons: {
      type: 'array',
      minItems: 0,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          equipmentId: { type: 'integer' },
          reason: { type: 'string' },
        },
        required: ['equipmentId', 'reason'],
      },
    },
    followUpQuestion: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
    },
    showQuoteCta: { type: 'boolean' },
    whatsappPrefill: { type: 'string' },
  },
  required: [
    'answer',
    'selectedEquipmentIds',
    'itemReasons',
    'followUpQuestion',
    'showQuoteCta',
    'whatsappPrefill',
  ],
} as const;

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
  if (event.httpMethod !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const payload = parsePayload(event.body);

  if (!payload) {
    return jsonResponse({ error: 'Invalid request payload' }, 400);
  }

  const request = createConsultorRequest(payload.message, payload.history, payload.context);

  if (!request.message) {
    return jsonResponse({ error: 'Invalid request payload' }, 400);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return jsonResponse({ error: 'A chave da OpenAI não está configurada para o consultor.' }, 503);
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create(
      {
        model: process.env.OPENAI_MODEL || 'gpt-5-nano',
        instructions: DEVELOPER_PROMPT,
        reasoning: {
          effort: 'minimal',
        },
        input: [
          ...request.history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          {
            role: 'user' as const,
            content: JSON.stringify(buildConsultorAiPromptPayload(request)),
          },
        ],
        max_output_tokens: 1200,
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'consultor_mega_equipamentos',
            description:
              'Resposta estruturada do consultor virtual da Mega Equipamentos usando o catálogo completo.',
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      },
      { timeout: 15000 }
    );

    const parsedResponse = parseModelOutput(response.output_text);
    const normalizedResponse = normalizeConsultorResponse(parsedResponse, request);

    if (!normalizedResponse) {
      return jsonResponse({ error: 'A IA retornou uma resposta inválida.' }, 502);
    }

    return jsonResponse(normalizedResponse);
  } catch (error) {
    console.error('consultor-equipamentos function failed', error);
    return jsonResponse(
      { error: 'A IA ficou indisponível no momento. Tente novamente em instantes.' },
      502
    );
  }
};

function loadLocalEnvForDevelopment() {
  if (process.env.OPENAI_API_KEY) {
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

function jsonResponse(body: object, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}
