'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import StaffHeader from '@/components/layout/StaffHeader';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import api from '@/lib/api';
import { type OrderStatus, ORDER_STATUS_CONFIG } from '@/lib/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Table {
  id: number;
  name: string;
  capacity: number;
  qrToken: string;
  isActive: boolean;
  activeSessionId: number | null;
}

interface Category { id: number; name: string; displayOrder: number; }
interface MenuItem  { id: number; categoryId: number; name: string; description?: string; price: number; isAvailable: boolean; }

interface OrderItemResp { menuItemName: string; quantity: number; unitPrice: number; }
interface Order { id: number; status: OrderStatus; createdAt: string; items: OrderItemResp[]; }
interface BillResponse { sessionId: number; orders: Order[]; totalAmount: number; }

type Cart = Record<number, number>; // itemId → quantity

// sessionId → notification types active for that session
type NotifMap = Map<number, Set<string>>;

interface WaiterNotification {
  type: string;   // ORDER_READY | BILL_REQUESTED
  orderId: number | null;
  sessionId: number;
  tableName: string;
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'CONFIRMED', CONFIRMED: 'PREPARING', PREPARING: 'READY', READY: 'SERVED',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WaiterPage() {
  const { user, token, hydrated, hydrate } = useAuth();
  const router = useRouter();
  const { connect, subscribe, disconnect } = useWebSocket();

  const [tables, setTables]   = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  // notification badges: sessionId → types
  const [notifs, setNotifs] = useState<NotifMap>(new Map());

  // ── Bill modal ──
  const [billTable, setBillTable]     = useState<Table | null>(null);
  const [bill, setBill]               = useState<BillResponse | null>(null);
  const [billLoading, setBillLoading] = useState(false);
  const [closing, setClosing]         = useState(false);

  // ── Order modal ──
  const [orderTable, setOrderTable]   = useState<Table | null>(null);
  const [sessionId, setSessionId]     = useState<number | null>(null);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [activeCat, setActiveCat]     = useState<number | null>(null);
  const [cart, setCart]               = useState<Cart>({});
  const [orderNotes, setOrderNotes]   = useState('');
  const [menuLoading, setMenuLoading] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const allItemsRef = useRef<MenuItem[]>([]);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { if (hydrated && !token) router.replace('/auth/login'); }, [hydrated, token, router]);

  const refreshTables = useCallback(() => {
    api.get<Table[]>('/api/waiter/tables').then(({ data }) => setTables(data)).catch(() => {});
  }, []);

