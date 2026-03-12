import { Injectable, NgZone, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  private ipcRenderer: any;
  private webUtils: any;
  private zone = inject(NgZone);
  private debugChannels = new Set(['add-location', 'get-locations']);

  private sendToMain(level: 'log' | 'warn' | 'error', message: string, meta?: any) {
    if (!this.ipcRenderer?.send) return;
    try {
      this.ipcRenderer.send('renderer-log', {
        level,
        message,
        meta,
        time: new Date().toISOString(),
      });
    } catch {}
  }

  constructor() {
    if (this.isElectron()) {
      const electron = (window as any).require('electron');
      this.ipcRenderer = electron.ipcRenderer;
      this.webUtils = electron.webUtils;
    }
  }

  isElectron(): boolean {
    return !!(window && (window as any).process && (window as any).process.type);
  }

  async invoke(channel: string, ...args: any[]): Promise<any> {
    if (this.isElectron()) {
      const startedAt = performance.now();
      if (this.debugChannels.has(channel)) {
        try {
          console.log(`[ipc->] ${channel}`, { args });
        } catch {}
        this.sendToMain('log', `[ipc->] ${channel}`, { args });
      }
      const promise = this.ipcRenderer.invoke(channel, ...args);
      return await new Promise((resolve, reject) => {
        promise.then(
          (value: any) =>
            this.zone.run(() => {
              if (this.debugChannels.has(channel)) {
                const elapsedMs = Math.round(performance.now() - startedAt);
                console.log(`[ipc<-] ${channel}`, { elapsedMs, value });
                this.sendToMain('log', `[ipc<-] ${channel}`, { elapsedMs, value });
              }
              resolve(value);
            }),
          (err: any) =>
            this.zone.run(() => {
              if (this.debugChannels.has(channel)) {
                const elapsedMs = Math.round(performance.now() - startedAt);
                console.error(`[ipc<!>] ${channel}`, { elapsedMs, err });
                this.sendToMain('error', `[ipc<!>] ${channel}`, { elapsedMs, err });
              }
              reject(err);
            }),
        );
      });
    }
    return null;
  }

  getFilePath(file: File): string {
    if (this.isElectron() && this.webUtils) {
      return this.webUtils.getPathForFile(file);
    }
    return (file as any).path;
  }

  // Deprecated: Use UserService instead
  async getUsers(): Promise<any[]> {
    return this.invoke('get-users');
  }

  // Deprecated: Use UserService instead
  async addUser(user: any): Promise<any> {
    return this.invoke('add-user', user);
  }
}
