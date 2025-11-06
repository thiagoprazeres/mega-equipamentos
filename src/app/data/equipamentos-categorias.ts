import { EquipamentoCategoria } from '../interfaces/equipamento-categoria';
import { EquipamentosCategoriasId } from '../enums/equipamentos-categorias-id';
import {
  ArrowUpRight,
  Building2,
  Layers,
  Waves,
  Box,
  Scissors,
  Trash2,
  Drill,
  Plug,
  Truck,
  Package,
} from 'lucide-angular';

export const equipamentosCategorias: EquipamentoCategoria[] = [
  {
    id: EquipamentosCategoriasId.Acesso_e_Elevacao,
    nome: 'Acesso e Elevação',
    name: 'Access and Elevation',
    slug: 'acesso-e-elevacao',
    icone: ArrowUpRight,
    avatar: 'https://images.pexels.com/photos/34581859/pexels-photo-34581859.jpeg',
    objetivo:
      'Facilitar o acesso e o transporte vertical de materiais e profissionais em diferentes níveis de obra, com equipamentos seguros e de alta performance.',
  },
  {
    id: EquipamentosCategoriasId.Andaimes,
    nome: 'Andaimes',
    name: 'Scaffolding',
    slug: 'andaimes',
    icone: Building2,
    avatar: '/imagens/equipamentos/andaimes.jpg',
    objetivo:
      'Oferecer sistemas de andaimes modulares, seguros e de fácil montagem para serviços em altura.',
  },
  {
    id: EquipamentosCategoriasId.Escoramento_de_Estruturas,
    nome: 'Escoramento de Estruturas',
    name: 'Structural Shoring',
    slug: 'escoramento-de-estruturas',
    icone: Layers,
    avatar:
      'https://images.pexels.com/photos/585419/pexels-photo-585419.jpeg?w=800&h=600&auto=compress&cs=tinysrgb',
    objetivo: 'Sustentação temporária de lajes, vigas e pilares durante concretagens.',
  },
  {
    id: EquipamentosCategoriasId.Compactacao_e_Solo,
    nome: 'Compactação e Solo',
    name: 'Soil Compaction',
    slug: 'compactacao-e-solo',
    icone: Waves,
    avatar: '/imagens/equipamentos/placa-vibratoria.jpg',
    objetivo: 'Garantir estabilidade e resistência do solo antes da concretagem e pavimentação.',
  },
  {
    id: EquipamentosCategoriasId.Concretagem,
    nome: 'Concretagem',
    name: 'Concreting',
    slug: 'concretagem',
    icone: Box,
    avatar: '/imagens/equipamentos/concretagem.png',
    objetivo: 'Mistura e adensamento do concreto com eficiência e qualidade.',
  },
  {
    id: EquipamentosCategoriasId.Corte_e_Demolicao,
    nome: 'Corte e Demolição',
    name: 'Cutting and Demolition',
    slug: 'corte-e-demolicao',
    icone: Scissors,
    avatar:
      'https://images.pexels.com/photos/585420/pexels-photo-585420.jpeg?w=800&h=600&auto=compress&cs=tinysrgb',
    objetivo: 'Corte e demolição de materiais e estruturas.',
  },
  {
    id: EquipamentosCategoriasId.Demolicao,
    nome: 'Demolição',
    name: 'Demolition',
    slug: 'demolicao',
    icone: Trash2,
    avatar: '/imagens/equipamentos/martelete-demolidor.jpg',
    objetivo: 'Demolição de materiais e estruturas.',
  },
  {
    id: EquipamentosCategoriasId.Ferramentas_Eletricas,
    nome: 'Ferramentas Elétricas',
    name: 'Power Tools',
    slug: 'ferramentas-eletricas',
    icone: Drill,
    avatar:
      'https://conecta.fg.com.br/wp-content/uploads/2023/12/37_Aprenda_como_escolher_o_n%C3%ADvel_a_laser_ideal_para_seu_trabalho_blog.png',
    objetivo: 'Ferramentas elétricas para serviços de construção.',
  },
  {
    id: EquipamentosCategoriasId.Motores_e_Geradores,
    nome: 'Motores e Geradores',
    name: 'Engines and Generators',
    slug: 'motores-e-geradores',
    icone: Plug,
    avatar: 'https://conecta.fg.com.br/wp-content/uploads/2020/05/05_Usos_Geradores.png',
    objetivo: 'Motores e geradores para serviços de construção.',
  },
  {
    id: EquipamentosCategoriasId.Reboque_e_Transporte,
    nome: 'Reboque e Transporte',
    name: 'Trailers and Transport',
    slug: 'reboque-e-transporte',
    icone: Truck,
    avatar:
      'https://images.pexels.com/photos/2199293/pexels-photo-2199293.jpeg?w=800&h=600&auto=compress&cs=tinysrgb',
    objetivo: 'Reboque e transporte de materiais e estruturas.',
  },
  {
    id: EquipamentosCategoriasId.Diversos,
    nome: 'Diversos',
    name: 'Miscellaneous',
    slug: 'diversos',
    icone: Package,
    avatar:
      'https://www.c3equipamentos.com.br/images/Blog/diadamulher-americandaimes-1200x800.webp',
    objetivo: 'Diversos',
  },
];
