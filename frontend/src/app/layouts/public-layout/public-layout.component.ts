import { AsyncPipe, NgIf, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ContentService, type PageToggles } from '../../core/services/content.service';

declare const $localize: { locale?: string };

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [AsyncPipe, NgIf, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss'
})
export class PublicLayoutComponent implements OnInit {
  @ViewChild('dragTrack')
  private readonly dragTrackRef?: ElementRef<HTMLDivElement>;

  @ViewChild('dragThumb')
  private readonly dragThumbRef?: ElementRef<HTMLDivElement>;

  private readonly auth = inject(AuthService);
  private readonly contentService = inject(ContentService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly user$ = this.auth.currentUser$;
  protected pageToggles: PageToggles | null = null;
  ngOnInit(): void {
    this.auth.ensureSession().subscribe();
    this.contentService.getPageToggles().subscribe((toggles) => {
      this.pageToggles = toggles;
    });
    this.setDragPosition(this.currentLocale);
  }

  protected get currentLocale(): 'ka' | 'en' {
    const locale = (typeof $localize !== 'undefined' && $localize.locale) || '';
    if (locale.startsWith('ka')) {
      return 'ka';
    }
    if (locale.startsWith('en')) {
      return 'en';
    }

    if (this.isBrowser) {
      return window.location.pathname.startsWith('/ka') ? 'ka' : 'en';
    }

    return 'en';
  }

  protected switchLocale(target: 'ka' | 'en'): void {
    if (!this.isBrowser) {
      return;
    }

    const nextUrl = this.buildLocaleUrl(target);
    if (nextUrl === window.location.href) {
      return;
    }

    window.location.assign(nextUrl);
  }

  protected logout(): void {
    this.auth.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  private buildLocaleUrl(target: 'ka' | 'en'): string {
    const url = new URL(window.location.href);
    const stripped = url.pathname.replace(/^\/(en|ka)(?=\/|$)/, '') || '/';
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const prefix = isLocalhost ? '' : (target === 'ka' ? '/ka' : '');
    url.pathname = `${prefix}${stripped}`;

    if (isLocalhost) {
      if (target === 'en' && url.port === '4200') {
        url.port = '4201';
      }
      if (target === 'ka' && url.port === '4201') {
        url.port = '4200';
      }
    }

    return url.toString();
  }

  dragPosition = '0px';
  dragging = false;
  dragThumbWidth = 36;
  dragTrackWidth = 80;
  dragLocale: 'ka' | 'en' = this.currentLocale;
  activePointerId: number | null = null;

  startDrag(event: PointerEvent): void {
    if (!this.isBrowser) {
      return;
    }

    this.dragging = true;
    this.activePointerId = event.pointerId;
    this.updateDragPosition(event.clientX);
    event.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  onDragMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }

    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) {
      return;
    }

    this.updateDragPosition(event.clientX);
  }

  @HostListener('document:pointerup', ['$event'])
  @HostListener('document:pointercancel', ['$event'])
  onDragEnd(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }

    if (this.activePointerId !== null && event.pointerId !== this.activePointerId) {
      return;
    }

    this.dragging = false;
    this.activePointerId = null;
    this.setDragPosition(this.dragLocale);

    if (this.dragLocale !== this.currentLocale) {
      this.switchLocale(this.dragLocale);
    }
  }

  setDragPosition(locale: 'ka' | 'en'): void {
    const max = this.getMaxLeft();
    this.dragPosition = locale === 'ka' ? '0px' : `${max}px`;
    this.dragLocale = locale;
  }

  private updateDragPosition(clientX: number): void {
    const track = this.dragTrackRef?.nativeElement;
    if (!track) {
      return;
    }

    const rect = track.getBoundingClientRect();
    const thumbWidth = this.getThumbWidth();
    const max = Math.max(0, rect.width - thumbWidth);
    const raw = clientX - rect.left - thumbWidth / 2;
    const left = Math.max(0, Math.min(raw, max));
    this.dragPosition = `${left}px`;
    this.dragLocale = left >= max / 2 ? 'en' : 'ka';
  }

  private getMaxLeft(): number {
    const width = this.dragTrackRef?.nativeElement.getBoundingClientRect().width ?? this.dragTrackWidth;
    return Math.max(0, width - this.getThumbWidth());
  }

  private getThumbWidth(): number {
    return this.dragThumbRef?.nativeElement.getBoundingClientRect().width ?? this.dragThumbWidth;
  }

}
