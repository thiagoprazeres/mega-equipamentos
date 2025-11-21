import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { equipamentosData } from '../../data/equipamentos-data';
import { equipamentosCategoriasData } from '../../data/equipamentos-categorias-data';
import { Equipamento } from '../../interfaces/equipamento';
import { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import { Title, Meta } from '@angular/platform-browser';

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

  constructor(private route: ActivatedRoute, private title: Title, private meta: Meta) {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.slug = slug;
    const cat = equipamentosCategoriasData.find((c) => c.slug === slug);
    this.categoria = cat || equipamentosCategoriasData[0];
    this.itens = equipamentosData.filter(
      (e) => e.equipamentoCategoria.slug === this.categoria.slug
    );

    const nome = this.categoria?.nome || 'Equipamentos';
    let desc = (this.categoria?.objetivo || 'Locação de equipamentos').replace(/\s+/g, ' ').trim();
    if (desc.length > 160) {
      desc = desc.slice(0, 157).trimEnd() + '...';
    }
    const img = this.categoria?.avatar || 'https://megaequip.com.br/images/logo-capa.png';
    const url = `https://megaequip.com.br/equipamentos/${slug}`;

    this.title.setTitle(`Equipamentos - ${nome}`);

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
