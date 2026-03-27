import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';

declare const $localize: { locale?: string };

type SeoKey =
  | 'home'
  | 'shop'
  | 'productDetail'
  | 'cart'
  | 'checkout'
  | 'login'
  | 'register'
  | 'orders'
  | 'profile'
  | 'adminDashboard'
  | 'adminProducts'
  | 'adminContent'
  | 'adminOrders'
  | 'adminUsers'
  | 'adminSecurity';

interface SeoContent {
  titleEn: string;
  titleKa: string;
  descriptionEn: string;
  descriptionKa: string;
  keywordsEn: string[];
  keywordsKa: string[];
}

interface SeoPayload {
  title: string;
  description: string;
  keywords: string[];
  type?: 'website' | 'product';
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly baseTitle = 'Shello';
  private readonly defaultImage = '/favicon.ico';
  private initialized = false;

  private readonly seoByKey: Record<SeoKey, SeoContent> = {
    home: {
      titleEn: 'Shello | Premium Phone Cases',
      titleKa: 'Shello | პრემიუმ ტელეფონის ქეისები',
      descriptionEn:
        'Shello premium phone cases built for confident protection and bold everyday style.',
      descriptionKa:
        'Shello-ს პრემიუმ ქეისები შექმნილია საიმედო დაცვისთვის და გამორჩეული ყოველდღიური სტილისთვის.',
      keywordsEn: ['Shello', 'phone cases', 'premium cases', 'protective case'],
      keywordsKa: ['Shello', 'ქეისები', 'ტელეფონის ქეისი', 'დამცავი ქეისი']
    },
    shop: {
      titleEn: 'Shop Cases | Shello',
      titleKa: 'ქეისების მაღაზია | Shello',
      descriptionEn: 'Browse Shello phone case collections for style, grip, and impact protection.',
      descriptionKa: 'დაათვალიერე Shello-ს ქეისების კოლექცია სტილის, კომფორტული მოჭიდებისა და დაცვისთვის.',
      keywordsEn: ['shop phone cases', 'Shello store', 'durable cases'],
      keywordsKa: ['ქეისების მაღაზია', 'Shello მაღაზია', 'გამძლე ქეისები']
    },
    productDetail: {
      titleEn: 'Product Details | Shello',
      titleKa: 'პროდუქტის დეტალები | Shello',
      descriptionEn: 'See product materials, colors, and compatibility before adding your case to cart.',
      descriptionKa: 'ნახე პროდუქტის მასალა, ფერი და თავსებადობა, სანამ ქეისს კალათაში დაამატებ.',
      keywordsEn: ['product details', 'phone case model', 'case compatibility'],
      keywordsKa: ['პროდუქტის დეტალები', 'ქეისის მოდელი', 'თავსებადობა']
    },
    cart: {
      titleEn: 'Your Cart | Shello',
      titleKa: 'კალათა | Shello',
      descriptionEn: 'Review selected Shello cases and prepare your order checkout.',
      descriptionKa: 'გადაამოწმე არჩეული Shello ქეისები და მოემზადე შეკვეთის გასაფორმებლად.',
      keywordsEn: ['cart', 'checkout prep', 'Shello order'],
      keywordsKa: ['კალათა', 'შეკვეთის გაფორმება', 'Shello შეკვეთა']
    },
    checkout: {
      titleEn: 'Checkout | Shello',
      titleKa: 'შეკვეთის გაფორმება | Shello',
      descriptionEn: 'Complete your Shello purchase quickly and securely.',
      descriptionKa: 'დაასრულე Shello-ს შეძენა სწრაფად და უსაფრთხოდ.',
      keywordsEn: ['checkout', 'secure payment', 'order details'],
      keywordsKa: ['შეკვეთის გაფორმება', 'უსაფრთხო გადახდა', 'შეკვეთის დეტალები']
    },
    login: {
      titleEn: 'Login | Shello',
      titleKa: 'შესვლა | Shello',
      descriptionEn: 'Sign in to your Shello account to track orders and manage your profile.',
      descriptionKa: 'შედი შენს Shello ანგარიშში შეკვეთების სანახავად და პროფილის სამართავად.',
      keywordsEn: ['login', 'account access', 'Shello account'],
      keywordsKa: ['შესვლა', 'ანგარიშზე წვდომა', 'Shello ანგარიში']
    },
    register: {
      titleEn: 'Create Account | Shello',
      titleKa: 'ანგარიშის შექმნა | Shello',
      descriptionEn: 'Create a Shello account for faster checkout and order tracking.',
      descriptionKa: 'შექმენი Shello ანგარიში უფრო სწრაფი შეკვეთისა და ტრეკინგისთვის.',
      keywordsEn: ['register', 'create account', 'Shello signup'],
      keywordsKa: ['რეგისტრაცია', 'ანგარიშის შექმნა', 'Shello პროფილი']
    },
    orders: {
      titleEn: 'My Orders | Shello',
      titleKa: 'ჩემი შეკვეთები | Shello',
      descriptionEn: 'Track your Shello orders, statuses, and purchase history in one place.',
      descriptionKa: 'ნახე შენი Shello შეკვეთები, სტატუსები და ყიდვების ისტორია ერთ სივრცეში.',
      keywordsEn: ['order tracking', 'order history', 'my orders'],
      keywordsKa: ['შეკვეთების ისტორია', 'ტრეკინგი', 'ჩემი შეკვეთები']
    },
    profile: {
      titleEn: 'My Profile | Shello',
      titleKa: 'ჩემი პროფილი | Shello',
      descriptionEn: 'Manage your Shello profile, personal info, and shopping preferences.',
      descriptionKa: 'მართე შენი Shello პროფილი, პირადი ინფორმაცია და საყიდლების პარამეტრები.',
      keywordsEn: ['profile settings', 'account profile', 'Shello profile'],
      keywordsKa: ['პროფილის პარამეტრები', 'ანგარიში', 'Shello პროფილი']
    },
    adminDashboard: {
      titleEn: 'Admin Dashboard | Shello',
      titleKa: 'ადმინის პანელი | Shello',
      descriptionEn: 'Monitor store operations, activity, and key metrics from the Shello admin dashboard.',
      descriptionKa: 'აკონტროლე მაღაზიის ოპერაციები, აქტივობა და ძირითადი მაჩვენებლები Shello ადმინ პანელიდან.',
      keywordsEn: ['admin dashboard', 'store analytics', 'admin panel'],
      keywordsKa: ['ადმინ პანელი', 'მაღაზიის ანალიტიკა', 'მართვა']
    },
    adminProducts: {
      titleEn: 'Admin Products | Shello',
      titleKa: 'ადმინი • პროდუქტები | Shello',
      descriptionEn: 'Create, update, and manage Shello product catalog entries.',
      descriptionKa: 'შექმენი, განაახლე და მართე Shello-ს პროდუქტების კატალოგი.',
      keywordsEn: ['admin products', 'catalog management', 'product editor'],
      keywordsKa: ['პროდუქტების მართვა', 'კატალოგის მართვა', 'ადმინი']
    },
    adminContent: {
      titleEn: 'Admin Content | Shello',
      titleKa: 'ადმინი • კონტენტი | Shello',
      descriptionEn: 'Control homepage content, hero sections, and featured products.',
      descriptionKa: 'მართე მთავარი გვერდის კონტენტი, ჰირო სექციები და გამორჩეული პროდუქტები.',
      keywordsEn: ['content management', 'homepage editor', 'featured products'],
      keywordsKa: ['კონტენტის მართვა', 'მთავარი გვერდი', 'გამორჩეული პროდუქტები']
    },
    adminOrders: {
      titleEn: 'Admin Orders | Shello',
      titleKa: 'ადმინი • შეკვეთები | Shello',
      descriptionEn: 'Review and process customer orders from the Shello admin area.',
      descriptionKa: 'განიხილე და დაამუშავე მომხმარებლის შეკვეთები Shello-ს ადმინ სივრცეში.',
      keywordsEn: ['admin orders', 'order processing', 'store operations'],
      keywordsKa: ['შეკვეთების მართვა', 'ადმინის შეკვეთები', 'ოპერაციები']
    },
    adminUsers: {
      titleEn: 'Admin Users | Shello',
      titleKa: 'ადმინი • მომხმარებლები | Shello',
      descriptionEn: 'Manage customer and admin user accounts securely.',
      descriptionKa: 'უსაფრთხოდ მართე მომხმარებლებისა და ადმინების ანგარიშები.',
      keywordsEn: ['user management', 'admin users', 'account roles'],
      keywordsKa: ['მომხმარებლების მართვა', 'ადმინები', 'ანგარიშის როლები']
    },
    adminSecurity: {
      titleEn: 'Admin Security | Shello',
      titleKa: 'ადმინი • უსაფრთხოება | Shello',
      descriptionEn: 'Configure and review security controls for the Shello platform.',
      descriptionKa: 'დააკონფიგურირე და გადაამოწმე Shello პლატფორმის უსაფრთხოების პარამეტრები.',
      keywordsEn: ['security settings', 'admin security', 'platform security'],
      keywordsKa: ['უსაფრთხოების პარამეტრები', 'ადმინის უსაფრთხოება', 'პლატფორმის დაცვა']
    }
  };

