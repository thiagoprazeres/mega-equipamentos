import { Component } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-quem-somos',
  standalone: true,
  imports: [],
  templateUrl: './quem-somos.html',
  styleUrl: './quem-somos.css',
})
export class QuemSomosPage {
  constructor(title: Title, meta: Meta) {
    const pageTitle = 'Quem Somos | Mega Equipamentos';
    const desc = 'Conheça a Mega Equipamentos, empresa especializada em locação de equipamentos para construção civil em Caruaru e região. Acervo completo, manutenção própria e entrega rápida.';
    const url = 'https://megaequip.com.br/quem-somos';
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
}
