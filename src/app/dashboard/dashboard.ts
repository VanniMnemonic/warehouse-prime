import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AssetService } from '../services/asset.service';
import { BatchService } from '../services/batch.service';
import { WithdrawalService } from '../services/withdrawal.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  assetService = inject(AssetService);
  batchService = inject(BatchService);
  withdrawalService = inject(WithdrawalService);
  router = inject(Router);

  loading = signal(true);

  inefficientAssets = signal<any[]>([]);
  expiringBatches = signal<any[]>([]);
  expiredBatches = signal<any[]>([]);
  overdueWithdrawals = signal<any[]>([]);

  ngOnInit() {
    void this.loadDashboard();
  }

  async loadDashboard() {
    this.loading.set(true);
    try {
      const [assets, expiringBatches, expiredBatches, overdueWithdrawals] = await Promise.all([
        this.assetService.getAll(),
        this.batchService.getExpiringWithinDays(30),
        this.batchService.getExpired(),
        this.withdrawalService.getOverdue(),
      ]);

      this.inefficientAssets.set(
        (assets ?? [])
          .filter((a: any) => Number(a?.inefficient_quantity ?? 0) > 0)
          .sort((a: any, b: any) => Number(b?.inefficient_quantity ?? 0) - Number(a?.inefficient_quantity ?? 0)),
      );

      this.expiringBatches.set(expiringBatches ?? []);
      this.expiredBatches.set(expiredBatches ?? []);
      this.overdueWithdrawals.set(overdueWithdrawals ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  openAsset(asset: any) {
    const id = Number(asset?.id);
    if (!Number.isFinite(id)) return;
    this.router.navigate(['/assets', id], { state: { asset } });
  }

  openAssetFromBatch(batch: any) {
    const asset = batch?.asset;
    const id = Number(asset?.id);
    if (!Number.isFinite(id)) return;
    this.router.navigate(['/assets', id], { state: { asset } });
  }

  openWithdrawal(withdrawal: any) {
    const id = Number(withdrawal?.id);
    if (!Number.isFinite(id)) return;
    this.router.navigate(['/withdrawals', id], { state: { withdrawal } });
  }

  getOutstandingQty(withdrawal: any): number {
    const q = Number(withdrawal?.quantity ?? 0);
    const r = Number(withdrawal?.returned_quantity ?? 0);
    return Math.max(0, q - r);
  }

  getOverdueDays(withdrawal: any): number {
    const expected = withdrawal?.expected_return_date ? new Date(withdrawal.expected_return_date) : null;
    if (!expected) return 0;
    const diffMs = Date.now() - expected.getTime();
    return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
  }
}
