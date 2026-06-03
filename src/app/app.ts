import { Component, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Header } from "./components/header/header";
import { Footer } from "./components/footer/footer";
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { WhatsAppButton } from './components/whats-app-button/whats-app-button';
import { ExternalLink, LucideAngularModule, PanelLeftOpen, ShieldCheck } from 'lucide-angular';
import { filter } from 'rxjs';
import { GestorNavComponent } from './components/gestor-nav/gestor-nav';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [Header, Footer, GestorNavComponent, RouterLink, RouterOutlet, WhatsAppButton, LucideAngularModule]
})
export class App {
  protected readonly title = signal('mega-equipamentos');
  protected readonly isAuthPage = signal(false);
  protected readonly isRestrictedArea = signal(false);
  protected readonly ExternalLink = ExternalLink;
  protected readonly PanelLeftOpen = PanelLeftOpen;
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
    const isLoginRoute = path === '/area-restrita' || path === '/gestor/login';

    this.isAuthPage.set(isLoginRoute);
    this.isRestrictedArea.set(!isLoginRoute && (path === '/gestor' || path.startsWith('/gestor/')));
  }
}
