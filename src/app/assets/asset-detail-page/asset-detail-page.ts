import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { AssetService } from '../../services/asset.service';
import { AssetDetail } from '../asset-detail/asset-detail';
import { AssetForm } from '../asset-form/asset-form';
import { AssetBatchForm } from '../asset-batch-form/asset-batch-form';

@Component({
  selector: 'app-asset-detail-page',
  imports: [CommonModule, ButtonModule, DialogModule, AssetDetail, AssetForm, AssetBatchForm],
  templateUrl: './asset-detail-page.html',
  styleUrl: './asset-detail-page.css',
})
export class AssetDetailPage {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private assetService = inject(AssetService);
  private cdr = inject(ChangeDetectorRef);

  asset: any = null;
  loading = true;

  formDrawerVisible = false;
  batchFormDrawerVisible = false;
  editingAsset: any = null;
  selectedBatch: any = null;

  constructor() {
    const navigationAsset = this.router.getCurrentNavigation()?.extras.state?.['asset'];
    if (navigationAsset) {
      this.asset = navigationAsset;
      this.loading = false;
    }

    this.route.paramMap.subscribe(() => {
      this.loadAsset();
    });
  }

  async loadAsset() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const assetId = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(assetId)) {
      this.asset = null;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    if (this.asset?.id === assetId) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    try {
      this.loading = true;
      this.cdr.detectChanges();
      const assets = await this.assetService.getAll();
      this.asset = assets.find((a: any) => a.id === assetId) ?? null;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
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
    console.log('Withdraw batch:', batch);
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
