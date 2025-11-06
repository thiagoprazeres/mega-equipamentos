import { EquipamentoCategoria } from '../interfaces/equipamento-categoria';
import { EquipamentosCategoriasId } from '../enums/equipamentos-categorias-id';

export const equipamentosCategorias: EquipamentoCategoria[] = [
  {
    id: EquipamentosCategoriasId.Acesso_e_Elevacao,
    nome: 'Acesso e Elevação',
    slug: 'acesso-e-elevacao',
    objetivo: 'Facilitar o acesso e o transporte vertical de materiais e profissionais em diferentes níveis de obra, com equipamentos seguros e de alta performance.',
  },
  {
    id: EquipamentosCategoriasId.Andaimes,
    nome: 'Andaimes',
    slug: 'andaimes',
    objetivo: 'Oferecer sistemas de andaimes modulares, seguros e de fácil montagem para serviços em altura.',
  },
  {
    id: EquipamentosCategoriasId.Escoramento_de_Estruturas,
    nome: 'Escoramento de Estruturas',
    slug: 'escoramento-de-estruturas',
    objetivo: 'Sustentação temporária de lajes, vigas e pilares durante concretagens.',
  },
  {
    id: EquipamentosCategoriasId.Compactacao_e_Solo,
    nome: 'Compactação e Solo',
    slug: 'compactacao-e-solo',
    objetivo: 'Garantir estabilidade e resistência do solo antes da concretagem e pavimentação.',
  },
  {
    id: EquipamentosCategoriasId.Concretagem,
    nome: 'Concretagem',
    slug: 'concretagem',
    objetivo: 'Mistura e adensamento do concreto com eficiência e qualidade.',
  },
  {
    id: EquipamentosCategoriasId.Corte_e_Demolicao,
    nome: 'Corte e Demolição',
    slug: 'corte-e-demolicao',
    objetivo: 'Corte e demolição de materiais e estruturas.',
  },
  {
    id: EquipamentosCategoriasId.Demolicao,
    nome: 'Demolição',
    slug: 'demolicao',
    objetivo: 'Demolição de materiais e estruturas.',
  },
  {
    id: EquipamentosCategoriasId.Ferramentas_Eletricas,
    nome: 'Ferramentas Elétricas',
    slug: 'ferramentas-eletricas',
    objetivo: 'Ferramentas elétricas para serviços de construção.',
  },
  {
    id: EquipamentosCategoriasId.Motores_e_Geradores,
    nome: 'Motores e Geradores',
    slug: 'motores-e-geradores',
    objetivo: 'Motores e geradores para serviços de construção.',
  },
  {
    id: EquipamentosCategoriasId.Reboque_e_Transporte,
    nome: 'Reboque e Transporte',
    slug: 'reboque-e-transporte',
    objetivo: 'Reboque e transporte de materiais e estruturas.',
  },
  {
    id: EquipamentosCategoriasId.Diversos,
    nome: 'Diversos',
    slug: 'diversos',
    objetivo: 'Diversos',
  },
];
