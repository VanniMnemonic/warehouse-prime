import { Component, input, inject, ChangeDetectorRef, effect, output, computed } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SplitButtonModule } from 'primeng/splitbutton';
import { BatchService } from '../../services/batch.service';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { LocationDisplay } from '../../shared/components/location-display';
import { DomSanitizer } from '@angular/platform-browser';
import { NotesComponent } from '../../shared/components/notes/notes';
import { ImageDisplay } from '../../shared/components/image-display/image-display';
import { AccordionModule } from 'primeng/accordion';

@Component({
  selector: 'app-asset-detail',
  imports: [
    ButtonModule,
    TooltipModule,
    ToastModule,
    TableModule,
    TagModule,
    SplitButtonModule,
    DatePipe,
    FormsModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    DividerModule,
    LocationDisplay,
    NotesComponent,
    ImageDisplay,
    AccordionModule,
  ],
  templateUrl: './asset-detail.html',
  styleUrl: './asset-detail.css',
  providers: [MessageService],
})
export class AssetDetail {
  asset = input<any | null>(null);
  onEdit = output<any>();
  onEditBatch = output<any>();
  onWithdrawBatch = output<any>();
  
  messageService = inject(MessageService);
  batchService = inject(BatchService);
  cdr = inject(ChangeDetectorRef);
  sanitizer = inject(DomSanitizer);

  batches: any[] = [];
  loading: boolean = true;
  searchValue: string | undefined;
  selectedBatch: any;

  // Computed signal for image URL to ensure immediate updates
  imageUrl = computed(() => {
    const a = this.asset();
    if (!a?.image_path) return null;
    return this.sanitizer.bypassSecurityTrustUrl(a.image_path);
  });

  batchItems: MenuItem[] = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: () => {
        this.onEditBatch.emit(this.selectedBatch);
      },
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      command: () => {
        // TODO: Implement delete logic or emit event
        console.log('Delete batch', this.selectedBatch);
      },
    },
  ];

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

  setMenuBatch(batch: any) {
    this.selectedBatch = batch;
  }

  getSafeUrl(path: string) {
    if (!path) return null;
    return this.sanitizer.bypassSecurityTrustUrl(path);
  }

  isExpired(date: string): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  isNearExpiry(date: string): boolean {
    if (!date) return false;
    const expiry = new Date(date);
    const now = new Date();
    if (expiry < now) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    return expiry <= thirtyDaysFromNow;
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
