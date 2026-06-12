'use client';

import { useEffect, useState } from 'react';
import StaffHeader from '@/components/layout/StaffHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import api from '@/lib/api';
import { type OrderStatus, ORDER_STATUS_CONFIG } from '@/lib/constants';

interface OrderItem {
  id: number;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

interface Order {
  id: number;
  sessionId: number;
  tableName: string;
  status: OrderStatus;
  notes?: string;
  takenByName?: string;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: 'Aktif', value: 'PENDING,CONFIRMED,PREPARING,READY' },
  { label: 'Bekliyor', value: 'PENDING' },
  { label: 'Hazırlanıyor', value: 'CONFIRMED,PREPARING' },
  { label: 'Hazır', value: 'READY' },
  { label: 'Servis', value: 'SERVED' },
  { label: 'İptal', value: 'CANCELLED' },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING:   'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY:     'SERVED',
};

export default function AdminOrdersPage() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState(STATUS_FILTERS[0].value);
  const [updating, setUpdating]   = useState<number | null>(null);

  const load = async (statuses: string) => {
    setLoading(true);
    try {
      const { data } = await api.get<Order[]>('/api/orders', { params: { statuses } });
      setOrders(data);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const handleStatus = async (orderId: number, next: OrderStatus) => {
    setUpdating(orderId);
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: next });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: next } : o));
    } catch { /* ignore */ } finally {
      setUpdating(null);
    }
  };

  const timeAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return 'Şimdi';
    if (mins < 60) return `${mins} dk önce`;
    return `${Math.floor(mins / 60)} sa önce`;
  };

  return (
    <>
      <StaffHeader title="Siparişler" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4 max-w-4xl">
          <h2 className="text-xl font-bold text-gray-800">Siparişler</h2>
          <button
            onClick={() => load(filter)}
            className="text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            ↻ Yenile
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-5 flex-wrap max-w-4xl">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                filter === f.value
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Bu filtreye ait sipariş yok.</div>
        ) : (
          <div className="max-w-4xl space-y-3">
            {orders.map((order) => {
              const next = NEXT_STATUS[order.status];
              const ageMs  = Date.now() - new Date(order.createdAt).getTime();
              const urgent = order.status === 'PENDING' && ageMs > 5 * 60_000;
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-xl border p-4 space-y-3 ${
                    urgent ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">#{order.id}</span>
                        <span className="text-sm text-gray-500">{order.tableName}</span>
                        {order.takenByName && (
                          <span className="text-xs text-gray-400">· {order.takenByName}</span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${urgent ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                        {timeAgo(order.createdAt)}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <ul className="space-y-1 border-t border-gray-100 pt-2">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex gap-2 text-sm">
                        <span className="shrink-0 w-5 h-5 bg-orange-100 text-orange-700 text-xs font-bold rounded flex items-center justify-center">
                          {item.quantity}
                        </span>
                        <span className="flex-1 text-gray-700">{item.menuItemName}</span>
                        <span className="text-gray-400">{(item.unitPrice * item.quantity).toFixed(2)} ₺</span>
                      </li>
                    ))}
                  </ul>

                  {order.notes && (
                    <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-2.5 py-1.5">
                      📝 {order.notes}
                    </p>
                  )}

                  {next && (
                    <button
                      disabled={updating === order.id}
                      onClick={() => handleStatus(order.id, next)}
                      className="w-full py-2 text-sm font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition-colors"
                    >
                      {updating === order.id ? '...' : `→ ${ORDER_STATUS_CONFIG[next].label}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
