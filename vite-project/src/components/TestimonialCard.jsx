import RatingStars from './RatingStars.jsx';

export default function TestimonialCard({ testimonial }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-gold-400/15 bg-[rgba(8,28,20,0.85)] p-8">
      <RatingStars rating={testimonial.rating} size={16} />
      <p className="my-4 flex-1 font-quote text-[1rem] italic leading-[1.7] text-[#f1f5f9]">
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
}
