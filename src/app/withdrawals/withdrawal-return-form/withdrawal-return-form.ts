import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { WithdrawalService } from '../../services/withdrawal.service';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';

@Component({
  selector: 'app-withdrawal-return-form',
  imports: [CommonModule, FormsModule, ButtonModule, DatePickerModule, AvatarModule],
  templateUrl: './withdrawal-return-form.html',
  styleUrl: './withdrawal-return-form.css',
  providers: [MessageService],
})
export class WithdrawalReturnForm {
  withdrawalService = inject(WithdrawalService);
  messageService = inject(MessageService);

  withdrawal = input.required<any>();
  onSave = output<void>();
  onCancel = output<void>();

  returnDate: Date = new Date();
  loading = false;

  async submit() {
    try {
      this.loading = true;
      await this.withdrawalService.return(this.withdrawal().id, this.returnDate);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Asset returned successfully',
      });
      this.onSave.emit();
    } catch (error) {
      console.error('Error returning asset:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to return asset',
      });
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.onCancel.emit();
  }
}
