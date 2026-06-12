import Badge from '@/components/ui/Badge';
import { ORDER_STATUS_CONFIG, type OrderStatus } from '@/lib/constants';

const statusToColor = {
  PENDING:   'yellow',
  CONFIRMED: 'blue',
  PREPARING: 'orange',
  READY:     'green',
  SERVED:    'gray',
  CANCELLED: 'red',
} as const satisfies Record<OrderStatus, 'yellow' | 'blue' | 'orange' | 'green' | 'gray' | 'red'>;

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <Badge color={statusToColor[status]}>
      {ORDER_STATUS_CONFIG[status].label}
    </Badge>
  );
}
