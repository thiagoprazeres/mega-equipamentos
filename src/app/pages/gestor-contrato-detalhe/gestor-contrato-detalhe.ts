import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArrowLeft, FileText, LucideAngularModule } from 'lucide-angular';

import type {
  RentalBillingPeriod,
  RentalContract,
  RentalContractStatus,
  RentalFinancialStatus,
  RentalOperationalCode,
  RentalPaymentMethod,
} from '../../interfaces/rental-contract';
import { RentalContractService } from '../../services/rental-contract.service';
import { formatCurrencyCents } from '../../utils/prices';

const PERIOD_LABELS: Record<RentalBillingPeriod, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  fortnightly: 'Quinzenal',
  monthly: 'Mensal',
};
const STATUS_LABELS: Record<RentalContractStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  closed: 'Encerrado',
  returned: 'Devolvido',
  cancelled: 'Cancelado',
};
const FINANCIAL_STATUS_LABELS: Record<RentalFinancialStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Atrasado',
  partial: 'Parcial',
  cancelled: 'Cancelado',
};
const PAYMENT_METHOD_LABELS: Record<RentalPaymentMethod, string> = {
  not_defined: 'Não definido',
  pix: 'Pix',
  cash: 'Dinheiro',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  bank_transfer: 'Transferência',
  boleto: 'Boleto',
  courtesy: 'Cortesia',
  other: 'Outro',
};
const OPERATIONAL_CODE_LABELS: Record<RentalOperationalCode, string> = {
  CR: 'Contrato renovado',
  SR: 'Sem renovação',
  'SR/C': 'Sem renovação/coletado',
};

@Component({
  selector: 'app-gestor-contrato-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-contrato-detalhe.html',
})
export class GestorContratoDetalhePage implements OnInit {
  protected readonly ArrowLeft = ArrowLeft;
  protected readonly FileText = FileText;

  protected contract: RentalContract | null = null;
  protected loading = true;
  protected errorMessage = '';

  constructor(
    private readonly changeDetector: ChangeDetectorRef,
    private readonly rentalContractService: RentalContractService,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    try {
      const contracts = await this.rentalContractService.listContracts();
      this.contract = contracts.find((item) => item.id === id) ?? null;

      if (!this.contract) {
        this.errorMessage = 'Contrato não encontrado.';
      }
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível carregar o contrato.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  protected formatMoney(value: number): string {
    return formatCurrencyCents(value);
  }

  protected periodLabel(period: RentalBillingPeriod): string {
    return PERIOD_LABELS[period];
  }

  protected rentalDurationLabel(contract: RentalContract): string {
    return formatRentalDuration(contract.billingPeriod, contract.rentalPeriodCount);
  }

  protected statusLabel(status: RentalContractStatus): string {
    return STATUS_LABELS[status];
  }

  protected financialStatusLabel(status: RentalFinancialStatus): string {
    return FINANCIAL_STATUS_LABELS[status];
  }

  protected paymentMethodLabel(method: RentalPaymentMethod): string {
    return PAYMENT_METHOD_LABELS[method];
  }

  protected operationalCodeLabel(code: RentalOperationalCode): string {
    return OPERATIONAL_CODE_LABELS[code];
  }

  protected formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  }
}

function formatRentalDuration(period: RentalBillingPeriod, countValue: unknown): string {
  const count = normalizeRentalPeriodCount(countValue);
  const units: Record<RentalBillingPeriod, [string, string]> = {
    daily: ['diária', 'diárias'],
    weekly: ['semana', 'semanas'],
    fortnightly: ['quinzena', 'quinzenas'],
    monthly: ['mês', 'meses'],
  };
  const [singular, plural] = units[period];

  return `${count} ${count === 1 ? singular : plural}`;
}

function normalizeRentalPeriodCount(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.max(1, Math.trunc(numberValue)) : 1;
}
