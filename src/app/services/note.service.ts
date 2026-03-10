import { Injectable, inject } from '@angular/core';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class NoteService {
  private electronService = inject(ElectronService);

  async getByEntity(entityType: string, entityId: number): Promise<any[]> {
    return (await this.electronService.invoke('get-notes', entityType, entityId)) ?? [];
  }

  async create(note: any): Promise<any> {
    return await this.electronService.invoke('add-note', note);
  }

  async delete(id: number): Promise<void> {
    return await this.electronService.invoke('delete-note', id);
  }
}
