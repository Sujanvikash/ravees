import RatingStars from './RatingStars.jsx';
import { cardClass } from './cardClass.js';

const TestimonialCard = ({ testimonial }) => {
  return (
    <div className={`${cardClass('panel')} flex h-full flex-col p-8`}>
      <RatingStars rating={testimonial.rating} size={16} />
      <p className="my-4 flex-1 font-quote text-[1rem] italic leading-[1.7] text-text-quote">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div>
        <div className="text-[0.95rem] font-semibold text-gold-300">{testimonial.author}</div>
        <div className="text-[0.78rem] text-text-muted">
          {testimonial.location} &bull; Verified owner of {testimonial.treeModel}
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;
