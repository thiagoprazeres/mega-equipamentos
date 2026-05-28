import { afterNextRender, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { equipamentosData } from '../../data/equipamentos-data';
import { Equipamento } from '../../interfaces/equipamento';
import { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import { Title, Meta } from '@angular/platform-browser';
import { CatalogService } from '../../services/catalog.service';
import { formatCurrencyCents, hasAnyRentalPrice, RENTAL_PRICE_FIELDS } from '../../utils/prices';

@Component({
  selector: 'app-equipamento',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './equipamento.html',
  styleUrl: './equipamento.css',
})
export class EquipamentoPage {
  equipamento!: Equipamento | undefined;
  categoria!: EquipamentoCategoria | undefined;
  categoriaSlug = '';
  slug = '';

  constructor(
    private route: ActivatedRoute,
    private catalogService: CatalogService,
    private title: Title,
    private meta: Meta
  ) {
    const categoriaSlug = this.route.snapshot.paramMap.get('categoriaSlug') || '';
    const slug = this.route.snapshot.paramMap.get('slug') || '';

    this.categoriaSlug = categoriaSlug;
    this.slug = slug;
    this.equipamento = equipamentosData.find((e) => e.slug === slug);
    this.categoria = this.equipamento?.equipamentoCategoria;
    this.setMetadata();

    afterNextRender(() => {
      void this.refreshEquipment();
    });
  }

  private async refreshEquipment() {
    const equipment = await this.catalogService.getEquipmentBySlug(this.slug, this.categoriaSlug);

    if (equipment) {
      this.equipamento = equipment;
      this.categoria = equipment.equipamentoCategoria;
      this.setMetadata();
    }
  }

  protected hasPrices(): boolean {
    return hasAnyRentalPrice(this.equipamento?.precos);
  }

  protected priceRows() {
    return RENTAL_PRICE_FIELDS.map((field) => ({
      label: field.label,
      value: this.equipamento?.precos?.[field.key] ?? 0,
    }));
  }

  protected formatPrice(value: number): string {
    return formatCurrencyCents(value);
  }

  private setMetadata() {
    const nome = this.equipamento?.nome || 'Equipamento';
    let desc = (this.equipamento?.descricao || 'Locação de equipamentos')
      .replace(/\s+/g, ' ')
      .trim();
    if (desc.length > 160) {
      desc = desc.slice(0, 157).trimEnd() + '...';
    }
    const img =
      this.equipamento?.avatar ||
      this.categoria?.avatar ||
      'https://megaequip.com.br/images/logo-capa.png';
    const url = `https://megaequip.com.br/equipamentos/${this.categoriaSlug}/${this.slug}`;

    const aplicacao = this.equipamento?.aplicacao || '';
    const enrichedDesc = aplicacao
      ? `${desc} Ideal para: ${aplicacao}`.slice(0, 160)
      : desc;

    this.title.setTitle(`${nome} para Locação em Caruaru | Mega Equipamentos`);

    this.meta.updateTag({ name: 'description', content: enrichedDesc });
    this.meta.updateTag({ property: 'og:type', content: 'equipment' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:title', content: nome });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ property: 'og:image', content: img });
    this.meta.updateTag({ property: 'og:locale', content: 'pt_BR' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: nome });
    this.meta.updateTag({ name: 'twitter:description', content: desc });
    this.meta.updateTag({ name: 'twitter:image', content: img });
  }

  whatsappHref(): string {
    if (!this.equipamento) return 'https://wa.me/5581985555943';
    const msg =
      'Olá! Estou entrando em contato pelo site da Mega Equipamentos. Gostaria de solicitar um orçamento para locação de ' +
      this.equipamento.nome +
      ' com o período de locação: (diária/semanal/quinzenal/mensal).';
    const encoded = encodeURIComponent(msg);
    return `https://wa.me/5581985555943?text=${encoded}`;
  }
}
