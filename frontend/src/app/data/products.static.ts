// Local catalog used when the app runs in static mode.
//
// Edit this file to change products shown on the shop and landing pages.
// All fields with `*En` and `*Ka` variants are required; the storefront
// renders the right one based on the active locale.
//
// Images live in /assets/cases/... — paths must match files in
// frontend/public/assets/cases/.

export type StaticProduct = {
  id: string;

  // Display copy (both languages required)
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;

  brandEn: string;
  brandKa: string;
  modelEn: string;
  modelKa: string;
  categoryEn: string;
  categoryKa: string;

  // Optional refinements shown as meta pills / spec rows
  caseTypeEn?: string;
  caseTypeKa?: string;
  colorEn?: string;
  colorKa?: string;

  // Commerce
  price: number;
  inStock: boolean;

  // Imagery
  image: string;          // primary image, used in cards
  extraImages?: string[]; // additional gallery shots
};

const PRICE = 89;

export const STATIC_PRODUCTS: StaticProduct[] = [
  {
    id: 'b16',
    nameEn: 'Shello B16',
    nameKa: 'Shello B16',
    brandEn: 'Shello',
    brandKa: 'Shello',
    modelEn: 'B16',
    modelKa: 'B16',
    categoryEn: 'Designer',
    categoryKa: 'დიზაინერული',
    caseTypeEn: 'Slim',
    caseTypeKa: 'თხელი',
    colorEn: 'Patterned',
    colorKa: 'პრინტიანი',
    descriptionEn:
      'A signature B16 drop with a bold patterned back over a slim, drop-tested shell. Reinforced corners and a raised camera lip keep daily use easy.',
    descriptionKa:
      'B16 — გამორჩეული პრინტიანი ზურგი თხელ, დროპ-ტესტირებულ ქეისზე. გამაგრებული კუთხეები და კამერის ამაღლებული კიდე ყოველდღიურ გამოყენებას უსაფრთხოს ხდის.',
    price: PRICE,
    inStock: true,
    image: '/assets/cases/B16/B161.jpg',
    extraImages: [
      '/assets/cases/B16/B162.jpg',
      '/assets/cases/B16/B163.jpg',
      '/assets/cases/B16/B164.jpg',
      '/assets/cases/B16/B165.jpg',
      '/assets/cases/B16/B166.jpg',
      '/assets/cases/B16/1.17.png',
      '/assets/cases/B16/2.17.png',
      '/assets/cases/B16/3.17.png'
    ]
  },
  {
    id: 'g17',
    nameEn: 'Shello G17',
    nameKa: 'Shello G17',
    brandEn: 'Shello',
    brandKa: 'Shello',
    modelEn: 'G17',
    modelKa: 'G17',
    categoryEn: 'Designer',
    categoryKa: 'დიზაინერული',
    caseTypeEn: 'Slim',
    caseTypeKa: 'თხელი',
    colorEn: 'Patterned',
    colorKa: 'პრინტიანი',
    descriptionEn:
      'The G17 is built around a refined graphic and a soft-grip back. The shell is engineered for everyday carry — slim, drop-tested, and made to keep its finish.',
    descriptionKa:
      'G17 აერთიანებს დახვეწილ პრინტს და მოჭიდებად ზურგს. ქეისი ყოველდღიური მოხმარებისთვისაა გათვლილი — თხელი, დროპ-ტესტირებული და გამძლე დასრულებით.',
    price: PRICE,
    inStock: true,
    image: '/assets/cases/G17/G1.jpg',
    extraImages: [
      '/assets/cases/G17/G2.jpg',
      '/assets/cases/G17/G3.jpg',
      '/assets/cases/G17/G4.jpg',
      '/assets/cases/G17/G5.jpg',
      '/assets/cases/G17/G6.jpg',
      '/assets/cases/G17/1.png',
      '/assets/cases/G17/2.png'
    ]
  },
  {
    id: 'studio-onyx',
    nameEn: 'Studio Onyx',
    nameKa: 'Studio Onyx',
    brandEn: 'Shello',
    brandKa: 'Shello',
    modelEn: 'Studio',
    modelKa: 'Studio',
    categoryEn: 'Studio',
    categoryKa: 'სტუდიური',
    caseTypeEn: 'Soft-touch',
    caseTypeKa: 'მქრქალი',
    colorEn: 'Onyx Black',
    colorKa: 'ონიქს შავი',
    descriptionEn:
      'A clean black soft-touch shell with reinforced corners and a precise cutout for every button. The everyday case that just feels right in the hand.',
    descriptionKa:
      'ღრმა შავი, მქრქალი ზედაპირით — გამაგრებული კუთხეები და ზუსტი ამოჭრები ყველა ღილაკისთვის. ყოველდღიური ქეისი, რომელიც ხელში სასიამოვნოდ წევს.',
    price: PRICE,
    inStock: true,
    image: '/assets/cases/Black/1.png',
    extraImages: [
      '/assets/cases/Black/2.png',
      '/assets/cases/Black/3.png',
      '/assets/cases/Black/4.png',
      '/assets/cases/Black/5.png',
      '/assets/cases/Black/6.png',
      '/assets/cases/Black/B1.png',
      '/assets/cases/Black/or1.png',
      '/assets/cases/Black/or2.png',
      '/assets/cases/Black/or3.png'
    ]
  },
  {
    id: 'studio-tobacco',
    nameEn: 'Studio Tobacco',
    nameKa: 'Studio Tobacco',
    brandEn: 'Shello',
    brandKa: 'Shello',
    modelEn: 'Studio',
    modelKa: 'Studio',
    categoryEn: 'Studio',
    categoryKa: 'სტუდიური',
    caseTypeEn: 'Soft-touch',
    caseTypeKa: 'მქრქალი',
    colorEn: 'Tobacco Brown',
    colorKa: 'ტობაკოს ყავისფერი',
    descriptionEn:
      'Warm tobacco brown with a matte finish that ages well. The same drop-tested core as the rest of the Studio line, dressed in a softer colourway.',
    descriptionKa:
      'თბილი ტობაკოს ყავისფერი მქრქალი დასრულებით, რომელიც დროსთან ერთად კიდევ უფრო ლამაზდება. Studio კოლექციის იგივე გამძლე კონსტრუქცია — უფრო რბილ პალიტრაში.',
    price: PRICE,
    inStock: true,
    image: '/assets/cases/Brown/1.png',
    extraImages: [
      '/assets/cases/Brown/2.png',
      '/assets/cases/Brown/3.png',
      '/assets/cases/Brown/4.png',
      '/assets/cases/Brown/5.png',
      '/assets/cases/Brown/s1.png'
    ]
  },
  {
    id: 'studio-snow',
    nameEn: 'Studio Snow',
    nameKa: 'Studio Snow',
    brandEn: 'Shello',
    brandKa: 'Shello',
    modelEn: 'Studio',
    modelKa: 'Studio',
    categoryEn: 'Studio',
    categoryKa: 'სტუდიური',
    caseTypeEn: 'Soft-touch',
    caseTypeKa: 'მქრქალი',
    colorEn: 'Snow White',
    colorKa: 'თოვლისფერი',
    descriptionEn:
      'Crisp matte white with an anti-yellow coating to keep its tone over time. A clean, minimal shell with the same protective core as the rest of the Studio line.',
    descriptionKa:
      'მკაფიო, მქრქალი თეთრი — გაყვითლების საწინააღმდეგო დაფარვით, რომელიც ფერს დიდხანს უნარჩუნებს. მინიმალისტური, სუფთა ქეისი Studio კოლექციის გამძლე ბირთვით.',
    price: PRICE,
    inStock: true,
    image: '/assets/cases/White/1.png',
    extraImages: [
      '/assets/cases/White/2.png',
      '/assets/cases/White/3.png',
      '/assets/cases/White/4.png',
      '/assets/cases/White/5.png',
      '/assets/cases/White/6.png',
      '/assets/cases/White/7.png',
      '/assets/cases/White/8.png',
      '/assets/cases/White/w1.png'
    ]
  }
];

