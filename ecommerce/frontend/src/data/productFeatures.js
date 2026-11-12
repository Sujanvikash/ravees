import { TreePine, Sparkles, ShieldCheck, Gem, Flame, Award, Gift, Heart } from 'lucide-react';

// The four points under the description on a product page, per collection. Kept to what the site already
// promises everywhere (European standard, safety certified, fire-retardant, 10-year warranty), so nothing here
// claims a technical spec the catalogue doesn't have. Edit freely; a collection not listed uses DEFAULT.
const DEFAULT = [
  { Icon: Gem, text: 'European Quality Standard' },
  { Icon: Sparkles, text: 'Handpicked Festive Design' },
  { Icon: Award, text: 'Made to Last for Seasons' },
  { Icon: ShieldCheck, text: 'European Safety Certified' },
];

export const PRODUCT_FEATURES = {
  trees: [
    { Icon: TreePine, text: 'Lifelike European Foliage' },
    { Icon: Flame, text: 'Fire-Retardant & Non-Toxic' },
    { Icon: Award, text: '10-Year Warranty' },
    { Icon: ShieldCheck, text: 'European Safety Certified' },
  ],
  lights: [
    { Icon: TreePine, text: 'Perfect for Christmas Trees' },
    { Icon: Sparkles, text: 'Warm Festive Glow' },
    { Icon: Gem, text: 'European Quality Standard' },
    { Icon: ShieldCheck, text: 'European Safety Certified' },
  ],
  baubles: [
    { Icon: TreePine, text: 'Made for Your Tree' },
    { Icon: Sparkles, text: 'Handpicked Festive Design' },
    { Icon: Gem, text: 'European Quality Standard' },
    { Icon: Heart, text: 'Heirloom Keepsake Feel' },
  ],
  'decor-items': [
    { Icon: Heart, text: 'Made for Festive Homes' },
    { Icon: Sparkles, text: 'Finely Detailed Pieces' },
    { Icon: Gem, text: 'European Quality Standard' },
    { Icon: Gift, text: 'A Gift for Generations' },
  ],
};

export const featuresFor = (category) => PRODUCT_FEATURES[category] ?? DEFAULT;
