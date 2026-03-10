import { Injectable, inject } from '@angular/core';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class TitleService {
  private electronService = inject(ElectronService);

  async getAll(): Promise<any[]> {
    return (await this.electronService.invoke('get-titles')) ?? [];
  }

  async create(title: any): Promise<any> {
    return await this.electronService.invoke('add-title', title);
  }
}
