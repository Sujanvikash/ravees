/**
 * One-time scraper for christmasraave.in (WooCommerce).
 * Emits src/data/products.js + src/data/categories.js and downloads product
 * images into public/images/products/.
 *
 * Run: node scripts/scrape-site.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const IMAGE_DIR = path.join(ROOT, 'public', 'images', 'products');
const DATA_DIR = path.join(ROOT, 'src', 'data');

const BASE = 'https://www.christmasraave.in';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const DELAY_MS = 350;

const TOP_LEVEL = [
  { slug: 'christmas-trees', label: 'Christmas Trees', icon: '🎄' },
  { slug: 'tree-hangings', label: 'Tree Hangings', icon: '🔮' },
  { slug: 'christmas-lights', label: 'Christmas Lights', icon: '✨' },
  { slug: 'wreath-garlands', label: 'Wreath & Garlands', icon: '🌿' },
  { slug: 'nativity-sets', label: 'Nativity Sets', icon: '⭐' },
  { slug: 'santa-toy', label: 'Santa Toys', icon: '🎅' },
  { slug: 'home-decors', label: 'Home Decors', icon: '🏠' },
];

// Child taxonomy -> top-level bucket. `santa-toy` is a child of home-decors on the
// site but the nav presents it as its own category, so it stays top-level.
const PARENT_OF = {
  'premium-artificial-tree': 'christmas-trees',
  'bell-beets-boots-baubles': 'tree-hangings',
  'music-instruments-cherrys': 'tree-hangings',
  'stars-paper-stars': 'tree-hangings',
  tinsel: 'tree-hangings',
  'tree-top-star-led': 'tree-hangings',
  'tree-top-star-angels': 'tree-hangings',
  'christmas-tree-hanging-decor': 'tree-hangings',
  'tear-drop': 'tree-hangings',
  'cushion-covers': 'tree-hangings',
  'led-string-lights': 'christmas-lights',
  swag: 'wreath-garlands',
  garlands: 'wreath-garlands',
  'crib-set': 'nativity-sets',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  '#8211': '–', '#8212': '—', '#8216': '‘', '#8217': '’',
  '#8220': '“', '#8221': '”', '#038': '&', '#039': "'", '#8230': '…',
};

function decode(str) {
  return str
    .replace(/&(#?\w+);/g, (m, code) => ENTITIES[code] ?? m)
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)));
}

function stripTags(html) {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Max page number from a WooCommerce `page-numbers` pagination block. */
function getMaxPage(html) {
  const nums = [...html.matchAll(/\/page\/(\d+)\//g)].map((m) => Number(m[1]));
  return nums.length ? Math.max(...nums) : 1;
}

function getResultCount(html) {
  const m = html.match(/Showing[^<]*?of\s+(\d+)\s+results/i);
  return m ? Number(m[1]) : null;
}

/** Pull product blocks out of a category/shop archive page. */
function parseListing(html) {
  const found = [];
  const blocks = html.split(/<li\s+class="[^"]*\bproduct\b/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<\/li>/i)[0];
    const slugMatch = block.match(/href="https?:\/\/[^"]*\/product\/([^/"?]+)\//i);
    if (!slugMatch) continue;
    const titleMatch =
      block.match(/<h2[^>]*loop-product__title[^>]*>([\s\S]*?)<\/h2>/i) ||
      block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const catSlugs = [...raw.slice(0, raw.indexOf('>')).matchAll(/product_cat-([a-z0-9-]+)/gi)].map(
      (m) => m[1]
    );
    found.push({
      slug: slugMatch[1],
      title: titleMatch ? stripTags(titleMatch[1]) : slugMatch[1],
      catSlugs,
    });
  }
  return found;
}

/** Crawl one archive (shop or category), following pagination. */
async function crawlArchive(basePath, label) {
  const first = await fetchHtml(`${BASE}${basePath}`);
  const maxPage = getMaxPage(first);
  const total = getResultCount(first);
  let items = parseListing(first);

  for (let page = 2; page <= maxPage; page++) {
    await sleep(DELAY_MS);
    try {
      items = items.concat(parseListing(await fetchHtml(`${BASE}${basePath}page/${page}/`)));
    } catch (err) {
      console.warn(`  ! ${label} page ${page}: ${err.message}`);
    }
  }
  console.log(`  ${label}: ${items.length} listed${total ? ` (site reports ${total})` : ''}`);
  return items;
}

/** Parse a single product detail page. */
function parseProduct(html, slug) {
  const titleMatch = html.match(/<h1[^>]*product_title[^>]*>([\s\S]*?)<\/h1>/i);
  const name = titleMatch ? stripTags(titleMatch[1]) : slug;

  // Short/long description, if the product has one at all.
  let description = '';
  const descPanel =
    html.match(/<div[^>]*Tabs-panel--description[^>]*>([\s\S]*?)<\/div>\s*<div/i) ||
    html.match(/<div[^>]*woocommerce-product-details__short-description[^>]*>([\s\S]*?)<\/div>/i);
  if (descPanel) {
    description = stripTags(descPanel[1]).replace(/^Description\s*/i, '').trim();
  }

  // Attribute table -> specs + sizes
  const specs = [];
  const tableMatch = html.match(/<table[^>]*shop_attributes[^>]*>([\s\S]*?)<\/table>/i);
  if (tableMatch) {
    for (const row of tableMatch[1].match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
      const label = row.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
      const value = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
      if (label && value) {
        const l = stripTags(label[1]);
        const v = stripTags(value[1]);
        if (l && v) specs.push({ label: l, value: v });
      }
    }
  }
  const sizeSpec = specs.find((s) => /feet|size|height|length|meter/i.test(s.label));
  const sizes = sizeSpec ? sizeSpec.value.split(/,\s*/).filter(Boolean) : [];

  // Categories from the "Categories:" breadcrumb under the summary
  const postedIn = html.match(/<span[^>]*posted_in[^>]*>([\s\S]*?)<\/span>/i);
  const catPairs = postedIn
    ? [...postedIn[1].matchAll(/product-category\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)\/"[^>]*>([^<]+)</gi)].map(
        (m) => ({ slug: m[1].split('/').pop(), label: decode(m[2]).trim() })
      )
    : [];

  // Full-resolution gallery images
  const imageUrls = [];
  for (const m of html.matchAll(/data-large_image="([^"]+)"/gi)) imageUrls.push(m[1]);
  if (!imageUrls.length) {
    for (const m of html.matchAll(
      /woocommerce-product-gallery__image[^>]*>\s*<a[^>]*href="([^"]+)"/gi
    )) {
      imageUrls.push(m[1]);
    }
  }
  const images = [...new Set(imageUrls.filter((u) => /wp-content\/uploads/.test(u)))];

  // Read status off the main product element: the page also carries a hidden
  // "out of stock" variation template, so matching stock text gives false negatives.
  const mainClass = html.match(/<div id="product-\d+"[^>]*class="([^"]*)"/i)?.[1] ?? '';
  const inStock = !/\b(outofstock|onbackorder)\b/.test(mainClass);

  return { name, description, specs, sizes, catPairs, images, inStock };
}

