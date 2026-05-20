import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { WithdrawalService } from '../../services/withdrawal.service';
import { NotesComponent } from '../../shared/components/notes/notes';
import { DialogModule } from 'primeng/dialog';
import { WithdrawalReturnForm } from '../../withdrawals/withdrawal-return-form/withdrawal-return-form';
import { WithdrawalsTable } from '../../withdrawals/withdrawals-table/withdrawals-table';
import { Router } from '@angular/router';
import { UserFullDetail } from '../../shared/components/user-display/user-full-detail';
import type { UserWithDetails, Withdrawal } from '../../../shared/types/models';

@Component({
  selector: 'app-user-detail',
  imports: [
    ToastModule,
    NotesComponent,
    DialogModule,
    WithdrawalReturnForm,
    WithdrawalsTable,
    UserFullDetail,
  ],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetail {
  user = input<UserWithDetails | null>(null);
  onEdit = output<UserWithDetails>();

  private messageService = inject(MessageService);
  private withdrawalService = inject(WithdrawalService);
  private router = inject(Router);

  protected readonly withdrawals = signal<Withdrawal[]>([]);
  protected readonly loading = signal(true);
  protected readonly returnDrawerVisible = signal(false);
  protected readonly selectedWithdrawal = signal<Withdrawal | null>(null);

  constructor() {
    effect(() => {
      const u = this.user();
      if (u && u.id) {
        void this.loadWithdrawals(u.id);
      } else {
        this.loading.set(false);
        this.withdrawals.set([]);
      }
    });
  }

  async loadWithdrawals(userId: number) {
    try {
      this.loading.set(true);
      this.withdrawals.set(await this.withdrawalService.getByUser(userId));
    } finally {
      this.loading.set(false);
    }
  }

  copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text);
    this.messageService.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'Email copied to clipboard',
    });
  }

  edit() {
    const u = this.user();
    if (u) this.onEdit.emit(u);
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
    const u = this.user();
    if (u?.id) await this.loadWithdrawals(u.id);
  }

  onReturnCancel() {
    this.returnDrawerVisible.set(false);
  }
}
