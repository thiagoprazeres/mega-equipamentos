import { CommonModule } from '@angular/common';
import { afterNextRender, Component } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, MessageCircleMore, Search } from 'lucide-angular';

import { Equipamento } from '../../interfaces/equipamento';
import { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import { CatalogService } from '../../services/catalog.service';

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

  protected categorias: EquipamentoCategoria[] = [];
  protected equipamentos: Equipamento[] = [];
  protected query = '';
  protected suggestions: SearchSuggestion[] = [];
  protected loading = false;

  constructor(
    private readonly router: Router,
    private readonly catalogService: CatalogService,
    title: Title,
    meta: Meta
  ) {
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

    this.categorias = this.catalogService.getLocalCategories();
    this.equipamentos = this.catalogService.getLocalEquipments();

    afterNextRender(() => {
      void this.refreshCatalog();
    });
  }

  private async refreshCatalog() {
    const [categorias, equipamentos] = await Promise.all([
      this.catalogService.listCategories(),
      this.catalogService.listEquipments(),
    ]);

    this.categorias = categorias;
    this.equipamentos = equipamentos;
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

    const itemSuggestions = this.equipamentos
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
