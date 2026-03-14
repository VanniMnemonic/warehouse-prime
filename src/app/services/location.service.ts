import { Injectable, inject } from '@angular/core';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private electronService = inject(ElectronService);

  async getAll(): Promise<any[]> {
    return (await this.electronService.invoke('get-locations')) ?? [];
  }

  async create(location: any): Promise<any> {
    return await this.electronService.invoke('add-location', location);
  }

  async update(location: any): Promise<any> {
    return await this.electronService.invoke('update-location', location);
  }

  async updateHierarchy(
    updates: Array<{ id: number; parent_id: number | null; sort_order: number }>,
  ): Promise<void> {
    await this.electronService.invoke('update-locations-hierarchy', updates);
  }
}
