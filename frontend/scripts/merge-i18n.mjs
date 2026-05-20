// Merge fresh extracted i18n into messages.ka.xlf, preserving existing
// translations and applying hand-crafted Georgian for new strings.
//
// Usage: node scripts/merge-i18n.mjs
//
// Reads:
//   src/locale/messages.fresh.xlf  (just-extracted by `ng extract-i18n`)
//   src/locale/messages.ka.xlf     (existing translations)
// Writes:
//   src/locale/messages.ka.xlf     (merged, every fresh unit present)
//
// The DICT below is the source of truth for new strings. Keys are the
// exact <source> text trimmed of surrounding element whitespace.

import fs from 'node:fs';
import path from 'node:path';

// Translations keyed by trans-unit id, used for units that contain
// placeholders so we can preserve the <x ... /> tags exactly.
const ID_DICT = {
  // public-layout Cart link with badge (full-stack mode only)
  '4876446441859890676': 'კალათა <x id="START_TAG_NG_CONTAINER" ctype="x-ng_container"/><x id="START_TAG_SPAN" ctype="x-span"/><x id="INTERPOLATION"/><x id="CLOSE_TAG_SPAN" ctype="x-span"/><x id="CLOSE_TAG_NG_CONTAINER" ctype="x-ng_container"/>'
};

const DICT = {
  // Landing — hero
  'Shello Studio · New drop': 'Shello Studio · ახალი დროპი',
  'Cases that look as bold as you do.': 'ქეისები, რომლებიც შენი სტილისთვისაა შექმნილი.',
  'Drop-tested, hand-finished phone cases made in our Tbilisi studio for people who care how their phone looks and feels.':
    'დროპ-ტესტირებული, ხელით დასრულებული ქეისები ჩვენი თბილისის სტუდიიდან — მათთვის, ვისთვისაც ტელეფონის შეხება და გარეგნობა მნიშვნელოვანია.',
  'Browse cases': 'ქეისების დათვალიერება',
  'Contact us': 'დაგვიკავშირდი',
  'layer shell': 'ფენიანი დაცვა',
  'drop-tested': 'დროპ-ტესტირებული',
  'studio crafted': 'სტუდიური ხელნაკეთი',
  'Featured drop': 'რჩეული დროპი',

  // Landing — pillars
  'Why Shello': 'რატომ Shello',
  'Built to take a hit': 'ნამდვილი დაცვისთვის',
  '3-layer construction, reinforced corners, raised camera and screen lips. Real protection, every day.':
    '3-ფენიანი კონსტრუქცია, გამაგრებული კუთხეები, კამერისა და ეკრანის ამაღლებული კიდეები — ყოველდღიური, ნამდვილი დაცვა.',
  'Tailored to your phone': 'შენი ტელეფონისთვის მორგებული',
  'Cut and finished for each specific model — no loose fit, no generic shells, no compromises.':
    'თითოეული მოდელისთვის ცალკე გამოჭრილი და დასრულებული — შაბლონები და გასაშვები ფასი არ არის.',
  'Hand-finished in Tbilisi': 'ხელით დასრულებული თბილისში',
  'Designed and assembled in our local studio. Every drop is small, intentional, and made to last.':
    'დაპროექტებული და აწყობილი ჩვენს თბილისურ სტუდიაში. ყოველი დროპი ლიმიტირებული, გააზრებული და გამძლეა.',

  // Landing — featured / state
  'Featured drops': 'რჩეული დროპები',
  "This season's lineup": 'სეზონის კოლექცია',
  'See all cases →': 'ყველა ქეისის ნახვა →',
  'No drops to show yet.': 'ჯერ ქეისები არ არის.',
  'View →': 'ნახე →',

  // Landing — contact
  'Order direct': 'პირდაპირი შეკვეთა',
  'Order from Shello': 'Shello-დან შეკვეთა',
  "Online checkout isn't open yet. Message us on Instagram, Facebook, or TikTok to place an order, ask about a specific model, or get a custom case.":
    'ონლაინ შეკვეთა ჯერ არ მუშაობს. დაგვიკავშირდი Instagram-ზე, Facebook-ზე ან TikTok-ზე შესაკვეთად, კონკრეტული მოდელის შესახებ კითხვისთვის ან საკუთარი დიზაინისთვის.',

  // Shop
  'Shello Cases': 'Shello Cases',
  'The full lineup': 'სრული კოლექცია',
  'Browse every drop in the studio. Each case is tested, tuned, and limited.':
    'დაათვალიერე სტუდიის ყველა დროპი. თითოეული ქეისი შემოწმებული, მორგებული და ლიმიტირებულია.',
  'cases available': 'ქეისი ხელმისაწვდომი',
  "Online ordering isn't open yet — message Shello on social media to place an order.":
    'ონლაინ შეკვეთა ჯერ არ მუშაობს — შესაკვეთად დაგვიკავშირდი სოციალურ ქსელებში.',
  'Filter by category': 'კატეგორიის გაფილტვრა',
  'All': 'ყველა',
  'No cases match this filter.': 'ფილტრს არც ერთი ქეისი არ შეესაბამება.',
  'No image': 'სურათი არ არის',
  'View details →': 'დეტალურად →',
  'Add to cart': 'კალათაში დამატება',
  'Unable to load products.': 'პროდუქტების ჩატვირთვა ვერ მოხერხდა.',

  // Product detail
  'Home': 'მთავარი',
  'Shop': 'მაღაზია',
  'Breadcrumbs': 'ნავიგაცია',
  'Loading product…': 'პროდუქტი იტვირთება…',
  'Open image in fullscreen': 'სურათის გადიდება',
  'In stock': 'მარაგშია',
  'Sold out': 'მარაგი არ არის',
  'Price': 'ფასი',
  'Limited drop': 'ლიმიტირებული დროპი',
  '← Back to shop': '← მაღაზიაში დაბრუნება',
  'Want this case?': 'გაინტერესებს ეს ქეისი?',
  "Online checkout isn't open yet — message Shello on social media to place an order or request a custom build.":
    'ონლაინ შეკვეთა ჯერ არ მუშაობს — შესაკვეთად ან საკუთარი დიზაინისთვის დაგვიკავშირდი სოციალურ ქსელებში.',
  'You might also like': 'ასევე შეიძლება მოგეწონოს',
  'More from the lineup': 'მეტი კოლექციიდან',
  'Browse all →': 'ყველას ნახვა →',
  'Loading suggestions…': 'რეკომენდაციები იტვირთება…',
  'No suggestions yet.': 'ჯერ რეკომენდაცია არ არის.',
  'Suggested cases': 'რეკომენდებული ქეისები',
  'More drops that match this vibe.': 'მსგავსი სტილის სხვა დროპები.',
  'Zoom out': 'პატარა',
  'Reset': 'საწყისი',
  'Zoom in': 'გადიდება',
  'Close': 'დახურვა',

  // Header / mobile menu / footer
  'Open menu': 'მენიუს გახსნა',
  'Close menu': 'მენიუს დახურვა',
  'Menu': 'მენიუ',
  'Open user menu': 'მომხმარებლის მენიუ',
  'Find us': 'მოგვძებნე',
  'Language switcher': 'ენის გადართვა',

  // Footer
  'Cases designed for confident protection and bold style.':
    'ქეისები, რომლებიც დაცვასაც აერთიანებენ და თამამ სტილსაც.',
  'Browse': 'მენიუ',
  'Follow Shello': 'მოგვყევი',
  'Website Created By Shello Studio': 'საიტი შექმნა Shello Studio-მ',

  // Cart-related (only render in full-stack mode but keep translated)
  'Cart': 'კალათა',
  'Orders': 'შეკვეთები',
  'Login': 'შესვლა',
  'Get Started': 'რეგისტრაცია',
  'Profile': 'პროფილი',
  'Admin': 'ადმინი',
  'Sign out': 'გასვლა'
};

