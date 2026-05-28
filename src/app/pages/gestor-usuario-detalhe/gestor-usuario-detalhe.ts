import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArrowLeft, UserRound, LucideAngularModule } from 'lucide-angular';

import type { StaffUser, StaffUserRole } from '../../interfaces/staff-user';
import { StaffUserService } from '../../services/staff-user.service';

@Component({
  selector: 'app-gestor-usuario-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './gestor-usuario-detalhe.html',
})
export class GestorUsuarioDetalhePage implements OnInit {
  protected readonly ArrowLeft = ArrowLeft;
  protected readonly UserRound = UserRound;

  protected user: StaffUser | null = null;
  protected loading = true;
  protected errorMessage = '';

  constructor(
    private readonly changeDetector: ChangeDetectorRef,
    private readonly route: ActivatedRoute,
    private readonly staffUserService: StaffUserService
  ) {}

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    try {
      const users = await this.staffUserService.listUsers(true);
      this.user = users.find((item) => item.id === id) ?? null;

      if (!this.user) {
        this.errorMessage = 'Usuário não encontrado.';
      }
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message ? error.message : 'Não foi possível carregar o usuário.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }

  protected value(value?: string): string {
    return value || '-';
  }

  protected roleLabel(role: StaffUserRole): string {
    const labels: Record<StaffUserRole, string> = {
      admin: 'Admin',
      vendedor: 'Vendedor',
      operador: 'Operador',
      financeiro: 'Financeiro',
    };

    return labels[role];
  }
}
