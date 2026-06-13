'use client';

import Button from '@/components/ui/Button';
import { useCart } from '@/hooks/useCart';

interface NutritionInfo {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface MenuCardProps {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  nutrition?: NutritionInfo | null;
}

export default function MenuCard({ id, name, description, price, imageUrl, isAvailable, nutrition }: MenuCardProps) {
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
        {/* Nutrition badge on image corner */}
        {nutrition && (
          <div className="absolute top-2 left-2">
            <span className="bg-black/50 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
              🔥 {Math.round(nutrition.calories)} kcal
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{name}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{description}</p>
        )}

        {/* Detailed nutrition row */}
        {nutrition && (
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {nutrition.protein > 0 && (
              <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                P {nutrition.protein.toFixed(1)}g
              </span>
            )}
            {nutrition.fat > 0 && (
              <span className="text-[10px] text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded font-medium">
                Y {nutrition.fat.toFixed(1)}g
              </span>
            )}
            {nutrition.carbs > 0 && (
              <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded font-medium">
                K {nutrition.carbs.toFixed(1)}g
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
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
