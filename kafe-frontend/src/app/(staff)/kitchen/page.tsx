'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { type OrderStatus } from '@/lib/constants';
import StaffHeader from '@/components/layout/StaffHeader';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface KitchenItem {
  id: number;
  menuItemName: string;
  quantity: number;
  notes?: string;
  status: OrderStatus;
}

interface KitchenOrder {
  id: number;
  sessionId: number;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  items: KitchenItem[];
}

interface WsUpdate {
  orderId: number;
  newStatus: OrderStatus;
  updatedAt: string;
  items: Array<{ id: number; name: string; quantity: number; status: OrderStatus }>;
}

// ── Constants ────────────────────────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING:   'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
};

const COLUMNS: Array<{ statuses: OrderStatus[]; label: string; accent: string }> = [
  { statuses: ['PENDING'],               label: 'Bekleyen',      accent: 'border-yellow-500' },
  { statuses: ['CONFIRMED', 'PREPARING'], label: 'Hazırlanıyor', accent: 'border-orange-500' },
  { statuses: ['READY'],                 label: 'Hazır',         accent: 'border-green-500'  },
];

// ── Notification beep (Web Audio API) ────────────────────────────────────────

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* AudioContext unavailable */ }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function KitchenPage() {
  const { user, token, hydrated, hydrate } = useAuth();
  const [orders, setOrders]   = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const knownIds = useRef<Set<number>>(new Set());
  const { connect, subscribe, disconnect } = useWebSocket();

  useEffect(() => { hydrate(); }, [hydrate]);

  // Load active orders
  useEffect(() => {
    if (!user) return;
    api
      .get<KitchenOrder[]>('/api/orders', {
        params: { statuses: 'PENDING,CONFIRMED,PREPARING,READY' },
      })
      .then(({ data }) => {
        setOrders(data);
        data.forEach((o) => knownIds.current.add(o.id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // WebSocket
  useEffect(() => {
    if (!user) return;
    connect(user.tenantId, null);

    const unsub = subscribe(`/topic/kitchen/${user.tenantId}`, (data) => {
      const upd = data as WsUpdate;

      // Remove completed / cancelled
      if (upd.newStatus === 'SERVED' || upd.newStatus === 'CANCELLED') {
        setOrders((prev) => prev.filter((o) => o.id !== upd.orderId));
        knownIds.current.delete(upd.orderId);
        return;
      }

      const isNew = !knownIds.current.has(upd.orderId);

      if (isNew) {
        playBeep();
        knownIds.current.add(upd.orderId);

        // Minimal entry from WS data; enrich in background
        const partial: KitchenOrder = {
          id:        upd.orderId,
          sessionId: 0,
          status:    upd.newStatus,
          createdAt: upd.updatedAt,
          items:     upd.items.map((i) => ({
            id:            i.id,
            menuItemName:  i.name,
            quantity:      i.quantity,
            status:        i.status,
          })),
        };
        setOrders((prev) => [partial, ...prev]);

        api.get<KitchenOrder>(`/api/orders/${upd.orderId}`)
          .then(({ data: full }) =>
            setOrders((prev) => prev.map((o) => (o.id === upd.orderId ? full : o)))
          )
          .catch(() => {});
      } else {
        const itemMap = new Map(upd.items.map((i) => [i.id, i.status]));
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== upd.orderId) return o;
            return {
              ...o,
              status: upd.newStatus,
              items:  o.items.map((item) => ({
                ...item,
                status: itemMap.get(item.id) ?? item.status,
              })),
            };
          })
        );
      }
    });

    return () => { unsub(); disconnect(); };
  }, [user, connect, subscribe, disconnect]);

  const handleStatusChange = async (orderId: number, next: OrderStatus) => {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: next } : o))
    );
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: next });
    } catch { /* WS will correct state on failure */ }
  };

  if (!hydrated || loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-900">
        <StaffHeader title="Mutfak Ekranı" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <StaffHeader title="Mutfak Ekranı" />

      <div className="flex-1 overflow-x-auto p-4">
        <div
          className="flex gap-4 h-full"
          style={{ minWidth: `${COLUMNS.length * 320}px` }}
        >
          {COLUMNS.map(({ statuses, label, accent }) => {
            const colOrders = orders.filter((o) => statuses.includes(o.status));
            return (
              <div key={label} className="flex-1 min-w-72 flex flex-col gap-2">
                {/* Column header */}
                <div
                  className={`flex items-center gap-2 pb-2 border-b-2 ${accent}`}
                >
                  <h2 className="font-bold text-white text-sm uppercase tracking-widest">
                    {label}
                  </h2>
                  <span className="bg-gray-700 text-gray-300 text-xs font-bold rounded-full px-2 py-0.5 ml-auto">
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto pb-2">
                  {colOrders.length === 0 ? (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-700 rounded-xl">
                      <p className="text-gray-600 text-xs">Sipariş yok</p>
                    </div>
                  ) : (
                    colOrders.map((order) => (
                      <KitchenCard
                        key={order.id}
                        order={order}
                        onAction={handleStatusChange}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── KitchenCard ───────────────────────────────────────────────────────────────

function KitchenCard({
  order,
  onAction,
}: {
  order: KitchenOrder;
  onAction: (id: number, status: OrderStatus) => void;
}) {
  const next = NEXT_STATUS[order.status];

  const ageMs   = Date.now() - new Date(order.createdAt).getTime();
  const ageMin  = Math.floor(ageMs / 60_000);
  const ageText = ageMin < 1 ? 'Şimdi' : `${ageMin} dk önce`;
  const urgent  = order.status === 'PENDING' && ageMin >= 5;

  const actionLabel: Partial<Record<OrderStatus, string>> = {
    CONFIRMED: 'Onayla',
    PREPARING: 'Hazırlanıyor →',
    READY:     '✓ Hazır',
  };

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-shadow ${
        urgent
          ? 'bg-red-950 border-red-700 ring-1 ring-red-500'
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-white leading-tight">
            Sipariş #{order.id}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {order.sessionId > 0 && `Oturum ${order.sessionId} · `}
            <span className={urgent ? 'text-red-400 font-semibold' : ''}>
              {ageText}
            </span>
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Items */}
      <ul className="space-y-1.5 border-t border-gray-700 pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <span className="shrink-0 w-6 h-6 rounded bg-orange-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
              {item.quantity}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-gray-200 text-sm">{item.menuItemName}</span>
              {item.notes && (
                <p className="text-xs text-yellow-400 truncate">{item.notes}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="text-xs text-yellow-300 bg-yellow-900/30 rounded-lg px-2.5 py-1.5">
          📝 {order.notes}
        </p>
      )}

      {/* Action button */}
      {next && (
        <button
          onClick={() => onAction(order.id, next)}
          className={`w-full rounded-lg py-2 text-sm font-semibold transition-colors ${
            next === 'READY'
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : next === 'PREPARING'
              ? 'bg-orange-600 hover:bg-orange-500 text-white'
              : 'bg-gray-600 hover:bg-gray-500 text-white'
          }`}
        >
          {actionLabel[next]}
        </button>
      )}
    </div>
  );
}
