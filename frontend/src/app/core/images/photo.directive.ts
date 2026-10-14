import { Directive, computed, input } from '@angular/core';
import { OPTIMIZED_IMAGES } from './optimized-images';

/**
 * <img [appPhoto]="url" sizes="...">: serves the WebP copies of a catalogue photo
 * (public/assets/opt) with a srcset, so a 300 px card loads a ~30 KB file instead of a
 * 1–6 MB phone JPEG. Any other URL (admin uploads, API images) is passed through unchanged.
 */
@Directive({
  selector: 'img[appPhoto]',
  standalone: true,
  host: {
    '[attr.src]': 'resolved().src',
    '[attr.srcset]': 'resolved().srcset',
    '[attr.sizes]': 'resolved().srcset ? sizes() : null',
    '[attr.loading]': "eager() ? 'eager' : 'lazy'",
    '[attr.fetchpriority]': "eager() ? 'high' : null",
    '[attr.decoding]': "'async'",
  },
})
export class PhotoDirective {
  readonly appPhoto = input<string | null | undefined>(null);
  readonly sizes = input('(max-width: 640px) 50vw, 320px');
  readonly eager = input(false);

  protected readonly resolved = computed(() => {
    const url = this.appPhoto() ?? '';
    const path = decodeURI(url.replace(/^https?:\/\/[^/]+/, ''));
    const entry = OPTIMIZED_IMAGES[path];
    if (!entry) {
      return { src: url || null, srcset: null };
    }
    const file = (w: number) => `/assets/opt/${entry.slug}-${w}.webp`;
    const middle = entry.widths.find((w) => w >= 960) ?? entry.widths[entry.widths.length - 1];
    return {
      src: file(middle),
      srcset: entry.widths.map((w) => `${file(w)} ${w}w`).join(', '),
    };
  });
}
