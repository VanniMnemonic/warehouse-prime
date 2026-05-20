import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BatchService } from '../../services/batch.service';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { LocationDisplay } from '../../shared/components/location-display';
import { DomSanitizer } from '@angular/platform-browser';
import { NotesComponent } from '../../shared/components/notes/notes';
import { ImageDisplay } from '../../shared/components/image-display/image-display';
import { TabsModule } from 'primeng/tabs';
import { WithdrawalsTable } from '../../withdrawals/withdrawals-table/withdrawals-table';
import { WithdrawalService } from '../../services/withdrawal.service';
import { DialogModule } from 'primeng/dialog';
import { WithdrawalReturnForm } from '../../withdrawals/withdrawal-return-form/withdrawal-return-form';
import { Router } from '@angular/router';
import { EXPIRY_WARNING_DAYS } from '../../shared/constants';
import type {
  AssetWithDetails,
  Batch,
  Withdrawal,
} from '../../../shared/types/models';

@Component({
  selector: 'app-asset-detail',
  imports: [
    ButtonModule,
    TooltipModule,
    ToastModule,
    TableModule,
    TagModule,
    DatePipe,
    FormsModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    DividerModule,
    LocationDisplay,
    NotesComponent,
    ImageDisplay,
    TabsModule,
    WithdrawalsTable,
    DialogModule,
    WithdrawalReturnForm,
  ],
  templateUrl: './asset-detail.html',
  styleUrl: './asset-detail.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetDetail {
  asset = input<AssetWithDetails | null>(null);
  onEdit = output<AssetWithDetails>();
  onEditBatch = output<Batch>();
  onWithdrawBatch = output<Batch>();

  private messageService = inject(MessageService);
  private batchService = inject(BatchService);
  private withdrawalService = inject(WithdrawalService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  protected readonly batches = signal<Batch[]>([]);
  protected readonly loading = signal(true);
  searchValue: string | undefined;
  protected readonly withdrawals = signal<Withdrawal[]>([]);
  protected readonly withdrawalsLoading = signal(true);
  protected readonly returnDrawerVisible = signal(false);
  protected readonly selectedWithdrawal = signal<Withdrawal | null>(null);
  tabsValue: string = 'batches';

  // Sanitized image URL — recomputed when `asset()` changes.
  protected readonly imageUrl = computed(() => {
    const a = this.asset();
    if (!a?.image_path) return null;
    return this.sanitizer.bypassSecurityTrustUrl(a.image_path);
  });

  constructor() {
    effect(() => {
      const a = this.asset();
      if (a && a.id) {
        void this.loadBatches(a.id);
        void this.loadWithdrawals(a.id);
      } else {
        this.loading.set(false);
        this.batches.set([]);
        this.withdrawalsLoading.set(false);
        this.withdrawals.set([]);
      }
    });
  }

  withdrawBatch(batch: Batch) {
    this.onWithdrawBatch.emit(batch);
  }

  editBatch(batch: Batch) {
    this.onEditBatch.emit(batch);
  }

  deleteBatch(batch: Batch) {
    console.log('Delete batch', batch);
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
    if (expiry < now) return false;
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() + EXPIRY_WARNING_DAYS);
    return expiry <= cutoff;
  }

  async loadBatches(assetId: number) {
    try {
      this.loading.set(true);
      this.batches.set(await this.batchService.getByAsset(assetId));
    } finally {
      this.loading.set(false);
    }
  }

  async loadWithdrawals(assetId: number) {
    try {
      this.withdrawalsLoading.set(true);
      this.withdrawals.set(await this.withdrawalService.getByAsset(assetId));
    } finally {
      this.withdrawalsLoading.set(false);
    }
  }

  copyToClipboard(text: string | null | undefined) {
    if (!text) return;
    void navigator.clipboard.writeText(text);
    this.messageService.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'Text copied to clipboard',
    });
  }

  edit() {
    const a = this.asset();
    if (a) this.onEdit.emit(a);
  }

  openDetails(withdrawal: Withdrawal) {
    if (!withdrawal?.id) return;
    this.router.navigate(['/withdrawals', withdrawal.id], { state: { withdrawal } });
  }

  openReturn(withdrawal: Withdrawal) {
    this.selectedWithdrawal.set(withdrawal);
    this.returnDrawerVisible.set(true);
  }

  async onReturnSave() {
    this.returnDrawerVisible.set(false);
    const a = this.asset();
    if (a?.id) {
      await Promise.all([this.loadBatches(a.id), this.loadWithdrawals(a.id)]);
    }
  }

  onReturnCancel() {
    this.returnDrawerVisible.set(false);
  }
}
