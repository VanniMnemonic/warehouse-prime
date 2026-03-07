import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { WithdrawalService } from '../services/withdrawal.service';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { WithdrawalForm } from './withdrawal-form/withdrawal-form';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MenuItem } from 'primeng/api';
import { WithdrawalReturnForm } from './withdrawal-return-form/withdrawal-return-form';

@Component({
  selector: 'app-withdrawals',
  imports: [
    CommonModule,
    TableModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    FormsModule,
    AvatarModule,
    TagModule,
    ButtonModule,
    DrawerModule,
    WithdrawalForm,
    SplitButtonModule,
    WithdrawalReturnForm,
  ],
  templateUrl: './withdrawals.html',
  styleUrl: './withdrawals.css',
})
export class Withdrawals implements OnInit {
  withdrawalService = inject(WithdrawalService);
  cdr = inject(ChangeDetectorRef);

  withdrawals: any[] = [];
  loading: boolean = true;
  searchValue: string | undefined;
  formDrawerVisible: boolean = false;
  returnDrawerVisible: boolean = false;
  selectedWithdrawal: any = null;

  items: MenuItem[] = [
    {
      label: 'View Details',
      icon: 'pi pi-eye',
      command: () => {
        console.log('View details for:', this.selectedWithdrawal);
      },
    },
  ];

  ngOnInit() {
    this.loadWithdrawals();
  }

  setMenuWithdrawal(withdrawal: any) {
    this.selectedWithdrawal = withdrawal;
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
