import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { RoadmapShellComponent } from './roadmap-shell.component';

describe('RoadmapShellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoadmapShellComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('creates the shell', () => {
    const fixture = TestBed.createComponent(RoadmapShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('without a session it does not show the navbar', async () => {
    const fixture = TestBed.createComponent(RoadmapShellComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('header')).toBeNull();
  });
});
