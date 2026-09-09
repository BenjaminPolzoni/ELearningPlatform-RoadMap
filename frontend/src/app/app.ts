import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthMockService } from './core/auth/auth-mock.service';
import { ThemeService } from './core/theme.service';
import { RankingTrigger } from './features/ranking/ranking-trigger';

/** Shell: navbar (solo con sesión) + outlet + botón HI-RANKING del ranking + gate desktop-only (RF-NFR-05). */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RankingTrigger],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthMockService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly esDesktop = signal(this.medir());

  @HostListener('window:resize')
  protected onResize(): void {
    this.esDesktop.set(this.medir());
  }

  protected salir(): void {
    this.auth.salir();
    this.router.navigate(['/login']);
  }

  private medir(): boolean {
    return window.innerWidth >= 1024;
  }
}
