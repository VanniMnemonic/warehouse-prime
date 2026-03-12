import { Component, inject, input, output, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { LocationService } from '../../services/location.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-location-form',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, TextareaModule, FormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label for="denomination" class="font-bold">Denomination</label>
        <input pInputText id="denomination" formControlName="denomination" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="description" class="font-bold">Description</label>
        <textarea pTextarea id="description" formControlName="description" rows="3"></textarea>
      </div>
      <div class="flex flex-col gap-1">
        <label for="phone" class="font-bold">Phone</label>
        <input pInputText id="phone" formControlName="phone" />
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <p-button label="Cancel" severity="secondary" (onClick)="cancel()" />
        <p-button label="Save" type="submit" [disabled]="form.invalid" />
      </div>
    </form>
  `,
  providers: [MessageService],
})
export class LocationForm {
  fb = inject(FormBuilder);
  locationService = inject(LocationService);
  messageService = inject(MessageService);

  parentLocation = input<any>(null);
  onSave = output<void>();
  onCancel = output<void>();

  form = this.fb.group({
    denomination: ['', Validators.required],
    description: [''],
    phone: [''],
  });

  async save() {
    console.log('[location-form] save:click', {
      invalid: this.form.invalid,
      value: this.form.value,
      parent: this.parentLocation(),
    });
    if (this.form.invalid) return;

    const parent = this.parentLocation();
    const locationData = {
      ...this.form.value,
      parent_id: parent?.id ?? null,
    };

    try {
      console.log('[location-form] save:invoke add-location', { locationData });
      await this.locationService.create(locationData);
      console.log('[location-form] save:success');
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Location created successfully',
      });
      console.log('[location-form] save:emit onSave');
      queueMicrotask(() => this.onSave.emit());
    } catch (error) {
      console.error('[location-form] save:error', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create location',
      });
    }
  }

  cancel() {
    this.onCancel.emit();
  }
}
