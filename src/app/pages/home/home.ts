import { Component } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { equipamentosCategoriasData } from '../../data/equipamentos-categorias-data';
import { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import { LucideIconData } from 'lucide-angular';
import { LucideAngularModule, Shield, Clock, Wrench, Drill, TrendingUp, ArrowRight } from 'lucide-angular';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [LucideAngularModule, RouterLink, LucideAngularModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class HomePage {
  readonly categorias: EquipamentoCategoria[] = equipamentosCategoriasData;

  constructor(title: Title, meta: Meta) {
    const pageTitle = 'Mega Equipamentos | Locação de Equipamentos para Obras em Caruaru';
    const desc = 'Alugue andaimes, escoras, betoneiras, compactadores e ferramentas para construção civil em Caruaru e região. Entrega rápida e acervo completo.';
    const url = 'https://megaequip.com.br/';
    const img = 'https://megaequip.com.br/imagens/logo-capa.png';

    title.setTitle(pageTitle);
    meta.updateTag({ name: 'description', content: desc });
    meta.updateTag({ property: 'og:type', content: 'website' });
    meta.updateTag({ property: 'og:url', content: url });
    meta.updateTag({ property: 'og:title', content: pageTitle });
    meta.updateTag({ property: 'og:description', content: desc });
    meta.updateTag({ property: 'og:image', content: img });
    meta.updateTag({ property: 'og:locale', content: 'pt_BR' });
    meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    meta.updateTag({ name: 'twitter:title', content: pageTitle });
    meta.updateTag({ name: 'twitter:description', content: desc });
    meta.updateTag({ name: 'twitter:image', content: img });
  }
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
