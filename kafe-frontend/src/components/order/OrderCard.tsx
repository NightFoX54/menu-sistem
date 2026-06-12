'use client';

import { type OrderStatus } from '@/lib/constants';
import OrderStatusBadge from './OrderStatusBadge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Onayla',
  PREPARING: 'Hazırlamaya Başla',
  READY:     'Hazır',
  SERVED:    'Servise Alındı',
};

interface OrderItem {
  id: number;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  status: OrderStatus;
}

interface OrderCardProps {
  orderId: number;
  sessionId: number;
  status: OrderStatus;
  notes?: string;
  takenByName?: string;
  createdAt: string;
  items: OrderItem[];
  onStatusChange?: (orderId: number, status: OrderStatus) => void;
  nextStatus?: OrderStatus;
}

export default function OrderCard({
  orderId,
  sessionId,
  status,
  notes,
  takenByName,
  createdAt,
  items,
  onStatusChange,
  nextStatus,
}: OrderCardProps) {
  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">Sipariş #{orderId}</p>
          <p className="text-xs text-gray-400">
            Masa oturumu {sessionId} ·{' '}
            {new Date(createdAt).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          {takenByName && (
            <p className="text-xs text-gray-500">Garson: {takenByName}</p>
          )}
        </div>
        <OrderStatusBadge status={status} />
      </div>

      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between">
            <span>
              {item.quantity}× {item.menuItemName}
            </span>
            <span className="text-gray-500">
              ₺{(item.unitPrice * item.quantity).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      {notes && (
        <p className="text-xs italic text-gray-500 border-t border-gray-50 pt-2">
          Not: {notes}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-gray-50 pt-2">
        <span className="text-sm font-semibold">₺{total.toFixed(2)}</span>
        {onStatusChange && nextStatus && (
          <Button size="sm" onClick={() => onStatusChange(orderId, nextStatus)}>
            {NEXT_STATUS_LABEL[nextStatus] ?? nextStatus}
          </Button>
        )}
      </div>
    </Card>
  );
}
