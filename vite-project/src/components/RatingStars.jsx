import { Star } from 'lucide-react';

/**
 * The scraped catalog carries no ratings, so this renders nothing unless a rating is
 * actually supplied (testimonials pass one in).
 */
const RatingStars = ({ rating, reviewsCount, size = 14, className = '' }) => {
  if (!rating) return null;

  return (
    <div className={`flex items-center gap-1.5 text-[0.78rem] text-text-muted ${className}`}>
      <span className="flex items-center gap-0.5 text-gold-400">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={size}
            strokeWidth={2}
            fill={i < Math.round(rating) ? 'currentColor' : 'none'}
          />
        ))}
      </span>
      <span>
        {rating}
        {reviewsCount ? ` (${reviewsCount})` : ''}
      </span>
    </div>
  );
};

export default RatingStars;
