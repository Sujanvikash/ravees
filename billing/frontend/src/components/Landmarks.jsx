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
  // Vidhana Soudha: wide base, columned portico, the central dome and two small side domes
  bengaluru: [
    'M6 46V30H74V46',
    'M28 30V22H52V30',
    'M30 22H50',
    'M32 22Q32 9 40 9Q48 9 48 22',
    'M40 9V4',
    'M10 30Q10 24 14 24Q18 24 18 30M62 30Q62 24 66 24Q70 24 70 30',
    'M31 46V34M36 46V34M40 46V34M44 46V34M49 46V34',
    'M28 34H52',
  ],
  // Our Lady of the Immaculate Conception, Panaji: twin towers, the bell gable and the criss-cross steps
  goa: [
    'M18 38H62',
    'M26 38V18L40 10L54 18V38',
    'M18 38V14H26M54 14H62V38',
    'M18 14L22 9L26 14M54 14L58 9L62 14',
    'M22 9V4M20.5 5.5H23.5M58 9V4M56.5 5.5H59.5M40 10V5M38.5 6.5H41.5',
    'M37 38V30Q40 26.5 43 30V38',
    'M12 46H20V44H24V42H28V40H32V38M48 38V40H52V42H56V44H60V46H68',
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

export const Landmark = ({ id, className = '' }) => {
  const paths = PATHS[id];
  if (!paths) return null;
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
