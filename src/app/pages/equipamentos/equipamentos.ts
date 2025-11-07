import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { equipamentosCategoriasData } from '../../data/equipamentos-categorias-data';
import { Equipamento } from '../../interfaces/equipamento';
import { LucideAngularModule, Search } from 'lucide-angular';
import { equipamentosData } from '../../data/equipamentos-data';

@Component({
  selector: 'app-equipamentos',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './equipamentos.html',
  styleUrl: './equipamentos.css',
})
export class EquipamentosPage {
  Search = Search;
  categorias = equipamentosCategoriasData;
  itens = equipamentosData;
  query = '';
  suggestions: Array<{
    label: string;
    slug: string;
    kind: 'categoria' | 'equipamento';
    categorySlug: string;
  }> = [];

  constructor(private router: Router) {}

  whatsappHref(e: Equipamento): string {
    const msg =
      'Olá! Vi o equipamento ' +
      e.nome +
      ' no site da Mega Equipamentos. Quero tengo interesse em alugar.';
    const encoded = encodeURIComponent(msg);
    return `https://wa.me/5581985555943?text=${encoded}`;
  }

  onInput(value: string) {
    this.query = value;
    const q = value.trim().toLowerCase();
    if (!q) {
      this.suggestions = [];
      return;
    }

    const catSuggestions = this.categorias
      .filter((c) => c.nome.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q))
      .map((c) => ({
        label: c.nome,
        slug: c.slug,
        kind: 'categoria' as const,
        categorySlug: c.slug,
      }));

    const itemSuggestions = this.itens
      .filter((e) => e.nome.toLowerCase().includes(q))
      .map((e) => ({
        label: e.nome,
        slug: e.slug,
        kind: 'equipamento' as const,
        categorySlug: e.equipamentoCategoria.slug,
      }));

    // Priorize categorias no topo e limite total para evitar lista gigante
    this.suggestions = [...catSuggestions, ...itemSuggestions].slice(0, 12);
  }

  onSelect(s: { kind: 'categoria' | 'equipamento'; slug: string; categorySlug: string }) {
    const target = s.kind === 'categoria' ? s.slug : s.categorySlug;
    this.router.navigate(['/equipamentos', target]);
    // limpar após navegação
    this.query = '';
    this.suggestions = [];
  }
}
