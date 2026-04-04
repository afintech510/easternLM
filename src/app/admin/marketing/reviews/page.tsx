"use client";

import { useEffect, useState } from "react";
import { Star, CheckCircle, Pencil, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const API = process.env.NEXT_PUBLIC_MARKETING_API_URL || "http://localhost:3200";

interface Review {
  id: string;
  platform: string;
  rating: number | null;
  reviewer_name: string | null;
  review_text: string | null;
  response_draft: string | null;
  response_status: string;
  created_at: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    fetch(`${API}/api/reviews/pending`).then(r => r.json()).then(d => {
      setReviews(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const approveResponse = async (id: string) => {
    await fetch(`${API}/api/reviews/${id}/approve`, { method: "POST" });
    setReviews(prev => prev.filter(r => r.id !== id));
  };

  const editAndApprove = async (id: string) => {
    await fetch(`${API}/api/reviews/${id}/edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response_draft: editDraft }),
    });
    setReviews(prev => prev.filter(r => r.id !== id));
    setEditingId(null);
    setEditDraft("");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reviews</h1>

      {reviews.length === 0 ? (
        <div className="rounded-lg border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">No reviews awaiting response.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`h-4 w-4 ${s <= (review.rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                  ))}
                </div>
                <span className="text-sm font-medium">{review.reviewer_name ?? "Anonymous"}</span>
                <Badge variant="outline" className="text-xs">{review.platform}</Badge>
              </div>

              {review.review_text && (
                <p className="text-sm text-muted-foreground mb-3 italic">"{review.review_text}"</p>
              )}

              {review.response_draft && (
                <div className="bg-muted/50 rounded-md p-3 mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">AI Draft Response:</p>
                  {editingId === review.id ? (
                    <textarea
                      className="w-full rounded-md border p-2 text-sm"
                      rows={3}
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm">{review.response_draft}</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {editingId === review.id ? (
                  <>
                    <Button size="sm" onClick={() => editAndApprove(review.id)} className="bg-green-600 hover:bg-green-700 text-white">Save & Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditDraft(""); }}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={() => approveResponse(review.id)} className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(review.id); setEditDraft(review.response_draft ?? ""); }}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
