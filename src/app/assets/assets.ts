import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { ImageModule } from 'primeng/image';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
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
  ],
  templateUrl: './assets.html',
  styleUrl: './assets.css',
})
export class Assets implements OnInit {
  assetService = inject(AssetService);
  batchService = inject(BatchService);
  withdrawalService = inject(WithdrawalService);
  cdr = inject(ChangeDetectorRef);
  sanitizer = inject(DomSanitizer);
  router = inject(Router);
  route = inject(ActivatedRoute);

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
    this.route.queryParamMap.subscribe(() => {
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

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    return expiry <= thirtyDaysFromNow;
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
