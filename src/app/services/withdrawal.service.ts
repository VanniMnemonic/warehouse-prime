import { Injectable, inject } from '@angular/core';
import type { Withdrawal } from '../../shared/types/models';
import { ElectronService } from './electron';

@Injectable({
  providedIn: 'root',
})
export class WithdrawalService {
  private electronService = inject(ElectronService);

  async getByUser(userId: number): Promise<Withdrawal[]> {
    return (await this.electronService.invoke('get-withdrawals-by-user', userId)) ?? [];
  }

  async getByAsset(assetId: number): Promise<Withdrawal[]> {
    return (await this.electronService.invoke('get-withdrawals-by-asset', assetId)) ?? [];
  }

  async getAll(): Promise<Withdrawal[]> {
    return (await this.electronService.invoke('get-withdrawals')) ?? [];
  }

  async getOverdue(): Promise<Withdrawal[]> {
    return (await this.electronService.invoke('get-withdrawals-overdue')) ?? [];
  }

  // The withdrawal form composes the payload from multiple controls
  // (asset / batch / quantity / must_return / dates) — typing it tightly
  // here would force the form into a typed FormGroup, out of scope.
  async create(withdrawal: unknown): Promise<Withdrawal[]> {
    return (await this.electronService.invoke('add-withdrawal', withdrawal)) ?? [];
  }

  async return(
    withdrawalId: number,
    returnDate: Date,
    returnedQuantity: number,
    inefficientQuantity: number,
  ): Promise<Withdrawal> {
    return await this.electronService.invoke('return-withdrawal', {
      id: withdrawalId,
      date: returnDate,
      returnedQuantity,
      inefficientQuantity,
    });
  }

  async forceReturn(
    withdrawalId: number,
    returnDate: Date,
    returnedQuantity: number,
  ): Promise<Withdrawal> {
    return await this.electronService.invoke('force-return-withdrawal', {
      id: withdrawalId,
      date: returnDate,
      returnedQuantity,
    });
  }
}
