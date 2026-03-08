import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageModule } from 'primeng/image';
import { SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-image-display',
  standalone: true,
  imports: [CommonModule, ImageModule],
  template: `
    @if (image()) {
      <p-image
        [src]="$any(image())"
        [preview]="preview()"
        [width]="width()"
        [class]="imageClass()"
        [imageStyle]="imageStyle()"
      />
    } @else {
      <div [class]="containerClass()" [style]="containerStyle()">
        <i [class]="icon() + ' text-2xl'"></i>
      </div>
    }
  `,
})
export class ImageDisplay {
  image = input<string | SafeUrl | null | undefined>(null);
  width = input<string>('50px');
  height = input<string>('50px');
  shape = input<'square' | 'circle'>('square');
  icon = input<string>('pi pi-image');
  preview = input<boolean>(true);

  containerClass = computed(() => {
    const base =
      'flex items-center justify-center text-muted-color border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800';
    const shapeClass = this.shape() === 'circle' ? 'rounded-full' : 'rounded-md';
    return `${base} ${shapeClass}`;
  });

  imageClass = computed(() => {
    return `overflow-hidden ${this.shape() === 'circle' ? 'rounded-full' : 'rounded-md'}`;
  });

  imageStyle = computed(() => ({
    'object-fit': 'cover',
    width: this.width(),
    height: this.height(),
    aspectRatio: '1/1',
  }));

  containerStyle = computed(() => ({
    width: this.width(),
    height: this.height(),
    aspectRatio: '1 / 1',
  }));
}
