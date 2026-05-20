import { Injectable, NgZone, inject } from '@angular/core';

/**
 * Surface exposed by `src/electron/preload.js` via `contextBridge`.
 * The renderer can ONLY reach the main process through this object —
 * `window.require`, `process`, `Buffer` etc. are not in scope.
 */
interface ElectronAPI {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  getFilePath(file: File): string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    electron?: ElectronAPI;
  }
}

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  private zone = inject(NgZone);

  // Captured at construction. With contextIsolation: true the bridge is
  // injected before any renderer script runs, so this is always defined
  // in a real Electron host; only `ng serve` in a plain browser tab
  // leaves it undefined (used as the dev-only fallback).
  private api: ElectronAPI | undefined =
    typeof window !== 'undefined' ? window.electron : undefined;

  isElectron(): boolean {
    return !!this.api;
  }

  async invoke(channel: string, ...args: unknown[]): Promise<any> {
    if (!this.api) return null;
    // The promise returned by the bridge resolves outside Angular's zone;
    // hop the resolution back in so signals / change detection see it.
    const promise = this.api.invoke(channel, ...args);
    return await new Promise<any>((resolve, reject) => {
      promise.then(
        (value) => this.zone.run(() => resolve(value)),
        (err) => this.zone.run(() => reject(err)),
      );
    });
  }

  getFilePath(file: File): string {
    if (this.api) return this.api.getFilePath(file);
    // ng-serve fallback: in plain browser context File has no `.path`.
    return (file as { path?: string }).path ?? '';
  }

  // Deprecated: Use UserService instead
  async getUsers(): Promise<any[]> {
    return (await this.invoke('get-users')) ?? [];
  }

  // Deprecated: Use UserService instead
  async addUser(user: unknown): Promise<unknown> {
    return await this.invoke('add-user', user);
  }
}
