/**
 * Simple line drawings of each showroom city's best-known landmark, for the login tiles. They are drawn in
 * the current text colour on an 80 × 48 grid, all standing on the same ground line.
 */
const PATHS = {
  // Chennai Central: long arcaded front, corner turrets and the clock tower in the middle
  chennai: [
    'M8 46V26H72V46',
    'M8 26V20H14V26M66 26V20H72V26',
    'M8 20Q11 15 14 20M66 20Q69 15 72 20',
    'M33 46V14H47V46',
    'M35 14V8H45V14',
    'M38 8L40 2L42 8',
    'M8 32H33M47 32H72',
    'M14 46V40Q16 37 18 40V46M22 46V40Q24 37 26 40V46M54 46V40Q56 37 58 40V46M62 46V40Q64 37 66 40V46',
    'M37 46V40Q40 36 43 40V46',
  ],
  // The East Coast Road shore: a banded lighthouse with its lantern shining, the sea at its foot
  palavakkam: [
    'M34 46L36.5 14H43.5L46 46',
    'M34 14H46',
    'M37 14V9H43V14',
    'M36 9L40 5L44 9',
    'M34.8 36H45.2M35.6 26H44.4',
    'M38.5 46V41H41.5V46',
    'M31 9L24 6M31 12L24 15M49 9L56 6M49 12L56 15',
    'M4 46Q8 42.5 12 46Q16 42.5 20 46M60 46Q64 42.5 68 46Q72 42.5 76 46',
  ],
  // Cochin's Chinese fishing net: the platform on stilts, the mast, the long boom and the net hanging over the water
  cochin: [
    'M6 36H30',
    'M10 36V46M18 36V46M26 36V46',
    'M22 36L32 8L36 36',
    'M12 30L70 12',
    'M32 8L70 12M32 8L12 30',
    'M12 30V34M10 34H14V37H10Z',
    'M70 12L60 30M70 12L78 30',
    'M60 30Q69 38 78 30',
    'M64 33.5L70 30M69 35L75 30.5',
    'M40 46Q44 43 48 46Q52 43 56 46Q60 43 64 46Q68 43 72 46',
  ],
  // Gateway of India: the great central arch, two side arches and four domed turrets
  mumbai: [
    'M14 46V18H66V46',
    'M14 22H66',
    'M32 46V31Q40 19 48 31V46',
    'M19 46V36Q22.5 31 26 36V46M54 46V36Q57.5 31 61 36V46',
    'M14 18V11H21V18M59 18V11H66V18',
    'M14 11Q17.5 6 21 11M59 11Q62.5 6 66 11',
    'M31 18V13H36V18M44 18V13H49V18',
    'M31 13Q33.5 9 36 13M44 13Q46.5 9 49 13',
  ],
  // Shaniwar Wada: the fort wall, two bastions and the arched Delhi Gate between them
  pune: ['M4 46V30H24M56 30H76V46', 'M24 46V24H34V46M46 46V24H56V46', 'M34 26H46', 'M36 46V33Q40 27 44 33V46', 'M39 46V36M41 46V36'],
  // The Charminar: the square gateway with its great pointed arch, the arcaded gallery above, and a minaret at each
  // corner with its balconies and onion dome
  hyderabad: [
    'M18 46V18H62V46',
    'M31 46V35Q31 29 40 26Q49 29 49 35V46',
    'M18 24H62',
    'M23 24V21Q25 19 27 21V24M31 24V21Q33 19 35 21V24M45 24V21Q47 19 49 21V24M53 24V21Q55 19 57 21V24',
    'M12 46V12H18M68 46V12H62',
    'M10.5 30H19.5M60.5 30H69.5M10.5 18H19.5M60.5 18H69.5',
    'M12 12Q12 7 15 5.5Q18 7 18 12M62 12Q62 7 65 5.5Q68 7 68 12',
    'M15 5.5V2.5M65 5.5V2.5',
  ],
};

// battlements, drawn as a thick dashed line along the top of a wall
const MERLONS = {
  pune: [
    [4, 24, 28.5],
    [24, 34, 22.5],
    [34, 46, 24.5],
    [46, 56, 22.5],
    [56, 76, 28.5],
  ],
};

// A plain storefront for a store added later, which has no city landmark drawing of its own.
const GENERIC = [
  'M14 46V22H66V46',
  'M12 22L20 12H60L68 22H12',
  'M34 46V30H46V46',
  'M20 29H30V38H20V29M50 29H60V38H50V29',
];

export const Landmark = ({ id, className = '' }) => {
  const paths = PATHS[id] ?? GENERIC;
  return (
    <svg viewBox="0 0 80 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2 46H78" />
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
      {MERLONS[id]?.map(([x1, x2, y]) => (
        <line key={x1} x1={x1} x2={x2} y1={y} y2={y} strokeWidth="3" strokeDasharray="2 2" strokeLinecap="butt" />
      ))}
    </svg>
  );
};
