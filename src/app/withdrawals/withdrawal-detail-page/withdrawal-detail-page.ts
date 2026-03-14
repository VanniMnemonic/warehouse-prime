import { Component, NgZone, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Subscription } from 'rxjs';
import { WithdrawalService } from '../../services/withdrawal.service';
import { WithdrawalDetail } from '../withdrawal-detail/withdrawal-detail';
import { WithdrawalReturnForm } from '../withdrawal-return-form/withdrawal-return-form';

@Component({
  selector: 'app-withdrawal-detail-page',
  imports: [CommonModule, ButtonModule, DialogModule, WithdrawalDetail, WithdrawalReturnForm],
  templateUrl: './withdrawal-detail-page.html',
  styleUrl: './withdrawal-detail-page.css',
})
export class WithdrawalDetailPage implements OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private withdrawalService = inject(WithdrawalService);
  private zone = inject(NgZone);
  private destroyed = false;
  private routeSub: Subscription | null = null;

  withdrawal: any = null;
  loading = true;

  returnDrawerVisible = false;

  get pageTitle() {
    const denom = this.withdrawal?.batch?.asset?.denomination;
    return denom || $localize`:@@withdrawalDetailTitle:Withdrawal Detail`;
  }

  get pageSubtitle() {
    const firstName = this.withdrawal?.user?.first_name ?? '';
    const lastName = this.withdrawal?.user?.last_name ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || this.withdrawal?.batch?.serial_number || '';
  }

  get canReturn() {
    return !!this.withdrawal && !this.withdrawal.return_date;
  }

  constructor() {
    const navigationWithdrawal = this.router.getCurrentNavigation()?.extras.state?.['withdrawal'];
    if (navigationWithdrawal) {
      this.withdrawal = navigationWithdrawal;
      this.loading = false;
    }

    this.routeSub = this.route.paramMap.subscribe(() => {
      this.loadWithdrawal();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.routeSub?.unsubscribe();
  }

  async loadWithdrawal(force = false) {
    const idParam = this.route.snapshot.paramMap.get('id');
    const withdrawalId = idParam ? Number(idParam) : NaN;
    if (!Number.isFinite(withdrawalId)) {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.withdrawal = null;
        this.loading = false;
      });
      return;
    }

    if (!force && this.withdrawal?.id === withdrawalId) {
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
      const withdrawals = await this.withdrawalService.getAll();
      if (this.destroyed) return;
      const selected = withdrawals.find((w: any) => w.id === withdrawalId) ?? null;
      this.zone.run(() => {
        this.withdrawal = selected;
      });
    } finally {
      if (this.destroyed) return;
      this.zone.run(() => {
        this.loading = false;
      });
    }
  }

  goBack() {
    this.router.navigate(['/withdrawals']);
  }

  openReturn(withdrawal: any) {
    if (!withdrawal) return;
    this.withdrawal = withdrawal;
    this.returnDrawerVisible = true;
  }

  async onReturnSave() {
    this.returnDrawerVisible = false;
    await this.loadWithdrawal(true);
  }

  onReturnCancel() {
    this.returnDrawerVisible = false;
  }
}
