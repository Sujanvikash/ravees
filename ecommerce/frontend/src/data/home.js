/**
 * Copy for the home page sections. The wording is the old site's own (christmasraave.in: home and About
 * pages), lightly tidied (its typos fixed); the pictures that go with it are ours. The products, categories
 * and stores come from the shop API (context/StorefrontContext.jsx).
 */

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
    to: '/shop?category=trees',
    cta: 'Shop Trees',
  },
  {
    title: 'All Christmas decor from lights to tree skirts',
    to: '/shop?category=decor-items',
    cta: 'Shop Decor',
  },
  {
    title: 'Christmas Raave’s Lights Create Magical Moments',
    to: '/shop?category=lights',
    cta: 'Shop Lights',
  },
];

// The old home page's slider and its red promo card.
export const HERO_SLIDES = [
  {
    eyebrow: 'No. 1 in Christmas · Since 1997',
    title: 'Christmas Raave’s Festive Beats Await You',
    text: 'Let the rhythm spark your joy!',
    cta: { label: 'Shop the Collection', to: '/shop' },
  },
  {
    eyebrow: 'Christmas Lights',
    title: 'Christmas Raave’s Lights Illuminate Your Soul',
    text: 'Dance through magical, glowing moments.',
    cta: { label: 'Shop Lights', to: '/shop?category=lights' },
  },
  {
    eyebrow: 'Christmas Trees',
    title: 'European Standard Trees, Under One Roof',
    text: 'Lush, lifelike trees that become the centrepiece of your celebrations.',
    cta: { label: 'Shop Trees', to: '/shop?category=trees' },
  },
];

// "No. 1 in Christmas": the client's claim for the brand (2026-11-12), with what stands behind it. `{stores}` and
// `{cities}` are filled in from the shop's store list.
export const NUMBER_ONE = {
  eyebrow: 'Since 1997',
  title: 'India’s No. 1 in Christmas',
  text: 'For nearly three decades, Raave’s Evergreen has been where India comes for Christmas: the country’s largest importer of European-standard artificial Christmas trees, lights and decorations, trusted by homes, cathedrals and hotels to make the season shine.',
  points: [
    { title: 'Since 1997', text: 'Nearly 30 seasons of bringing Christmas home to India.' },
    { title: 'India’s largest importer', text: 'European-standard trees, lights and décor, chosen piece by piece.' },
    { title: '{stores} stores in {cities} cities', text: 'Chennai, Bangalore, Pune, Mumbai, Goa, Hyderabad and Kochi.' },
    { title: 'Everything under one roof', text: 'Trees, lights, baubles, décor, wreaths and garlands.' },
  ],
};

export const VISIT_US = {
  title: 'Wherever you are, step into the nearest Christmas Raaves store',
  text: 'Let us help you create a magical and memorable festive season!',
};
