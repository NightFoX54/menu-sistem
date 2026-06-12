'use client';

import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import Button from '@/components/ui/Button';
import api from '@/lib/api';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderPlaced?: () => void;
}

export default function CartDrawer({ isOpen, onClose, onOrderPlaced }: CartDrawerProps) {
  const { items, sessionId, updateQuantity, clearCart, total, itemCount } = useCart();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOrder = async () => {
    if (!sessionId || items.length === 0) return;
    setLoading(true);
    try {
      await api.post('/api/orders', {
        sessionId,
        notes,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes,
        })),
      });
      clearCart();
      setNotes('');
      onOrderPlaced?.();
      onClose();
    } catch (err) {
      console.error('Order failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white w-full max-w-sm h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Sepet ({itemCount()})</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Sepet boş</p>
          ) : (
            items.map((item) => (
              <div key={item.menuItemId} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <p className="text-orange-600 text-sm">
                    ₺{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-medium text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                    className="w-7 h-7 rounded-full bg-orange-100 hover:bg-orange-200 flex items-center justify-center text-orange-700"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sipariş notu (opsiyonel)"
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <div className="flex justify-between text-sm font-semibold">
              <span>Toplam</span>
              <span className="text-orange-600">₺{total().toFixed(2)}</span>
            </div>
            <Button fullWidth onClick={handleOrder} loading={loading}>
              Sipariş Ver
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
