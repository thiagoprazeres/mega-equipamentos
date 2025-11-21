import { Component } from '@angular/core';

@Component({
  selector: 'app-whats-app-button',
  standalone: true,
  imports: [],
  templateUrl: './whats-app-button.html',
  styleUrls: ['./whats-app-button.css'],
})
export class WhatsAppButton {
  whatsappHref(): string {
    const msg =
      'Olá! Entrando em contato pelo site da Mega Equipamentos. Gostaria de solicitar um orçamento para locação de equipamento';
    const encoded = encodeURIComponent(msg);
    return `https://wa.me/5581985555943?text=${encoded}`;
  }
}
