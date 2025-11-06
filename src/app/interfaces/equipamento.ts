import { EquipamentoCategoria } from "./equipamento-categoria";

export interface Equipamento {
    id: number;
    nome: string;
    foto?: string;
    slug: string;
    descricao: string;
    aplicacao: string;
    tipoDeServico: string;
    periodoDeLocacao: string;
    diferenciais: string;
    equipamentoCategoria: EquipamentoCategoria;
}
