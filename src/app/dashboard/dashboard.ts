import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { EXPIRY_WARNING_DAYS } from '../shared/constants';
import { AssetService } from '../services/asset.service';
import { BatchService } from '../services/batch.service';
import { WithdrawalService } from '../services/withdrawal.service';
import type {
  AssetWithDetails,
  Batch,
  Withdrawal,
} from '../../shared/types/models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, TableModule, TagModule, ButtonModule],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private assetService = inject(AssetService);
  private batchService = inject(BatchService);
  private withdrawalService = inject(WithdrawalService);
  private router = inject(Router);

  loading = signal(true);

  inefficientAssets = signal<AssetWithDetails[]>([]);
  expiringBatches = signal<Batch[]>([]);
  expiredBatches = signal<Batch[]>([]);
  overdueWithdrawals = signal<Withdrawal[]>([]);

  ngOnInit() {
    void this.loadDashboard();
  }

  async loadDashboard() {
    this.loading.set(true);
    try {
      const [assets, expiringBatches, expiredBatches, overdueWithdrawals] = await Promise.all([
        this.assetService.getAll(),
        this.batchService.getExpiringWithinDays(EXPIRY_WARNING_DAYS),
        this.batchService.getExpired(),
        this.withdrawalService.getOverdue(),
      ]);

      this.inefficientAssets.set(
        (assets ?? [])
          .filter((a) => (a.inefficient_quantity ?? 0) > 0)
          .sort((a, b) => (b.inefficient_quantity ?? 0) - (a.inefficient_quantity ?? 0)),
      );

      this.expiringBatches.set(expiringBatches ?? []);
      this.expiredBatches.set(expiredBatches ?? []);
      this.overdueWithdrawals.set(overdueWithdrawals ?? []);
    } finally {
      this.loading.set(false);
    }
  }

  openAsset(asset: AssetWithDetails) {
    const id = Number(asset?.id);
    if (!Number.isFinite(id)) return;
    this.router.navigate(['/assets', id], { state: { asset } });
  }

  openAssetFromBatch(batch: Batch) {
    const asset = batch?.asset;
    const id = Number(asset?.id);
    if (!Number.isFinite(id)) return;
    this.router.navigate(['/assets', id], { state: { asset } });
  }

  openWithdrawal(withdrawal: Withdrawal) {
    const id = Number(withdrawal?.id);
    if (!Number.isFinite(id)) return;
    this.router.navigate(['/withdrawals', id], { state: { withdrawal } });
  }

  getOutstandingQty(withdrawal: Withdrawal): number {
    const q = Number(withdrawal?.quantity ?? 0);
    const r = Number(withdrawal?.returned_quantity ?? 0);
    return Math.max(0, q - r);
  }

  getOverdueDays(withdrawal: Withdrawal): number {
    const expected = withdrawal?.expected_return_date
      ? new Date(withdrawal.expected_return_date)
      : null;
    if (!expected) return 0;
    const diffMs = Date.now() - expected.getTime();
    return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
  }
}
