import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  Building2,
  ClipboardList,
  FileText,
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
      class="flex max-w-full flex-wrap gap-2 rounded-box border border-base-300 bg-base-100 p-2 shadow-sm"
      aria-label="Menu da área gestora"
    >
      @for (item of navItems; track item.route) {
        <a
          class="btn btn-ghost btn-sm justify-start gap-2 whitespace-nowrap"
          routerLinkActive="btn-active"
          [routerLink]="item.route"
          [routerLinkActiveOptions]="{ exact: false }"
        >
          <lucide-angular [img]="item.icon" class="h-4 w-4"></lucide-angular>
          {{ item.label }}
        </a>
      }
    </nav>
  `,
})
export class GestorNavComponent {
  protected readonly navItems: GestorNavItem[] = [
    { label: 'Equipamentos', route: '/gestor/equipamentos', icon: Package },
    { label: 'Clientes', route: '/gestor/clientes', icon: UsersRound },
    { label: 'Orçamentos', route: '/gestor/orcamentos', icon: ClipboardList },
    { label: 'Contratos', route: '/gestor/contratos', icon: FileText },
    { label: 'Empresa', route: '/gestor/empresa', icon: Building2 },
    { label: 'Usuários', route: '/gestor/usuarios', icon: UserRound },
  ];
}
