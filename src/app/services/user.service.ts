import { Injectable, inject } from '@angular/core';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private electronService = inject(ElectronService);

  async getAll(): Promise<any[]> {
    return (await this.electronService.invoke('get-users')) ?? [];
  }

  async create(user: any): Promise<any> {
    return await this.electronService.invoke('add-user', user);
  }

  async update(user: any): Promise<any> {
    return await this.electronService.invoke('update-user', user);
  }

  async uploadImage(filePath: string): Promise<string> {
    return await this.electronService.invoke('upload-image', filePath);
  }

  getFilePath(file: File): string {
    return this.electronService.getFilePath(file);
  }
}
