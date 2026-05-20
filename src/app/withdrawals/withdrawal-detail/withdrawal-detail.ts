import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Router } from '@angular/router';
import { ImageDisplay } from '../../shared/components/image-display/image-display';
import { NotesComponent } from '../../shared/components/notes/notes';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import type { Withdrawal } from '../../../shared/types/models';

@Component({
  selector: 'app-withdrawal-detail',
  imports: [CommonModule, DatePipe, ButtonModule, TagModule, TooltipModule, ToastModule, ImageDisplay, NotesComponent],
  templateUrl: './withdrawal-detail.html',
  styleUrl: './withdrawal-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WithdrawalDetail {
  private router = inject(Router);

  withdrawal = input<Withdrawal | null>(null);

  openUser() {
    const w = this.withdrawal();
    const userId = w?.user?.id;
    if (!userId) return;
    this.router.navigate(['/users', userId], { state: { user: w.user } });
  }

  openAsset() {
    const w = this.withdrawal();
    const asset = w?.batch?.asset;
    if (!asset?.id) return;
    this.router.navigate(['/assets', asset.id], { state: { asset } });
  }
}

