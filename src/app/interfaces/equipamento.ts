import { EquipamentoCategoria } from "./equipamento-categoria";

export interface Equipamento {
    id: number;
    nome: string;
    avatar?: string;
    slug: string;
    descricao: string;
    aplicacao: string;
    tipoDeServico: string;
    periodoDeLocacao: string;
    diferenciais: string;
    equipamentoCategoria: EquipamentoCategoria;
}
