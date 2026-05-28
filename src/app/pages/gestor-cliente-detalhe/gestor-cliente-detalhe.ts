import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArrowLeft, UserRound, LucideAngularModule } from 'lucide-angular';

import type { Customer } from '../../interfaces/customer';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-gestor-cliente-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-cliente-detalhe.html',
})
export class GestorClienteDetalhePage implements OnInit {
  protected readonly ArrowLeft = ArrowLeft;
  protected readonly UserRound = UserRound;

  protected customer: Customer | null = null;
  protected loading = true;
  protected errorMessage = '';

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
}
