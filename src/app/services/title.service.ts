import { Injectable, inject } from '@angular/core';
import type { Title } from '../../shared/types/models';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class TitleService {
  private electronService = inject(ElectronService);

  async getAll(): Promise<Title[]> {
    return (await this.electronService.invoke('get-titles')) ?? [];
  }

  async create(title: Record<string, unknown>): Promise<Title> {
    return await this.electronService.invoke('add-title', title);
  }
}
