import { CommonModule } from '@angular/common';
import { afterNextRender, Component, ElementRef, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, MessageCircleMore, SendHorizontal, Sparkles } from 'lucide-angular';

import {
  buildConsultorAnswerSegments,
  buildConsultorRenderedText,
  buildWhatsAppHref,
  createConsultorRequest,
} from '../../features/consultor-equipamentos/consultor-equipamentos';
import type {
  ConsultorAnswerSegment,
  ConsultorChatHistoryItem,
  ConsultorEquipamentosRequest,
  ConsultorEquipamentosResponse,
} from '../../features/consultor-equipamentos/consultor-equipamentos.types';
import { Equipamento } from '../../interfaces/equipamento';
import { CatalogService } from '../../services/catalog.service';
import { equipamentosData } from '../../data/equipamentos-data';

interface ChatTurn {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  pending?: boolean;
  source?: 'ai';
  error?: boolean;
  followUpQuestion?: string | null;
  showQuoteCta?: boolean;
  whatsappHref?: string;
  segments?: ConsultorAnswerSegment[];
}

@Component({
  selector: 'app-consultor-virtual',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './consultor-virtual.html',
  styleUrl: './consultor-virtual.css',
})
export class ConsultorVirtualPage {
  @ViewChild('chatScroller') private chatScroller?: ElementRef<HTMLDivElement>;

  protected readonly Sparkles = Sparkles;
  protected readonly MessageCircleMore = MessageCircleMore;
  protected readonly SendHorizontal = SendHorizontal;

  protected readonly quickPrompts = [
    'Preciso concretar uma laje e apoiar as formas.',
    'Vou fazer pintura em fachada e preciso trabalhar em altura.',
    'Quero demolir um piso de concreto com agilidade.',
    'Preciso de energia provisória para a obra.',
  ];

  protected readonly draft = signal('');
  protected readonly isSending = signal(false);
  protected readonly networkNotice = signal<string | null>(null);
  protected readonly messages = signal<ChatTurn[]>([]);
  private equipamentosById = new Map<number, Equipamento>(
    equipamentosData.map((equipamento) => [equipamento.id, equipamento])
  );

  constructor(private readonly catalogService: CatalogService) {
    afterNextRender(() => {
      void this.refreshCatalog();
    });
  }

  private async refreshCatalog() {
    const equipamentos = await this.catalogService.listEquipments();
    this.equipamentosById = new Map(
      equipamentos.map((equipamento) => [equipamento.id, equipamento])
    );
  }

  protected onDraftInput(value: string) {
    this.draft.set(value);
  }

  protected onComposerKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendMessage();
    }
  }

  protected async useQuickPrompt(prompt: string) {
    await this.sendMessage(prompt);
  }

  protected async onSubmit(event: SubmitEvent) {
    event.preventDefault();
    await this.sendMessage();
  }

  protected contentSegments(message: ChatTurn): ConsultorAnswerSegment[] {
    return message.segments ?? [{ text: message.text }];
  }

  protected trackByTurn(_: number, turn: ChatTurn) {
    return turn.id;
  }

  protected trackBySegment(index: number, segment: ConsultorAnswerSegment) {
    return `${segment.href ?? 'text'}-${index}-${segment.text}`;
  }

  private async sendMessage(prefilledMessage?: string) {
    const content = (prefilledMessage ?? this.draft()).trim();

    if (!content || this.isSending()) {
      return;
    }

    const request = createConsultorRequest(content, this.buildHistory());
    const userTurn: ChatTurn = {
      id: this.createTurnId('user'),
      role: 'user',
      text: content,
    };
    const loadingId = this.createTurnId('assistant');
    const loadingTurn: ChatTurn = {
      id: loadingId,
      role: 'assistant',
      text: 'Entendendo sua necessidade...',
      pending: true,
    };

    this.networkNotice.set(null);
    this.draft.set('');
    this.messages.update((messages) => [...messages, userTurn, loadingTurn]);
    this.isSending.set(true);
    this.scrollToBottom();

    let assistantTurn: ChatTurn;

    try {
      const response = await this.fetchConsultorResponse(request);
      assistantTurn = this.createAssistantTurn(loadingId, response);
    } catch (error) {
      console.error('consultor response failed', error);
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'A IA ficou indisponível no momento. Tente novamente em instantes.';
      this.networkNotice.set(errorMessage);
      assistantTurn = this.createErrorTurn(loadingId, errorMessage);
    } finally {
      this.isSending.set(false);
    }

    this.messages.update((messages) =>
      messages.map((message) => (message.id === loadingId ? assistantTurn : message))
    );
    this.scrollToBottom();
  }

  private buildHistory(): ConsultorChatHistoryItem[] {
    return this.messages()
      .filter((message) => !message.pending && !message.error)
      .map((message) => ({
        role: message.role,
        content:
          message.role === 'assistant' && message.followUpQuestion
            ? buildConsultorRenderedText(message.text, message.followUpQuestion)
            : message.text,
      }));
  }

  private async fetchConsultorResponse(
    payload: ConsultorEquipamentosRequest
  ): Promise<ConsultorEquipamentosResponse> {
    const response = await fetch('/.netlify/functions/consultor-equipamentos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(
        typeof errorPayload?.error === 'string' && errorPayload.error.trim()
          ? errorPayload.error.trim()
          : 'A IA ficou indisponível no momento. Tente novamente em instantes.'
      );
    }

    const data = (await response.json()) as Partial<ConsultorEquipamentosResponse>;

    if (
      data.source !== 'ai' ||
      typeof data.answer !== 'string' ||
      !Array.isArray(data.selectedEquipmentIds)
    ) {
      throw new Error('Invalid consultor response');
    }

    return data as ConsultorEquipamentosResponse;
  }

  private createAssistantTurn(
    id: string,
    response: ConsultorEquipamentosResponse
  ): ChatTurn {
    const equipamentos = response.selectedEquipmentIds
      .map((equipamentoId) => this.equipamentosById.get(equipamentoId))
      .filter((equipamento): equipamento is Equipamento => !!equipamento);
    const renderedText = buildConsultorRenderedText(response.answer, response.followUpQuestion);

    return {
      id,
      role: 'assistant',
      text: response.answer,
      source: response.source,
      followUpQuestion: response.followUpQuestion,
      showQuoteCta: response.showQuoteCta,
      whatsappHref: buildWhatsAppHref(response.whatsappPrefill),
      segments: buildConsultorAnswerSegments(renderedText, equipamentos),
    };
  }

  private createErrorTurn(id: string, errorMessage: string): ChatTurn {
    return {
      id,
      role: 'assistant',
      text: errorMessage,
      error: true,
      segments: [{ text: errorMessage }],
    };
  }

  private scrollToBottom() {
    requestAnimationFrame(() => {
      const container = this.chatScroller?.nativeElement;

      if (!container) {
        return;
      }

      container.scrollTop = container.scrollHeight;
    });
  }

  private createTurnId(prefix: 'assistant' | 'user') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
