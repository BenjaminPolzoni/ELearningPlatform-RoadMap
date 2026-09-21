import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RoadmapDataPort } from './data-access/roadmap/roadmap-data.port';
import { ROADMAP_ROUTES } from './roadmap.routes';

describe('ROADMAP_ROUTES', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mock-role', 'TEACHER');
    TestBed.configureTestingModule({ providers: [provideRouter(ROADMAP_ROUTES)] });
  });

  it('redirects the feature root to the home of the current role', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/teacher');
  });

  it('sends unknown paths (like the old /login) to the home of the current role', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');
    expect(TestBed.inject(Router).url).toBe('/teacher');
  });

  it.each(['/teacher', '/student', '/badges'])(
    'renders %s with the data ports provided by the route injector',
    async (url) => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      expect(harness.routeNativeElement?.textContent?.length ?? 0).toBeGreaterThan(0);
      expect(() => TestBed.inject(RoadmapDataPort)).toThrow();
    },
  );
});
