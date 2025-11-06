import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { equipamentos } from '../../data/equipamentos';
import { equipamentosCategorias } from '../../data/equipamentos-categorias';
import { Equipamento } from '../../interfaces/equipamento';

@Component({
  selector: 'app-equipamentos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './equipamentos.html',
  styleUrl: './equipamentos.css',
})
export class EquipamentosPage {
  categorias = equipamentosCategorias;
  itens = equipamentos;

  whatsappHref(e: Equipamento): string {
    const msg = "Olá! 👋 Sou da Mega Equipamentos. Recebi sua mensagem pelo site. Equipamento: " + e.nome + " | Período: (diária/semanal/quinzenal/mensal)";
    const encoded = encodeURIComponent(msg);
    return `https://wa.me/5581985555943?text=${encoded}`;
  }
}
