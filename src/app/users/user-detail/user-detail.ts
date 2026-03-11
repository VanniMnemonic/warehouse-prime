import { Component, input, inject, ChangeDetectorRef, effect, output } from '@angular/core';
import { ImageModule } from 'primeng/image';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MenuItem, MessageService } from 'primeng/api';
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
import { NotesComponent } from '../../shared/components/notes/notes';
import { SplitButtonModule } from 'primeng/splitbutton';
import { DialogModule } from 'primeng/dialog';
import { WithdrawalReturnForm } from '../../withdrawals/withdrawal-return-form/withdrawal-return-form';

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
    NotesComponent,
    SplitButtonModule,
    DialogModule,
    WithdrawalReturnForm,
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
  searchValue: string | undefined;
  returnDrawerVisible: boolean = false;
  selectedWithdrawal: any = null;

  items: MenuItem[] = [
    {
      label: $localize`:@@menuViewDetails:View Details`,
      icon: 'pi pi-eye',
      command: () => {
        console.log('View details for:', this.selectedWithdrawal);
      },
    },
  ];

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

  setMenuWithdrawal(withdrawal: any) {
    this.selectedWithdrawal = withdrawal;
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
