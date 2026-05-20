import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { WithdrawalService } from '../services/withdrawal.service';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { WithdrawalForm } from './withdrawal-form/withdrawal-form';
import { WithdrawalReturnForm } from './withdrawal-return-form/withdrawal-return-form';
import { WithdrawalsTable } from './withdrawals-table/withdrawals-table';
import type { Withdrawal } from '../../shared/types/models';

@Component({
  selector: 'app-withdrawals',
  imports: [
    CommonModule,
    DialogModule,
    WithdrawalForm,
    WithdrawalReturnForm,
    WithdrawalsTable,
  ],
  templateUrl: './withdrawals.html',
  styleUrl: './withdrawals.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Withdrawals implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private withdrawalService = inject(WithdrawalService);
  private destroyRef = inject(DestroyRef);

  protected readonly withdrawals = signal<Withdrawal[]>([]);
  protected readonly loading = signal(true);
  protected readonly formDrawerVisible = signal(false);
  protected readonly returnDrawerVisible = signal(false);
  protected readonly selectedWithdrawal = signal<Withdrawal | null>(null);

  ngOnInit() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const action = this.route.snapshot.queryParamMap.get('action');
        if (action === 'add') {
          this.openAddWithdrawal();
          this.router.navigate([], {
            queryParams: { action: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
      });
    void this.loadWithdrawals();
  }

  openDetails(withdrawal: Withdrawal) {
    if (!withdrawal?.id) return;
    this.router.navigate(['/withdrawals', withdrawal.id], { state: { withdrawal } });
  }

  async loadWithdrawals() {
    try {
      this.loading.set(true);
      this.withdrawals.set(await this.withdrawalService.getAll());
    } finally {
      this.loading.set(false);
    }
  }

  openAddWithdrawal() {
    this.formDrawerVisible.set(true);
  }

  openReturn(withdrawal: Withdrawal) {
    this.selectedWithdrawal.set(withdrawal);
    this.returnDrawerVisible.set(true);
  }

  async onFormSave(withdrawalData: unknown) {
    try {
      this.loading.set(true);
      await this.withdrawalService.create(withdrawalData);
      this.formDrawerVisible.set(false);
      await this.loadWithdrawals();
    } catch (error) {
      console.error('Error saving withdrawal:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onFormCancel() {
    this.formDrawerVisible.set(false);
  }

  async onReturnSave() {
    this.returnDrawerVisible.set(false);
    await this.loadWithdrawals();
  }

  onReturnCancel() {
    this.returnDrawerVisible.set(false);
  }
}
