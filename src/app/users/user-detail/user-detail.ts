import { Component, input, inject, ChangeDetectorRef, effect, output } from '@angular/core';
import { ImageModule } from 'primeng/image';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { WithdrawalService } from '../../services/withdrawal.service';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { LocationDisplay } from '../../shared/components/location-display';

@Component({
  selector: 'app-user-detail',
  imports: [
    ImageModule,
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
  ],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
  providers: [MessageService],
})
export class UserDetail {
  user = input.required<any>();
  onEdit = output<any>();
  messageService = inject(MessageService);
  withdrawalService = inject(WithdrawalService);
  cdr = inject(ChangeDetectorRef);

  withdrawals: any[] = [];
  loading: boolean = true;
  searchValue: string | undefined;

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
}