const root = process.cwd();
const freshPath = path.join(root, 'src/locale/messages.fresh.xlf');
const existingPath = path.join(root, 'src/locale/messages.ka.xlf');

const fresh = fs.readFileSync(freshPath, 'utf8');
const existing = fs.existsSync(existingPath) ? fs.readFileSync(existingPath, 'utf8') : null;

const unitRe = /<trans-unit[\s\S]*?<\/trans-unit>/g;
const idRe = /id="([^"]+)"/;
const sourceRe = /<source>([\s\S]*?)<\/source>/;
const targetRe = /<target>([\s\S]*?)<\/target>/;

function parseUnits(xml) {
  if (!xml) return new Map();
  const map = new Map();
  const matches = xml.match(unitRe) || [];
  for (const unit of matches) {
    const idMatch = unit.match(idRe);
    const sourceMatch = unit.match(sourceRe);
    const targetMatch = unit.match(targetRe);
    if (!idMatch || !sourceMatch) continue;
    map.set(idMatch[1], {
      raw: unit,
      source: sourceMatch[1],
      target: targetMatch ? targetMatch[1] : null
    });
  }
  return map;
}

function applyTarget(unitXml, target) {
  if (unitXml.includes('<target>')) {
    return unitXml.replace(targetRe, `<target>${target}</target>`);
  }
  return unitXml.replace(
    sourceRe,
    (match) => `${match}\n        <target>${target}</target>`
  );
}

function normaliseKey(s) {
  return s.trim();
}

function decodeEntities(s) {
  return s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

const existingMap = parseUnits(existing);
const existingBySource = new Map();
for (const u of existingMap.values()) {
  if (u.target) existingBySource.set(decodeEntities(normaliseKey(u.source)), u.target);
}

let untranslated = 0;
const missing = [];
const merged = fresh.replace(unitRe, (unit) => {
  const idMatch = unit.match(idRe);
  const sourceMatch = unit.match(sourceRe);
  if (!idMatch || !sourceMatch) return unit;

  const id = idMatch[1];
  const rawSource = sourceMatch[1];
  const key = decodeEntities(normaliseKey(rawSource));

  if (ID_DICT[id]) return applyTarget(unit, ID_DICT[id]);
  if (DICT[key]) return applyTarget(unit, DICT[key]);

  const existingUnit = existingMap.get(id);
  if (existingUnit?.target) return applyTarget(unit, existingUnit.target);

  const bySource = existingBySource.get(key);
  if (bySource) return applyTarget(unit, bySource);

  untranslated += 1;
  missing.push(`[${id}] ${key}`);
  return unit;
});

fs.writeFileSync(existingPath, merged, 'utf8');
console.log(`Merged i18n into ${path.relative(root, existingPath)}.`);
console.log(`Missing translations: ${untranslated}`);
if (untranslated > 0) {
  console.log('First 20 missing:');
  for (const m of missing.slice(0, 20)) console.log('  ' + m);
}
