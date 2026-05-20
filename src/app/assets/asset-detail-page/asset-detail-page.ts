import { Component, NgZone, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
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
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    AssetDetail,
    AssetForm,
    AssetBatchForm,
    WithdrawalForm,
  ],
  templateUrl: './asset-detail-page.html',
  styleUrl: './asset-detail-page.css',
  providers: [ConfirmationService, MessageService],
})
export class AssetDetailPage implements OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private assetService = inject(AssetService);
  private withdrawalService = inject(WithdrawalService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private zone = inject(NgZone);

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

  async loadAsset(force = false) {
    const idParam = this.route.snapshot.paramMap.get('id');
    const assetId = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(assetId)) {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.asset = null;
        this.loading = false;
      });
      return;
    }

    if (!force && this.asset?.id === assetId) {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.loading = false;
      });
      return;
    }

    try {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.loading = true;
      });
      const assets = await this.assetService.getAll();
      if (this.destroyed) return;
      const selected = assets.find((a: any) => a.id === assetId) ?? null;
      this.zone.run(() => {
        this.asset = selected;
      });
    } finally {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.loading = false;
      });
    }
  }

  goBack() {
    this.router.navigate(['/assets']);
  }

  openEditAsset(asset: any) {
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
          await this.assetService.delete(asset.id);
          this.messageService.add({
            severity: 'success',
            summary: $localize`:@@toastSuccessSummary:Success`,
            detail: $localize`:@@toastDeleteAssetSuccessDetail:Asset deleted.`,
          });
          this.router.navigate(['/assets']);
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
        }
      },
    });
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
