import {
  Component,
  inject,
  input,
  effect,
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
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { SliderModule } from 'primeng/slider';
import { ToastModule } from 'primeng/toast';
import { ImageDisplay } from '../../shared/components/image-display/image-display';
import { TableModule } from 'primeng/table';
import { UserSelected } from '../../shared/components/user-display/user-selected';
import { UserSummary } from '../../shared/components/user-display/user-summary';

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
    DialogModule,
    TableModule,
    InputNumberModule,
    DatePickerModule,
    CheckboxModule,
    SliderModule,
    ToastModule,
    ImageDisplay,
    UserSelected,
    UserSummary,
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

  preselectedAsset = input<any | null>(null);
  preselectedBatch = input<any | null>(null);

  onSave = output<any>();
  onCancel = output<void>();

  @ViewChild('userBarcodeInput') userBarcodeInput!: ElementRef;
  @ViewChild('assetBarcodeInput') assetBarcodeInput!: ElementRef;

  // Step 1: User Selection
  userBarcode = '';
  selectedUser: any = null;
  userSearchVisible = signal(false);
  userSearchLoading = signal(false);
  userSearchUsers = signal<any[]>([]);
  userSearchValue = '';

  // Step 2: Asset Selection
  assetBarcode = '';
  selectedBatch: any = null;
  assetSearchVisible = signal(false);
  assetSearchLoading = signal(false);
  assetSearchAssets = signal<any[]>([]);
  assetSearchValue = '';

  // Step 3: Details
  quantity = 1;
  date = new Date();
  mustReturn = false;
  expectedReturnDate: Date | null = null;
  unknownLabel = $localize`:@@unknownLabel:Unknown`;

  constructor() {
    effect(() => {
      const asset = this.preselectedAsset();
      if (asset) {
        void this.selectAsset(asset, false);
      }
    });
    effect(() => {
      const batch = this.preselectedBatch();
      if (batch) {
        this.selectBatch(batch, false);
      }
    });
  }

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

  private async selectAsset(asset: any, showToast: boolean) {
    this.selectedAsset = asset;
    this.selectedBatch = null;
    this.quantity = 1;

    const batches = await this.batchService.getByAsset(asset.id);
    const now = new Date();
    const validBatches = batches.filter(
      (b: any) => b.quantity > 0 && (!b.expiration_date || new Date(b.expiration_date) >= now),
    );
    const totalQuantity = validBatches.reduce((sum: number, b: any) => sum + b.quantity, 0);
    this.selectedAsset.totalAvailable = totalQuantity;

    if (showToast) {
      if (totalQuantity > 0) {
        this.messageService.add({
          severity: 'success',
          summary: 'Asset Found',
          detail: `${asset.denomination} (Total Available: ${totalQuantity})`,
        });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Out of Stock',
          detail: 'Asset found but no valid stock available (checked expiration)',
        });
      }
    }
  }

  private selectBatch(batch: any, showToast: boolean) {
    this.selectedBatch = batch;
    this.selectedAsset = batch.asset ?? null;
    this.quantity = 1;

    if (showToast) {
      const assetName = batch.asset?.denomination ?? 'Batch';
      const serial = batch.serial_number ? ` (S/N: ${batch.serial_number})` : '';
      this.messageService.add({
        severity: 'success',
        summary: 'Batch Found',
        detail: `${assetName}${serial}`,
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
        // Asset found - allow withdrawal from multiple batches
        await this.selectAsset(asset, true);
        return;
      }

      // 2. Check if it matches a batch serial number
      const batch = await this.batchService.getBySerial(this.assetBarcode);
      if (batch) {
        if (batch.quantity > 0) {
          this.selectBatch(batch, true);
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

  async openUserSearch() {
    this.userSearchValue = '';
    this.userSearchVisible.set(true);
    this.userSearchLoading.set(true);
    try {
      const users = await this.userService.getAll();
      this.userSearchUsers.set(users ?? []);
    } finally {
      this.userSearchLoading.set(false);
    }
  }

  selectUserFromSearch(user: any) {
    this.selectedUser = user;
    this.userSearchVisible.set(false);
    this.userBarcode = '';
    setTimeout(() => {
      if (this.assetBarcodeInput) {
        this.assetBarcodeInput.nativeElement.focus();
      }
    }, 100);
  }

  async openAssetSearch() {
    this.assetSearchValue = '';
    this.assetSearchVisible.set(true);
    this.assetSearchLoading.set(true);
    try {
      const assets = await this.assetService.getAll();
      this.assetSearchAssets.set(assets ?? []);
    } finally {
      this.assetSearchLoading.set(false);
    }
  }

  async selectAssetFromSearch(asset: any) {
    await this.selectAsset(asset, true);
    this.assetSearchVisible.set(false);
    this.assetBarcode = '';
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
