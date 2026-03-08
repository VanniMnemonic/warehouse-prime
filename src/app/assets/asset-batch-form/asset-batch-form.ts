import { Component, inject, input, output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { BatchService } from '../../services/batch.service';
import { LocationService } from '../../services/location.service';
import { MessageService, TreeNode } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { TreeSelectModule } from 'primeng/treeselect';

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
    TreeSelectModule,
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
  batch = input<any>(null); // Optional input for edit mode
  onSave = output<void>();
  onCancel = output<void>();

  // Form fields
  denomination = '';
  serialNumber = '';
  quantity = 1;
  expirationDate: Date | null = null;
  selectedLocation: any = null;

  locations: TreeNode[] = [];
  loading = false;

  async ngOnInit() {
    await this.loadLocations();

    const b = this.batch();
    if (b) {
      // Edit mode
      this.denomination = b.denomination;
      this.serialNumber = b.serial_number;
      this.quantity = b.quantity;
      this.expirationDate = b.expiration_date ? new Date(b.expiration_date) : null;
      // Find matching location object
      if (b.location) {
        this.selectedLocation = {
          label: b.location.denomination,
          data: b.location,
          key: b.location.id.toString(),
        };
      }
    } else {
      // Create mode default
      this.denomination = `Batch - ${this.asset().denomination}`;
    }
  }

  async loadLocations() {
    try {
      const locations = await this.locationService.getAll();
      this.locations = this.transformToTree(locations);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }

  transformToTree(locations: any[]): TreeNode[] {
    const map = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    // First pass: create nodes
    locations.forEach((loc) => {
      map.set(loc.id, {
        label: loc.denomination,
        data: loc,
        key: loc.id.toString(),
        children: [],
        expanded: true,
      });
    });

    // Second pass: build hierarchy
    locations.forEach((loc) => {
      const node = map.get(loc.id);
      if (node) {
        if (loc.parent) {
          const parentNode = map.get(loc.parent.id);
          if (parentNode) {
            parentNode.children?.push(node);
          }
        } else {
          roots.push(node);
        }
      }
    });

    return roots;
  }

  cancel() {
    this.onCancel.emit();
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
        asset: this.asset(),
        denomination: this.denomination,
        serial_number: this.serialNumber,
        quantity: this.quantity,
        expiration_date: this.expirationDate,
        location: this.selectedLocation ? this.selectedLocation.data : null,
      };

      if (this.batch()) {
        // Update existing batch
        await this.batchService.update({ ...batchData, id: this.batch().id });
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Batch updated successfully',
        });
      } else {
        // Create new batch
        await this.batchService.create(batchData);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Batch created successfully',
        });
      }

      this.onSave.emit();
    } catch (error) {
      console.error('Error saving batch:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save batch',
      });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
