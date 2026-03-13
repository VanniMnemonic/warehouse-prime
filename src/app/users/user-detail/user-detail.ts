import { Component, input, inject, ChangeDetectorRef, effect, output } from '@angular/core';
import { ImageModule } from 'primeng/image';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { WithdrawalService } from '../../services/withdrawal.service';
import { DividerModule } from 'primeng/divider';
import { LocationDisplay } from '../../shared/components/location-display';
import { NotesComponent } from '../../shared/components/notes/notes';
import { DialogModule } from 'primeng/dialog';
import { WithdrawalReturnForm } from '../../withdrawals/withdrawal-return-form/withdrawal-return-form';
import { WithdrawalsTable } from '../../withdrawals/withdrawals-table/withdrawals-table';

@Component({
  selector: 'app-user-detail',
  imports: [
    ImageModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
    DividerModule,
    LocationDisplay,
    NotesComponent,
    DialogModule,
    WithdrawalReturnForm,
    WithdrawalsTable,
  ],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
  providers: [MessageService],
})
export class UserDetail {
  user = input<any | null>(null);
  onEdit = output<any>();
  messageService = inject(MessageService);
  withdrawalService = inject(WithdrawalService);
  cdr = inject(ChangeDetectorRef);

  withdrawals: any[] = [];
  loading: boolean = true;
  returnDrawerVisible: boolean = false;
  selectedWithdrawal: any = null;

  constructor() {
    effect(() => {
      const u = this.user();
      if (u && u.id) {
        this.loadWithdrawals(u.id);
      } else {
        this.loading = false;
        this.withdrawals = [];
        this.cdr.detectChanges();
      }
    });
  }

  async loadWithdrawals(userId: number) {
    try {
      this.loading = true;
      this.cdr.detectChanges();
      this.withdrawals = await this.withdrawalService.getByUser(userId);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    this.messageService.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'Email copied to clipboard',
    });
  }

  edit() {
    this.onEdit.emit(this.user());
  }

  openDetails(withdrawal: any) {
    console.log('View details for:', withdrawal);
  }

  openReturn(withdrawal: any) {
    this.selectedWithdrawal = withdrawal;
    this.returnDrawerVisible = true;
  }

  async onReturnSave() {
    this.returnDrawerVisible = false;
    const u = this.user();
    if (u?.id) {
      await this.loadWithdrawals(u.id);
    }
  }

  onReturnCancel() {
    this.returnDrawerVisible = false;
  }
}
