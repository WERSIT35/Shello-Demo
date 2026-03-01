import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDark = signal<boolean>(true);

  constructor() {
    this.applyDarkTheme();
  }

  private applyDarkTheme() {
    document.body.setAttribute('data-theme', 'dark');
  }
}
