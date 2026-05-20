import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { ImageDisplay } from '../image-display/image-display';
import { LocationDisplay } from '../location-display';

@Component({
  selector: 'app-user-table-item',
  imports: [ImageDisplay, LocationDisplay, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    
    <!-- Image -->
    <td class="px-6">
      <app-image-display
        [image]="user().image_path"
        width="60px"
        height="60px"
        shape="square"
        icon="pi pi-user"
      />
    </td>

    <!-- Title -->
    <td class="px-6">{{ user().title?.title }}</td>
    
    <!-- First Name -->
    <td class="px-6">{{ user().first_name }}</td>
    
    <!-- Last Name -->
    <td class="px-6">{{ user().last_name }}</td>
    
    <!-- Email -->
    <td class="px-6">{{ user().email }}</td>
    
    <!-- Location -->
    <td class="px-6">
      @if (user().location) {
        <app-location-display [location]="user().location" />
      }
    </td>
    
    <!-- Barcode -->
    <td class="px-6">{{ user().barcode }}</td>
    
    <!-- Active Withdrawals -->
    <td class="text-center">
      @if (user().active_withdrawals > 0) {
        <p-tag
          [value]="user().active_withdrawals.toString()"
          severity="warn"
        />
      }
    </td>
  `,
})
export class UserTableItem {
  user = input.required<any>();
}
