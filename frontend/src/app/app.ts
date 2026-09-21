import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthMockService } from './core/auth/auth-mock.service';

/** Shell: outlet + desktop-only gate (RF-NFR-05). */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthMockService);
  private readonly router = inject(Router);

  protected readonly isDesktop = signal(this.measure());

  @HostListener('window:resize')
  protected onResize(): void {
    this.isDesktop.set(this.measure());
  }

  protected exit(): void {
    this.auth.exit();
    this.router.navigate(['/login']);
  }

  private measure(): boolean {
    return window.innerWidth >= 1024;
  }
}
