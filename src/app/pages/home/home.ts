import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { equipamentosCategoriasData } from '../../data/equipamentos-categorias-data';
import { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import { LucideIconData } from 'lucide-angular';
import { LucideAngularModule, Shield, Clock, Wrench, Drill, TrendingUp, ArrowRight } from 'lucide-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [LucideAngularModule, CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class HomePage {
  readonly categorias: EquipamentoCategoria[] = equipamentosCategoriasData;
  readonly Drill = Drill;
  readonly ArrowRight = ArrowRight;
  readonly diferenciais = [
    {
      icone: Shield,
      titulo: 'Equipamentos de Qualidade',
      descricao: 'Acervo completo e bem mantido para garantir segurança na sua obra',
    },
    {
      icone: Clock,
      titulo: 'Entrega Rápida',
      descricao: 'Atendimento ágil com retirada no galpão ou entrega na obra',
    },
    {
      icone: Wrench,
      titulo: 'Manutenção Própria',
      descricao:
        'Equipe técnica especializada para manter todos os equipamentos em perfeito estado',
    },
    {
      icone: TrendingUp,
      titulo: 'Melhor Custo-Benefício',
      descricao:
        'Preços competitivos com transparência total. Locação diária, semanal, quinzenal ou mensal.',
    },
  ];
}
