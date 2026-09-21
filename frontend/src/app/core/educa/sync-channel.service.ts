import { Injectable, NgZone, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type SyncMessage =
  | { type: 'course_updated'; courseId: string; timestamp: number }
  | { type: 'unit_deleted'; courseId: string; unitId: string; timestamp: number }
  | { type: 'roadmap_updated'; timestamp: number };

export type SyncMessageInput =
  | { type: 'course_updated'; courseId: string; timestamp?: number }
  | { type: 'unit_deleted'; courseId: string; unitId: string; timestamp?: number }
  | { type: 'roadmap_updated'; timestamp?: number };

const CHANNEL_NAME = 'educa_sync_channel';
const STORAGE_SYNC_KEY = 'educa_sync_event';

@Injectable({ providedIn: 'root' })
export class SyncChannelService {
  private ngZone = inject(NgZone);
  private channel: BroadcastChannel | null = null;
  private messages$ = new Subject<SyncMessage>();

  constructor() {
    this.initChannel();
    this.initStorageFallback();
  }

  /**
   * Observable stream of all synchronization messages received from other tabs.
   */
  get events$(): Observable<SyncMessage> {
    return this.messages$.asObservable();
  }

  /**
   * Emits a synchronization message to all open tabs and to local subscribers.
   */
  broadcast(msg: SyncMessageInput): void {
    const fullMsg: SyncMessage = {
      ...msg,
      timestamp: msg.timestamp ?? Date.now(),
    } as SyncMessage;

    // 1. Emit locally for components in the same tab or test suites
    this.messages$.next(fullMsg);

    // 2. Emit through BroadcastChannel (modern high-speed standard between tabs)
    if (this.channel) {
      try {
        this.channel.postMessage(fullMsg);
      } catch {
        /* fallback */
      }
    }

    // 3. Also emit through localStorage (StorageEvent) as a safe fallback
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(fullMsg));
      }
    } catch {
      /* ignore */
    }
  }

  /**
   * Closes the listeners and open channels.
   */
  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.onStorageEvent);
    }
  }

  private initChannel(): void {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
          if (event?.data?.type) {
            this.ngZone.run(() => {
              this.messages$.next(event.data);
            });
          }
        };
      } catch {
        this.channel = null;
      }
    }
  }

  private initStorageFallback(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.onStorageEvent);
    }
  }

  private onStorageEvent = (event: StorageEvent): void => {
    if (event.key === STORAGE_SYNC_KEY && event.newValue) {
      try {
        const msg = JSON.parse(event.newValue) as SyncMessage;
        if (msg?.type) {
          this.ngZone.run(() => {
            this.messages$.next(msg);
          });
        }
      } catch {
        /* ignore */
      }
    }
  };
}
