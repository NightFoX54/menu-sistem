'use client';

import { useEffect, useState } from 'react';
import StaffHeader from '@/components/layout/StaffHeader';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import api from '@/lib/api';
import { type OrderStatus } from '@/lib/constants';

interface DashboardStats {
  activeTables: number;
  todayOrders: number;
  pendingOrders: number;
  todayRevenue: number;
}

interface OrderItem { menuItemName: string; quantity: number; }
interface RecentOrder {
  id: number;
  tableName: string;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}

interface LowStockItem {
  id: number;
  name: string;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats]         = useState<DashboardStats | null>(null);
  const [recent, setRecent]       = useState<RecentOrder[]>([]);
  const [lowStock, setLowStock]   = useState<LowStockItem[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats>('/api/admin/dashboard/stats'),
      api.get<RecentOrder[]>('/api/orders', { params: { statuses: 'PENDING,CONFIRMED,PREPARING,READY' } }),
      api.get<LowStockItem[]>('/api/admin/ingredients'),
    ]).then(([statsRes, ordersRes, ingredientsRes]) => {
      setStats(statsRes.data);
      setRecent(ordersRes.data.slice(0, 5));
      setLowStock(ingredientsRes.data.filter((i) => i.stockQuantity < i.lowStockThreshold));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const STAT_CARDS = stats ? [
    { label: 'Aktif Masalar',       icon: '🪑', value: stats.activeTables },
    { label: 'Bugünkü Siparişler',  icon: '📋', value: stats.todayOrders  },
    { label: 'Bekleyen Siparişler', icon: '⏳', value: stats.pendingOrders },
    { label: 'Bugünkü Gelir (₺)',   icon: '💰', value: stats.todayRevenue.toFixed(2) },
  ] : [];

  return (
    <>
      <StaffHeader title="Dashboard" />
      <main className="flex-1 overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {STAT_CARDS.map((s) => (
                <Card key={s.label} className="text-center py-6">
                  <span className="text-3xl">{s.icon}</span>
                  <p className="text-2xl font-bold mt-2 text-gray-900">{s.value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="min-h-48">
                <h3 className="font-semibold text-gray-700 mb-3">Aktif Siparişler</h3>
                {recent.length === 0 ? (
                  <p className="text-sm text-gray-400">Bekleyen sipariş yok.</p>
                ) : (
                  <div className="space-y-2">
                    {recent.map((o) => (
                      <div key={o.id} className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-b-0">
                        <span className="text-sm font-semibold text-gray-600 w-8">#{o.id}</span>
                        <span className="text-sm text-gray-700 flex-1 truncate">
                          {o.tableName} · {o.items.map((i) => `${i.quantity}× ${i.menuItemName}`).join(', ')}
                        </span>
                        <OrderStatusBadge status={o.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="min-h-48">
                <h3 className="font-semibold text-gray-700 mb-3">Stok Uyarıları</h3>
                {lowStock.length === 0 ? (
                  <p className="text-sm text-gray-400">Tüm stoklar yeterli.</p>
                ) : (
                  <div className="space-y-2">
                    {lowStock.map((i) => (
                      <div key={i.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-b-0">
                        <span className="text-red-500 text-sm">⚠</span>
                        <span className="text-sm text-gray-700 flex-1">{i.name}</span>
                        <span className="text-xs text-red-600 font-semibold">
                          {i.stockQuantity.toFixed(2)} / {i.lowStockThreshold.toFixed(2)} {i.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </main>
    </>
  );
}
