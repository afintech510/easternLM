import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type CachedReview = {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
  profile_photo_url?: string;
  author_url?: string;
  time?: number;
};

export type ReviewsData = {
  rating: number;
  totalReviews: number;
  reviews: CachedReview[];
  reviewUrl: string | null;
};

const FALLBACK: ReviewsData = {
  rating: 5.0,
  totalReviews: 17,
  reviews: [],
  reviewUrl: null,
};

export async function getGoogleReviews(): Promise<ReviewsData> {
  try {
    const supabase = getSupabaseAdminClient();

    const [cacheResult, settingsResult] = await Promise.all([
      supabase.from("google_reviews_cache").select("*").eq("id", 1).single(),
      supabase.from("site_settings").select("google_review_url").eq("id", 1).single(),
    ]);

    const cache = cacheResult.data;
    const reviewUrl = settingsResult.data?.google_review_url || null;

    if (!cache) return { ...FALLBACK, reviewUrl };

    return {
      rating: Number(cache.overall_rating) || 5.0,
      totalReviews: cache.total_reviews || 0,
      reviews: (cache.reviews as CachedReview[]) || [],
      reviewUrl,
    };
  } catch {
    // During build or when Supabase is unavailable, return fallback
    return FALLBACK;
  }
}
