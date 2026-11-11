import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Reveal from '../Reveal.jsx';
import { CATEGORIES } from '../../data/categories.js';
import { CATEGORY_PHOTOS } from '../../data/home.js';

const TILES = CATEGORIES.filter((c) => CATEGORY_PHOTOS[c.id]);

/**
 * "Christmas decorations": a tall photo tile per collection with its name and piece count, opening the
 * shop on that collection. Six in a row on desktop, three on tablets, two on phones.
 */
const CategoryTiles = ({ className = '' }) => (
  <ul className={`grid list-none grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6 ${className}`}>
    {TILES.map(({ id, name, count }) => (
      <Reveal as="li" key={id} delay="auto">
        <Link
          to={`/shop?category=${id}`}
          className="group relative isolate flex aspect-3/4 flex-col justify-end overflow-hidden rounded-2xl border border-gold-400/20 p-4 no-underline shadow-[0_12px_30px_--alpha(var(--color-black)/40%)]"
        >
          <img
            src={CATEGORY_PHOTOS[id]}
            alt=""
            loading="lazy"
            className="absolute inset-0 -z-10 size-full object-cover transition-[scale] duration-700 ease-premium group-hover:scale-[1.07]"
          />
          <span aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-shade via-shade/40 to-transparent" />
          <span className="font-serif text-[1.02rem] font-bold leading-tight text-white sm:text-[1.1rem]">{name}</span>
          <span className="mt-1 flex items-center justify-between text-[0.76rem] text-gold-300">
            {count} {count === 1 ? 'piece' : 'pieces'}
            <ArrowUpRight
              size={16}
              strokeWidth={2}
              className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        </Link>
      </Reveal>
    ))}
  </ul>
);

export default CategoryTiles;
