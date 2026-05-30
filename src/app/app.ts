import { Component, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from "./components/header/header";
import { Footer } from "./components/footer/footer";
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { WhatsAppButton } from './components/whats-app-button/whats-app-button';
import { ArrowLeft, LayoutDashboard, LucideAngularModule, ShieldCheck } from 'lucide-angular';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [Header, Footer, RouterLink, RouterOutlet, WhatsAppButton, LucideAngularModule]
})
export class App {
  protected readonly title = signal('mega-equipamentos');
  protected readonly isRestrictedArea = signal(false);
  protected readonly ArrowLeft = ArrowLeft;
  protected readonly LayoutDashboard = LayoutDashboard;
  protected readonly ShieldCheck = ShieldCheck;

  constructor(private readonly router: Router) {
    this.updateLayoutForUrl(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((event) => this.updateLayoutForUrl(event.urlAfterRedirects));
  }

  private updateLayoutForUrl(url: string): void {
    const path = url.split(/[?#]/)[0];

    this.isRestrictedArea.set(
      path === '/area-restrita' || path === '/gestor' || path.startsWith('/gestor/')
    );
  }
}
