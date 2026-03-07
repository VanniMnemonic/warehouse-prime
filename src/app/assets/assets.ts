import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { AssetService } from '../services/asset.service';
import { BatchService } from '../services/batch.service';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MenuItem } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { AssetDetail } from './asset-detail/asset-detail';
import { AssetForm } from './asset-form/asset-form';
import { AssetBatchForm } from './asset-batch-form/asset-batch-form';
import { LocationDisplay } from '../shared/components/location-display';
import { TagModule } from 'primeng/tag';

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
    AvatarModule,
    SplitButtonModule,
    DrawerModule,
    AssetDetail,
    AssetForm,
    AssetBatchForm,
    LocationDisplay,
    TagModule,
  ],
  templateUrl: './assets.html',
  styleUrl: './assets.css',
})
export class Assets implements OnInit {
  assetService = inject(AssetService);
  batchService = inject(BatchService);
  cdr = inject(ChangeDetectorRef);

  assets: any[] = [];
  loading: boolean = true;
  searchValue: string | undefined;
  selectedAsset: any;
  drawerVisible: boolean = false;
  formDrawerVisible: boolean = false;
  batchFormDrawerVisible: boolean = false;
  editingAsset: any = null;

  // Cache for asset batches
  assetBatches: { [key: number]: any[] } = {};
  loadingBatches: { [key: number]: boolean } = {};
  expandedRows: { [key: string]: boolean } = {};

  items: MenuItem[] = [
    {
      label: 'View Details',
      icon: 'pi pi-eye',
      command: () => {
        this.openDetail(this.selectedAsset);
      },
    },
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: () => {
        console.log('Edit asset:', this.selectedAsset);
        this.openEditAsset(this.selectedAsset);
      },
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: () => {
        console.log('Delete asset:', this.selectedAsset);
        // TODO: Implement delete logic
      },
    },
  ];

  ngOnInit() {
    this.loadAssets();
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

  onRowExpand(event: any) {
    this.loadAssetBatches(event.data.id);
  }

  async loadAssetBatches(assetId: number, forceReload: boolean = false) {
    if (this.assetBatches[assetId] && !forceReload) {
      return; // Already loaded
    }

    this.loadingBatches[assetId] = true;
    // Force UI update to show loading state if used in template
    this.cdr.detectChanges();

    try {
      this.assetBatches[assetId] = await this.batchService.getByAsset(assetId);
      // Create a new reference for assetBatches to trigger change detection if bound directly
      this.assetBatches = { ...this.assetBatches };
    } catch (error) {
      console.error('Error loading batches for asset', assetId, error);
      this.assetBatches[assetId] = [];
    } finally {
      this.loadingBatches[assetId] = false;
      this.cdr.detectChanges();
    }
  }

  setMenuAsset(asset: any) {
    this.selectedAsset = asset;
  }

  openDetail(asset: any) {
    this.selectedAsset = asset;
    this.drawerVisible = true;
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

  openAddBatch(asset: any) {
    this.selectedAsset = asset;
    this.batchFormDrawerVisible = true;
  }

  onFormSave() {
    this.formDrawerVisible = false;
    this.loadAssets();
  }

  async onBatchFormSave() {
    this.batchFormDrawerVisible = false;
    await this.loadAssets();

    // Invalidate and reload batches for the selected asset
    if (this.selectedAsset) {
      // Force reload batches
      await this.loadAssetBatches(this.selectedAsset.id, true);

      // Auto-expand the row
      this.expandedRows = { ...this.expandedRows, [this.selectedAsset.id]: true };
      this.cdr.detectChanges();
    }
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
