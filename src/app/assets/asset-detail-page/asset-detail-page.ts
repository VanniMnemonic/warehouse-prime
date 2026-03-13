import { ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { AssetService } from '../../services/asset.service';
import { AssetDetail } from '../asset-detail/asset-detail';
import { AssetForm } from '../asset-form/asset-form';
import { AssetBatchForm } from '../asset-batch-form/asset-batch-form';
import { WithdrawalForm } from '../../withdrawals/withdrawal-form/withdrawal-form';
import { WithdrawalService } from '../../services/withdrawal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-asset-detail-page',
  imports: [
    CommonModule,
    ButtonModule,
    DialogModule,
    AssetDetail,
    AssetForm,
    AssetBatchForm,
    WithdrawalForm,
  ],
  templateUrl: './asset-detail-page.html',
  styleUrl: './asset-detail-page.css',
})
export class AssetDetailPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private assetService = inject(AssetService);
  private withdrawalService = inject(WithdrawalService);
  private cdr = inject(ChangeDetectorRef);

  asset: any = null;
  loading = true;

  formDrawerVisible = false;
  batchFormDrawerVisible = false;
  withdrawFormDrawerVisible = false;
  editingAsset: any = null;
  selectedBatch: any = null;
  selectedBatchForWithdrawal: any = null;
  private destroyed = false;
  private routeSub: Subscription | null = null;

  get pageTitle() {
    return this.asset?.denomination ?? $localize`:@@assetDetailTitle:Asset Detail`;
  }

  get batchDialogHeader() {
    const assetName = this.asset?.denomination ?? $localize`:@@assetLabel:Asset`;
    return $localize`:@@editBatchForHeader:Edit Batch for ${assetName}:assetName:`;
  }

  constructor() {
    const navigationAsset = this.router.getCurrentNavigation()?.extras.state?.['asset'];
    if (navigationAsset) {
      this.asset = navigationAsset;
      this.loading = false;
    }

    this.routeSub = this.route.paramMap.subscribe(() => {
      this.loadAsset();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.routeSub?.unsubscribe();
  }

  private safeDetectChanges() {
    if (!this.destroyed) {
      this.cdr.detectChanges();
    }
  }

  async loadAsset(force = false) {
    const idParam = this.route.snapshot.paramMap.get('id');
    const assetId = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(assetId)) {
      this.asset = null;
      this.loading = false;
      this.safeDetectChanges();
      return;
    }

    if (!force && this.asset?.id === assetId) {
      this.loading = false;
      this.safeDetectChanges();
      return;
    }

    try {
      this.loading = true;
      this.safeDetectChanges();
      const assets = await this.assetService.getAll();
      if (this.destroyed) return;
      this.asset = assets.find((a: any) => a.id === assetId) ?? null;
    } finally {
      if (this.destroyed) return;
      this.loading = false;
      this.safeDetectChanges();
    }
  }

  goBack() {
    this.router.navigate(['/assets']);
  }

  openEditAsset(asset: any) {
    this.editingAsset = asset;
    this.formDrawerVisible = true;
  }

  openEditBatch(batch: any) {
    this.selectedBatch = batch;
    this.batchFormDrawerVisible = true;
  }

  withdrawBatch(batch: any) {
    this.selectedBatchForWithdrawal = {
      ...batch,
      asset: batch.asset ?? this.asset,
    };
    this.withdrawFormDrawerVisible = true;
  }

  async onWithdrawFormSave(withdrawalData: any) {
    this.withdrawFormDrawerVisible = false;
    await this.withdrawalService.create(withdrawalData);
    await this.loadAsset(true);
  }

  onWithdrawFormCancel() {
    this.withdrawFormDrawerVisible = false;
  }

  onFormSave() {
    this.formDrawerVisible = false;
    this.loadAsset();
  }

  async onBatchFormSave() {
    this.batchFormDrawerVisible = false;
    await this.loadAsset();
  }

  onFormCancel() {
    this.formDrawerVisible = false;
  }
}
