import { Injectable, inject } from '@angular/core';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class BatchService {
  private electronService = inject(ElectronService);

  async getByAsset(assetId: number): Promise<any[]> {
    return (await this.electronService.invoke('get-batches-by-asset', assetId)) ?? [];
  }

  async create(batchData: any): Promise<any> {
    return await this.electronService.invoke('add-batch', batchData);
  }

  async update(batchData: any): Promise<any> {
    return await this.electronService.invoke('update-batch', batchData);
  }

  async getBySerial(serialNumber: string): Promise<any> {
    return await this.electronService.invoke('get-batch-by-serial', serialNumber);
  }
}
