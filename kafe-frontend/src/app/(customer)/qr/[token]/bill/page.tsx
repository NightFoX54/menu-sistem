'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import Modal from '@/components/ui/Modal';
import { useWebSocket } from '@/hooks/useWebSocket';
import { type OrderStatus } from '@/lib/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: number;
  menuItemId: number;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  status: OrderStatus;
}

interface Order {
  id: number;
  sessionId: number;
  status: OrderStatus;
  notes?: string;
  takenByName?: string;
  createdAt: string;
  items: OrderItem[];
}

interface Bill {
  sessionId: number;
  tableId: number;
  orders: Order[];
  totalAmount: number;
}

interface QrData {
  sessionId: number;
  tenantId: number;
  tableName: string;
}

interface WsOrderUpdate {
  orderId: number;
  newStatus: OrderStatus;
  updatedAt: string;
  items: Array<{ id: number; status: OrderStatus }>;
}

interface WsSessionEvent {
  type: string;   // SESSION_CLOSED
  sessionId: number;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BillPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const [bill, setBill]           = useState<Bill | null>(null);
  const [qrData, setQrData]       = useState<QrData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Bill request flow
  const [billRequested, setBillRequested] = useState(false);
  const [requesting, setRequesting]       = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Session closed → feedback flow
  const [sessionClosed, setSessionClosed] = useState(false);
  const [showFeedback, setShowFeedback]   = useState(false);
  const [rating, setRating]               = useState(0);
  const [comment, setComment]             = useState('');
  const [itemRatings, setItemRatings]     = useState<Record<number, boolean | null>>({});
  const [feedbackSent, setFeedbackSent]   = useState(false);
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  const { connect, subscribe, disconnect } = useWebSocket();

  // ── Load bill ───────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get<QrData>(`/api/qr/${token}`)
      .then(({ data }) => {
        setQrData(data);
        return api.get<Bill>(`/api/sessions/${data.sessionId}/bill`, {
          headers: { 'X-Tenant-Id': String(data.tenantId) },
        });
      })
      .then(({ data: billData }) => setBill(billData))
      .catch(() => setError('Hesap bilgisi yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [token]);

  // ── WebSocket subscriptions ─────────────────────────────────────────────────
  useEffect(() => {
    if (!qrData) return;
    connect(qrData.tenantId, qrData.sessionId);

    // Order status updates
    const unsubOrder = subscribe(`/topic/table/${qrData.sessionId}`, (data) => {
      const upd = data as WsOrderUpdate;
      setBill((prev) => {
        if (!prev) return prev;
        const itemMap = new Map(upd.items.map((i) => [i.id, i.status]));
        return {
          ...prev,
          orders: prev.orders.map((order) => {
            if (order.id !== upd.orderId) return order;
            return {
              ...order,
              status: upd.newStatus,
              items: order.items.map((item) => ({
                ...item,
                status: itemMap.get(item.id) ?? item.status,
              })),
            };
          }),
        };
      });
    });

    // Session events (close → prompt feedback)
    const unsubSession = subscribe(`/topic/session/${qrData.sessionId}`, (data) => {
      const evt = data as WsSessionEvent;
      if (evt.type === 'SESSION_CLOSED') {
        setSessionClosed(true);
        setShowFeedback(true);
      }
    });

    return () => { unsubOrder(); unsubSession(); disconnect(); };
  }, [qrData, connect, subscribe, disconnect]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRequestBill = async () => {
    if (!qrData || requesting) return;
    setRequesting(true);
    try {
      await api.post(
        `/api/sessions/${qrData.sessionId}/bill-request`,
        {},
        { headers: { 'X-Tenant-Id': String(qrData.tenantId) } }
      );
      setBillRequested(true);
    } catch { /* ignore — garson yine de görecek */ } finally {
      setRequesting(false);
      setShowConfirmModal(true);
    }
  };

  // Unique menu items from the bill (for item-level rating)
  const billItems = useMemo(() => {
    if (!bill) return [];
    const seen = new Set<number>();
    const result: { menuItemId: number; menuItemName: string }[] = [];
    for (const order of bill.orders) {
      for (const item of order.items) {
        if (item.status !== 'CANCELLED' && !seen.has(item.menuItemId)) {
          seen.add(item.menuItemId);
          result.push({ menuItemId: item.menuItemId, menuItemName: item.menuItemName });
        }
      }
    }
    return result;
  }, [bill]);

  const toggleItemRating = (menuItemId: number, liked: boolean) => {
    setItemRatings((prev) => ({
      ...prev,
      [menuItemId]: prev[menuItemId] === liked ? null : liked,
    }));
  };

  const handleFeedback = async () => {
    if (!qrData || rating === 0) return;
    setFeedbackSaving(true);
    const ratedItems = Object.entries(itemRatings)
      .filter(([, v]) => v !== null)
      .map(([id, liked]) => ({ menuItemId: Number(id), liked: liked as boolean }));
    try {
      await api.post(
        '/api/feedback',
        {
          sessionId: qrData.sessionId,
          rating,
          comment: comment.trim() || undefined,
          items: ratedItems.length > 0 ? ratedItems : undefined,
        },
        { headers: { 'X-Tenant-Id': String(qrData.tenantId) } }
      );
      setFeedbackSent(true);
    } catch { /* conflict = already submitted, treat as sent */ setFeedbackSent(true); } finally {
      setFeedbackSaving(false);
    }
  };

  const orderSubtotal = (order: Order) =>
    order.items.filter((i) => i.status !== 'CANCELLED')
      .reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const activeOrders = bill?.orders.filter((o) => o.status !== 'CANCELLED') ?? [];

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-50"><LoadingSpinner size="lg" /></div>;
  }

  if (error || !bill) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-5 p-6 bg-gray-50 text-center">
        <span className="text-5xl">❌</span>
        <p className="text-gray-600 font-medium">{error || 'Hesap bulunamadı.'}</p>
        <Button variant="secondary" onClick={() => router.push(`/qr/${token}`)}>Menüye Dön</Button>
      </div>
    );
  }

