import { Injectable, inject } from '@angular/core';
import type { Note } from '../../shared/types/models';
import { ElectronService } from './electron';

/**
 * Entity types the IPC `get-notes` handler accepts. Must mirror the
 * column names on the Note entity (see `src/electron/entities/Note.ts`)
 * so that `<type>_id` maps to a real FK column.
 */
export type NoteEntityType = 'asset' | 'batch' | 'location' | 'title' | 'user' | 'withdrawal';

@Injectable({
  providedIn: 'root',
})
export class NoteService {
  private electronService = inject(ElectronService);

  async getByEntity(entityType: NoteEntityType, entityId: number): Promise<Note[]> {
    return (await this.electronService.invoke('get-notes', entityType, entityId)) ?? [];
  }

  async create(note: Record<string, unknown>): Promise<Note> {
    return await this.electronService.invoke('add-note', note);
  }

  async delete(id: number): Promise<void> {
    await this.electronService.invoke('delete-note', id);
  }
}
