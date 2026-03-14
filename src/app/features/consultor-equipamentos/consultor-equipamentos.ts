import { equipamentosData } from '../../data/equipamentos-data';
import { Equipamento } from '../../interfaces/equipamento';
import {
  ConsultorAiPromptPayload,
  ConsultorAnswerSegment,
  ConsultorCatalogItem,
  ConsultorChatHistoryItem,
  ConsultorContext,
  ConsultorEquipamentosRequest,
  ConsultorEquipamentosResponse,
  ConsultorItemReason,
} from './consultor-equipamentos.types';

export const MEGA_WHATSAPP_PHONE = '5581985555943';

export const MEGA_CONSULTOR_CONTEXT: ConsultorContext = {
  businessName: 'Mega Equipamentos',
  city: 'Caruaru - PE',
  region: 'Caruaru e região',
  whatsappPhone: MEGA_WHATSAPP_PHONE,
  rentalPeriods: 'Diária, semanal, quinzenal e mensal',
};

export const CONSULTOR_INITIAL_MESSAGE =
  'Olá! Sou o consultor virtual da Mega Equipamentos. Me conte sobre a sua obra que eu vou te ajudar por aqui.';

const consultorCatalogItems = equipamentosData.map(mapEquipamentoToCatalogItem);
const consultorCatalogById = new Map(consultorCatalogItems.map((item) => [item.id, item] as const));
const equipamentosById = new Map(equipamentosData.map((equipamento) => [equipamento.id, equipamento] as const));

export function sanitizeHistory(
  history: ConsultorChatHistoryItem[],
  limit = 8
): ConsultorChatHistoryItem[] {
  return history
    .filter(
      (item) =>
        (item.role === 'assistant' || item.role === 'user') && typeof item.content === 'string'
    )
    .slice(-limit)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 1600),
    }))
    .filter((item) => item.content.length > 0);
}

export function createConsultorRequest(
  message: string,
  history: ConsultorChatHistoryItem[],
  context: ConsultorContext = MEGA_CONSULTOR_CONTEXT
): ConsultorEquipamentosRequest {
  return {
    message: message.trim().slice(0, 800),
    history: sanitizeHistory(history),
    context,
  };
}

export function isConsultorRequestPayload(value: unknown): value is ConsultorEquipamentosRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<ConsultorEquipamentosRequest>;
  const context = payload.context as Partial<ConsultorContext> | undefined;

  return (
    typeof payload.message === 'string' &&
    Array.isArray(payload.history) &&
    !!context &&
    typeof context.businessName === 'string' &&
    typeof context.city === 'string' &&
    typeof context.region === 'string' &&
    typeof context.whatsappPhone === 'string' &&
    typeof context.rentalPeriods === 'string'
  );
}

export function getConsultorCatalogItems(): ConsultorCatalogItem[] {
  return consultorCatalogItems.map((item) => ({ ...item }));
}

export function buildConsultorAiPromptPayload(
  request: ConsultorEquipamentosRequest
): ConsultorAiPromptPayload {
  return {
    context: request.context,
    userMessage: request.message,
    catalog: getConsultorCatalogItems(),
  };
}

export function getEquipamentoById(id: number): Equipamento | undefined {
  return equipamentosById.get(id);
}

