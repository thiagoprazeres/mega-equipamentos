import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArrowLeft, Package, LucideAngularModule } from 'lucide-angular';

import type { Equipamento } from '../../interfaces/equipamento';
import { CatalogService } from '../../services/catalog.service';
import { formatCurrencyCents, RENTAL_PRICE_FIELDS } from '../../utils/prices';

@Component({
  selector: 'app-gestor-equipamento-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-equipamento-detalhe.html',
})
export class GestorEquipamentoDetalhePage implements OnInit {
  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Package = Package;
  protected readonly priceFields = RENTAL_PRICE_FIELDS;

  protected equipment: Equipamento | null = null;
  protected loading = true;
  protected errorMessage = '';

  constructor(
    private readonly catalogService: CatalogService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    try {
      const equipments = await this.catalogService.listEquipments({ includeArchived: true });
      this.equipment = equipments.find((item) => item.id === id) ?? null;

      if (!this.equipment) {
        this.errorMessage = 'Equipamento não encontrado.';
      }
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível carregar o equipamento.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  protected formatMoney(value?: number): string {
    return formatCurrencyCents(value ?? 0);
  }
}
