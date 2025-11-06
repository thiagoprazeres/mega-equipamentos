import { Component, signal } from '@angular/core';
import { Header } from "./components/header/header";
import { Footer } from "./components/footer/footer";
import { RouterOutlet } from '@angular/router';
import { WhatsAppButton } from './components/whats-app-button/whats-app-button';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [Header, Footer, RouterOutlet, WhatsAppButton]
})
export class App {
  protected readonly title = signal('mega-equipamentos');
}