export type StaticHero = {
  title: string;
  subtitle: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  imageUrl: string | null;
  highlights: string[];
};

const HERO_IMAGE = '/assets/cases/All Three cases/IMG_6087.jpeg';

export const STATIC_HERO_KA: StaticHero = {
  title: 'ქეისები, რომლებიც შენი სტილისთვისაა შექმნილი.',
  subtitle:
    'დროპ-ტესტირებული, ხელით დასრულებული ქეისები ჩვენი თბილისის სტუდიიდან — მათთვის, ვისთვისაც ტელეფონის შეხება და გარეგნობა მნიშვნელოვანია.',
  primaryCtaText: 'ქეისების დათვალიერება',
  primaryCtaLink: '/shop',
  secondaryCtaText: 'დაგვიკავშირდი',
  secondaryCtaLink: '/',
  imageUrl: HERO_IMAGE,
  highlights: ['დროპ-ტესტი', 'არასრიალა მოჭიდება', '3-ფენიანი დაცვა', 'მატე ზედაპირი']
};

export const STATIC_HERO_EN: StaticHero = {
  title: 'Cases that look as bold as you do.',
  subtitle:
    'Drop-tested, hand-finished phone cases made in our Tbilisi studio for people who care how their phone looks and feels.',
  primaryCtaText: 'Browse cases',
  primaryCtaLink: '/shop',
  secondaryCtaText: 'Contact us',
  secondaryCtaLink: '/',
  imageUrl: HERO_IMAGE,
  highlights: ['Drop tested', 'Grip textured', '3-layer shell', 'Matte finish']
};

// IDs from STATIC_PRODUCTS that should appear on the landing hero panel and
// the "suggested" carousel. Edit these arrays to curate the homepage.
export const STATIC_HERO_PRODUCT_IDS: string[] = [
  'b16',
  'g17',
  'studio-onyx',
  'studio-snow'
];

export const STATIC_SUGGESTED_PRODUCT_IDS: string[] = [
  'studio-tobacco',
  'studio-onyx',
  'b16',
  'g17',
  'studio-snow'
];
