import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { equipamentosData } from '../../data/equipamentos-data';
import { equipamentosCategoriasData } from '../../data/equipamentos-categorias-data';
import { Equipamento } from '../../interfaces/equipamento';
import { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';

@Component({
  selector: 'app-equipamentos-categoria',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './equipamentos-categoria.html',
  styleUrl: './equipamentos-categoria.css',
})
export class EquipamentosCategoriaPage {
  categoria!: EquipamentoCategoria;
  itens: Equipamento[] = [];
  slug: string = '';

  constructor(private route: ActivatedRoute) {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.slug = slug;
    const cat = equipamentosCategoriasData.find((c) => c.slug === slug);
    this.categoria = cat || equipamentosCategoriasData[0];
    this.itens = equipamentosData.filter(
      (e) => e.equipamentoCategoria.slug === this.categoria.slug
    );
  }

  whatsappHref(e: Equipamento): string {
    const msg =
      'Olá! 👋 Sou da Mega Equipamentos. Recebi sua mensagem pelo site. Equipamento: ' +
      e.nome +
      ' | Período: (diária/semanal/quinzenal/mensal)';
    const encoded = encodeURIComponent(msg);
    return `https://wa.me/5581985555943?text=${encoded}`;
  }
}
