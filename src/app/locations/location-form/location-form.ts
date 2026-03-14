import { Component, effect, inject, input, output } from '@angular/core';
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
  location = input<any>(null);
  onSave = output<void>();
  onCancel = output<void>();

  form = this.fb.group({
    denomination: ['', Validators.required],
    description: [''],
    phone: [''],
  });

  constructor() {
    effect(() => {
      const loc = this.location();
      if (loc) {
        this.form.patchValue({
          denomination: loc.denomination ?? '',
          description: loc.description ?? '',
          phone: loc.phone ?? '',
        });
      } else {
        this.form.reset({
          denomination: '',
          description: '',
          phone: '',
        });
      }
    });
  }

  async save() {
    if (this.form.invalid) return;

    try {
      const editing = this.location();
      if (editing?.id) {
        await this.locationService.update({
          id: editing.id,
          ...this.form.value,
          parent_id: editing.parent_id ?? null,
          sort_order: editing.sort_order ?? 0,
        });
      } else {
        const parent = this.parentLocation();
        await this.locationService.create({
          ...this.form.value,
          parent_id: parent?.id ?? null,
        });
      }
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: editing?.id ? 'Location updated successfully' : 'Location created successfully',
      });
      queueMicrotask(() => this.onSave.emit());
    } catch (error) {
      console.error(error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save location',
      });
    }
  }

  cancel() {
    this.onCancel.emit();
  }
}
