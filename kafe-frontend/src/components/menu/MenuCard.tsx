'use client';

import Button from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';

interface MenuCardProps {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
}

export default function MenuCard({ id, name, description, price, imageUrl, isAvailable }: MenuCardProps) {
  const addItem = useCart((s) => s.addItem);

  return (
    <div
      className={`relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all ${
        !isAvailable ? 'grayscale opacity-70' : ''
      }`}
    >
      {/* Image area */}
      <div className="h-36 bg-gray-100 overflow-hidden relative">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
        )}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="bg-white text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full shadow">
              Tükendi
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{name}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-orange-600 text-sm">₺{price.toFixed(2)}</span>
          {isAvailable ? (
            <Button size="sm" onClick={() => addItem({ menuItemId: id, name, price })}>
              Ekle
            </Button>
          ) : (
            <span className="text-xs text-gray-400 font-medium">Tükendi</span>
          )}
        </div>
      </div>
    </div>
  );
}
