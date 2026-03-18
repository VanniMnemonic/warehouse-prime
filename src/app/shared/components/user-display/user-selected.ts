import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ImageDisplay } from '../image-display/image-display';

@Component({
  selector: 'app-user-selected',
  imports: [ImageDisplay, ButtonModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-4 p-4 border rounded-xl border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-950"
    >
      <app-image-display
        [image]="user().image_path"
        width="64px"
        height="64px"
        shape="circle"
        icon="pi pi-user"
      />
      <div class="flex flex-col">
        <span class="text-xl font-bold">{{ user().first_name }} {{ user().last_name }}</span>
        <span class="text-muted-color">{{ user().email }}</span>
        <span class="text-sm" i18n="@@withdrawalUserRole">Role: {{ user().role }}</span>
      </div>
      <div class="ml-auto flex gap-2">
        <p-button
          icon="pi pi-times"
          severity="secondary"
          [text]="true"
          (onClick)="onClear.emit()"
          pTooltip="Change User"
          i18n-pTooltip="@@withdrawalChangeUserTooltip"
        />
        <i class="pi pi-check-circle text-green-500 text-2xl" aria-hidden="true"></i>
      </div>
    </div>
  `,
})
export class UserSelected {
  user = input.required<any>();
  onClear = output<void>();
}
