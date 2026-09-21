import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SyncChannelService, type SyncMessage } from './sync-channel.service';

describe('SyncChannelService', () => {
  let service: SyncChannelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SyncChannelService);
  });

  afterEach(() => {
    service.destroy();
  });

  it('is created correctly', () => {
    expect(service).toBeTruthy();
  });

  it('allows emitting messages through the channel without throwing exceptions', () => {
    const msg: SyncMessage = {
      type: 'course_updated',
      courseId: 'curso-123',
      timestamp: Date.now(),
    };
    expect(() => service.broadcast(msg)).not.toThrow();
  });
});
