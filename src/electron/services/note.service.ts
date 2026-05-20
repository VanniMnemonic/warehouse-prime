import type { Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Note } from '../entities/Note';

export class NoteService {
  // Lazy getter so the repository survives a DataSource destroy/initialize
  // cycle (used by backup import to release the SQLite file handle).
  private get repository(): Repository<Note> {
    return AppDataSource.getRepository(Note);
  }

  async getAll(): Promise<Note[]> {
    return this.repository.find({
      relations: ['asset', 'batch', 'location', 'title', 'user', 'withdrawal'],
      order: { created_at: 'DESC' },
    });
  }

  async getByEntity(entityType: string, entityId: number): Promise<Note[]> {
    const where: any = {};
    // Map entityType to the column name in Note entity
    // entityType should be one of: 'asset', 'batch', 'location', 'title', 'user', 'withdrawal'
    where[`${entityType}_id`] = entityId;
    
    return this.repository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async create(noteData: Partial<Note>): Promise<Note> {
    const note = this.repository.create(noteData);
    return this.repository.save(note);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
