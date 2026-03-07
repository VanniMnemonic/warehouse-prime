import {
  Component,
  inject,
  output,
  signal,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
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
import { SliderModule } from 'primeng/slider';

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
    SliderModule,
  ],
  templateUrl: './withdrawal-form.html',
  styleUrl: './withdrawal-form.css',
  providers: [MessageService],
})
export class WithdrawalForm implements AfterViewInit {
  userService = inject(UserService);
  batchService = inject(BatchService);
  assetService = inject(AssetService);
  messageService = inject(MessageService);

  onSave = output<any>();
  onCancel = output<void>();

  @ViewChild('userBarcodeInput') userBarcodeInput!: ElementRef;
  @ViewChild('assetBarcodeInput') assetBarcodeInput!: ElementRef;

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
  expectedReturnDate: Date | null = null;

  ngAfterViewInit() {
    // Small delay to ensure the drawer animation/rendering is complete
    setTimeout(() => {
      if (this.userBarcodeInput) {
        this.userBarcodeInput.nativeElement.focus();
      }
    }, 300);
  }

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

        // Focus on asset barcode input after a short delay to allow DOM update
        setTimeout(() => {
          if (this.assetBarcodeInput) {
            this.assetBarcodeInput.nativeElement.focus();
          }
        }, 100);
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

      // 2. Check if it matches a batch serial number
      // We need to search across all batches or fetch all batches?
      // Or maybe implement a search method in batch service.
      // For now, let's assume we can fetch all batches (inefficient but works for small app) or search by serial.
      // Let's iterate over assets and their batches? No, that's too slow.
      // Let's try to search via batch service directly if we had a method.
      // Assuming we don't have a global search, we might need to rely on what we have.
      // However, we can fetch all batches if needed or add a search endpoint.
      // Let's add a search endpoint or just fetch all assets and their batches.

      // Since we don't have a direct search endpoint, let's try to match against fetched assets' batches?
      // No, batches are fetched by asset ID.
      // Let's try to find a batch by serial number via a new service method or just assume the user scans an asset barcode.
      // But the user asked if it finds serial_number.

      // Let's implement searching by serial number.
      // We will need to fetch all batches or search on the server side.
      // Since this is electron with sqlite, we can add an IPC handler for searching batch by serial.

      const batch = await this.batchService.getBySerial(this.assetBarcode);
      if (batch) {
        if (batch.quantity > 0) {
          this.selectedBatch = batch;
          this.quantity = 1;
          this.messageService.add({
            severity: 'success',
            summary: 'Batch Found',
            detail: `${batch.asset.denomination} (S/N: ${batch.serial_number})`,
          });
          return;
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Out of Stock',
            detail: 'Batch found but no stock available',
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
      expected_return_date: this.expectedReturnDate,
    };

    this.onSave.emit(withdrawalData);
  }
}
