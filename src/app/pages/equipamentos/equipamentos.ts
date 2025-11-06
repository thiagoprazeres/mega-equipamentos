import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { equipamentosCategoriasData } from '../../data/equipamentos-categorias-data';
import { Equipamento } from '../../interfaces/equipamento';
import { LucideAngularModule } from 'lucide-angular';
import { equipamentosData } from '../../data/equipamentos-data';

@Component({
  selector: 'app-equipamentos',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './equipamentos.html',
  styleUrl: './equipamentos.css',
})
export class EquipamentosPage {
  categorias = equipamentosCategoriasData;
  itens = equipamentosData;

  whatsappHref(e: Equipamento): string {
    const msg = "Olá! 👋 Sou da Mega Equipamentos. Recebi sua mensagem pelo site. Equipamento: " + e.nome + " | Período: (diária/semanal/quinzenal/mensal)";
    const encoded = encodeURIComponent(msg);
    return `https://wa.me/5581985555943?text=${encoded}`;
  }
}
