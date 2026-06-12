'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface FeedbackItemResponse {
  menuItemId: number;
  menuItemName: string;
  liked: boolean;
}

interface FeedbackResponse {
  id: number;
  sessionId: number;
  tableName: string;
  rating: number;
  comment?: string;
  items: FeedbackItemResponse[];
  createdAt: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-lg ${s <= rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    api.get<FeedbackResponse[]>('/api/admin/feedback')
      .then(({ data }) => setFeedbacks(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avg = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : null;

  // Per-item aggregated stats
  const itemStats = feedbacks
    .flatMap((f) => f.items)
    .reduce<Record<string, { name: string; liked: number; total: number }>>((acc, i) => {
      const key = String(i.menuItemId);
      if (!acc[key]) acc[key] = { name: i.menuItemName, liked: 0, total: 0 };
      acc[key].total += 1;
      if (i.liked) acc[key].liked += 1;
      return acc;
    }, {});

  const itemList = Object.values(itemStats).sort((a, b) => b.total - a.total);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Müşteri Yorumları</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {feedbacks.length} yorum{avg ? ` · Ortalama ${avg} ★` : ''}
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
      ) : feedbacks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-32 text-center">
          <span className="text-6xl">💬</span>
          <p className="text-gray-400 font-medium">Henüz yorum yok.</p>
        </div>
      ) : (
        <main className="p-8 space-y-8">
          {/* Per-item summary */}
          {itemList.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ürün Değerlendirmeleri</h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                {itemList.map((item) => {
                  const pct = Math.round((item.liked / item.total) * 100);
                  return (
                    <div key={item.name} className="flex items-center gap-4 px-5 py-3.5">
                      <span className="flex-1 text-sm font-medium text-gray-800">{item.name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Progress bar */}
                        <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 60 ? 'bg-green-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-600 w-8 text-right">{pct}%</span>
                        <span className="text-xs text-green-600 font-medium">👍 {item.liked}</span>
                        <span className="text-xs text-red-500 font-medium">👎 {item.total - item.liked}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Individual feedbacks */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tüm Yorumlar</h2>
            <div className="space-y-4">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm">{fb.tableName}</span>
                        <span className="text-xs text-gray-400">· #{fb.sessionId}</span>
                      </div>
                      <Stars rating={fb.rating} />
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                      {new Date(fb.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Comment */}
                  {fb.comment && (
                    <p className="text-sm text-gray-700 italic bg-gray-50 rounded-xl px-4 py-3">
                      "{fb.comment}"
                    </p>
                  )}

                  {/* Item ratings */}
                  {fb.items.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {fb.items.map((item) => (
                        <span
                          key={item.menuItemId}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
                            item.liked
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-red-50 border-red-200 text-red-600'
                          }`}
                        >
                          {item.liked ? '👍' : '👎'} {item.menuItemName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
