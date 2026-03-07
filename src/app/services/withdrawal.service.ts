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

  async create(withdrawal: any): Promise<any> {
    return await this.electronService.invoke('add-withdrawal', withdrawal);
  }

  async return(withdrawalId: number, returnDate: Date): Promise<any> {
    return await this.electronService.invoke('return-withdrawal', {
      id: withdrawalId,
      date: returnDate,
    });
  }
}
