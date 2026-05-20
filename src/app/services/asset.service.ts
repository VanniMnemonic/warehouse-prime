import { Injectable, inject } from '@angular/core';
import type { Asset, AssetWithDetails } from '../../shared/types/models';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class AssetService {
  private electronService = inject(ElectronService);

  async getAll(): Promise<AssetWithDetails[]> {
    return (await this.electronService.invoke('get-assets')) ?? [];
  }

  // `asset` is typed loosely because Angular FormGroups emit `null` for
  // empty optional fields, which doesn't satisfy `Partial<Asset>`. The DB
  // ignores extraneous nulls. Tighten once we move forms to typed
  // FormGroups.
  async create(asset: Record<string, unknown>): Promise<Asset> {
    return await this.electronService.invoke('add-asset', asset);
  }

  async update(asset: Record<string, unknown>): Promise<Asset> {
    return await this.electronService.invoke('update-asset', asset);
  }

  async delete(id: number): Promise<boolean> {
    return await this.electronService.invoke('delete-asset', id);
  }

  async uploadImage(filePath: string): Promise<string> {
    return await this.electronService.invoke('upload-image', filePath);
  }

  getFilePath(file: File): string {
    return this.electronService.getFilePath(file);
  }
}
