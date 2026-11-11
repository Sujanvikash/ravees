// Decorative images (see components/Decoration.jsx). The .webp files are what the site loads: each one is
// sized for the largest place it is shown (2x for sharp screens). The .jpg files next to them are the
// originals they were made from; nothing imports those, so they are not shipped.
import baublesScatter from './baubles_scatter.webp';
import festiveLanternGlow from './festive_lantern_glow.webp';
// Pine branches, cones and gold ribbon framing a dark middle (footer background; the .png is the original).
import footerBackground from './footer_background.webp';
import garlandDivider from './garland_divider.webp';
import goldenBellsCluster from './golden_bells_cluster.webp';
import goldenReindeerStatue from './golden_reindeer_statue.webp';
import heroTreeGlow from './hero_tree_glow.webp';
import luxuryGiftBoxes from './luxury_gift_boxes.webp';
import luxuryWreathAccent from './luxury_wreath_accent.webp';
import nativityCribSet from './nativity_crib_set.webp';
import pineBranchLeft from './pine_branch_left.webp';
import pineBranchRight from './pine_branch_right.webp';
import pineCrateBaubles from './pine_crate_baubles.webp';
import santaChildGift from './santa_child_gift.webp';
// Cut out of pine_branch_right.jpg (velvet background removed, transparent), for the cream section.
import pineCornerCutout from './pine_corner_cutout.webp';
// Cut out of golden_reindeer_statue.jpg (curtain and table removed, transparent), for the testimonials.
import goldenReindeerCutout from './golden_reindeer_cutout.webp';

// Ornaments: cut-outs (transparent) from the client's decoration pictures, for the ivory pages. Each comment
// gives the picture's width/height, for an aspect-[w/h] box that holds it without cropping. The corners hug
// a top-left corner; mirror them (-scale-x-100) for a top-right one.
import ornamentBowCorner from './ornament_pine_bow_corner.webp'; // 900/566, pine with lights, a gold bow, a bauble, a cone and berries
import ornamentBerryCorner from './ornament_pine_berry_corner.webp'; // 900/697, pine with lights, red berries and a cone
import ornamentBauble from './ornament_bauble_snowflake.webp'; // 686/900, an ivory bauble with a gold snowflake

// The home page's "Now open" card (1200×800, from the client): a gold reindeer among pine on the right,
// pale on the left.
import promoReindeerCard from './promo_reindeer_card.webp';

// Footer corners: cut-outs (transparent) from the client's footer sheet, one per corner.
import footerTopLeft from './footer_left_top.webp'; // 459/318, pine with berries, a cone and three hanging baubles
import footerTopRight from './footer_right_top.webp'; // 445/285, pine with lights, berries and two hanging baubles
import footerBottomLeft from './footer_left_bottom.webp'; // 629/313, pine, gifts, a lantern, a cone and a bauble
import footerBottomRight from './footer_right_bottom.webp'; // 667/390, pine, a lantern, a bauble, a cone, a gold reindeer and a gift

export {
  footerBottomLeft,
  footerBottomRight,
  footerTopLeft,
  footerTopRight,
  ornamentBauble,
  ornamentBerryCorner,
  ornamentBowCorner,
  promoReindeerCard,
  baublesScatter,
  festiveLanternGlow,
  footerBackground,
  garlandDivider,
  goldenBellsCluster,
  goldenReindeerCutout,
  goldenReindeerStatue,
  heroTreeGlow,
  luxuryGiftBoxes,
  luxuryWreathAccent,
  nativityCribSet,
  pineBranchLeft,
  pineBranchRight,
  pineCornerCutout,
  pineCrateBaubles,
  santaChildGift,
};
