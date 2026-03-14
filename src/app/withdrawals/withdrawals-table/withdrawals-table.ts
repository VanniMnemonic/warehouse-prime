import { Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { ImageDisplay } from '../../shared/components/image-display/image-display';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-withdrawals-table',
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    TableModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    TagModule,
    ButtonModule,
    ToolbarModule,
    TooltipModule,
    ImageDisplay,
  ],
  templateUrl: './withdrawals-table.html',
  styleUrl: './withdrawals-table.css',
})
export class WithdrawalsTable {
  withdrawals = input<any[]>([]);
  loading = input<boolean>(false);
  showAddButton = input<boolean>(true);
  toolbarFixed = input<boolean>(false);
  showToolbar = input<boolean>(true);

  onAdd = output<void>();
  onReturn = output<any>();
  onDetails = output<any>();

  searchValue: string | undefined;
}
