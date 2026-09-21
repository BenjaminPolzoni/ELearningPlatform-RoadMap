import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Root of the standalone roadmap app: it only hosts the router outlet. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
