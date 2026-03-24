import { Component } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { LucideAngularModule, Mail } from 'lucide-angular';

@Component({
  selector: 'app-como-alugar',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './como-alugar.html',
  styleUrl: './como-alugar.css',
})
export class ComoAlugarPage {
  readonly Mail = Mail;

  constructor(title: Title, meta: Meta) {
    const pageTitle = 'Como Alugar | Mega Equipamentos';
    const desc = 'Veja como é simples alugar equipamentos na Mega Equipamentos em Caruaru. Retirada no galpão ou entrega na obra. Locação diária, semanal, quinzenal ou mensal.';
    const url = 'https://megaequip.com.br/como-alugar';
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
