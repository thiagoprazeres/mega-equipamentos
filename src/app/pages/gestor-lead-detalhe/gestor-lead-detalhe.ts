import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArrowLeft, Pencil, ReceiptText, UserRound, LucideAngularModule } from 'lucide-angular';

import type { CatalogStatus } from '../../interfaces/equipamento';
import type { EquipamentoCategoria } from '../../interfaces/equipamento-categoria';
import { leadOriginLabel, type Lead, type LeadOrigin } from '../../interfaces/lead';
import { CatalogService } from '../../services/catalog.service';
import { LeadService } from '../../services/lead.service';

@Component({
  selector: 'app-gestor-lead-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-lead-detalhe.html',
})
export class GestorLeadDetalhePage implements OnInit {
  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Pencil = Pencil;
  protected readonly ReceiptText = ReceiptText;
  protected readonly UserRound = UserRound;

  protected lead: Lead | null = null;
  protected interestCategories: EquipamentoCategoria[] = [];
  protected loading = true;
  protected errorMessage = '';

  constructor(
    private readonly catalogService: CatalogService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly leadService: LeadService,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    try {
      const [leads, categories] = await Promise.all([
        this.leadService.listLeads(true),
        this.catalogService.listCategories({ includeArchived: true }),
      ]);
      this.lead = leads.find((item) => item.id === id) ?? null;
      this.interestCategories = categories;

      if (!this.lead) {
        this.errorMessage = 'Lead não encontrado.';
      }
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível carregar o lead.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  protected customerCode(lead: Lead): string {
    return lead.customerId ? `#${lead.customerId}` : '-';
  }

  protected formatDateTime(value?: string | Date): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected leadContact(lead: Lead): string {
    return lead.whatsapp || lead.phone || lead.email || '-';
  }

  protected leadInterestGroup(lead: Lead): string {
    if (lead.interestCategoryName) {
      return lead.interestCategoryName;
    }

    const category = this.interestCategories.find((item) => item.id === lead.interestCategoryId);
    return category?.nome ?? '-';
  }

  protected leadOrigin(value?: LeadOrigin): string {
    return leadOriginLabel(value);
  }

  protected statusLabel(status?: CatalogStatus): string {
    return status === 'archived' ? 'Arquivado' : 'Ativo';
  }

  protected value(value?: string | number | null): string {
    return value === undefined || value === null || value === '' ? '-' : String(value);
  }
}
