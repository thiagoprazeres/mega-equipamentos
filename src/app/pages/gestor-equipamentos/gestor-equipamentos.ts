import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  Archive,
  Eye,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  LucideAngularModule,
} from 'lucide-angular';

import type { CatalogStatus, Equipamento } from '../../interfaces/equipamento';
import type { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import { AuthService } from '../../services/auth.service';
import { CatalogService } from '../../services/catalog.service';
import {
  formatCurrencyCents,
  hasAnyRentalPrice,
  RENTAL_PRICE_FIELDS,
} from '../../utils/prices';
import { matchesSearchQuery } from '../../utils/search';

const CATALOG_LOAD_TIMEOUT_MS = 4500;
type SortDirection = 'asc' | 'desc';
type EquipmentSortKey =
  | 'createdAt'
  | 'code'
  | 'name'
  | 'category'
  | 'price'
  | 'assetValue'
  | 'stock'
  | 'status';

@Component({
  selector: 'app-gestor-equipamentos',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-equipamentos.html',
})
export class GestorEquipamentosPage implements OnInit {
  protected readonly Archive = Archive;
  protected readonly Eye = Eye;
  protected readonly LogOut = LogOut;
  protected readonly Pencil = Pencil;
  protected readonly Plus = Plus;
  protected readonly RotateCcw = RotateCcw;
  protected readonly Search = Search;

  protected categories: EquipamentoCategoria[] = [];
  protected equipments: Equipamento[] = [];
  protected query = '';
  protected selectedCategory = '';
  protected activeStatus: CatalogStatus | 'all' = 'active';
  protected loading = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected sortKey: EquipmentSortKey = 'createdAt';
  protected sortDirection: SortDirection = 'desc';
  private catalogLoadStarted = false;

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly catalogService: CatalogService,
    private readonly router: Router
  ) {
    this.useLocalCatalog();

    if (isBrowserRuntime()) {
      setTimeout(() => void this.loadCatalogOnce(false), 0);
    }
  }

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadCatalogOnce(false);
    }
  }

  protected filteredEquipments() {
    const filtered = this.equipments.filter((equipment) => {
      const matchesStatus =
        this.activeStatus === 'all' || (equipment.status ?? 'active') === this.activeStatus;
      const matchesCategory =
        !this.selectedCategory || equipment.equipamentoCategoria.slug === this.selectedCategory;
      const matchesQuery = matchesSearchQuery(this.query, [
        equipment.id,
        equipment.codigoInterno,
        equipment.codigo,
        equipment.equipamentoCategoria.codigo,
        equipment.equipamentoCategoria.nome,
        equipment.nome,
        equipment.nomeTecnico,
        equipment.slug,
        equipment.stockQuantity,
      ]);

      return matchesStatus && matchesCategory && matchesQuery;
    });

    return sortBy(filtered, (equipment) => this.equipmentSortValue(equipment), this.sortDirection);
  }

  protected filteredEquipmentsCount(): number {
    return this.filteredEquipments().length;
  }

  protected setSort(key: EquipmentSortKey) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortKey = key;
    this.sortDirection = 'asc';
  }

  protected sortIndicator(key: EquipmentSortKey): string {
    if (this.sortKey !== key) {
      return '';
    }

    return this.sortDirection === 'asc' ? '^' : 'v';
  }

  protected setStatus(status: CatalogStatus | 'all') {
    this.activeStatus = status;
  }

  protected async archive(equipment: Equipamento) {
    if (!confirm(`Arquivar ${equipment.nome}?`)) {
      return;
    }

    await this.catalogService.archiveEquipment(equipment.id);
    this.successMessage = 'Equipamento arquivado.';
    await this.loadCatalog(false);
    this.changeDetector.detectChanges();
  }

  protected async restore(equipment: Equipamento) {
    await this.catalogService.restoreEquipment(equipment.id);
    this.successMessage = 'Equipamento restaurado.';
    await this.loadCatalog(false);
    this.changeDetector.detectChanges();
  }

  protected priceLabel(equipment: Equipamento): string {
    if (!hasAnyRentalPrice(equipment.precos)) {
      return 'Sob consulta';
    }

    const firstPrice = RENTAL_PRICE_FIELDS.find(({ key }) => (equipment.precos?.[key] ?? 0) > 0);
    return firstPrice
      ? `${firstPrice.label}: ${formatCurrencyCents(equipment.precos?.[firstPrice.key] ?? 0)}`
      : 'Sob consulta';
  }

  protected commercialSummary(equipment: Equipamento): string {
    const value = equipment.assetValueCents ? formatCurrencyCents(equipment.assetValueCents) : 'Sem valor';
    const total = equipment.totalInvestedCents
      ? formatCurrencyCents(equipment.totalInvestedCents)
      : 'Sem total';

    return `${value} | Total ${total}`;
  }

  protected async signOut() {
    await this.authService.signOut();
    void this.router.navigateByUrl('/gestor/login');
  }

  private equipmentSortValue(equipment: Equipamento): string | number {
    switch (this.sortKey) {
      case 'createdAt':
        return newestSortValue(equipment.createdAt, equipment.id);
      case 'code':
        return equipment.codigoInterno ?? equipment.id;
      case 'category':
        return equipment.equipamentoCategoria.nome;
      case 'price':
        return equipment.precos?.monthlyPriceCents || equipment.precos?.dailyPriceCents || 0;
      case 'assetValue':
        return equipment.totalInvestedCents ?? equipment.assetValueCents ?? 0;
      case 'stock':
        return equipment.stockQuantity ?? 0;
      case 'status':
        return equipment.status ?? 'active';
      case 'name':
      default:
        return equipment.nome;
    }
  }

  private async loadCatalog(showLoading = true) {
    if (showLoading) {
      this.loading = true;
    }

    this.errorMessage = '';

    try {
      const [categories, equipments] = await withTimeout(
        Promise.all([
          this.catalogService.listCategories({ includeArchived: true }),
          this.catalogService.listEquipments({ includeArchived: true }),
        ]),
        CATALOG_LOAD_TIMEOUT_MS
      );
      this.categories = [...categories].sort(compareCategoryByCode);
      this.equipments = equipments;

      if (!this.equipments.length) {
        throw new Error('EMPTY_CATALOG');
      }
    } catch (error) {
      console.error('catalog manager load failed', error);
      this.useLocalCatalog('O Supabase demorou para responder. Mostrando o catálogo local.');
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  private async loadCatalogOnce(showLoading = false) {
    if (this.catalogLoadStarted) {
      return;
    }

    this.catalogLoadStarted = true;
    await this.loadCatalog(showLoading);
  }

  private useLocalCatalog(errorMessage = '') {
    this.categories = this.catalogService.getLocalCategories({ includeArchived: true });
    this.categories = [...this.categories].sort(compareCategoryByCode);
    this.equipments = this.catalogService.getLocalEquipments({ includeArchived: true });
    this.errorMessage = errorMessage;
  }
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function sortBy<Item>(
  items: Item[],
  getValue: (item: Item) => string | number | undefined,
  direction: SortDirection
): Item[] {
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...items].sort((left, right) => {
    const leftValue = getValue(left) ?? '';
    const rightValue = getValue(right) ?? '';

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return (leftValue - rightValue) * multiplier;
    }

    return String(leftValue).localeCompare(String(rightValue), 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    }) * multiplier;
  });
}

function newestSortValue(createdAt: string | undefined, id: number): number {
  const timestamp = createdAt ? Date.parse(createdAt) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp + id / 1_000_000 : id;
}

function compareCategoryByCode(left: EquipamentoCategoria, right: EquipamentoCategoria): number {
  return (left.codigo || left.nome).localeCompare(right.codigo || right.nome, 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  });
}

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('CATALOG_LOAD_TIMEOUT'));
    }, timeoutMs);

    promise.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}