export function normalizeConsultorResponse(
  candidate: Partial<ConsultorEquipamentosResponse>,
  request: ConsultorEquipamentosRequest
): ConsultorEquipamentosResponse | null {
  if (
    typeof candidate.answer !== 'string' ||
    !Array.isArray(candidate.selectedEquipmentIds) ||
    !Array.isArray(candidate.itemReasons)
  ) {
    return null;
  }

  const answer = sanitizeAnswer(candidate.answer);

  if (!answer) {
    return null;
  }

  const selectedEquipmentIds = normalizeSelectedEquipmentIds(candidate.selectedEquipmentIds, answer);
  const candidateItemReasons = candidate.itemReasons;
  const itemReasons = selectedEquipmentIds.map((equipmentId) => {
    const matchedReason = candidateItemReasons.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        Number((item as ConsultorItemReason).equipmentId) === equipmentId &&
        typeof (item as ConsultorItemReason).reason === 'string' &&
        (item as ConsultorItemReason).reason.trim()
    ) as ConsultorItemReason | undefined;

    return (
      matchedReason ?? {
        equipmentId,
        reason: buildFallbackItemReason(equipmentId),
      }
    );
  });

  const followUpQuestion =
    typeof candidate.followUpQuestion === 'string' && candidate.followUpQuestion.trim()
      ? candidate.followUpQuestion.trim()
      : null;
  const whatsappPrefill = normalizeWhatsAppPrefill(
    candidate.whatsappPrefill,
    request,
    selectedEquipmentIds
  );

  return {
    source: 'ai',
    answer,
    selectedEquipmentIds,
    itemReasons,
    followUpQuestion,
    showQuoteCta: Boolean(candidate.showQuoteCta) && selectedEquipmentIds.length > 0,
    whatsappPrefill,
  };
}

export function buildConsultorAnswerSegments(
  answer: string,
  equipamentos: Equipamento[]
): ConsultorAnswerSegment[] {
  if (!equipamentos.length) {
    return compactAnswerSegments([{ text: answer }]);
  }

  const matches: Array<{ start: number; end: number; equipamento: Equipamento }> = [];

  for (const equipamento of [...equipamentos].sort((left, right) => right.nome.length - left.nome.length)) {
    const expression = new RegExp(escapeRegExp(equipamento.nome), 'gi');
    let match: RegExpExecArray | null;

    while ((match = expression.exec(answer)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        equipamento,
      });

      if (match.index === expression.lastIndex) {
        expression.lastIndex += 1;
      }
    }
  }

  matches.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    return right.end - right.start - (left.end - left.start);
  });

  const accepted: typeof matches = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor) {
      continue;
    }

    accepted.push(match);
    cursor = match.end;
  }

  const segments: ConsultorAnswerSegment[] = [];
  let textCursor = 0;

  for (const match of accepted) {
    if (textCursor < match.start) {
      segments.push({ text: answer.slice(textCursor, match.start) });
    }

    segments.push({
      text: answer.slice(match.start, match.end),
      href: buildEquipmentHref(match.equipamento),
    });
    textCursor = match.end;
  }

  if (textCursor < answer.length) {
    segments.push({ text: answer.slice(textCursor) });
  }

  return compactAnswerSegments(segments);
}

export function buildConsultorRenderedText(
  answer: string,
  followUpQuestion: string | null
): string {
  if (!followUpQuestion) {
    return answer;
  }

  const normalizedAnswer = normalizeText(answer);
  const normalizedFollowUp = normalizeText(followUpQuestion);

  if (!normalizedFollowUp) {
    return answer;
  }

  if (normalizedAnswer.includes(normalizedFollowUp) || answer.includes('?')) {
    return answer;
  }

  return `${answer}\n\n${followUpQuestion}`;
}