  // ── Session kapatıldıktan sonra feedback ekranı ────────────────────────────
  if (sessionClosed && showFeedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-8 text-center space-y-5">
          {feedbackSent ? (
            <>
              <span className="text-6xl block">🙏</span>
              <h2 className="text-xl font-bold text-gray-900">Teşekkürler!</h2>
              <p className="text-gray-500 text-sm">Yorumunuz için teşekkür ederiz. Tekrar görüşmek üzere!</p>
            </>
          ) : (
            <>
              <span className="text-5xl block">⭐</span>
              <h2 className="text-xl font-bold text-gray-900">Deneyiminizi değerlendirin</h2>
              <p className="text-gray-500 text-sm">Bize birkaç saniye ayırır mısınız?</p>

              {/* Star rating */}
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-transform hover:scale-110 ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              {/* Per-item liked / disliked */}
              {billItems.length > 0 && (
                <div className="w-full text-left space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Ürünleri değerlendirin
                  </p>
                  {billItems.map(({ menuItemId, menuItemName }) => {
                    const val = itemRatings[menuItemId];
                    return (
                      <div
                        key={menuItemId}
                        className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-b-0"
                      >
                        <span className="text-sm text-gray-700 flex-1 leading-tight">{menuItemName}</span>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => toggleItemRating(menuItemId, true)}
                            className={`w-9 h-9 rounded-full text-base flex items-center justify-center transition-all border ${
                              val === true
                                ? 'bg-green-500 border-green-500 text-white shadow-sm'
                                : 'bg-white border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-500'
                            }`}
                          >
                            👍
                          </button>
                          <button
                            onClick={() => toggleItemRating(menuItemId, false)}
                            className={`w-9 h-9 rounded-full text-base flex items-center justify-center transition-all border ${
                              val === false
                                ? 'bg-red-500 border-red-500 text-white shadow-sm'
                                : 'bg-white border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500'
                            }`}
                          >
                            👎
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Genel yorumunuz... (opsiyonel)"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />

              <Button fullWidth onClick={handleFeedback} loading={feedbackSaving} disabled={rating === 0}>
                Gönder
              </Button>
              <button
                onClick={() => setShowFeedback(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Atla
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main bill view ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push(`/qr/${token}`)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            ←
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Hesabım</h1>
          {qrData && (
            <span className="ml-auto text-sm text-gray-400">{qrData.tableName}</span>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <span className="text-5xl">🛒</span>
            <p className="text-gray-400 font-medium">Henüz sipariş verilmedi.</p>
            <Button onClick={() => router.push(`/qr/${token}`)}>Menüye Git</Button>
          </div>
        ) : (
          activeOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <div>
                  <p className="font-semibold text-sm text-gray-800">Sipariş #{order.id}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    {order.takenByName && ` · ${order.takenByName}`}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <ul className="divide-y divide-gray-50">
                {order.items.filter((i) => i.status !== 'CANCELLED').map((item) => (
                  <li key={item.id} className="flex items-start justify-between px-4 py-3 gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="shrink-0 text-xs font-semibold bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 mt-0.5">
                        {item.quantity}×
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 font-medium leading-tight">{item.menuItemName}</p>
                        {item.notes && (
                          <p className="text-xs text-gray-400 italic mt-0.5 truncate">{item.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <p className="text-sm font-semibold text-gray-700">
                        ₺{(item.unitPrice * item.quantity).toFixed(2)}
                      </p>
                      <OrderStatusBadge status={item.status} />
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex justify-between items-center px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                <span className="text-xs text-gray-500">Ara Toplam</span>
                <span className="text-sm font-semibold text-gray-700">₺{orderSubtotal(order).toFixed(2)}</span>
              </div>

              {order.notes && (
                <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-100">
                  <p className="text-xs text-yellow-700 italic">Not: {order.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </main>

      {activeOrders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Genel Toplam</span>
              <span className="text-2xl font-bold text-orange-600">₺{bill.totalAmount.toFixed(2)}</span>
            </div>
            <Button
              fullWidth
              size="lg"
              variant={billRequested ? 'secondary' : 'primary'}
              disabled={billRequested}
              loading={requesting}
              onClick={handleRequestBill}
            >
              {billRequested ? '✓ Hesap İstendi' : 'Hesabı İste'}
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} title="Hesap İsteği">
        <div className="text-center py-2 space-y-4">
          <span className="text-5xl block">🧾</span>
          <p className="text-gray-700">
            Hesap isteğiniz garsonumuza iletildi. En kısa sürede masanıza gelecektir.
          </p>
          <Button fullWidth onClick={() => setShowConfirmModal(false)}>Tamam</Button>
        </div>
      </Modal>
    </div>
  );
}
