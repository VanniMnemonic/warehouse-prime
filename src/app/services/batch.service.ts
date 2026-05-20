import { Injectable, inject } from '@angular/core';
import type { Batch } from '../../shared/types/models';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class BatchService {
  private electronService = inject(ElectronService);

  async getByAsset(assetId: number): Promise<Batch[]> {
    return (await this.electronService.invoke('get-batches-by-asset', assetId)) ?? [];
  }

  // Forms emit `null` for empty optional fields, which `Partial<Batch>` rejects.
  // See AssetService for the rationale on `Record<string, unknown>`.
  async create(batchData: Record<string, unknown>): Promise<Batch> {
    return await this.electronService.invoke('add-batch', batchData);
  }

  async update(batchData: Record<string, unknown>): Promise<Batch> {
    return await this.electronService.invoke('update-batch', batchData);
  }

  async getBySerial(serialNumber: string): Promise<Batch | null> {
    return (await this.electronService.invoke('get-batch-by-serial', serialNumber)) ?? null;
  }

  async getByLocation(locationId: number): Promise<Batch[]> {
    return (await this.electronService.invoke('get-batches-by-location', locationId)) ?? [];
  }

  async getExpiringWithinDays(days: number): Promise<Batch[]> {
    return (await this.electronService.invoke('get-batches-expiring-within-days', days)) ?? [];
  }

  async getExpired(): Promise<Batch[]> {
    return (await this.electronService.invoke('get-batches-expired')) ?? [];
  }
}