export function buildWhatsAppHref(message: string): string {
  return `https://wa.me/${MEGA_WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapEquipamentoToCatalogItem(equipamento: Equipamento): ConsultorCatalogItem {
  return {
    id: equipamento.id,
    nome: equipamento.nome,
    slug: equipamento.slug,
    categoriaSlug: equipamento.equipamentoCategoria.slug,
    categoriaNome: equipamento.equipamentoCategoria.nome,
    descricao: equipamento.descricao,
    aplicacao: equipamento.aplicacao,
    tipoDeServico: equipamento.tipoDeServico,
  };
}

function normalizeSelectedEquipmentIds(selectedEquipmentIds: number[], answer: string): number[] {
  const validSelectedIds = Array.from(
    new Set(
      selectedEquipmentIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && consultorCatalogById.has(id))
    )
  );
  const mentionedIds = getMentionedEquipmentIdsInText(answer);

  return mergeEquipmentIds(mentionedIds, validSelectedIds).slice(0, 5);
}

function getMentionedEquipmentIdsInText(answer: string): number[] {
  const matches: Array<{ equipmentId: number; start: number; end: number }> = [];

  for (const item of [...consultorCatalogItems].sort((left, right) => right.nome.length - left.nome.length)) {
    const expression = new RegExp(escapeRegExp(item.nome), 'gi');
    let match: RegExpExecArray | null;

    while ((match = expression.exec(answer)) !== null) {
      matches.push({
        equipmentId: item.id,
        start: match.index,
        end: match.index + match[0].length,
      });

      if (match.index === expression.lastIndex) {
        expression.lastIndex += 1;
      }
    }
  }

  matches.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    return right.end - right.start - (left.end - left.start);
  });

  const accepted: typeof matches = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor) {
      continue;
    }

    accepted.push(match);
    cursor = match.end;
  }

  return Array.from(new Set(accepted.map((match) => match.equipmentId)));
}

function mergeEquipmentIds(primary: number[], secondary: number[]): number[] {
  const merged: number[] = [];
  const seen = new Set<number>();

  for (const equipmentId of [...primary, ...secondary]) {
    if (seen.has(equipmentId)) {
      continue;
    }

    seen.add(equipmentId);
    merged.push(equipmentId);
  }

  return merged;
}

function buildFallbackItemReason(equipmentId: number): string {
  const catalogItem = consultorCatalogById.get(equipmentId);

  if (!catalogItem) {
    return 'Item citado na resposta.';
  }

  return `Indicado para ${lowercaseFirst(catalogItem.aplicacao).replace(/\.$/, '')}.`;
}

function normalizeWhatsAppPrefill(
  value: unknown,
  request: ConsultorEquipamentosRequest,
  selectedEquipmentIds: number[]
): string {
  if (typeof value === 'string' && value.trim()) {
    return value.trim().slice(0, 1000);
  }

  return buildDefaultWhatsAppPrefill(request, selectedEquipmentIds);
}

function buildDefaultWhatsAppPrefill(
  request: ConsultorEquipamentosRequest,
  selectedEquipmentIds: number[]
): string {
  const selectedNames = selectedEquipmentIds
    .map((equipmentId) => consultorCatalogById.get(equipmentId)?.nome)
    .filter((name): name is string => !!name);
  const intro = 'Olá! Vim do consultor virtual da Mega Equipamentos.';
  const need = request.message ? ` Minha necessidade: ${request.message}.` : '';
  const items = selectedNames.length
    ? ` Itens sugeridos: ${formatHumanList(selectedNames)}.`
    : '';

  return `${intro}${need}${items}`.trim();
}

function sanitizeAnswer(value: string): string {
  return value
    .replace(/<\/?br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\bselectedequipmentids\b/gi, '')
    .replace(/\bitemreasons\b/gi, '')
    .replace(/\bshortlist\b/gi, 'catálogo')
    .replace(/\blead\.stage\b/gi, 'atendimento')
    .replace(/\bpayload\b/gi, 'mensagem')
    .replace(/\(\s*id\s*\d+\s*\)/gi, '')
    .replace(/\bid\s*\d+\b/gi, '')
    .replace(/\s+\./g, '.')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function compactAnswerSegments(segments: ConsultorAnswerSegment[]): ConsultorAnswerSegment[] {
  const compacted: ConsultorAnswerSegment[] = [];

  for (const segment of segments) {
    if (!segment.text) {
      continue;
    }

    const previous = compacted[compacted.length - 1];

    if (!segment.href && previous && !previous.href) {
      previous.text += segment.text;
      continue;
    }

    compacted.push({ ...segment });
  }

  return compacted;
}

function buildEquipmentHref(equipamento: Equipamento): string {
  return `/equipamentos/${equipamento.equipamentoCategoria.slug}/${equipamento.slug}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lowercaseFirst(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function formatHumanList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }

  if (items.length === 2) {
    return `${items[0]} e ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}
