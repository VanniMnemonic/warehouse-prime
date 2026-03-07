import { Component, inject, input, output, effect, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AssetService } from '../../services/asset.service';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
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
    AvatarModule,
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

  asset = input<any>(null);
  onSave = output<void>();
  onCancel = output<void>();

  imagePath = signal<any>(null);
  
  // Create a computed signal or effect to handle the image path update?
  // No, the signal set() should trigger update.
  // The issue might be that PrimeNG Avatar doesn't support SafeUrl object directly in [image] input
  // if it expects a string. But DomSanitizer.bypassSecurityTrustUrl returns a SafeUrlImpl object.
  // Angular handles SafeUrl in standard bindings like [src], but PrimeNG components might treat it differently.
  // However, UserForm works with the same logic.
  
  // Let's verify what happens if we force string conversion or use a different approach.
  // Wait, local-resource:// protocol is custom. Maybe we need to ensure the sanitizer trusts it properly.
  // The log shows: local-resource:///...
  
  // Let's inject ChangeDetectorRef just in case
  cdr = inject(ChangeDetectorRef);

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
    const file = event.files[0];
    if (file) {
      // Use AssetService (which uses ElectronService) to get the file path safely
      const filePath = this.assetService.getFilePath(file);

      if (filePath) {
        try {
          const uploadedPath = await this.assetService.uploadImage(filePath);
          console.log('Uploaded image path:', uploadedPath);
          
          // Force change detection or signal update
          // When bypassing security, we get a SafeUrl object
          const safeUrl = this.sanitizer.bypassSecurityTrustUrl(uploadedPath);
          this.imagePath.set(safeUrl);
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
      } else {
        console.warn('Could not get file path from selected file');
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
