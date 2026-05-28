import {
  buildConsultorAiPromptPayload,
  buildConsultorAnswerSegments,
  buildConsultorRenderedText,
  createConsultorRequest,
  getConsultorCatalogItems,
  getEquipamentoById,
  isConsultorRequestPayload,
  MEGA_CONSULTOR_CONTEXT,
  normalizeConsultorResponse,
} from './consultor-equipamentos';

describe('consultor-equipamentos', () => {
  it('cria um request mínimo para o backend sem lead, confidence ou shortlist', () => {
    const request = createConsultorRequest('  Oi, meu nome é Thiago  ', [
      { role: 'assistant', content: '  Como posso ajudar?  ' },
    ]);

    expect(request).toEqual({
      message: 'Oi, meu nome é Thiago',
      history: [{ role: 'assistant', content: 'Como posso ajudar?' }],
      context: MEGA_CONSULTOR_CONTEXT,
    });
    expect('lead' in (request as object)).toBeFalse();
    expect('confidence' in (request as object)).toBeFalse();
    expect('shortlist' in (request as object)).toBeFalse();
  });

  it('valida o payload mínimo do consultor', () => {
    expect(
      isConsultorRequestPayload({
        message: 'Oi, meu nome é Thiago',
        history: [],
        context: MEGA_CONSULTOR_CONTEXT,
      })
    ).toBeTrue();

    expect(
      isConsultorRequestPayload({
        message: 'Oi',
        history: [],
      })
    ).toBeFalse();
  });

  it('monta o payload da OpenAI com o catálogo completo da Mega', () => {
    const request = createConsultorRequest(
      'Quero construir um campo de society em Caruaru.',
      [{ role: 'user', content: 'Oi' }]
    );
    const aiPayload = buildConsultorAiPromptPayload(request);

    expect(aiPayload.userMessage).toBe('Quero construir um campo de society em Caruaru.');
    expect(aiPayload.context).toEqual(MEGA_CONSULTOR_CONTEXT);
    expect(aiPayload.catalog.length).toBe(getConsultorCatalogItems().length);
    expect(aiPayload.catalog[0]).toEqual(
      jasmine.objectContaining({
        id: jasmine.any(Number),
        nome: jasmine.any(String),
        slug: jasmine.any(String),
        categoriaSlug: jasmine.any(String),
        categoriaNome: jasmine.any(String),
        descricao: jasmine.any(String),
        aplicacao: jasmine.any(String),
        tipoDeServico: jasmine.any(String),
      })
    );
  });

  it('normaliza uma resposta da IA sem equipamentos quando ela só está refinando a conversa', () => {
    const request = createConsultorRequest('Oi, meu nome é Thiago', []);
    const normalized = normalizeConsultorResponse(
      {
        answer: 'Oi, Thiago! Qual é a cidade da obra?',
        selectedEquipmentIds: [],
        itemReasons: [],
        followUpQuestion: 'Qual é a cidade da obra?',
        showQuoteCta: false,
        whatsappPrefill: 'Olá! Vim do consultor virtual da Mega Equipamentos.',
      },
      request
    );

    expect(normalized).not.toBeNull();
    expect(normalized!.source).toBe('ai');
    expect(normalized!.selectedEquipmentIds).toEqual([]);
    expect(normalized!.showQuoteCta).toBeFalse();
  });

  it('recupera todos os links inline para os equipamentos citados pela IA', () => {
    const request = createConsultorRequest(
      'Quero demolir um piso de concreto com agilidade em Caruaru. Meu nome é Thiago. 81997070825',
      []
    );
    const martelete30 = getConsultorCatalogItems().find(
      (item) => item.nome === 'Martelete Demolidor 30 kg'
    )!;
    const martelete16 = getConsultorCatalogItems().find((item) => item.nome === 'Martelete 16 kg')!;
    const martelete11 = getConsultorCatalogItems().find((item) => item.nome === 'Martelete 11 kg')!;
    const cortarPiso = getConsultorCatalogItems().find(
      (item) => item.nome === 'Máquina de Cortar Piso'
    )!;
    const normalized = normalizeConsultorResponse(
      {
        answer: `As opções mais indicadas aqui são ${martelete30.nome}, ${martelete16.nome}, ${martelete11.nome} e ${cortarPiso.nome}.`,
        selectedEquipmentIds: [martelete30.id, martelete16.id, cortarPiso.id, 9999],
        itemReasons: [
          { equipmentId: martelete30.id, reason: 'Entrega mais impacto na demolição pesada.' },
          { equipmentId: martelete16.id, reason: 'Ajuda nas áreas intermediárias.' },
          { equipmentId: cortarPiso.id, reason: 'Facilita os cortes de alívio.' },
        ],
        followUpQuestion: null,
        showQuoteCta: true,
        whatsappPrefill: 'Olá! Quero continuar o atendimento.',
      },
      request
    );

    expect(normalized).not.toBeNull();
    expect(normalized!.selectedEquipmentIds).toEqual([
      martelete30.id,
      martelete16.id,
      martelete11.id,
      cortarPiso.id,
    ]);

    const equipamentos = normalized!.selectedEquipmentIds
      .map((equipamentoId) => getEquipamentoById(equipamentoId))
      .filter((equipamento) => !!equipamento);
    const segments = buildConsultorAnswerSegments(normalized!.answer, equipamentos);

    expect(segments).toContain(
      jasmine.objectContaining({
        text: 'Martelete 11 kg',
        href: `/equipamentos/${getEquipamentoById(martelete11.id)!.equipamentoCategoria.slug}/${getEquipamentoById(martelete11.id)!.slug}`,
      })
    );
  });

  it('rejeita resposta inválida da OpenAI', () => {
    const request = createConsultorRequest('Oi', []);

    expect(
      normalizeConsultorResponse(
        {
          answer: 'Oi!',
        },
        request
      )
    ).toBeNull();
  });

  it('não duplica a pergunta quando a resposta já termina com uma pergunta', () => {
    const renderedText = buildConsultorRenderedText(
      'Oi, Thiago! Qual é a área aproximada que você vai pintar?',
      'Qual é a área aproximada que você vai pintar?'
    );

    expect(renderedText).toBe('Oi, Thiago! Qual é a área aproximada que você vai pintar?');
  });
});
