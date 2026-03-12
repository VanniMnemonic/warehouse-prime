import { Injectable, inject } from '@angular/core';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private electronService = inject(ElectronService);

  async getAll(): Promise<any[]> {
    const startedAt = performance.now();
    console.log('[locations] getAll:start');
    try {
      const result = (await this.electronService.invoke('get-locations')) ?? [];
      const elapsedMs = Math.round(performance.now() - startedAt);
      console.log('[locations] getAll:done', { elapsedMs, count: result.length });
      return result;
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      console.error('[locations] getAll:error', { elapsedMs, error });
      throw error;
    }
  }

  async create(location: any): Promise<any> {
    const startedAt = performance.now();
    console.log('[locations] create:start', { location });
    try {
      const created = await this.electronService.invoke('add-location', location);
      const elapsedMs = Math.round(performance.now() - startedAt);
      console.log('[locations] create:done', { elapsedMs, created });
      return created;
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      console.error('[locations] create:error', { elapsedMs, error });
      throw error;
    }
  }
}
