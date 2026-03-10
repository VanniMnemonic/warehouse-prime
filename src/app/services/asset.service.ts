import { Injectable, inject } from '@angular/core';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class AssetService {
  private electronService = inject(ElectronService);

  async getAll(): Promise<any[]> {
    return (await this.electronService.invoke('get-assets')) ?? [];
  }

  async create(asset: any): Promise<any> {
    return await this.electronService.invoke('add-asset', asset);
  }

  async update(asset: any): Promise<any> {
    return await this.electronService.invoke('update-asset', asset);
  }

  async uploadImage(filePath: string): Promise<string> {
    return await this.electronService.invoke('upload-image', filePath);
  }

  getFilePath(file: File): string {
    return this.electronService.getFilePath(file);
  }
}
