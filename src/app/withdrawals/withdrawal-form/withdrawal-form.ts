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
import { UserService } from '../../services/user.service';
import { BatchService } from '../../services/batch.service';
import { AssetService } from '../../services/asset.service';
import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { SliderModule } from 'primeng/slider';
import { ToastModule } from 'primeng/toast';
import { ImageDisplay } from '../../shared/components/image-display/image-display';

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
    InputNumberModule,
    DatePickerModule,
    CheckboxModule,
    SliderModule,
    ToastModule,
    ImageDisplay,
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

  selectedAsset: any = null;

  async searchAsset() {
    if (!this.assetBarcode) return;

    try {
      // 1. Check if it matches an asset
      const assets = await this.assetService.getAll();
      const asset = assets.find(
        (a: any) => a.barcode === this.assetBarcode || a.part_number === this.assetBarcode,
      );

      if (asset) {
        // Asset found - allow withdrawal from multiple batches
        this.selectedAsset = asset;
        this.selectedBatch = null; // Clear specific batch if asset is selected

        // Calculate total available quantity from non-expired batches
        const batches = await this.batchService.getByAsset(asset.id);
        const now = new Date();
        const validBatches = batches.filter(
          (b: any) => b.quantity > 0 && (!b.expiration_date || new Date(b.expiration_date) >= now),
        );
        const totalQuantity = validBatches.reduce((sum: number, b: any) => sum + b.quantity, 0);

        if (totalQuantity > 0) {
          // Store total available for validation/max
          this.selectedAsset.totalAvailable = totalQuantity;
          this.quantity = 1;

          this.messageService.add({
            severity: 'success',
            summary: 'Asset Found',
            detail: `${asset.denomination} (Total Available: ${totalQuantity})`,
          });
          return;
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Out of Stock',
            detail: 'Asset found but no valid stock available (checked expiration)',
          });
          return;
        }
      }

      // 2. Check if it matches a batch serial number
      const batch = await this.batchService.getBySerial(this.assetBarcode);
      if (batch) {
        if (batch.quantity > 0) {
          this.selectedBatch = batch;
          this.selectedAsset = null; // Specific batch selected
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
    if (!this.selectedUser || (!this.selectedBatch && !this.selectedAsset)) return;

    const withdrawalData = {
      user: this.selectedUser,
      asset: this.selectedAsset, // Can be null if batch is selected
      batch: this.selectedBatch, // Can be null if asset is selected
      quantity: this.quantity,
      date: this.date,
      must_return: this.mustReturn,
      expected_return_date: this.expectedReturnDate,
    };

    this.onSave.emit(withdrawalData);
  }
}
