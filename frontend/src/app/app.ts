import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthMockService } from './core/auth/auth-mock.service';

/** Shell: outlet + gate desktop-only (RF-NFR-05). */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthMockService);
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
