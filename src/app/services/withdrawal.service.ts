import { Injectable, inject } from '@angular/core';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class WithdrawalService {
  private electronService = inject(ElectronService);

  async getByUser(userId: number): Promise<any[]> {
    return await this.electronService.invoke('get-withdrawals-by-user', userId);
  }

  async getAll(): Promise<any[]> {
    return await this.electronService.invoke('get-withdrawals');
  }
}
