import { AsyncPipe, DOCUMENT, NgIf, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
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

  @ViewChild('userMenu')
  private readonly userMenuRef?: ElementRef<HTMLDivElement>;

  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly contentService = inject(ContentService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly user$ = this.auth.currentUser$;
  protected readonly cartCount$ = this.cart.items$.pipe(
    map((items) => items.reduce((sum, item) => sum + item.quantity, 0))
  );
  protected pageToggles: PageToggles | null = null;
  protected isMobileMenuOpen = false;
  protected isUserMenuOpen = false;
  ngOnInit(): void {
    this.auth.ensureSession().subscribe();
    this.contentService.getPageToggles().subscribe((toggles) => {
      this.pageToggles = toggles;
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.setMobileMenuState(false);
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
      this.setMobileMenuState(false);
      this.router.navigate(['/login']);
    });
  }

  protected toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  protected closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  protected toggleMobileMenu(): void {
    this.setMobileMenuState(!this.isMobileMenuOpen);
  }

  protected closeMobileMenu(): void {
    this.setMobileMenuState(false);
  }

  protected onMobileSheetBackgroundClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.setMobileMenuState(false);
    }
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

  @HostListener('window:resize')
  onResize(): void {
    if (typeof window !== 'undefined' && window.innerWidth > 900) {
      this.setMobileMenuState(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const menuElement = this.userMenuRef?.nativeElement;
    const target = event.target as Node | null;
    if (!menuElement || !target) {
      return;
    }

    if (!menuElement.contains(target)) {
      this.isUserMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isUserMenuOpen = false;
    this.setMobileMenuState(false);
  }

  private setMobileMenuState(next: boolean): void {
    this.isMobileMenuOpen = next;
    if (!next) {
      this.isUserMenuOpen = false;
    }
    if (!this.isBrowser) {
      return;
    }

    this.document.body.style.overflow = next ? 'hidden' : '';
  }

}