async function downloadImage(url, destPath) {
  if (fs.existsSync(destPath)) return true;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
  return true;
}

/** Resolve the top-level bucket for a product from its category list. */
function resolveCategory(catPairs, fallbackCatSlugs) {
  const slugs = [...catPairs.map((c) => c.slug), ...fallbackCatSlugs];
  for (const { slug, label } of TOP_LEVEL) {
    if (slugs.includes(slug)) return { category: slug, categoryLabel: label };
  }
  for (const s of slugs) {
    const parent = PARENT_OF[s];
    if (parent) {
      const top = TOP_LEVEL.find((t) => t.slug === parent);
      if (top) return { category: top.slug, categoryLabel: top.label };
    }
  }
  return { category: 'home-decors', categoryLabel: 'Home Decors' };
}

async function main() {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('Crawling archives...');
  const byslug = new Map();
  let rawCount = 0;

  const shopItems = await crawlArchive('/shop/', 'shop');
  for (const item of shopItems) {
    rawCount++;
    byslug.set(item.slug, item);
  }

  for (const { slug, label } of TOP_LEVEL) {
    await sleep(DELAY_MS);
    try {
      const items = await crawlArchive(`/product-category/${slug}/`, label);
      for (const item of items) {
        rawCount++;
        const existing = byslug.get(item.slug);
        if (existing) {
          existing.catSlugs = [...new Set([...existing.catSlugs, ...item.catSlugs, slug])];
        } else {
          byslug.set(item.slug, { ...item, catSlugs: [...item.catSlugs, slug] });
        }
      }
    } catch (err) {
      console.warn(`  ! category ${slug}: ${err.message}`);
    }
  }

  console.log(`\nListings parsed: ${rawCount} raw -> ${byslug.size} unique products\n`);
  console.log('Fetching product detail pages...');

  const products = [];
  let imageCount = 0;
  let failures = 0;

  for (const [slug, listing] of byslug) {
    await sleep(DELAY_MS);
    const sourceUrl = `${BASE}/product/${slug}/`;
    try {
      const detail = parseProduct(await fetchHtml(sourceUrl), slug);
      const { category, categoryLabel } = resolveCategory(detail.catPairs, listing.catSlugs);

      const localImages = [];
      for (let i = 0; i < detail.images.length; i++) {
        const url = new URL(detail.images[i], BASE).href;
        const ext = (url.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i)?.[1] ?? 'jpg').toLowerCase();
        const filename = `${slug}-${i + 1}.${ext}`;
        try {
          await downloadImage(url, path.join(IMAGE_DIR, filename));
          localImages.push(`/images/products/${filename}`);
          imageCount++;
        } catch (err) {
          console.warn(`  ! image ${filename}: ${err.message}`);
        }
      }

      const name = detail.name || listing.title;
      products.push({
        id: slug,
        name,
        category,
        categoryLabel,
        description:
          detail.description ||
          `${name} — part of Raave's Evergreen ${categoryLabel} collection, imported to European quality standards.`,
        specs: detail.specs,
        sizes: detail.sizes,
        images: localImages,
        image: localImages[0] ?? '/images/products/placeholder.jpg',
        inStock: detail.inStock,
        priceOnRequest: true,
        sourceUrl,
      });
      console.log(`  ✓ ${slug} (${categoryLabel}, ${localImages.length} img)`);
    } catch (err) {
      failures++;
      console.warn(`  ✗ ${slug}: ${err.message}`);
    }
  }

  products.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const categories = [
    { id: 'all', name: 'All Collections', count: products.length, icon: '✦' },
    ...TOP_LEVEL.map(({ slug, label, icon }) => ({
      id: slug,
      name: label,
      count: products.filter((p) => p.category === slug).length,
      icon,
    })),
  ];

  const header = `/**\n * AUTO-GENERATED by scripts/scrape-site.mjs — do not edit by hand.\n * Source: ${BASE}\n * Scraped: ${new Date().toISOString()}\n */\n\n`;

  fs.writeFileSync(
    path.join(DATA_DIR, 'products.js'),
    `${header}export const PRODUCTS = ${JSON.stringify(products, null, 2)};\n`
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'categories.js'),
    `${header}export const CATEGORIES = ${JSON.stringify(categories, null, 2)};\n`
  );

  console.log(`\nDone: ${products.length} products, ${imageCount} images, ${failures} failures`);
  console.log('Per category:');
  for (const c of categories) console.log(`  ${c.name}: ${c.count}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
