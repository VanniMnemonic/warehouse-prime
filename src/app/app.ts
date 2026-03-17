import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('prime');

  // Injecting ThemeService here ensures it is instantiated (and the saved
  // theme class is applied to <html>) before any child component renders.
  protected readonly theme = inject(ThemeService);
}
