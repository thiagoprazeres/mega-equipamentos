import { EquipamentoCategoria } from '../interfaces/equipamento-categoria';
import { EquipamentosCategoriasId } from '../enums/equipamentos-categorias-id';

export const equipamentosCategoriasData: EquipamentoCategoria[] = [
  {
    id: EquipamentosCategoriasId.Acesso_e_Elevacao,
    nome: 'Acesso e Elevação',
    name: 'Access and Elevation',
    slug: 'acesso-e-elevacao',
    icone: 'icones/Acesso_e_Elevacao.png',
    avatar: 'https://images.pexels.com/photos/34581859/pexels-photo-34581859.jpeg',
    objetivo:
      'Facilitar o acesso e o transporte vertical de materiais e profissionais em diferentes níveis de obra, com equipamentos seguros e de alta performance.',
  },
  {
    id: EquipamentosCategoriasId.Andaimes,
    nome: 'Andaimes',
    name: 'Scaffolding',
    slug: 'andaimes',
    icone: 'icones/Andaime.png',
    avatar: '/imagens/equipamentos/andaimes.jpg',
    objetivo:
      'Oferecer sistemas de andaimes modulares, seguros e de fácil montagem para serviços em altura.',
  },
  {
    id: EquipamentosCategoriasId.Escoramento_de_Estruturas,
    nome: 'Escoramento de Estruturas',
    name: 'Structural Shoring',
    slug: 'escoramento-de-estruturas',
    icone: 'icones/Escoramento_de_Estruturas.png',
    avatar:
      'https://images.pexels.com/photos/585419/pexels-photo-585419.jpeg?w=800&h=600&auto=compress&cs=tinysrgb',
    objetivo: 'Sustentação temporária de lajes, vigas e pilares durante concretagens.',
  },
  {
    id: EquipamentosCategoriasId.Compactacao_e_Solo,
    nome: 'Compactação e Solo',
    name: 'Soil Compaction',
    slug: 'compactacao-e-solo',
    icone: 'icones/Compactacao_e_Solo.png',
    avatar: '/imagens/equipamentos/placa-vibratoria.jpg',
    objetivo: 'Garantir estabilidade e resistência do solo antes da concretagem e pavimentação.',
  },
  {
    id: EquipamentosCategoriasId.Concretagem,
    nome: 'Concretagem',
    name: 'Concreting',
    slug: 'concretagem',
    icone: 'icones/Concretagem.png',
    avatar: '/imagens/equipamentos/concretagem.png',
    objetivo: 'Mistura e adensamento do concreto com eficiência e qualidade.',
  },
  {
    id: EquipamentosCategoriasId.Corte_e_Demolicao,
    nome: 'Corte e Demolição',
    name: 'Cutting and Demolition',
    slug: 'corte-e-demolicao',
    icone: 'icones/Corte_e_Demolicao.png',
    avatar: '/imagens/equipamentos/martelete-demolidor.jpg',
    objetivo:
      'Fornecer marteletes de diversos portes para demolições leves a pesadas de concretos e alvenarias.',
  },
  {
    id: EquipamentosCategoriasId.Ferramentas_Eletricas,
    nome: 'Ferramentas Elétricas',
    name: 'Power Tools',
    slug: 'ferramentas-eletricas',
    icone: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRDIwMCIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWRyaWxsLWljb24gbHVjaWRlLWRyaWxsIj48cGF0aCBkPSJNMTAgMThhMSAxIDAgMCAxIDEgMXYyYTEgMSAwIDAgMS0xIDFINWEzIDMgMCAwIDEtMy0zIDEgMSAwIDAgMSAxLTF6Ii8+PHBhdGggZD0iTTEzIDEwSDRhMiAyIDAgMCAxLTItMlY0YTIgMiAwIDAgMSAyLTJoOWExIDEgMCAwIDEgMSAxdjZhMSAxIDAgMCAxLTEgMWwtLjgxIDMuMjQyYTEgMSAwIDAgMS0uOTcuNzU4SDgiLz48cGF0aCBkPSJNMTQgNGgzYTEgMSAwIDAgMSAxIDF2MmExIDEgMCAwIDEtMSAxaC0zIi8+PHBhdGggZD0iTTE4IDZoNCIvPjxwYXRoIGQ9Im01IDEwLTIgOCIvPjxwYXRoIGQ9Im03IDE4IDItOCIvPjwvc3ZnPg==',
    avatar:
      'https://conecta.fg.com.br/wp-content/uploads/2023/12/37_Aprenda_como_escolher_o_n%C3%ADvel_a_laser_ideal_para_seu_trabalho_blog.png',
    objetivo: 'Equipamentos de precisão e acabamento para marcenaria, instalação e manutenção.',
  },
  {
    id: EquipamentosCategoriasId.Motores_e_Geradores,
    nome: 'Motores e Geradores',
    name: 'Engines and Generators',
    slug: 'motores-e-geradores',
    icone: 'icones/Motores_e_Geradores.png',
    avatar: 'https://conecta.fg.com.br/wp-content/uploads/2020/05/05_Usos_Geradores.png',
    objetivo: 'Energia, compressão e bombeamento para obras e serviços gerais.',
  },
  {
    id: EquipamentosCategoriasId.Reboque_e_Transporte,
    nome: 'Reboque e Transporte',
    name: 'Trailers and Transport',
    slug: 'reboque-e-transporte',
    icone: 'icones/Reboque.png',
    avatar:
      'https://images.pexels.com/photos/188679/pexels-photo-188679.jpeg?w=800&h=600&auto=compress',
    objetivo: 'Soluções logísticas seguras para transporte de materiais e equipamentos.',
  },
  {
    id: EquipamentosCategoriasId.Diversos,
    nome: 'Diversos',
    name: 'Miscellaneous',
    slug: 'diversos',
    icone: 'icones/Diversos.png',
    avatar:
      'https://www.c3equipamentos.com.br/images/Blog/diadamulher-americandaimes-1200x800.webp',
    objetivo: 'Apoio à estrutura e organização do canteiro de obras.',
  },
];
