"use client";

import { Star } from "lucide-react";

type Review = {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
  profile_photo_url?: string;
};

type GoogleReviewsProps = {
  rating: number;
  totalReviews: number;
  reviews: Review[];
  /** Compact mode for footer/sidebar */
  compact?: boolean;
  /** Google review URL for "Leave a Review" CTA */
  reviewUrl?: string;
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  );
}

/** Compact badge for footer or sidebars */
export function ReviewBadge({
  rating,
  totalReviews,
  reviewUrl,
}: {
  rating: number;
  totalReviews: number;
  reviewUrl?: string;
}) {
  const content = (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      <span className="font-semibold">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">on Google</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{totalReviews} reviews</span>
    </span>
  );

  if (reviewUrl) {
    return (
      <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
        {content}
      </a>
    );
  }
  return content;
}

/** Full reviews section for homepage/service pages */
export function GoogleReviews({
  rating,
  totalReviews,
  reviews,
  compact = false,
  reviewUrl,
}: GoogleReviewsProps) {
  if (compact) {
    return <ReviewBadge rating={rating} totalReviews={totalReviews} reviewUrl={reviewUrl} />;
  }

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            What Our Customers Say
          </h2>
          <div className="mt-3 flex items-center justify-center gap-2">
            <StarRating rating={Math.round(rating)} />
            <span className="text-lg font-semibold">{rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({totalReviews} reviews on Google)</span>
          </div>
        </div>

        {/* Reviews grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 5).map((review, i) => (
            <article
              key={i}
              className="flex flex-col rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center gap-3">
                {review.profile_photo_url ? (
                  <img
                    src={review.profile_photo_url}
                    alt=""
                    className="h-10 w-10 rounded-full"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {review.author_name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{review.author_name}</p>
                  <p className="text-xs text-muted-foreground">{review.relative_time_description}</p>
                </div>
              </div>
              <StarRating rating={review.rating} />
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-4">
                {review.text}
              </p>
            </article>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {reviewUrl && (
            <a
              href={reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Star className="h-4 w-4" />
              Leave a Review
            </a>
          )}
          <a
            href="https://www.google.com/maps/place/Eastern+Landscape+%26+Mason+Supply/@40.7932,-72.7889,17z/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            See all reviews on Google
          </a>
        </div>
      </div>
    </section>
  );
}

export default GoogleReviews;
