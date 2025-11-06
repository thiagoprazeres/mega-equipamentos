import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { equipamentosCategorias } from '../../data/equipamentos-categorias';
import { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import { LucideAngularModule, Shield, Clock, Wrench, Drill } from 'lucide-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [LucideAngularModule, CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class HomePage {
  readonly categorias: EquipamentoCategoria[] = equipamentosCategorias;
  readonly Drill = Drill;
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
  ];
}
