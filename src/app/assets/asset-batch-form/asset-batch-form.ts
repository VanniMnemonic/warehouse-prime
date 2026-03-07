import { Component, inject, input, output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { BatchService } from '../../services/batch.service';
import { LocationService } from '../../services/location.service';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-asset-batch-form',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    AvatarModule,
    SelectModule,
  ],
  templateUrl: './asset-batch-form.html',
  styleUrl: './asset-batch-form.css',
  providers: [MessageService],
})
export class AssetBatchForm {
  batchService = inject(BatchService);
  locationService = inject(LocationService);
  messageService = inject(MessageService);
  cdr = inject(ChangeDetectorRef);

  asset = input.required<any>();
  onSave = output<void>();
  onCancel = output<void>();

  // Form fields
  denomination = '';
  serialNumber = '';
  quantity = 1;
  expirationDate: Date | null = null;
  selectedLocation: any = null;

  locations: any[] = [];
  loading = false;

  async ngOnInit() {
    // Set default denomination
    this.denomination = `Batch - ${this.asset().denomination}`;
    this.loadLocations();
  }

  async loadLocations() {
    try {
      this.locations = await this.locationService.getAll();
      this.cdr.detectChanges(); // Manually trigger change detection after data load
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }

  async submit() {
    if (!this.quantity || this.quantity < 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Quantity must be a positive number',
      });
      return;
    }

    try {
      this.loading = true;
      const batchData = {
        asset_id: this.asset().id,
        denomination: this.denomination,
        serial_number: this.serialNumber,
        quantity: this.quantity,
        expiration_date: this.expirationDate,
        location: this.selectedLocation,
      };

      await this.batchService.create(batchData);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Batch created successfully',
      });
      this.onSave.emit();
    } catch (error) {
      console.error('Error creating batch:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create batch',
      });
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.onCancel.emit();
  }
}