  init(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.updateForCurrentRoute();
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.updateForCurrentRoute());
  }

  setProductSeo(product: { title: string; description?: string | null; images?: string[] }): void {
    const locale = this.resolveLocale();
    const description = (product.description || '').trim();
    const title = `${product.title} | ${this.baseTitle}`;
    const fallbackDescription =
      locale === 'ka'
        ? `${product.title} - Shello-ს პრემიუმ ქეისი გამორჩეული დაცვითა და სტილით.`
        : `${product.title} - premium Shello case with reliable protection and style.`;

    this.applySeo({
      title,
      description: description || fallbackDescription,
      keywords: locale === 'ka'
        ? ['ქეისი', 'ტელეფონის დაცვა', 'Shello', 'პროდუქტი']
        : ['phone case', 'product page', 'Shello', 'protective case'],
      type: 'product'
    });

    const productImage = product.images?.find((image) => image.trim());
    if (productImage) {
      this.updateMetaProperty('og:image', productImage);
      this.updateMetaName('twitter:image', productImage);
    }
  }

  private updateForCurrentRoute(): void {
    const route = this.getDeepestActiveRoute();
    const seoKey = route.snapshot.data['seoKey'] as SeoKey | undefined;
    const selectedKey: SeoKey = seoKey && this.seoByKey[seoKey] ? seoKey : 'home';
    const locale = this.resolveLocale();
    const seo = this.seoByKey[selectedKey];

    const payload: SeoPayload = {
      title: locale === 'ka' ? seo.titleKa : seo.titleEn,
      description: locale === 'ka' ? seo.descriptionKa : seo.descriptionEn,
      keywords: locale === 'ka' ? seo.keywordsKa : seo.keywordsEn,
      type: 'website'
    };

    this.applySeo(payload);
  }

  private applySeo(payload: SeoPayload): void {
    this.title.setTitle(payload.title);
    this.updateMetaName('description', payload.description);
    this.updateMetaName('keywords', payload.keywords.join(', '));
    this.updateMetaName('robots', 'index, follow, max-image-preview:large');
    this.updateMetaName('theme-color', '#0c0d12');

    this.updateMetaProperty('og:site_name', this.baseTitle);
    this.updateMetaProperty('og:title', payload.title);
    this.updateMetaProperty('og:description', payload.description);
    this.updateMetaProperty('og:type', payload.type ?? 'website');
    this.updateMetaProperty('og:image', this.defaultImage);

    this.updateMetaName('twitter:card', 'summary_large_image');
    this.updateMetaName('twitter:title', payload.title);
    this.updateMetaName('twitter:description', payload.description);
    this.updateMetaName('twitter:image', this.defaultImage);

    const locale = this.resolveLocale();
    this.updateMetaProperty('og:locale', locale === 'ka' ? 'ka_GE' : 'en_US');
    this.updateMetaProperty('og:locale:alternate', locale === 'ka' ? 'en_US' : 'ka_GE');

    const urls = this.computeLocaleUrls();
    this.updateMetaProperty('og:url', locale === 'ka' ? urls.ka : urls.en);
    this.setLink('canonical', locale === 'ka' ? urls.ka : urls.en);
    this.setLink('alternate', urls.en, { hreflang: 'en' });
    this.setLink('alternate', urls.ka, { hreflang: 'ka' });
    this.setLink('alternate', locale === 'ka' ? urls.ka : urls.en, { hreflang: 'x-default' });
  }

  private updateMetaName(name: string, content: string): void {
    this.meta.updateTag({ name, content }, `name='${name}'`);
  }

  private updateMetaProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property='${property}'`);
  }

  private getDeepestActiveRoute(): ActivatedRoute {
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }

  private resolveLocale(): 'ka' | 'en' {
    const localized = (typeof $localize !== 'undefined' && $localize.locale) || '';
    if (localized.startsWith('ka')) {
      return 'ka';
    }
    if (localized.startsWith('en')) {
      return 'en';
    }

    const langAttr = this.document?.documentElement?.lang || '';
    if (langAttr.startsWith('ka')) {
      return 'ka';
    }
    return 'en';
  }

  private computeLocaleUrls(): { en: string; ka: string } {
    const baseHref = this.isBrowser ? window.location.href : 'https://shello.shop/';
    const url = new URL(baseHref);
    const strippedPath = this.stripLocalePrefix(url.pathname);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const normalizedPath = strippedPath === '/' ? '' : strippedPath;

    if (isLocalhost) {
      return {
        en: `${url.protocol}//${url.hostname}:4201/en${normalizedPath}`,
        ka: `${url.protocol}//${url.hostname}:4200${strippedPath}`
      };
    }

    return {
      en: `${url.origin}${strippedPath}`,
      ka: `${url.origin}/ka${normalizedPath}`
    };
  }

  private stripLocalePrefix(path: string): string {
    const stripped = path.replace(/^\/(en|ka)(?=\/|$)/, '');
    return stripped || '/';
  }

  private setLink(rel: string, href: string, attrs: Record<string, string> = {}): void {
    const selector = Object.entries(attrs).reduce(
      (current, [key, value]) => `${current}[${key}='${value}']`,
      `link[rel='${rel}']`
    );
    const head = this.document.head;
    if (!head) {
      return;
    }

    let link = head.querySelector(selector) as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', rel);
      Object.entries(attrs).forEach(([key, value]) => link?.setAttribute(key, value));
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
