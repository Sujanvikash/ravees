import { PRODUCTS } from './products.js';

/**
 * Copy for the home page sections. The wording is the old site's own (christmasraave.in: home and About
 * pages), lightly tidied (its typos fixed); the pictures that go with it are ours.
 */

// The photo shown for each category (category circles, tabs): a product that reads well cropped
// small, picked so no two categories show the same thing.
export const CATEGORY_IMAGES = {
  all: '/images/products/santa-doll-1-1.jpg',
  'christmas-trees': '/images/products/french-pine-christmas-tree-1.png',
  'tree-hangings': '/images/products/wonderland-ornaments-15-1.jpg',
  'christmas-lights': '/images/products/ww-with-ball-decoration-1.jpg',
  'wreath-garlands': '/images/products/garland-52958-1.jpg',
  'nativity-sets': '/images/products/cribsets-1-1.jpg',
  'santa-toy': '/images/products/santa-doll-deer-toy-1-1.jpg',
  'home-decors': '/images/products/santa-toy-3-1.jpg',
};

/** The products of one category, in catalogue order (all of them when `limit` is left out). */
export const productsIn = (category, limit) => {
  const list = category === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);
  return limit ? list.slice(0, limit) : list;
};

/** Looks a product up by id (for hand-picked spots such as a hero). */
export const productById = (id) => PRODUCTS.find((p) => p.id === id);

/**
 * A mixed selection across the catalogue: one product from each category in turn, then the next one from
 * each, and so on, so a short row never shows six ornaments in a row.
 */
export const mixedProducts = (limit) => {
  const byCategory = new Map();
  for (const p of PRODUCTS) byCategory.set(p.category, [...(byCategory.get(p.category) ?? []), p]);
  const queues = [...byCategory.values()];
  const picks = [];
  for (let round = 0; picks.length < limit && queues.some((q) => q.length > round); round += 1) {
    for (const q of queues) if (q[round] && picks.length < limit) picks.push(q[round]);
  }
  return picks;
};

// "Why choose Raave's Christmas Tree and Decoration"
export const WHY_CHOOSE = [
  {
    title: 'Premium Quality Craftsmanship',
    text: 'Each Raave’s Christmas tree and decoration is crafted with the highest quality materials, ensuring longevity and elegance that make every holiday season brighter and more memorable.',
  },
  {
    title: 'Wide Range of Designs',
    text: 'From classic ornaments to modern, bold decorations, Raave offers a variety that suits all styles, allowing you to create the perfect festive look that reflects your unique taste.',
  },
  {
    title: 'Easy Setup and Storage',
    text: 'Raave’s Christmas trees are designed for effortless assembly and easy storage, so you can spend more time enjoying the holiday spirit with family and less time on setup.',
  },
];

// The old home page's three feature banners, each pointed at the part of the shop it talks about.
export const PROMOS = [
  {
    title: 'European standard Christmas trees and decorations under one roof',
    to: '/shop?category=christmas-trees',
    cta: 'Shop Trees',
  },
  {
    title: 'All Christmas decor from lights to tree skirts',
    to: '/shop?category=tree-hangings',
    cta: 'Shop Decor',
  },
  {
    title: 'Christmas Raave’s Lights Create Magical Moments',
    to: '/shop?category=christmas-lights',
    cta: 'Shop Lights',
  },
];

// The old home page's slider and its red promo card.
export const HERO_SLIDES = [
  {
    eyebrow: 'Since 1997 · 27th year in India',
    title: 'Christmas Raave’s Festive Beats Await You',
    text: 'Let the rhythm spark your joy!',
    cta: { label: 'Shop the Collection', to: '/shop' },
  },
  {
    eyebrow: 'Christmas Lights',
    title: 'Christmas Raave’s Lights Illuminate Your Soul',
    text: 'Dance through magical, glowing moments.',
    cta: { label: 'Shop Lights', to: '/shop?category=christmas-lights' },
  },
  {
    eyebrow: 'Christmas Trees',
    title: 'European Standard Trees, Under One Roof',
    text: 'Lush, lifelike trees that become the centrepiece of your celebrations.',
    cta: { label: 'Shop Trees', to: '/shop?category=christmas-trees' },
  },
];

export const VISIT_US = {
  title: 'Wherever you are, step into the nearest Christmas Raaves store',
  text: 'Let us help you create a magical and memorable festive season!',
};
