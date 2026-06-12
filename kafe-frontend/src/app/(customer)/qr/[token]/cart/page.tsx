'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import Button from '@/components/ui/Button';
import api from '@/lib/api';

export default function CartPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const { items, sessionId, updateQuantity, clearCart, total } = useCart();

  // Per-item notes stored locally (not in cart store)
  const [itemNotes, setItemNotes]  = useState<Record<number, string>>({});
  const [orderNote, setOrderNote]  = useState('');
  const [loading, setLoading]      = useState(false);
  const [error, setError]          = useState('');
  const [success, setSuccess]      = useState(false);

  const handleOrder = async () => {
    if (!sessionId || items.length === 0) return;
    setLoading(true);
    setError('');
    try {
      // Geofencing: konumu al, hata/ret durumunda null ile devam et
      let latitude: number | null = null;
      let longitude: number | null = null;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              latitude  = pos.coords.latitude;
              longitude = pos.coords.longitude;
              resolve();
            },
            () => resolve(), // izin verilmedi veya hata — devam et
            { timeout: 5000, maximumAge: 60000 }
          );
        });
      }

      await api.post('/api/orders', {
        sessionId,
        notes:     orderNote.trim() || null,
        latitude,
        longitude,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity:   i.quantity,
          notes:      itemNotes[i.menuItemId]?.trim() || null,
        })),
      });
      clearCart();
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'Sipariş gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl">
          ✅
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Siparişiniz Alındı!</h2>
          <p className="text-gray-500 mt-2 text-sm">Mutfak en kısa sürede hazırlamaya başlayacak.</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button fullWidth onClick={() => router.push(`/qr/${token}`)}>
            Menüye Dön
          </Button>
          <Button fullWidth variant="secondary" onClick={() => router.push(`/qr/${token}/bill`)}>
            Hesabımı Görüntüle
          </Button>
        </div>
      </div>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-5 p-8 text-center">
        <span className="text-6xl">🛒</span>
        <p className="text-gray-500 font-medium">Sepetiniz boş.</p>
        <Button onClick={() => router.push(`/qr/${token}`)}>Menüye Git</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Geri"
          >
            ←
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Sepet</h1>
          <span className="text-sm text-gray-400 ml-auto">{items.length} kalem</span>
        </div>
      </header>

      {/* ── Cart items ─────────────────────────────────────────────────────── */}
      <main className="max-w-xl mx-auto px-4 pt-4 pb-44 space-y-3">
        {items.map((item) => (
          <div
            key={item.menuItemId}
            className="bg-white rounded-xl border border-gray-100 p-4 space-y-3"
          >
            {/* Item row */}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 leading-tight">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  ₺{item.price.toFixed(2)} × {item.quantity}
                </p>
                <p className="text-orange-600 font-bold mt-0.5">
                  ₺{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>

              {/* Quantity stepper */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-500
                    flex items-center justify-center text-gray-600 font-bold text-lg transition-colors"
                >
                  −
                </button>
                <span className="w-7 text-center font-semibold text-gray-900">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-orange-100 hover:bg-orange-200
                    flex items-center justify-center text-orange-700 font-bold text-lg transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Per-item note */}
            <input
              type="text"
              value={itemNotes[item.menuItemId] ?? ''}
              onChange={(e) =>
                setItemNotes((prev) => ({ ...prev, [item.menuItemId]: e.target.value }))
              }
              placeholder="Not ekle (opsiyonel)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300"
            />
          </div>
        ))}

        {/* Order-level note */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Genel Sipariş Notu
          </label>
          <textarea
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="Örn: Köpek balığı alerjim var, lütfen dikkate alın"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none
              h-20 focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-gray-300"
          />
        </div>
      </main>

      {/* ── Sticky footer: total + submit ───────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700">Toplam</span>
            <span className="text-2xl font-bold text-orange-600">
              ₺{total().toFixed(2)}
            </span>
          </div>
          <Button fullWidth size="lg" onClick={handleOrder} loading={loading}>
            Siparişi Ver
          </Button>
        </div>
      </div>
    </div>
  );
}
