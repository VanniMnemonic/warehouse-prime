import { Injectable, inject } from '@angular/core';
import type { User, UserWithDetails } from '../../shared/types/models';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private electronService = inject(ElectronService);

  async getAll(): Promise<UserWithDetails[]> {
    return (await this.electronService.invoke('get-users')) ?? [];
  }

  // See AssetService for the rationale on `Record<string, unknown>` instead
  // of `Partial<User>`.
  async create(user: Record<string, unknown>): Promise<User> {
    return await this.electronService.invoke('add-user', user);
  }

  async update(user: Record<string, unknown>): Promise<User> {
    return await this.electronService.invoke('update-user', user);
  }

  async uploadImage(filePath: string): Promise<string> {
    return await this.electronService.invoke('upload-image', filePath);
  }

  getFilePath(file: File): string {
    return this.electronService.getFilePath(file);
  }
}
