import { Equipamento } from '../interfaces/equipamento';
import { EquipamentosCategoriasId } from '../enums/equipamentos-categorias-id';
import { equipamentosCategoriasData } from './equipamentos-categorias-data';

export const equipamentosData: Equipamento[] = [
  {
    id: 1,
    nome: 'Guincho de Coluna 400 kg',
    slug: 'guincho-de-coluna-400-kg',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/guincho-de-coluna-02.jpg',
    descricao:
      'Guincho elétrico de coluna para içamento vertical de materiais até 400 kg. Leve, resistente e de fácil montagem em lajes e estruturas.',
    aplicacao: 'Construção civil, reformas, estruturas metálicas.',
    tipoDeServico: 'Içamento de materiais, alvenaria, concretagem.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Instalação rápida • Baixo consumo • Operação segura',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Acesso_e_Elevacao
    )!,
  },
  {
    id: 2,
    nome: 'Escada de Extensão',
    slug: 'escada-de-extensao',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/escada-de-extensao.jpg',
    descricao:
      'Escada telescópica de alumínio para acesso em altura, com travas de segurança e pés antiderrapantes.',
    aplicacao: 'Pintura, elétrica, manutenção predial, instalações em fachada.',
    tipoDeServico: 'Acesso e mobilidade vertical.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Leve e durável • Altura ajustável • Transporte fácil',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Acesso_e_Elevacao
    )!,
  },
  {
    id: 3,
    nome: 'Talha Manual 1T',
    slug: 'talha-manual-1t',
    avatar:
      'https://casadoconstrutor.com.br/sites/default/files/2024-05/talha-manual-1-tonelada.jpg',
    descricao: 'Talha de corrente com capacidade de 1 tonelada para elevação precisa de cargas.',
    aplicacao: 'Serralheria, estruturas metálicas, montagens industriais.',
    tipoDeServico: 'Elevação e posicionamento de cargas.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Robustez • Baixa manutenção • Operação simples',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Acesso_e_Elevacao
    )!,
  },
  {
    id: 4,
    nome: 'Painel de Andaime 1,00 × 1,50 m',
    slug: 'painel-de-andaime-1-00-x-1-50-m',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/andaime-05%20%281%29.jpg',
    descricao:
      'Painel tubular em aço para montagem de torres e fachadas; pintura protetiva e encaixe rápido.',
    aplicacao: 'Fachadas, pintura, reboco, manutenção.',
    tipoDeServico: 'Acesso e plataformas de trabalho.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta resistência • Padrão Mega • Montagem ágil',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Andaimes
    )!,
  },
  {
    id: 5,
    nome: 'Painel de Andaime 1,00 × 1,00 m',
    slug: 'painel-de-andaime-1-00-x-1-00-m',
    avatar:
      'https://galpaodalocacao.com.br/wp-content/webp-express/webp-images/uploads/2023/11/andaime.png.webp',
    descricao:
      'Painel modular compacto para áreas com restrição de espaço/altura, compatível com toda a linha.',
    aplicacao: 'Obras internas, corredores, fachadas menores.',
    tipoDeServico: 'Acesso em espaços reduzidos.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Versátil • Leve • Compatível com plataformas e barras',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Andaimes
    )!,
  },
  {
    id: 6,
    nome: 'Plataforma Metálica',
    slug: 'plataforma-metalica',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2025-04/Andaime-Retr%C3%A1til.jpg',
    descricao: 'Piso metálico antiderrapante para circulação segura nas torres de andaime.',
    aplicacao: 'Serviços em altura, pintura, acabamento.',
    tipoDeServico: 'Apoio e circulação.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Antiderrapante • Encaixe firme • Alta durabilidade',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Andaimes
    )!,
  },
  {
    id: 7,
    nome: 'Barra Diagonal',
    slug: 'barra-diagonal',
    avatar:
      'https://galpaodalocacao.com.br/wp-content/webp-express/webp-images/uploads/2023/11/destaque-1.jpg.webp',
    descricao: 'Travamento estrutural para garantir rigidez e segurança das torres.',
    aplicacao: 'Torres e fachadas de andaime.',
    tipoDeServico: 'Reforço estrutural.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Galvanizada • Instalação rápida • Estabilidade',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Andaimes
    )!,
  },
  {
    id: 8,
    nome: 'Sapata Fixa',
    slug: 'sapata-fixa',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/sapata-fixa.jpg',
    descricao: 'Base de apoio para pisos nivelados, garantindo estabilidade do conjunto.',
    aplicacao: 'Pisos regulares e ambientes internos.',
    tipoDeServico: 'Apoio e sustentação.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Apoio firme • Proteção anticorrosiva • Compatibilidade total',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Andaimes
    )!,
  },
  {
    id: 9,
    nome: 'Sapata Ajustável',
    slug: 'sapata-ajustavel',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/sapata-ajustavel.jpg',
    descricao: 'Base com rosca para nivelamento em pisos irregulares.',
    aplicacao: 'Externas e terrenos desnivelados.',
    tipoDeServico: 'Apoio nivelador.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Ajuste preciso • Rosca reforçada • Produção própria',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Andaimes
    )!,
  },
  {
    id: 10,
    nome: 'Guarda-Corpo (com/sem porta)',
    slug: 'guarda-corpo-com-sem-porta',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/guarda-corpo.jpg',
    descricao: 'Proteção lateral para plataformas; opção com porta de acesso.',
    aplicacao: 'Fachadas e serviços verticais.',
    tipoDeServico: 'Proteção coletiva NR-18.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Travamento reforçado • Instalação fácil • Segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Andaimes
    )!,
  },
  {
    id: 11,
    nome: 'Rodízio para Andaime',
    slug: 'rodizio-para-andaime',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/rodizio.jpg',
    descricao: 'Roda com trava dupla acoplada à base para movimentação segura.',
    aplicacao: 'Obras internas, manutenção e pintura.',
    tipoDeServico: 'Mobilidade de torres.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Rodas reforçadas • Travamento eficiente • Para pisos lisos',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Andaimes
    )!,
  },
  {
    id: 12,
    nome: 'Escada de Andaime',
    slug: 'escada-de-andaime',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/escada-para-andaime.jpg',
    descricao:
      'Módulo de acesso com degraus antiderrapantes; opção com alçapão para passagem entre níveis.',
    aplicacao: 'Montagens de fachada, manutenção e pintura.',
    tipoDeServico: 'Acesso entre plataformas.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Compatível 1,00×1,50 e 1,00×1,00 • Alto grip • Estrutura robusta',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Andaimes
    )!,
  },
  {
    id: 13,
    nome: 'Escora Metálica 3,20 m',
    slug: 'escora-metalica-3-20-m',
    avatar: '/imagens/equipamentos/Escoramento_de_Estruturas/escora-metalica-3-20-m.jpeg',
    descricao:
      'Escora regulável até 3,20 m, com rosca de ajuste e trava de segurança, para lajes e vigas de pequeno/médio porte.',
    aplicacao: 'Concretagem e reformas estruturais.',
    tipoDeServico: 'Escoramento temporário.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Ajuste preciso • Alta capacidade • Produção própria',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Escoramento_de_Estruturas
    )!,
  },
  {
    id: 14,
    nome: 'Escora Metálica 4,50 m',
    slug: 'escora-metalica-4-50-m',
    avatar:
      'https://casadoconstrutor.com.br/sites/default/files/2024-05/escora-metalica-aplicacao.jpg',
    descricao: 'Escora regulável para grandes alturas (até 4,50 m) com reforço estrutural.',
    aplicacao: 'Galpões, mezaninos, edifícios com pé-direito alto.',
    tipoDeServico: 'Escoramento em grande altura.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Estrutura reforçada • Ampla regulagem • Pintura protetiva',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Escoramento_de_Estruturas
    )!,
  },
  {
    id: 15,
    nome: 'Forcado Simples/Duplo',
    slug: 'forcado-simples-duplo',
    avatar: '/imagens/equipamentos/Escoramento_de_Estruturas/forcado-simples-duplo.jpeg',
    descricao: 'Apoio superior para escoras, garantindo encaixe seguro de vigas.',
    aplicacao: 'Lajes, formas e vigas metálicas.',
    tipoDeServico: 'Apoio e sustentação de formas.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Encaixe rápido • Aço de alta resistência • Compatível com toda a linha',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Escoramento_de_Estruturas
    )!,
  },
  {
    id: 16,
    nome: 'Vigas Metálicas 1,3 m / 2 m / 3 m',
    slug: 'vigas-metalicas-1-3-m-2-m-3-m',
    avatar: 'https://www.c3equipamentos.com.br/images/Produtos/Fotos/esc-vig-mist-1.JPG',
    descricao: 'Vigas de apoio para formas e lajes, em comprimentos variados.',
    aplicacao: 'Concretagem e estruturas temporárias.',
    tipoDeServico: 'Apoio estrutural e travamento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rigidez • Acabamento protetivo • Modularidade',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Escoramento_de_Estruturas
    )!,
  },
  {
    id: 17,
    nome: 'Barra de Ancoragem e Travamento',
    slug: 'barra-de-ancoragem-e-travamento',
    avatar:
      'https://coplas.com.br/wp-content/uploads/2023/12/barra-de-ancoragem-e-porca-flangelada-Varao-Roscado-porca-Coplas-Produto.png',
    descricao: 'Sistema de barras/porcas para fixação e travamento de formas em vigas e pilares.',
    aplicacao: 'Concreto armado, pilares e painéis de forma.',
    tipoDeServico: 'Travamento e fixação estrutural.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Resistência à pressão • Alinhamento preciso • Montagem rápida',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Escoramento_de_Estruturas
    )!,
  },
  {
    id: 18,
    nome: 'Compactador de Solo (Sapo)',
    slug: 'compactador-de-solo-sapo',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/compactador-de-solo02.jpg',
    descricao:
      'Compactador de percussão para valas, fundações e áreas confinadas; motor de alto rendimento.',
    aplicacao: 'Solo argiloso, bases de calçadas e fundações.',
    tipoDeServico: 'Preparação e nivelamento de solo.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta densidade • Robusto • Ideal para áreas de difícil acesso',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Compactacao_e_Solo
    )!,
  },
  {
    id: 19,
    nome: 'Placa Vibratória',
    slug: 'placa-vibratoria',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/placa-vibratoria02.jpg',
    descricao: 'Compactação de solos granulares, areia e brita, com acabamento uniforme.',
    aplicacao: 'Bases de pisos, calçadas, lajes e pavers.',
    tipoDeServico: 'Acabamento e nivelamento de superfícies.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Compactação homogênea • Operação simples • Baixo consumo',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Compactacao_e_Solo
    )!,
  },
  {
    id: 20,
    nome: 'Betoneira (200–400 L)',
    slug: 'betoneira-200-400-l',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/betoneira.jpg',
    descricao:
      'Betoneira de mistura de concreto, argamassa e reboco; tambor basculante resistente e motor potente.',
    aplicacao: 'Obras de pequeno a grande porte.',
    tipoDeServico: 'Mistura e adensamento do concreto.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta capacidade • Robusto • Produção rápida',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Concretagem
    )!,
  },
  {
    id: 21,
    nome: 'Vibrador de Concreto',
    slug: 'vibrador-de-concreto',
    avatar:
      'https://casadoconstrutor.com.br/sites/default/files/2024-05/vibrador-para-concreto.jpg',
    descricao:
      'Vibrador de concreto para adensamento do concreto recém-lançado, eliminando bolhas de ar e aumentando a resistência.',
    aplicacao: 'Lajes, pilares, vigas, sapatas.',
    tipoDeServico: 'Adensamento e estruturação de fundações.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta eficiência • Reduz falhas • Modelos elétrico/combustão',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Concretagem
    )!,
  },
  {
    id: 26,
    nome: 'Máquina de Cortar Piso',
    slug: 'maquina-de-cortar-piso',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/cortadora-de-piso02.jpg',
    descricao: 'Corte linear em concreto/asfalto com disco diamantado.',
    aplicacao: 'Obras civis e serralheria.',
    tipoDeServico: 'Corte, desbaste e polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Corte limpo • Alta rotação • Fácil de operar',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Corte_e_Demolicao
    )!,
  },
  {
    id: 22,
    nome: 'Martelete Demolidor 30 kg',
    slug: 'martelete-demolidor-30-kg',
    avatar:
      'https://casadoconstrutor.com.br/sites/default/files/2024-05/martelo-demolidor-30-kg-02.jpg',
    descricao: 'Martelete de alto impacto para demolições pesadas de concreto e pavimentos.',
    aplicacao: 'Fundações, blocos e pisos industriais.',
    tipoDeServico: 'Demolição pesada.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Potência elevada • Punhos antivibração • Alta confiabilidade',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Corte_e_Demolicao
    )!,
  },
  {
    id: 29,
    nome: 'Martelete 16 kg',
    slug: 'martelete-16-kg',
    avatar:
      'https://casadoconstrutor.com.br/sites/default/files/2024-05/martelo-demolidor-16-kg-02.jpg',
    descricao: 'Potente e resistente para concreto espesso e fundações.',
    aplicacao: 'Lajes espessas e bases de concreto.',
    tipoDeServico: 'Demolição estrutural.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Durabilidade • Alta força • Desempenho superior',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Corte_e_Demolicao
    )!,
  },
  {
    id: 28,
    nome: 'Martelete 11 kg',
    slug: 'martelete-11-kg',
    avatar:
      'https://casadoconstrutor.com.br/sites/default/files/2024-05/martelete-rompedor-5-kg-02.jpg',
    descricao: 'Alto poder de impacto para demolições médias/pesadas em concreto.',
    aplicacao: 'Fundações, blocos e pisos industriais.',
    tipoDeServico: 'Demolição pesada.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Potência equilibrada • Ergonômico • Confiável',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Corte_e_Demolicao
    )!,
  },
  {
    id: 23,
    nome: 'Martelete 6 kg',
    slug: 'martelete-6-kg',
    avatar:
      'https://casadoconstrutor.com.br/sites/default/files/2024-05/martelete-perfurador-4-kg-02.jpg',
    descricao: 'Martelete para perfurações e demolições leves/médias; leve e versátil.',
    aplicacao: 'Paredes, pisos e revestimentos.',
    tipoDeServico: 'Reforma e perfuração.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Compacto • Precisão • Menor fadiga do operador',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Corte_e_Demolicao
    )!,
  },
  {
    id: 27,
    nome: 'Martelete 2,5 kg',
    slug: 'martelete-2-5-kg',
    avatar:
      'https://casadoconstrutor.com.br/sites/default/files/2024-05/martelete-perfurador-2-kg-02.jpg',
    descricao: 'Leve e versátil para pequenos serviços e perfurações em alvenaria.',
    aplicacao: 'Reparos e demolições leves.',
    tipoDeServico: 'Reforma e acabamento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Leveza • Precisão • Fácil operação',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Corte_e_Demolicao
    )!,
  },
  {
    id: 24,
    nome: 'Serra Mármore',
    slug: 'serra-marme',
    avatar:
      'https://static.odani.com.br/public/odaniferramentas/imagens/produtos/serra-marmore-profissional-4-3-8-1200w-m0400b-127v-industrial-makita-6581e6ebc6f1f.jpg',
    descricao: 'Corte, desbaste e acabamento em metal, concreto e pedra.',
    aplicacao: 'Obras civis e serralheria.',
    tipoDeServico: 'Corte, desbaste e polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Corte limpo • Alta rotação • Fácil de operar',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 25,
    nome: 'Esmerilhadeira',
    slug: 'esmerilhadeira',
    avatar:
      'https://ferramentasgerais.vteximg.com.br/arquivos/ids/1005546/Esmerilhadeira-angular-9-2800-W-220-V~-GWS-30-230-PB-BOSCH---0-601-8G1-1E0---BOSCH.jpg?v=638929366891870000',
    descricao: 'Corte, desbaste e acabamento em metal, concreto e pedra.',
    aplicacao: 'Obras civis e serralheria.',
    tipoDeServico: 'Corte, desbaste e polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Corte limpo • Alta rotação • Fácil de operar',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 30,
    nome: 'Pistola Finca-Pinos',
    slug: 'pistola-fincapinos',
    avatar:
      'https://brascamp.com.br/wp-content/uploads/2021/09/finca-pinos-FAI72N-0005-530x530.jpg',
    descricao: 'Fixação rápida de pinos em concreto e aço com cartuchos de pólvora.',
    aplicacao: 'Instalações elétricas, hidráulicas e estruturas.',
    tipoDeServico: 'Montagem e fixação.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Produtividade • Fixação instantânea • Sistema antirrecúo',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 31,
    nome: 'Serra Circular',
    slug: 'serra-circular',
    avatar: '/imagens/equipamentos/Ferramentas_Eletricas/serra-circular.jpeg',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 32,
    nome: 'Policorte',
    slug: 'policorte',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/policorte-14.jpg',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 33,
    nome: 'Perfuratriz',
    slug: 'perfuratriz',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2025-04/Perfuratriz.png',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 34,
    nome: 'Politriz',
    slug: 'politriz',
    avatar:
      'https://mestredaobralocacoes.com.br/wp-content/uploads/2023/07/politriz-angular-sm.png',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 35,
    nome: 'Nível a Laser',
    slug: 'nivel-a-laser',
    avatar:
      'https://conecta.fg.com.br/wp-content/uploads/2023/12/37_Aprenda_como_escolher_o_n%C3%ADvel_a_laser_ideal_para_seu_trabalho_blog.png',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 36,
    nome: 'Lixadeira de Parede',
    slug: 'lixadeira-de-parede',
    avatar:
      'https://conecta.fg.com.br/wp-content/uploads/2024/10/38_5_Benef%C3%ADcios_do_lixamento_sem_p%C3%B3_para_a_pintura_profissional_blog.png',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 37,
    nome: 'Pistola de Pintura Elétrica',
    slug: 'pistola-de-pintura-eletrica',
    avatar: 'imagens/equipamentos/Ferramentas_Eletricas/pistola-de-pintura-eletrica.jpeg',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 38,
    nome: 'Scanner de Parede',
    slug: 'scanner-de-parede',
    avatar:
      'https://boschferramentasbrasil.vtexassets.com/arquivos/ids/189072-2400-auto?v=638875945360830000&width=2400&height=auto&aspect=true',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 39,
    nome: 'Furadeira e Parafusadeira',
    slug: 'furadeira-e-parafusadeira',
    avatar:
      'https://72380.cdn.simplo7.net/static/72380/sku/eletricas-furadeiras-manuais-e-base-magnetica-furadeira-parafusadeira-impacto-1-2-20v-dcd7781-d1-dewalt-1638379781170.jpg',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 40,
    nome: 'Plaina Elétrica',
    slug: 'plaina-eletrica',
    avatar: 'https://img.lojadomecanico.com.br/IMAGENS/21/229/105004/1728046968135.JPG',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 41,
    nome: 'Soprador Térmico',
    slug: 'soprador-thermal',
    avatar:
      'https://blog.leomadeiras.com.br/wp-content/uploads/2024/08/soprador-termico-entenda-o-que-e-como-funciona-leo-madeiras.jpg',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Ferramentas_Eletricas
    )!,
  },
  {
    id: 42,
    nome: 'Compressor de Ar 25 L',
    slug: 'compressor-de-ar-25-l',
    avatar:
      'https://www.dutramaquinas.com.br/shared/img/produto/alta/219733_compressor_de_ar_6_5_pes_25_litros_2_hp_mcv25.webp',
    descricao: 'Corte, desbaste e acabamento em metais, concreto e pedra.',
    aplicacao: 'Serralheria e obras civis.',
    tipoDeServico: 'Corte/desbaste/polimento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta rotação • Ergonomia • Trava de segurança',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Motores_e_Geradores
    )!,
  },
  {
    id: 43,
    nome: 'Compressor de Ar 50 L',
    slug: 'compressor-de-ar-50-l',
    avatar:
      'https://casadoconstrutor.com.br/sites/default/files/2024-05/compressor-com-reservatorio.jpg',
    descricao: 'Maior reservatório e pressão estável para uso contínuo em obras e serralherias.',
    aplicacao: 'Pistolas de pintura, ferramentas pneumáticas.',
    tipoDeServico: 'Pressurização e alimentação de ar.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Tanque reforçado • Válvula de segurança • Durável',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Motores_e_Geradores
    )!,
  },
  {
    id: 48,
    nome: 'Gerador 5 kVA Monofásico',
    slug: 'gerador-5-kva-monofasico',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/gerador-5-kva.jpg',
    descricao: 'Fornecimento de energia portátil para obras, eventos e emergências; baixo ruído.',
    aplicacao: 'Abastecimento temporário de equipamentos/iluminação.',
    tipoDeServico: 'Geração monofásica.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Energia estável • Autonomia prolongada • Operação simples',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Motores_e_Geradores
    )!,
  },
  {
    id: 49,
    nome: 'Bomba Submersa de Água Suja (com Mangotes)',
    slug: 'bomba-submersa-de-agua-suja-com-mangotes',
    avatar:
      'https://casadoconstrutor.com.br/sites/default/files/2024-05/bomba-submersa-lameira.jpg',
    descricao: 'Drenagem e esgotamento de água suja; desligamento automático por pressão.',
    aplicacao: 'Concretagem, obras civis e serviços gerais.',
    tipoDeServico: 'Drenagem e esgotamento.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Auto-limpeza • Baixo consumo • Baixo ruído',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Motores_e_Geradores
    )!,
  },
  {
    id: 50,
    nome: 'Bomba Airless (Pintura)',
    slug: 'bomba-airless-pintura',
    avatar: 'https://casadoconstrutor.com.br/sites/default/files/2024-05/bomba-airless.jpg',
    descricao: 'Pintura pressurizada sem ar, com alto rendimento e acabamento uniforme.',
    aplicacao: 'Paredes, estruturas metálicas e fachadas.',
    tipoDeServico: 'Pintura profissional.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Alta pressão • Baixo consumo • Baixo ruído',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Motores_e_Geradores
    )!,
  },
  {
    id: 51,
    nome: 'Carretinha 1,20 × 1,80 m (1 eixo)',
    slug: 'carretinha-1-20-x-1-80-m-1-eixo',
    avatar: '/imagens/equipamentos/Reboque_e_Transporte/carretinha-1-20-x-1-80-m-1-eixo.png',
    descricao:
      'Estrutura metálica reforçada para transporte leve; engate padrão e iluminação traseira.',
    aplicacao: 'Ferramentas, materiais e pequenos equipamentos.',
    tipoDeServico: 'Logística de pequeno porte.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Aço tubular • ~500 kg de carga • Ideal para utilitários',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Reboque_e_Transporte
    )!,
  },
  {
    id: 52,
    nome: 'Carretinha 1,60 × 3,00 m (1 eixo)',
    slug: 'carretinha-1-60-x-3-00-m-1-eixo',
    avatar: 'https://http2.mlstatic.com/D_NQ_NP_2X_600666-MLB93848265857_092025-F.webp',
    descricao: 'Plataforma ampla para máquinas e materiais maiores; piso com chapa antiderrapante.',
    aplicacao: 'Betoneiras, compactadores e cargas médias.',
    tipoDeServico: 'Logística de médio porte.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Reforço estrutural • Até ~800 kg • Travamento seguro',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Reboque_e_Transporte
    )!,
  },
  {
    id: 53,
    nome: 'Banheiro de Obra (Módulo Sanitário)',
    slug: 'banheiro-de-obra-modulo-sanitario',
    avatar:
      'https://img.irroba.com.br/fit-in/900x700/filters:format(webp):fill(fff):quality(80)/jcequipa/catalog/banheiro-metalico.jpg',
    descricao: 'Unidade sanitária móvel com ventilação e acabamento de fácil higienização.',
    aplicacao: 'Obras, eventos e áreas sem infraestrutura fixa.',
    tipoDeServico: 'Apoio de canteiro.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Leve • Instalação rápida • Atende NR-18',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Diversos
    )!,
  },
  {
    id: 54,
    nome: 'Container Almoxarifado 1,50 × 3,00 × 2,00 m',
    slug: 'container-almoxarifado-1-50-x-3-00-x-2-00-m',
    avatar: 'https://atriocontainers.com.br/wp-content/uploads/2024/11/Container-Obra-3x1-6.webp',
    descricao: 'Armazenamento seguro de ferramentas/insumos com porta e ventilação.',
    aplicacao: 'Logística e apoio em obras.',
    tipoDeServico: 'Guarda de materiais e suporte ao canteiro.',
    periodoDeLocacao: 'Diária, Semanal, Quinzenal e Mensal.',
    diferenciais: 'Estrutura soldada • Tranca de segurança • Piso reforçado',
    equipamentoCategoria: equipamentosCategoriasData.find(
      (e) => e.id === EquipamentosCategoriasId.Diversos
    )!,
  },
];
