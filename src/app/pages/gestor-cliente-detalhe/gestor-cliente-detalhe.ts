import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArrowLeft, Printer, LucideAngularModule } from 'lucide-angular';

import type { Customer } from '../../interfaces/customer';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-gestor-cliente-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-cliente-detalhe.html',
  styles: [`
    @media print {
      @page {
        size: A4;
        margin: 12mm;
      }

      :host {
        display: block;
        color: #111827;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
      }

      .client-detail-page {
        min-height: auto !important;
        background: #ffffff !important;
        padding: 0 !important;
      }

      .client-print-shell {
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .screen-only {
        display: none !important;
      }

      .client-print-document {
        border: 0 !important;
        border-radius: 0 !important;
        background: #ffffff !important;
        box-shadow: none !important;
        padding: 0 !important;
      }

      .client-print-header {
        display: grid !important;
        grid-template-columns: 42mm 1fr 32mm;
        align-items: center;
        gap: 8mm;
        border: 1px solid #111827 !important;
        border-radius: 3mm;
        padding: 7mm;
        break-inside: avoid;
      }

      .client-print-logo {
        width: 38mm !important;
        height: auto !important;
      }

      .client-print-eyebrow {
        color: #004aad !important;
        font-size: 8pt !important;
        font-weight: 700 !important;
        letter-spacing: 0.12em !important;
        text-transform: uppercase !important;
      }

      .client-print-title {
        color: #111827 !important;
        font-size: 18pt !important;
        line-height: 1.15 !important;
      }

      .client-print-subtitle,
      .client-print-meta {
        color: #374151 !important;
        font-size: 9pt !important;
      }

      .client-print-status {
        justify-self: end;
        border: 1px solid #111827 !important;
        border-radius: 999px !important;
        color: #111827 !important;
        background: #ffffff !important;
        padding: 2mm 5mm !important;
        font-size: 9pt !important;
        font-weight: 700 !important;
      }

      .client-print-summary {
        margin-top: 7mm !important;
        border: 1px solid #d1d5db !important;
        border-radius: 3mm !important;
        padding: 6mm !important;
        break-inside: avoid;
      }

      .client-print-name {
        color: #004aad !important;
        font-size: 17pt !important;
        line-height: 1.2 !important;
      }

      .client-print-code {
        color: #111827 !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
        font-size: 14pt !important;
      }

      .client-print-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 5mm;
        margin-top: 5mm !important;
      }

      .client-print-section {
        border: 1px solid #d1d5db !important;
        border-radius: 3mm !important;
        background: #ffffff !important;
        padding: 5mm !important;
        break-inside: avoid;
      }

      .client-print-section-full {
        grid-column: 1 / -1;
      }

      .client-print-section-title {
        color: #004aad !important;
        border-bottom: 1px solid #d1d5db !important;
        padding-bottom: 2mm !important;
        font-size: 11pt !important;
        font-weight: 700 !important;
      }

      .client-print-fields {
        margin-top: 3mm !important;
        display: grid !important;
        gap: 2.5mm !important;
      }

      .client-print-field {
        border-bottom: 1px solid #e5e7eb !important;
        padding-bottom: 2mm !important;
      }

      .client-print-field:last-child {
        border-bottom: 0 !important;
        padding-bottom: 0 !important;
      }

      .client-print-field dt {
        color: #6b7280 !important;
        font-size: 8pt !important;
        font-weight: 700 !important;
        letter-spacing: 0.05em !important;
        text-transform: uppercase !important;
      }

      .client-print-field dd {
        color: #111827 !important;
        margin-top: 1mm !important;
        font-size: 10.5pt !important;
        line-height: 1.35 !important;
        word-break: break-word;
      }

      .client-print-notes {
        min-height: 24mm;
        white-space: pre-line;
      }

      .client-print-footer {
        display: flex !important;
        justify-content: space-between;
        gap: 5mm;
        margin-top: 7mm !important;
        border-top: 1px solid #d1d5db !important;
        padding-top: 3mm !important;
        color: #6b7280 !important;
        font-size: 8pt !important;
      }
    }
  `],
})
export class GestorClienteDetalhePage implements OnInit {
  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Printer = Printer;

  protected customer: Customer | null = null;
  protected loading = true;
  protected errorMessage = '';
  protected readonly issuedAt = new Date();

  constructor(
    private readonly changeDetector: ChangeDetectorRef,
    private readonly customerService: CustomerService,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    try {
      const customers = await this.customerService.listCustomers(true);
      this.customer = customers.find((item) => item.id === id) ?? null;

      if (!this.customer) {
        this.errorMessage = 'Cliente não encontrado.';
      }
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível carregar o cliente.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  protected value(value?: string): string {
    return value || '-';
  }

  protected customerCode(customer: Customer): string {
    return `#${String(customer.id).padStart(6, '0')}`;
  }

  protected statusLabel(customer: Customer): string {
    return customer.status === 'archived' ? 'Arquivado' : 'Ativo';
  }

  protected formatDateTime(value?: string | Date): string {
    if (!value) {
      return '-';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }

  protected printPage() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
