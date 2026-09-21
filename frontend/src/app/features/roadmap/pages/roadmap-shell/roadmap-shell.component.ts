import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Layout of the roadmap feature: outlet + desktop-only gate (RF-NFR-05). */
@Component({
  selector: 'app-roadmap-shell',
  imports: [RouterOutlet],
  templateUrl: './roadmap-shell.component.html',
  styleUrl: './roadmap-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapShellComponent {
  protected readonly isDesktop = signal(this.measure());

  @HostListener('window:resize')
  protected onResize(): void {
    this.isDesktop.set(this.measure());
  }

  private measure(): boolean {
    return window.innerWidth >= 1024;
  }
}
