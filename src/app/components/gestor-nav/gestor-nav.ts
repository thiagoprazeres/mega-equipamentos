import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  Banknote,
  Building2,
  ClipboardList,
  FileText,
  HandCoins,
  Package,
  UserRound,
  UsersRound,
  LucideAngularModule,
  type LucideIconData,
} from 'lucide-angular';

interface GestorNavItem {
  label: string;
  route: string;
  icon: LucideIconData;
}

@Component({
  selector: 'app-gestor-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <nav
      class="flex min-h-full flex-col border-r border-base-300 bg-base-100 text-base-content shadow-sm transition-[width] duration-200 is-drawer-close:w-16 is-drawer-open:w-72"
      aria-label="Menu da área gestora"
    >
      <div class="flex h-16 items-center gap-3 border-b border-base-300 px-3">
        <img
          class="h-10 w-10 shrink-0 rounded-lg bg-base-100 object-contain p-1 ring-1 ring-base-300"
          src="logo-mega-gestor-rental-mark.png"
          alt="Mega Gestor Rental"
        />
        <div class="min-w-0 is-drawer-close:hidden">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/55">Área gestora</p>
          <p class="truncate text-sm font-extrabold text-primary">Mega Gestor Rental</p>
        </div>
      </div>

      <ul class="menu w-full grow gap-1 p-2">
        @for (item of navItems; track item.route) {
          <li>
            <a
              class="is-drawer-close:tooltip is-drawer-close:tooltip-right gap-3 rounded-lg"
              routerLinkActive="menu-active"
              [attr.aria-label]="item.label"
              [attr.data-tip]="item.label"
              [routerLink]="item.route"
              [routerLinkActiveOptions]="{ exact: false }"
            >
              <lucide-angular [img]="item.icon" class="h-5 w-5 shrink-0"></lucide-angular>
              <span class="truncate is-drawer-close:hidden">{{ item.label }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class GestorNavComponent {
  protected readonly navItems: GestorNavItem[] = [
    { label: 'Estoque', route: '/gestor/equipamentos', icon: Package },
    { label: 'Clientes', route: '/gestor/clientes', icon: UsersRound },
    { label: 'Leads', route: '/gestor/leads', icon: UserRound },
    { label: 'Orçamentos', route: '/gestor/orcamentos', icon: ClipboardList },
    { label: 'Contratos', route: '/gestor/contratos', icon: FileText },
    { label: 'Recebimentos', route: '/gestor/recebimentos', icon: HandCoins },
    { label: 'Financeiro', route: '/gestor/financeiro', icon: Banknote },
    { label: 'Empresa', route: '/gestor/empresa', icon: Building2 },
    { label: 'Usuários', route: '/gestor/usuarios', icon: UserRound },
  ];
}