  // Load tables
  useEffect(() => {
    if (!user) return;
    api.get<Table[]>('/api/waiter/tables')
      .then(({ data }) => setTables(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // WebSocket: waiter notification channel
  useEffect(() => {
    if (!user) return;
    connect(user.tenantId);

    const unsub = subscribe(`/topic/waiter/${user.tenantId}`, (data) => {
      const notif = data as WaiterNotification;
      setNotifs((prev) => {
        const next = new Map(prev);
        const types = new Set(next.get(notif.sessionId) ?? []);
        types.add(notif.type);
        next.set(notif.sessionId, types);
        return next;
      });
    });

    return () => { unsub(); disconnect(); };
  }, [user, connect, subscribe, disconnect]);

  const clearNotifs = (sid: number) => {
    setNotifs((prev) => {
      const next = new Map(prev);
      next.delete(sid);
      return next;
    });
  };

  // ── Bill modal ──────────────────────────────────────────────────────────────

  const openBill = async (table: Table) => {
    if (!table.activeSessionId) return;
    setBillTable(table);
    setBill(null);
    setBillLoading(true);
    clearNotifs(table.activeSessionId);
    try {
      const { data } = await api.get<BillResponse>(`/api/sessions/${table.activeSessionId}/bill`);
      setBill(data);
    } catch { /* ignore */ } finally { setBillLoading(false); }
  };

  const handleBillStatus = async (orderId: number, next: OrderStatus) => {
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: next });
      if (billTable?.activeSessionId) {
        const { data } = await api.get<BillResponse>(`/api/sessions/${billTable.activeSessionId}/bill`);
        setBill(data);
      }
    } catch { /* ignore */ }
  };

  const handleCloseSession = async () => {
    if (!billTable?.activeSessionId) return;
    setClosing(true);
    try {
      await api.post(`/api/sessions/${billTable.activeSessionId}/close`);
      setBillTable(null);
      setBill(null);
      clearNotifs(billTable.activeSessionId);
      refreshTables();
    } catch { /* ignore */ } finally { setClosing(false); }
  };

  // ── Order modal ─────────────────────────────────────────────────────────────

  const openOrderModal = async (table: Table) => {
    setOrderTable(table);
    setCart({});
    setOrderNotes('');
    setSubmitError('');
    setMenuLoading(true);

    try {
      const { data: sessData } = await api.post<{ sessionId: number }>(`/api/waiter/tables/${table.id}/session`);
      setSessionId(sessData.sessionId);

      if (allItemsRef.current.length === 0) {
        const { data: menu } = await api.get<{ categories: Category[]; items: MenuItem[] }>('/api/waiter/menu');
        const sorted = [...menu.categories].sort((a, b) => a.displayOrder - b.displayOrder);
        setCategories(sorted);
        allItemsRef.current = menu.items;
        if (sorted.length > 0) setActiveCat(sorted[0].id);
      } else {
        if (activeCat === null && categories.length > 0) setActiveCat(categories[0].id);
      }
    } catch { setSubmitError('Menü yüklenemedi.'); } finally { setMenuLoading(false); }
  };

  const changeQty = (itemId: number, delta: number) => {
    setCart((prev) => {
      const next = (prev[itemId] ?? 0) + delta;
      if (next <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const currentItems = allItemsRef.current.filter((i) => i.categoryId === activeCat && i.isAvailable);

  const handleSubmitOrder = async () => {
    if (!sessionId || cartCount === 0) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const items = Object.entries(cart).map(([id, qty]) => ({
        menuItemId: Number(id),
        quantity:   qty,
      }));
      await api.post('/api/orders', {
        sessionId,
        notes: orderNotes.trim() || undefined,
        items,
      });
      setOrderTable(null);
      setCart({});
      setOrderNotes('');
      refreshTables();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(msg ?? 'Sipariş gönderilemedi.');
    } finally { setSubmitting(false); }
  };

  const closeOrderModal = () => { setOrderTable(null); setCart({}); setSubmitError(''); };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <StaffHeader title="Garson Paneli" />

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>
      ) : (
        <main className="flex-1 overflow-y-auto p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Masalar</h2>
          {tables.length === 0 ? (
            <p className="text-gray-400">Henüz masa tanımlanmamış.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tables.map((table) => {
                const occupied    = table.activeSessionId != null;
                const tableNotifs = occupied ? (notifs.get(table.activeSessionId!) ?? new Set()) : new Set<string>();
                const hasBill     = tableNotifs.has('BILL_REQUESTED');
                const hasReady    = tableNotifs.has('ORDER_READY');
                const hasAny      = hasBill || hasReady;

                return (
                  <div
                    key={table.id}
                    className={`relative bg-white rounded-2xl border p-4 flex flex-col items-center gap-3 transition-all hover:shadow-md ${
                      hasBill
                        ? 'border-red-300 ring-2 ring-red-200'
                        : hasReady
                        ? 'border-blue-300 ring-2 ring-blue-200'
                        : occupied
                        ? 'border-green-300 ring-1 ring-green-200'
                        : 'border-gray-100'
                    }`}
                  >
                    {/* Notification badge */}
                    {hasAny && (
                      <div className="absolute -top-2 -right-2 flex gap-1">
                        {hasBill && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                            Hesap
                          </span>
                        )}
                        {hasReady && (
                          <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                            Hazır
                          </span>
                        )}
                      </div>
                    )}

                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-black text-center px-1 ${
                        hasBill
                          ? 'bg-red-100 text-red-700'
                          : hasReady
                          ? 'bg-blue-100 text-blue-700'
                          : occupied
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {table.name}
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">{table.capacity} kişilik</p>
                      <p className={`text-xs font-semibold mt-0.5 ${occupied ? 'text-green-600' : 'text-gray-400'}`}>
                        {occupied ? '● Dolu' : '○ Boş'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 w-full">
                      <button
                        onClick={() => openOrderModal(table)}
                        className="w-full text-xs font-semibold py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                      >
                        + Sipariş Ekle
                      </button>
                      {occupied && (
                        <button
                          onClick={() => openBill(table)}
                          className={`w-full text-xs font-semibold py-1.5 rounded-lg transition-colors ${
                            hasBill
                              ? 'bg-red-100 hover:bg-red-200 text-red-700'
                              : hasReady
                              ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }`}
                        >
                          {hasBill ? '🧾 Hesap İstedi' : hasReady ? '✓ Sipariş Hazır' : '📋 Siparişleri Gör'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ── Bill Modal ──────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!billTable}
        onClose={() => { setBillTable(null); setBill(null); }}
        title={billTable ? `${billTable.name} — Siparişler` : ''}
      >
        {billLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : !bill || bill.orders.length === 0 ? (
          <p className="text-gray-400 text-center py-6 text-sm">Henüz sipariş yok.</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {bill.orders.map((order) => {
              const next = NEXT_STATUS[order.status];
              return (
                <div key={order.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">#{order.id}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <ul className="space-y-1">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-gray-700">
                        <span className="shrink-0 w-5 h-5 bg-orange-100 text-orange-700 text-xs font-bold rounded flex items-center justify-center">
                          {item.quantity}
                        </span>
                        <span className="flex-1">{item.menuItemName}</span>
                        <span className="text-gray-400">{(item.unitPrice * item.quantity).toFixed(2)} ₺</span>
                      </li>
                    ))}
                  </ul>
                  {next && (
                    <button
                      onClick={() => handleBillStatus(order.id, next)}
                      className="w-full text-xs font-semibold py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                    >
                      {next === 'SERVED' ? '✓ Servise Al' : ORDER_STATUS_CONFIG[next].label + ' →'}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Total + close session */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Toplam</span>
                <span className="font-bold text-gray-900">{bill.totalAmount.toFixed(2)} ₺</span>
              </div>
              <Button
                fullWidth
                loading={closing}
                onClick={handleCloseSession}
              >
                ✓ Ödendi — Masayı Kapat
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Order Modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!orderTable}
        onClose={closeOrderModal}
        title={orderTable ? `${orderTable.name} — Sipariş Ekle` : ''}
      >
        {menuLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          <div className="flex flex-col gap-3" style={{ minHeight: 320 }}>
            {/* Category tabs */}
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCat(cat.id)}
                    className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                      activeCat === cat.id
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-60">
              {currentItems.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Bu kategoride ürün yok.</p>
              ) : (
                currentItems.map((item) => {
                  const qty = cart[item.id] ?? 0;
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-orange-600 font-semibold">{item.price.toFixed(2)} ₺</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => changeQty(item.id, -1)}
                          disabled={qty === 0}
                          className="w-7 h-7 rounded-full border border-gray-200 text-gray-600 font-bold disabled:opacity-30 hover:bg-gray-100 transition-colors"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-gray-800">
                          {qty || ''}
                        </span>
                        <button
                          onClick={() => changeQty(item.id, 1)}
                          className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Notes */}
            <div className="shrink-0">
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Sipariş notu (opsiyonel)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {submitError && <p className="text-sm text-red-500 shrink-0">{submitError}</p>}
            <div className="shrink-0 flex gap-2">
              <button
                onClick={closeOrderModal}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <Button
                fullWidth
                loading={submitting}
                onClick={handleSubmitOrder}
              >
                {cartCount > 0 ? `Gönder (${cartCount} ürün)` : 'Gönder'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
