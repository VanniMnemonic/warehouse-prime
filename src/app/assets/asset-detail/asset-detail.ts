import { Component, input, inject, ChangeDetectorRef, effect, output } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BatchService } from '../../services/batch.service';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { LocationDisplay } from '../../shared/components/location-display';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-asset-detail',
  imports: [
    AvatarModule,
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
  templateUrl: './asset-detail.html',
  styleUrl: './asset-detail.css',
  providers: [MessageService],
})
export class AssetDetail {
  asset = input.required<any>();
  onEdit = output<any>();
  messageService = inject(MessageService);
  batchService = inject(BatchService);
  cdr = inject(ChangeDetectorRef);
  sanitizer = inject(DomSanitizer);

  batches: any[] = [];
  loading: boolean = true;
  searchValue: string | undefined;

  constructor() {
    effect(() => {
      const a = this.asset();
      if (a && a.id) {
        this.loadBatches(a.id);
      } else {
        this.loading = false;
        this.batches = [];
        this.cdr.detectChanges();
      }
    });
  }

  getSafeUrl(path: string) {
    if (!path) return null;
    return this.sanitizer.bypassSecurityTrustUrl(path);
  }

  async loadBatches(assetId: number) {
    try {
      this.loading = true;
      this.cdr.detectChanges();
      this.batches = await this.batchService.getByAsset(assetId);
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
      detail: 'Text copied to clipboard',
    });
  }

  edit() {
    this.onEdit.emit(this.asset());
  }
}
