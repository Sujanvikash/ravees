/**
 * The stores, one entry per city, from the old site's location and contact pages (addresses and numbers
 * as given there). `address` and `phone` are the city's main store; `stores` lists every store in it.
 * The old site gives no opening hours per store: `timing` is its footer's "Working 8:00 - 22:00".
 */
export const SHOWROOMS = [
  {
    city: 'Chennai',
    isFlagship: true,
    title: 'Tamil Nadu: Egmore, ECR & Coimbatore',
    address: 'No.54, Casa Major Road, Egmore, Chennai – 600008',
    phone: '+91 98407 88949',
    timing: '8:00 AM – 10:00 PM',
    features: [
      'European-standard trees, ornaments, wreaths and nativity sets',
      'ECR: Genesis Food Court, Injambakkam, Chennai – 600115',
      'Coimbatore: No.1229, Avanashi Road, Papanaickanpalayam – 641037',
    ],
    mapQuery: 'Raave’s Evergreen Chennai, Casa Major Road, Egmore',
    stores: [
      { name: 'Egmore', address: 'No.54, Casa Major Road, Egmore, Chennai – 600008', phone: '+91 98407 88949' },
      { name: 'ECR', address: 'Genesis Food Court, Injambakkam, ECR, Chennai – 600115', phone: '+91 88255 12353' },
      {
        name: 'Coimbatore',
        address: 'No.1229, Avanashi Road, Papanaickanpalayam, Coimbatore – 641037',
        phone: '+91 79045 15153',
      },
    ],
  },
  {
    city: 'Bengaluru',
    isFlagship: false,
    title: 'Commercial Street & HSR Layout',
    address: '2nd Floor, Soch Favourite, 23, Commercial Street, Tasker Town, Shivaji Nagar, Bengaluru – 560042',
    phone: '+91 87922 73777 / +91 89042 68003',
    timing: '8:00 AM – 10:00 PM',
    features: [
      'European-standard trees, ornaments, wreaths and nativity sets',
      'HSR Layout: 117, 27th Main Road, opposite Ramraj, Sector 2',
    ],
    mapQuery: 'Raave’s Christmas store, Commercial Street, Bengaluru',
    stores: [
      {
        name: 'Commercial Street',
        address: '2nd Floor, Soch Favourite, 23, Commercial Street, Tasker Town, Shivaji Nagar, Bengaluru – 560042',
        phone: '+91 87922 73777 / +91 89042 68003',
      },
      {
        name: 'HSR Layout',
        // PIN code as the old site gives it; HSR Layout's is usually 560102. Confirm before going live.
        address: '117, 27th Main Road, opposite Ramraj, Sector 2, HSR Layout, Bengaluru – 560001',
        phone: '+91 87922 73777 / +91 89042 68003',
      },
    ],
  },
  {
    city: 'Mumbai',
    isFlagship: false,
    title: 'Christmas Mart, Bandra West',
    address: 'Geetaneel Arcade, 1st Floor, No.85, Hill Road (next to Elco Market), Bandra West, Mumbai – 400050',
    phone: '+91 80154 32248 / +91 98407 88948',
    timing: '8:00 AM – 10:00 PM',
    features: ['European-standard trees, ornaments, wreaths and nativity sets', 'Christmas Mart, next to Elco Market'],
    mapQuery: '85 Hill Road, near Elco Arcade, Bandra West, Mumbai 400050',
    stores: [
      {
        name: 'Bandra West',
        address: 'Christmas Mart, Geetaneel Arcade, 1st Floor, No.85, Hill Road, Bandra West, Mumbai – 400050',
        phone: '+91 80154 32248 / +91 98407 88948',
      },
    ],
  },
  {
    city: 'Pune',
    isFlagship: false,
    title: 'MG Road, Camp',
    address: 'No. 79, MG Road, Camp, opposite Priya Hotel & Kohinoor Hotel, Pune – 411001',
    phone: '+91 82202 63913',
    timing: '8:00 AM – 10:00 PM',
    features: ['European-standard trees, ornaments, wreaths and nativity sets', 'Opposite Priya Hotel & Kohinoor Hotel'],
    mapQuery: '79 MG Road, Camp, Pune 411001',
    stores: [
      { name: 'MG Road', address: 'No. 79, MG Road, Camp, opposite Priya Hotel & Kohinoor Hotel, Pune – 411001', phone: '+91 82202 63913' },
    ],
  },
  {
    city: 'Goa',
    isFlagship: false,
    title: 'Panjim & Margao',
    address: 'Christmas Gallery, No.13, Junta House, 18th June Road, Panjim, Goa – 403001',
    phone: '+91 98407 88950',
    timing: '8:00 AM – 10:00 PM',
    features: [
      'European-standard trees, ornaments, wreaths and nativity sets',
      'Margao: Menezes Building, No. 2 & 4, Luis Miranda Road, Pajifond – 403601',
    ],
    mapQuery: 'Raaves Evergreen Christmas Tree & Christmas Decoration, Panjim, Goa',
    stores: [
      { name: 'Panjim', address: 'Christmas Gallery, No.13, Junta House, 18th June Road, Panjim, Goa – 403001', phone: '+91 98407 88950' },
      {
        name: 'Margao',
        address: 'Menezes Building, No. 2 & 4, Luis Miranda Road, Pajifond, Madgaon, Goa – 403601',
        phone: '+91 98407 88950',
      },
    ],
  },
];

/** Every store in every city, in one list. */
export const ALL_STORES = SHOWROOMS.flatMap((room) => room.stores.map((store) => ({ ...store, city: room.city })));

/** A phone number as a tel: link ("+91 98407 88949" → "tel:+919840788949"); of "a / b", the first. */
export const telHref = (phone) => `tel:${phone.split('/')[0].replace(/[^\d+]/g, '')}`;
