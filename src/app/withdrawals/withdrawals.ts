import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WithdrawalService } from '../services/withdrawal.service';
import { DialogModule } from 'primeng/dialog';
import { WithdrawalForm } from './withdrawal-form/withdrawal-form';
import { WithdrawalReturnForm } from './withdrawal-return-form/withdrawal-return-form';
import { WithdrawalsTable } from './withdrawals-table/withdrawals-table';

@Component({
  selector: 'app-withdrawals',
  imports: [
    CommonModule,
    DialogModule,
    WithdrawalForm,
    WithdrawalReturnForm,
    WithdrawalsTable,
  ],
  templateUrl: './withdrawals.html',
  styleUrl: './withdrawals.css',
})
export class Withdrawals implements OnInit {
  withdrawalService = inject(WithdrawalService);
  cdr = inject(ChangeDetectorRef);

  withdrawals: any[] = [];
  loading: boolean = true;
  formDrawerVisible: boolean = false;
  returnDrawerVisible: boolean = false;
  selectedWithdrawal: any = null;

  ngOnInit() {
    this.loadWithdrawals();
  }

  openDetails(withdrawal: any) {
    console.log('View details for:', withdrawal);
  }

  async loadWithdrawals() {
    try {
      this.loading = true;
      this.withdrawals = await this.withdrawalService.getAll();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  openAddWithdrawal() {
    this.formDrawerVisible = true;
  }

  openReturn(withdrawal: any) {
    this.selectedWithdrawal = withdrawal;
    this.returnDrawerVisible = true;
  }

  async onFormSave(withdrawalData: any) {
    try {
      this.loading = true;
      await this.withdrawalService.create(withdrawalData);
      this.formDrawerVisible = false;
      await this.loadWithdrawals();
    } catch (error) {
      console.error('Error saving withdrawal:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  onFormCancel() {
    this.formDrawerVisible = false;
  }

  async onReturnSave() {
    this.returnDrawerVisible = false;
    await this.loadWithdrawals();
  }

  onReturnCancel() {
    this.returnDrawerVisible = false;
  }
}
