import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  private ipcRenderer: any;

  constructor() {
    if (this.isElectron()) {
      this.ipcRenderer = (window as any).require('electron').ipcRenderer;
    }
  }

  isElectron(): boolean {
    return !!(window && (window as any).process && (window as any).process.type);
  }

  async getUsers(): Promise<any[]> {
    if (this.isElectron()) {
      return await this.ipcRenderer.invoke('get-users');
    }
    return [];
  }

  async addUser(user: any): Promise<any> {
    if (this.isElectron()) {
      return await this.ipcRenderer.invoke('add-user', user);
    }
    return null;
  }
}
