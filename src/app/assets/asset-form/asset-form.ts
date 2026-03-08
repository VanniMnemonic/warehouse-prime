import { Component, inject, input, output, effect, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AssetService } from '../../services/asset.service';
import { MessageService } from 'primeng/api';
import { ImageModule } from 'primeng/image';
import { FileUploadModule } from 'primeng/fileupload';
import { DomSanitizer } from '@angular/platform-browser';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-asset-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FormsModule,
    ImageModule,
    FileUploadModule,
    InputNumberModule,
  ],
  templateUrl: './asset-form.html',
  styleUrl: './asset-form.css',
  providers: [MessageService],
})
export class AssetForm {
  fb = inject(FormBuilder);
  assetService = inject(AssetService);
  messageService = inject(MessageService);
  sanitizer = inject(DomSanitizer);
  cdr = inject(ChangeDetectorRef);

  asset = input<any>(null);
  onSave = output<void>();
  onCancel = output<void>();

  imagePath = signal<any>(null);

  form = this.fb.group({
    id: [null],
    denomination: ['', Validators.required],
    part_number: [''],
    barcode: [''],
    min_stock: [0, [Validators.required, Validators.min(0)]],
    image_path: [''],
  });

  constructor() {
    effect(() => {
      const a = this.asset();
      if (a) {
        this.form.patchValue(a);
        
        if (a.image_path) {
          this.imagePath.set(this.sanitizer.bypassSecurityTrustUrl(a.image_path));
        } else {
          this.imagePath.set(null);
        }
      } else {
        this.form.reset({ min_stock: 0 });
        this.imagePath.set(null);
      }
    });
  }

  async onImageSelect(event: any) {
    const file = event.currentFiles?.[0] ?? event.files?.[0];
    if (!file) return;

    // Immediate preview from blob URL
    const previewUrl = file.objectURL
      ?? this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
    this.imagePath.set(previewUrl);

    // Persist via Electron upload
    const filePath = this.assetService.getFilePath(file);
    if (filePath) {
      try {
        const uploadedPath = await this.assetService.uploadImage(filePath);
        // Force change detection or signal update
        // When bypassing security, we get a SafeUrl object
        this.imagePath.set(this.sanitizer.bypassSecurityTrustUrl(uploadedPath));
        this.form.patchValue({ image_path: uploadedPath });
        
        // Trigger change detection manually
        this.cdr.detectChanges();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Image uploaded successfully',
        });
      } catch (error) {
        console.error('Image upload failed:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to upload image',
        });
      }
    }
  }

  async save() {
    if (this.form.invalid) {
      return;
    }

    const assetData = this.form.value;
    try {
      if (assetData.id) {
        await this.assetService.update(assetData);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Asset updated successfully',
        });
      } else {
        await this.assetService.create(assetData);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Asset created successfully',
        });
      }
      this.onSave.emit();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save asset',
      });
      console.error(error);
    }
  }

  cancel() {
    this.onCancel.emit();
  }
}
