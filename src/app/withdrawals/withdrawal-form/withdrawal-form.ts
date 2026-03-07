import { Component, inject, output, signal } from '@angular/core';
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { UserService } from '../../services/user.service';
import { BatchService } from '../../services/batch.service';
import { AssetService } from '../../services/asset.service';
import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-withdrawal-form',
  imports: [
    StepperModule,
    ButtonModule,
    CommonModule,
    FormsModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    AvatarModule,
    InputNumberModule,
    DatePickerModule,
    CheckboxModule,
  ],
  templateUrl: './withdrawal-form.html',
  styleUrl: './withdrawal-form.css',
  providers: [MessageService],
})
export class WithdrawalForm {
  userService = inject(UserService);
  batchService = inject(BatchService);
  assetService = inject(AssetService);
  messageService = inject(MessageService);

  onSave = output<any>();
  onCancel = output<void>();

  // Step 1: User Selection
  userBarcode = '';
  selectedUser: any = null;

  // Step 2: Asset Selection
  assetBarcode = '';
  selectedBatch: any = null;

  // Step 3: Details
  quantity = 1;
  date = new Date();
  mustReturn = false;
  returnDate: Date | null = null;

  async searchUser() {
    if (!this.userBarcode) return;

    try {
      const users = await this.userService.getAll();
      const user = users.find((u: any) => u.barcode === this.userBarcode);

      if (user) {
        this.selectedUser = user;
        this.messageService.add({
          severity: 'success',
          summary: 'User Found',
          detail: `${user.first_name} ${user.last_name}`,
        });
      } else {
        this.selectedUser = null;
        this.messageService.add({
          severity: 'error',
          summary: 'Not Found',
          detail: 'User not found',
        });
      }
    } catch (error) {
      console.error('Error searching user:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to search user',
      });
    }
  }

  async searchAsset() {
    if (!this.assetBarcode) return;

    try {
      // 1. Check if it matches an asset
      const assets = await this.assetService.getAll();
      const asset = assets.find(
        (a: any) => a.barcode === this.assetBarcode || a.part_number === this.assetBarcode,
      );

      if (asset) {
        // If asset found, we need to select a batch.
        // For simplicity, let's pick the first available batch or show a dialog.
        // The prompt implies we should select a batch.
        // Let's fetch batches for this asset.
        const batches = await this.batchService.getByAsset(asset.id);
        const availableBatch = batches.find((b: any) => b.quantity > 0);

        if (availableBatch) {
          this.selectedBatch = { ...availableBatch, asset };
          this.quantity = 1;
          this.messageService.add({
            severity: 'success',
            summary: 'Asset Found',
            detail: `${asset.denomination} (Batch: ${availableBatch.serial_number})`,
          });
          return;
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Out of Stock',
            detail: 'Asset found but no stock available',
          });
          return;
        }
      }

      this.messageService.add({
        severity: 'error',
        summary: 'Not Found',
        detail: 'Asset or Batch not found',
      });
    } catch (error) {
      console.error('Error searching asset:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to search asset',
      });
    }
  }

  submit() {
    if (!this.selectedUser || !this.selectedBatch) return;

    const withdrawalData = {
      user: this.selectedUser,
      batch: this.selectedBatch,
      quantity: this.quantity,
      date: this.date,
      must_return: this.mustReturn,
      return_date: this.returnDate,
    };

    this.onSave.emit(withdrawalData);
  }
}
