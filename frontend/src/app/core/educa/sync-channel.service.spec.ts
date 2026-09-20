import { TestBed } from '@angular/core/testing';
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

  it('se crea correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('permite emitir mensajes por el canal sin lanzar excepciones', () => {
    const msg: SyncMessage = {
      type: 'course_updated',
      courseId: 'curso-123',
      timestamp: Date.now(),
    };
    expect(() => service.broadcast(msg)).not.toThrow();
  });
});
