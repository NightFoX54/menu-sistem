'use client';

import { useEffect, useState } from 'react';
import StaffHeader from '@/components/layout/StaffHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import OrderStatusBadge from '@/components/order/OrderStatusBadge';
import api from '@/lib/api';
import { type OrderStatus } from '@/lib/constants';

interface Table {
  id: number;
  name: string;
  capacity: number;
  qrToken: string;
  isActive: boolean;
  activeSessionId: number | null;
}

interface OrderItem { menuItemName: string; quantity: number; unitPrice: number; }
interface Order { id: number; status: OrderStatus; createdAt: string; items: OrderItem[]; }
interface BillResponse { sessionId: number; orders: Order[]; totalAmount: number; }

const FRONTEND_URL =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

function qrImageUrl(qrToken: string) {
  const target = encodeURIComponent(`${FRONTEND_URL}/qr/${qrToken}`);
  return `https://api.qrserver.com/v1/create-qr-code/?data=${target}&size=300x300&margin=8`;
}

export default function TablesPage() {
  const [tables, setTables]   = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  // QR modal
  const [qrTable, setQrTable] = useState<Table | null>(null);

  // Orders modal
  const [ordersTable, setOrdersTable]   = useState<Table | null>(null);
  const [bill, setBill]                 = useState<BillResponse | null>(null);
  const [billLoading, setBillLoading]   = useState(false);

  // Add table modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm]           = useState({ name: '', capacity: '4' });
  const [addSaving, setAddSaving]       = useState(false);
  const [addError, setAddError]         = useState('');

  useEffect(() => {
    api.get<Table[]>('/api/admin/tables')
      .then(({ data }) => setTables(data))
      .finally(() => setLoading(false));
  }, []);

  const handleAddTable = async () => {
    if (!addForm.name.trim()) return;
    setAddSaving(true);
    setAddError('');
    try {
      const { data: created } = await api.post<Table>('/api/admin/tables', {
        name:     addForm.name.trim(),
        capacity: parseInt(addForm.capacity) || 4,
      });
      setTables((prev) => [...prev, created]);
      setShowAddModal(false);
      setAddForm({ name: '', capacity: '4' });
    } catch {
      setAddError('Masa eklenemedi. Bu isim zaten kullanılıyor olabilir.');
    } finally {
      setAddSaving(false);
    }
  };

  const openOrders = async (table: Table) => {
    if (!table.activeSessionId) return;
    setOrdersTable(table);
    setBill(null);
    setBillLoading(true);
    try {
      const { data } = await api.get<BillResponse>(`/api/sessions/${table.activeSessionId}/bill`);
      setBill(data);
    } catch { /* ignore */ } finally {
      setBillLoading(false);
    }
  };

  const handleDownloadQR = async (table: Table) => {
    try {
      const url = qrImageUrl(table.qrToken);
      const res  = await fetch(url);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = href;
      a.download = `${table.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      window.open(qrImageUrl(table.qrToken), '_blank');
    }
  };

  if (loading) {
    return (
      <>
        <StaffHeader title="Masa Yönetimi" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  return (
    <>
      <StaffHeader title="Masa Yönetimi" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6 max-w-5xl">
          <h2 className="text-xl font-bold text-gray-800">
            Masalar{' '}
            <span className="text-sm font-normal text-gray-400">({tables.length})</span>
          </h2>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            + Yeni Masa
          </Button>
        </div>

        {tables.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-20">
            <span className="text-6xl">🪑</span>
            <p className="text-gray-400">Henüz masa eklenmemiş.</p>
            <Button onClick={() => setShowAddModal(true)}>Masa Ekle</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 max-w-5xl">
            {tables.map((table) => {
              const hasSession = table.activeSessionId != null;

              return (
                <div
                  key={table.id}
                  className={`bg-white rounded-2xl border p-4 flex flex-col items-center gap-3 transition-all hover:shadow-md ${
                    hasSession ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-100'
                  }`}
                >
                  {/* Table name */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-black text-center px-1 ${
                      hasSession ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {table.name}
                  </div>

                  {/* Details */}
                  <div className="text-center">
                    <p className="text-xs text-gray-400">{table.capacity} kişilik</p>
                    <p
                      className={`text-xs font-semibold mt-0.5 ${
                        hasSession ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {hasSession ? '● Dolu' : '○ Boş'}
                    </p>
                  </div>

                  {/* QR actions */}
                  <div className="flex gap-1.5 w-full flex-wrap">
                    {hasSession && (
                      <button
                        onClick={() => openOrders(table)}
                        className="w-full text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-lg py-1.5 transition-colors font-medium"
                      >
                        📋 Siparişler
                      </button>
                    )}
                    <button
                      onClick={() => setQrTable(table)}
                      className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-1.5 transition-colors font-medium"
                    >
                      QR Gör
                    </button>
                    <button
                      onClick={() => handleDownloadQR(table)}
                      className="flex-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg py-1.5 transition-colors font-medium"
                    >
                      İndir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── QR Preview Modal ──────────────────────────────────────────────── */}
      <Modal
        isOpen={!!qrTable}
        onClose={() => setQrTable(null)}
        title={qrTable ? `${qrTable.name} — QR Kodu` : ''}
      >
        {qrTable && (
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-inner">
              <img
                src={qrImageUrl(qrTable.qrToken)}
                alt={`${qrTable.name} QR`}
                width={240}
                height={240}
                className="rounded"
              />
            </div>
            <p className="text-xs text-gray-400 text-center break-all max-w-xs">
              {FRONTEND_URL}/qr/{qrTable.qrToken}
            </p>
            <Button fullWidth onClick={() => handleDownloadQR(qrTable)}>
              QR Kodunu İndir
            </Button>
          </div>
        )}
      </Modal>

      {/* ── Orders Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!ordersTable}
        onClose={() => { setOrdersTable(null); setBill(null); }}
        title={ordersTable ? `${ordersTable.name} — Siparişler` : ''}
      >
        {billLoading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : !bill || bill.orders.length === 0 ? (
          <p className="text-gray-400 text-center py-6 text-sm">Henüz sipariş yok.</p>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto">
            {bill.orders.map((order) => (
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
              </div>
            ))}
            <div className="border-t pt-3 flex items-center justify-between font-semibold">
              <span className="text-gray-700">Toplam</span>
              <span className="text-gray-900">{bill.totalAmount.toFixed(2)} ₺</span>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add Table Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Yeni Masa Ekle"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Masa Adı *
            </label>
            <input
              autoFocus
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="Örn: Masa 5, Teras 2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kapasite (kişi)
            </label>
            <input
              type="number"
              min="1"
              value={addForm.capacity}
              onChange={(e) => setAddForm((f) => ({ ...f, capacity: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="4"
            />
          </div>
          {addError && <p className="text-sm text-red-500">{addError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>İptal</Button>
            <Button onClick={handleAddTable} loading={addSaving}>Ekle</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
