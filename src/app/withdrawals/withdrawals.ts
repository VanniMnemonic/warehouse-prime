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

  ngOnInit() {
    this.loadWithdrawals();
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

  onFormSave(withdrawalData: any) {
    console.log('Saving withdrawal:', withdrawalData);
    // TODO: Implement save logic via WithdrawalService
    // await this.withdrawalService.create(withdrawalData);
    this.formDrawerVisible = false;
    this.loadWithdrawals();
  }

  onFormCancel() {
    this.formDrawerVisible = false;
  }
}
