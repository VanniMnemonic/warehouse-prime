import { Component, inject, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { WithdrawalService } from '../../services/withdrawal.service';
import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';
import { SliderModule } from 'primeng/slider';
import { ImageDisplay } from '../../shared/components/image-display/image-display';

@Component({
  selector: 'app-withdrawal-return-form',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DatePickerModule,
    SliderModule,
    InputNumberModule,
    ImageDisplay,
  ],
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
  returnedQuantity: number = 0;
  inefficientQuantity: number = 0;
  loading = false;

  maxReturnQuantity = computed(() => {
    const w = this.withdrawal();
    return w.quantity - (w.returned_quantity || 0);
  });

  constructor() {
    // Initialize returnedQuantity when input is available (using effect or just default logic)
    // Since we use computed for max, let's just default to max in ngOnInit or effect
  }

  ngOnInit() {
    this.returnedQuantity = this.maxReturnQuantity();
  }

  async submit() {
    try {
      this.loading = true;
      await this.withdrawalService.return(
        this.withdrawal().id,
        this.returnDate,
        this.returnedQuantity,
        this.inefficientQuantity,
      );
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
