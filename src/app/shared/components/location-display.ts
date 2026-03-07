import { Component, input } from '@angular/core';

@Component({
  selector: 'app-location-display',
  standalone: true,
  template: `
    @if (location()) {
      <span>
        @if (location().parent) {
          <span>
            {{ location().parent.denomination }} <i class="pi pi-angle-double-right"></i>
          </span>
        }
        {{ location().denomination }}
      </span>
    }
  `,
})
export class LocationDisplay {
  location = input.required<any>();
}
