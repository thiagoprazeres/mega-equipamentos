import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, MessageCircleMore, Search } from 'lucide-angular';

import { equipamentosCategoriasData } from '../../data/equipamentos-categorias-data';
import { equipamentosData } from '../../data/equipamentos-data';

interface SearchSuggestion {
  label: string;
  slug: string;
  kind: 'categoria' | 'equipamento';
  categorySlug: string;
}

@Component({
  selector: 'app-equipamentos',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './equipamentos.html',
  styleUrl: './equipamentos.css',
})
export class EquipamentosPage {
  protected readonly Search = Search;
  protected readonly MessageCircleMore = MessageCircleMore;
  protected readonly categorias = equipamentosCategoriasData;

  protected query = '';
  protected suggestions: SearchSuggestion[] = [];

  constructor(private readonly router: Router, title: Title, meta: Meta) {
    const pageTitle = 'Catálogo de Equipamentos | Mega Equipamentos';
    const desc = 'Catálogo completo de equipamentos para locação em Caruaru: andaimes, escoras metálicas, betoneiras, compactadores, marteletes, ferramentas elétricas, geradores e muito mais.';
    const url = 'https://megaequip.com.br/equipamentos';
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

  protected onInput(value: string) {
    this.query = value;
    const q = value.trim().toLowerCase();

    if (!q) {
      this.suggestions = [];
      return;
    }

    const catSuggestions = this.categorias
      .filter((categoria) => {
        const nome = categoria.nome.toLowerCase();
        const englishName = categoria.name?.toLowerCase() ?? '';
        return nome.includes(q) || englishName.includes(q);
      })
      .map((categoria) => ({
        label: categoria.nome,
        slug: categoria.slug,
        kind: 'categoria' as const,
        categorySlug: categoria.slug,
      }));

    const itemSuggestions = equipamentosData
      .filter((equipamento) => equipamento.nome.toLowerCase().includes(q))
      .map((equipamento) => ({
        label: equipamento.nome,
        slug: equipamento.slug,
        kind: 'equipamento' as const,
        categorySlug: equipamento.equipamentoCategoria.slug,
      }));

    this.suggestions = [...catSuggestions, ...itemSuggestions].slice(0, 12);
  }

  protected onSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (!this.suggestions.length) {
      return;
    }

    this.onSelect(this.suggestions[0]);
  }

  protected onSelect(suggestion: SearchSuggestion) {
    const commands =
      suggestion.kind === 'categoria'
        ? ['/equipamentos', suggestion.slug]
        : ['/equipamentos', suggestion.categorySlug, suggestion.slug];

    void this.router.navigate(commands);
    this.query = '';
    this.suggestions = [];
  }

  protected clearSuggestions() {
    if (!this.query.trim()) {
      this.suggestions = [];
    }
  }
}
