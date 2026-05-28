import { afterNextRender, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { equipamentosCategoriasData } from '../../data/equipamentos-categorias-data';
import { Equipamento } from '../../interfaces/equipamento';
import { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import { Title, Meta } from '@angular/platform-browser';
import { CatalogService } from '../../services/catalog.service';
import { formatCurrencyCents, hasAnyRentalPrice, RENTAL_PRICE_FIELDS } from '../../utils/prices';

@Component({
  selector: 'app-equipamentos-categoria',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './equipamentos-categoria.html',
  styleUrl: './equipamentos-categoria.css',
})
export class EquipamentosCategoriaPage {
  @ViewChild('videoStory') videoStory!: ElementRef<HTMLVideoElement>;
  categoria!: EquipamentoCategoria;
  itens: Equipamento[] = [];
  slug: string = '';

  constructor(
    private route: ActivatedRoute,
    private catalogService: CatalogService,
    private title: Title,
    private meta: Meta
  ) {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.slug = slug;
    const cat = equipamentosCategoriasData.find((c) => c.slug === slug);
    this.categoria = cat || equipamentosCategoriasData[0];
    this.itens = this.catalogService.getLocalEquipments({ categorySlug: this.slug });
    this.setMetadata(this.categoria);

    afterNextRender(() => {
      void this.refreshCategory();
    });
  }

  private async refreshCategory() {
    const [category, equipments] = await Promise.all([
      this.catalogService.getCategoryBySlug(this.slug),
      this.catalogService.listEquipments({ categorySlug: this.slug }),
    ]);

    if (category) {
      this.categoria = category;
      this.setMetadata(category);
    }

    this.itens = equipments;
  }

  protected priceSummary(equipamento: Equipamento): string {
    if (!hasAnyRentalPrice(equipamento.precos)) {
      return 'Preço sob consulta';
    }

    const price = RENTAL_PRICE_FIELDS.find(({ key }) => (equipamento.precos?.[key] ?? 0) > 0);
    return price
      ? `${price.label}: ${formatCurrencyCents(equipamento.precos?.[price.key] ?? 0)}`
      : 'Preço sob consulta';
  }

  private setMetadata(categoria: EquipamentoCategoria) {
    const nome = categoria?.nome || 'Equipamentos';
    const objetivo = (categoria?.objetivo || '').replace(/\s+/g, ' ').trim();
    let desc = `Alugue ${nome} em Caruaru com a Mega Equipamentos. ${objetivo}`.trim();
    if (desc.length > 160) {
      desc = desc.slice(0, 157).trimEnd() + '...';
    }
    const img =
      categoria?.avatarHero ||
      categoria?.avatar ||
      'https://megaequip.com.br/images/logo-capa.png';
    const url = `https://megaequip.com.br/equipamentos/${this.slug}`;

    this.title.setTitle(`Locação de ${nome} em Caruaru | Mega Equipamentos`);

    this.meta.updateTag({ name: 'description', content: desc });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
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

  playAndGoFullscreen() {
    this.videoStory.nativeElement.play();
    this.videoStory.nativeElement.requestFullscreen();
  }
}
