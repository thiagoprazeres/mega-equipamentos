import { Component } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-contato',
  standalone: true,
  imports: [],
  templateUrl: './contato.html',
  styleUrl: './contato.css',
})
export class ContatoPage {
  constructor(title: Title, meta: Meta) {
    const pageTitle = 'Contato | Mega Equipamentos';
    const desc = 'Fale com a Mega Equipamentos em Caruaru. Solicite orçamento, tire dúvidas ou entre em contato via WhatsApp. Atendemos Caruaru e toda a região do Agreste.';
    const url = 'https://megaequip.com.br/contato';
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
