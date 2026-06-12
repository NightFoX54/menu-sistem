export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:8080';

export const ORDER_STATUS_CONFIG = {
  PENDING:   { label: 'Bekliyor',       bgClass: 'bg-yellow-100', textClass: 'text-yellow-800' },
  CONFIRMED: { label: 'Onaylandı',      bgClass: 'bg-blue-100',   textClass: 'text-blue-800'   },
  PREPARING: { label: 'Hazırlanıyor',   bgClass: 'bg-orange-100', textClass: 'text-orange-800' },
  READY:     { label: 'Hazır',          bgClass: 'bg-green-100',  textClass: 'text-green-800'  },
  SERVED:    { label: 'Servise Alındı', bgClass: 'bg-gray-100',   textClass: 'text-gray-800'   },
  CANCELLED: { label: 'İptal',          bgClass: 'bg-red-100',    textClass: 'text-red-800'    },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS_CONFIG;
