export const categoryCoverConfig = [
  {
    slug: 'acesso-e-elevacao',
    primaryEquipmentSlug: 'guincho-de-coluna-400-kg',
    supportEquipmentSlugs: ['escada-de-extensao', 'talha-manual-1t'],
    humanSceneBrief: 'Fachada de obra em andamento com uso real de acesso vertical.',
    humanActionBrief:
      'Operador conduzindo o içamento de material com o guincho enquanto a equipe apoia a atividade em altura.',
    ppeBrief: 'capacete, luvas, botas e cinto quando houver trabalho em altura',
    allowHumanPresence: true,
    brandingMode: 'none',
  },
  {
    slug: 'andaimes',
    primaryEquipmentSlug: 'painel-de-andaime-1-00-x-1-50-m',
    supportEquipmentSlugs: ['plataforma-metalica', 'guarda-corpo-com-sem-porta'],
    humanSceneBrief: 'Fachada com equipe trabalhando em altura em situação real de uso.',
    humanActionBrief:
      'Profissional executando pintura ou acabamento sobre estrutura de andaime montada e segura.',
    ppeBrief: 'capacete, luvas, botas e cinto de seguranca',
    allowHumanPresence: true,
    brandingMode: 'none',
  },
  {
    slug: 'escoramento-de-estruturas',
    primaryEquipmentSlug: 'escora-metalica-3-20-m',
    supportEquipmentSlugs: ['forcado-simples-duplo', 'vigas-metalicas-1-3-m-2-m-3-m'],
    humanSceneBrief: 'Laje em preparacao para concretagem com equipe ajustando o escoramento.',
    humanActionBrief:
      'Equipe posicionando e regulando escoras metalicas sob a estrutura, com atividade real de apoio de laje.',
    ppeBrief: 'capacete, luvas, botas e uniforme de obra',
    allowHumanPresence: true,
    brandingMode: 'none',
  },
  {
    slug: 'compactacao-e-solo',
    primaryEquipmentSlug: 'compactador-de-solo-sapo',
    supportEquipmentSlugs: ['placa-vibratoria'],
    humanSceneBrief: 'Preparacao de base e compactacao de solo em canteiro real.',
    humanActionBrief:
      'Operador usando o compactador sapo em solo de obra, com ritmo de trabalho real e postura natural.',
    ppeBrief: 'capacete, luvas, botas e protetor auricular',
    allowHumanPresence: true,
    brandingMode: 'none',
  },
  {
    slug: 'concretagem',
    primaryEquipmentSlug: 'vibrador-de-concreto',
    supportEquipmentSlugs: ['betoneira-200-400-l'],
    humanSceneBrief: 'Concretagem ativa de piso ou laje em ambiente de obra.',
    humanActionBrief:
      'Profissional operando o vibrador de concreto durante o adensamento, com a betoneira apenas como apoio de contexto.',
    ppeBrief: 'capacete, luvas, botas e uniforme de obra',
    allowHumanPresence: true,
    brandingMode: 'none',
  },
  {
    slug: 'corte-e-demolicao',
    primaryEquipmentSlug: 'martelete-demolidor-30-kg',
    supportEquipmentSlugs: ['maquina-de-cortar-piso', 'martelete-11-kg'],
    humanSceneBrief: 'Reforma estrutural com demolicao controlada em concreto e alvenaria.',
    humanActionBrief:
      'Operador usando o martelete em demoliciao real, com poeira moderada e contexto comercial limpo.',
    ppeBrief: 'capacete, luvas, botas, oculos e protetor auricular',
    allowHumanPresence: true,
    brandingMode: 'none',
  },
  {
    slug: 'ferramentas-eletricas',
    primaryEquipmentSlug: 'furadeira-e-parafusadeira',
    supportEquipmentSlugs: ['nivel-a-laser', 'serra-circular'],
    humanSceneBrief: 'Instalacao e acabamento em obra ou reforma profissional.',
    humanActionBrief:
      'Operador usando a furadeira/parafusadeira em aplicacao real, com o nivel a laser como apoio de medicao.',
    ppeBrief: 'capacete, luvas, botas e oculos de protecao',
    allowHumanPresence: true,
    brandingMode: 'none',
  },
  {
    slug: 'motores-e-geradores',
    primaryEquipmentSlug: 'gerador-5-kva-monofasico',
    supportEquipmentSlugs: ['compressor-de-ar-50-l', 'bomba-submersa-de-agua-suja-com-mangotes'],
    humanSceneBrief: 'Apoio operacional de obra com energia e equipamentos em uso.',
    humanActionBrief:
      'Operador monitorando ou acionando o gerador em canteiro real, com uso evidente e natural.',
    ppeBrief: 'capacete, luvas, botas e uniforme de obra',
    allowHumanPresence: true,
    brandingMode: 'none',
  },
  {
    slug: 'reboque-e-transporte',
    primaryEquipmentSlug: 'reboque-1-60-x-3-00-m-1-eixo',
    supportEquipmentSlugs: ['reboque-1-20-x-1-80-m-1-eixo'],
    humanSceneBrief: 'Logistica de obra com carga, descarga e transporte de equipamentos.',
    humanActionBrief:
      'Equipe movimentando carga com o reboque em uso real, com sensacao de operacao de frota propria.',
    ppeBrief: 'capacete, luvas, botas e colete',
    allowHumanPresence: true,
    brandingMode: 'mega-decal',
    brandingTarget: 'painel lateral ou tampa traseira do reboque',
  },
  {
    slug: 'diversos',
    primaryEquipmentSlug: 'container-almoxarifado-1-50-x-3-00-x-2-00-m',
    supportEquipmentSlugs: ['banheiro-de-obra-modulo-sanitario'],
    humanSceneBrief: 'Area de apoio de canteiro com organizacao, acesso e uso real do equipamento.',
    humanActionBrief:
      'Trabalhador acessando ou organizando materiais no container/modulo de apoio em uso cotidiano de obra.',
    ppeBrief: 'capacete, luvas, botas e uniforme de obra',
    allowHumanPresence: true,
    brandingMode: 'mega-decal',
    brandingTarget: 'lateral principal do container ou modulo de apoio',
  },
];

export const categoryCoverConfigBySlug = new Map(
  categoryCoverConfig.map((category) => [category.slug, category]),
);
