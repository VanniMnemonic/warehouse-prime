import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { ImageModule } from 'primeng/image';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { EXPIRY_WARNING_DAYS } from '../shared/constants';
import { AssetService } from '../services/asset.service';
import { BatchService } from '../services/batch.service';
import { WithdrawalService } from '../services/withdrawal.service';
import { ImageDisplay } from '../shared/components/image-display/image-display';
import { WithdrawalForm } from '../withdrawals/withdrawal-form/withdrawal-form';
import { AssetBatchForm } from './asset-batch-form/asset-batch-form';
import { AssetForm } from './asset-form/asset-form';

@Component({
  selector: 'app-assets',
  imports: [
    TableModule,
    CommonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    FormsModule,
    ButtonModule,
    ImageModule,
    DialogModule,
    AssetForm,
    AssetBatchForm,
    WithdrawalForm,
    TagModule,
    ImageDisplay,
    ToolbarModule,
    TooltipModule,
    ConfirmDialogModule,
    ToastModule,
  ],
  templateUrl: './assets.html',
  styleUrl: './assets.css',
  providers: [ConfirmationService, MessageService],
})
export class Assets implements OnInit {
  assetService = inject(AssetService);
  batchService = inject(BatchService);
  withdrawalService = inject(WithdrawalService);
  cdr = inject(ChangeDetectorRef);
  sanitizer = inject(DomSanitizer);
  router = inject(Router);
  route = inject(ActivatedRoute);
  confirmationService = inject(ConfirmationService);
  messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  assets: any[] = [];
  loading: boolean = true;
  searchValue: string | undefined;
  selectedAsset: any;
  formDrawerVisible: boolean = false;
  batchFormDrawerVisible: boolean = false;
  withdrawFormDrawerVisible: boolean = false;
  editingAsset: any = null;
  selectedBatch: any = null;
  selectedAssetForWithdrawal: any = null;

  ngOnInit() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const action = this.route.snapshot.queryParamMap.get('action');
      if (action === 'add') {
        this.openAddAsset();
        this.router.navigate([], {
          queryParams: { action: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
    this.loadAssets();
  }

  getAssetDialogHeader(): string {
    return this.editingAsset
      ? $localize`:@@editAssetDialogHeader:Edit Asset`
      : $localize`:@@addAssetDialogHeader:Add Asset`;
  }

  getBatchDialogHeader(): string {
    const assetName = this.selectedAsset?.denomination ?? $localize`:@@assetLabel:Asset`;
    return this.selectedBatch
      ? $localize`:@@editBatchForHeader:Edit Batch for ${assetName}:assetName:`
      : $localize`:@@addBatchForHeader:Add Batch for ${assetName}:assetName:`;
  }

  openAddBatch(asset: any) {
    this.selectedAsset = asset;
    this.selectedBatch = null; // Clear selected batch for add mode
    this.batchFormDrawerVisible = true;
  }

  openEditBatch(batch: any) {
    this.selectedBatch = batch;
    this.batchFormDrawerVisible = true;
  }

  withdrawBatch(batch: any) {
    console.log('Withdraw batch:', batch);
    // TODO: Implement withdrawal logic
  }

  getSafeUrl(path: string) {
    if (!path) return null;
    return this.sanitizer.bypassSecurityTrustUrl(path);
  }

  isExpired(date: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  isNearExpiry(date: string): boolean {
    if (!date) return false;
    const expiry = new Date(date);
    const now = new Date();
    // Consider expired items as not "near expiry" (they are already expired)
    if (expiry < now) return false;

    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() + EXPIRY_WARNING_DAYS);
    return expiry <= cutoff;
  }

  getQuantitySeverity(
    asset: any,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    if (asset.total_quantity < asset.min_stock) {
      return 'danger';
    }
    if (asset.total_quantity < asset.min_stock * 1.25) {
      return 'warn';
    }
    return 'success';
  }

  openDetail(asset: any) {
    this.selectedAsset = asset;
    this.router.navigate(['/assets', asset.id], { state: { asset } });
  }

  openAddAsset() {
    this.editingAsset = null;
    this.formDrawerVisible = true;
  }

  openEditAsset(asset: any) {
    console.log('Edit asset from detail:', asset);
    this.editingAsset = asset;
    this.formDrawerVisible = true;
  }

  confirmDeleteAsset(asset: any) {
    const name = asset?.denomination ?? '';
    this.confirmationService.confirm({
      header: $localize`:@@confirmDeleteAssetHeader:Delete Asset`,
      message: $localize`:@@confirmDeleteAssetMessage:Delete "${name}:assetName:" together with all its batches, withdrawals and notes? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          this.loading = true;
          await this.assetService.delete(asset.id);
          this.messageService.add({
            severity: 'success',
            summary: $localize`:@@toastSuccessSummary:Success`,
            detail: $localize`:@@toastDeleteAssetSuccessDetail:Asset deleted.`,
          });
          await this.loadAssets();
        } catch (error: any) {
          console.error('Error deleting asset:', error);
          const detail =
            typeof error?.message === 'string' && error.message.includes('active withdrawal')
              ? $localize`:@@toastDeleteAssetActiveWithdrawalsDetail:Cannot delete: there are still open withdrawals to return.`
              : $localize`:@@toastDeleteAssetErrorDetail:Failed to delete asset.`;
          this.messageService.add({
            severity: 'error',
            summary: $localize`:@@toastErrorSummary:Error`,
            detail,
          });
          this.loading = false;
        }
      },
    });
  }

  openWithdraw(asset: any) {
    this.selectedAssetForWithdrawal = asset;
    this.withdrawFormDrawerVisible = true;
  }

  onFormSave() {
    this.formDrawerVisible = false;
    this.loadAssets();
  }

  async onBatchFormSave() {
    this.batchFormDrawerVisible = false;
    await this.loadAssets();
  }

  async onWithdrawFormSave(withdrawalData: any) {
    this.withdrawFormDrawerVisible = false;
    await this.withdrawalService.create(withdrawalData);
    await this.loadAssets();
  }

  onWithdrawFormCancel() {
    this.withdrawFormDrawerVisible = false;
  }

  onFormCancel() {
    this.formDrawerVisible = false;
  }

  async loadAssets() {
    try {
      this.loading = true;
      this.assets = await this.assetService.getAll();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
