export type ConsultorChatRole = 'assistant' | 'user';

export interface ConsultorChatHistoryItem {
  role: ConsultorChatRole;
  content: string;
}

export interface ConsultorContext {
  businessName: string;
  city: string;
  region: string;
  whatsappPhone: string;
  rentalPeriods: string;
}

export interface ConsultorCatalogItem {
  id: number;
  nome: string;
  slug: string;
  categoriaSlug: string;
  categoriaNome: string;
  descricao: string;
  aplicacao: string;
  tipoDeServico: string;
}

export interface ConsultorAiPromptPayload {
  context: ConsultorContext;
  userMessage: string;
  catalog: ConsultorCatalogItem[];
}

export interface ConsultorEquipamentosRequest {
  message: string;
  history: ConsultorChatHistoryItem[];
  context: ConsultorContext;
}

export interface ConsultorItemReason {
  equipmentId: number;
  reason: string;
}

export interface ConsultorEquipamentosResponse {
  source: 'ai';
  answer: string;
  selectedEquipmentIds: number[];
  itemReasons: ConsultorItemReason[];
  followUpQuestion: string | null;
  showQuoteCta: boolean;
  whatsappPrefill: string;
}

export interface ConsultorAnswerSegment {
  text: string;
  href?: string;
}
