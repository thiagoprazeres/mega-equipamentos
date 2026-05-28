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
  UserRound,
  LucideAngularModule,
} from 'lucide-angular';

import { GestorNavComponent } from '../../components/gestor-nav/gestor-nav';
import type { CatalogStatus } from '../../interfaces/equipamento';
import type { StaffUser, StaffUserRole } from '../../interfaces/staff-user';
import { AuthService } from '../../services/auth.service';
import { StaffUserService } from '../../services/staff-user.service';
import { matchesSearchQuery } from '../../utils/search';

const USERS_LOAD_TIMEOUT_MS = 4500;
type SortDirection = 'asc' | 'desc';
type UserSortKey = 'name' | 'role' | 'document' | 'contact' | 'address' | 'status';

@Component({
  selector: 'app-gestor-usuarios',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, GestorNavComponent],
  templateUrl: './gestor-usuarios.html',
})
export class GestorUsuariosPage implements OnInit {
  protected readonly Archive = Archive;
  protected readonly Eye = Eye;
  protected readonly LogOut = LogOut;
  protected readonly Pencil = Pencil;
  protected readonly Plus = Plus;
  protected readonly RotateCcw = RotateCcw;
  protected readonly Search = Search;
  protected readonly UserRound = UserRound;

  protected users: StaffUser[] = [];
  protected query = '';
  protected activeStatus: CatalogStatus | 'all' = 'active';
  protected selectedRole: StaffUserRole | 'all' = 'all';
  protected loading = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected sortKey: UserSortKey = 'name';
  protected sortDirection: SortDirection = 'asc';
  protected readonly roleOptions: Array<{ value: StaffUserRole | 'all'; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'admin', label: 'Admin' },
    { value: 'vendedor', label: 'Vendedor' },
    { value: 'operador', label: 'Operador' },
    { value: 'financeiro', label: 'Financeiro' },
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly staffUserService: StaffUserService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadUsers();
    }
  }

  protected filteredUsers(): StaffUser[] {
    const filtered = this.users.filter((user) => {
      const matchesStatus =
        this.activeStatus === 'all' || (user.status ?? 'active') === this.activeStatus;
      const matchesRole = this.selectedRole === 'all' || user.role === this.selectedRole;
      const matchesQuery = matchesSearchQuery(this.query, [
        user.id,
        user.nome,
        user.role,
        this.roleLabel(user.role),
        user.document,
        user.email,
        user.phone,
        user.whatsapp,
        user.address,
        user.authUserId,
      ]);

      return matchesStatus && matchesRole && matchesQuery;
    });

    return sortBy(filtered, (user) => this.userSortValue(user), this.sortDirection);
  }

  protected filteredUsersCount(): number {
    return this.filteredUsers().length;
  }

  protected setSort(key: UserSortKey) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      return;
    }

    this.sortKey = key;
    this.sortDirection = 'asc';
  }

  protected sortIndicator(key: UserSortKey): string {
    if (this.sortKey !== key) {
      return '';
    }

    return this.sortDirection === 'asc' ? '^' : 'v';
  }

  protected setStatus(status: CatalogStatus | 'all') {
    this.activeStatus = status;
  }

  protected setRole(role: StaffUserRole | 'all') {
    this.selectedRole = role;
  }

  protected async archive(user: StaffUser) {
    if (!confirm(`Arquivar ${user.nome}?`)) {
      return;
    }

    await this.staffUserService.archiveUser(user.id);
    this.successMessage = 'Usuário arquivado.';
    await this.loadUsers(false);
    this.changeDetector.detectChanges();
  }

  protected async restore(user: StaffUser) {
    await this.staffUserService.restoreUser(user.id);
    this.successMessage = 'Usuário restaurado.';
    await this.loadUsers(false);
    this.changeDetector.detectChanges();
  }

  protected userContact(user: StaffUser): string {
    return user.whatsapp || user.phone || user.email || 'Sem contato';
  }

  protected roleLabel(role: StaffUserRole): string {
    return this.roleOptions.find((option) => option.value === role)?.label ?? role;
  }

  protected async signOut() {
    await this.authService.signOut();
    void this.router.navigateByUrl('/gestor/login');
  }

  private userSortValue(user: StaffUser): string {
    switch (this.sortKey) {
      case 'role':
        return this.roleLabel(user.role);
      case 'document':
        return user.document ?? '';
      case 'contact':
        return this.userContact(user);
      case 'address':
        return user.address ?? '';
      case 'status':
        return user.status ?? 'active';
      case 'name':
      default:
        return user.nome;
    }
  }

  private async loadUsers(showLoading = true) {
    if (showLoading) {
      this.loading = true;
    }

    this.errorMessage = '';

    try {
      this.users = await withTimeout(
        this.staffUserService.listUsers(true),
        USERS_LOAD_TIMEOUT_MS
      );
    } catch (error) {
      console.error('users manager load failed', error);
      this.errorMessage = 'Não foi possível carregar os usuários.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
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

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('SELLERS_LOAD_TIMEOUT'));
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
