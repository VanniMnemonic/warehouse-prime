import { Component, inject, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Router } from '@angular/router';
import { ImageDisplay } from '../../shared/components/image-display/image-display';
import { NotesComponent } from '../../shared/components/notes/notes';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-withdrawal-detail',
  imports: [CommonModule, DatePipe, ButtonModule, TagModule, TooltipModule, ToastModule, ImageDisplay, NotesComponent],
  templateUrl: './withdrawal-detail.html',
  styleUrl: './withdrawal-detail.css',
})
export class WithdrawalDetail {
  private router = inject(Router);

  withdrawal = input<any | null>(null);

  openUser() {
    const w = this.withdrawal();
    const userId = w?.user?.id;
    if (!userId) return;
    this.router.navigate(['/users', userId], { state: { user: w.user } });
  }

  openAsset() {
    const w = this.withdrawal();
    const assetId = w?.batch?.asset?.id;
    if (!assetId) return;
    this.router.navigate(['/assets', assetId], { state: { asset: w.batch.asset } });
  }
}

