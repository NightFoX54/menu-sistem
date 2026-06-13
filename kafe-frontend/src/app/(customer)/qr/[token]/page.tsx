'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import MenuCard from '@/components/menu/MenuCard';
import CategoryTabs from '@/components/menu/CategoryTabs';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useCart } from '@/hooks/useCart';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Category   { id: number; name: string; displayOrder: number; }
interface NutritionInfo { calories: number; protein: number; fat: number; carbs: number; }
interface MenuItem   { id: number; categoryId: number; name: string; description?: string; price: number; imageUrl?: string; isAvailable: boolean; nutrition?: NutritionInfo | null; }
interface QrData     { tableId: number; tableName: string; tenantId: number; tenantSlug: string; tenantName: string; sessionId: number; }
interface MenuUpdate { menuItemId: number; isAvailable: boolean; }

export default function QrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();

  const [qrData, setQrData]         = useState<QrData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Cache items per category so switching tabs doesn't refetch
  const itemsCache = useRef<Record<number, MenuItem[]>>({});
  const [currentItems, setCurrentItems] = useState<MenuItem[]>([]);

  const { setSession, itemCount } = useCart();
  const { connect, subscribe, disconnect } = useWebSocket();

  // ── Step 1: resolve QR → fetch full menu in one shot ────────────────────────
  useEffect(() => {
    let resolved: QrData;

    api.get<QrData>(`/api/qr/${token}`)
      .then(({ data }) => {
        resolved = data;
        setQrData(data);
        setSession(data.sessionId);
        sessionStorage.setItem('tenantId',  String(data.tenantId));
        sessionStorage.setItem('sessionId', String(data.sessionId));
        sessionStorage.setItem('tableName', data.tableName);
        sessionStorage.setItem('qrToken',   token);
        // Public menu endpoint: GET /api/menu/{tenantSlug}
        return api.get<{ categories: Category[]; items: MenuItem[] }>(
          `/api/menu/${data.tenantSlug}`
        );
      })
      .then(({ data: menu }) => {
        const sorted = [...menu.categories].sort((a, b) => a.displayOrder - b.displayOrder);
        setCategories(sorted);

        // Pre-populate entire cache so tab switches are instant
        const grouped: Record<number, MenuItem[]> = {};
        for (const item of menu.items) {
          if (!grouped[item.categoryId]) grouped[item.categoryId] = [];
          grouped[item.categoryId].push(item);
        }
        itemsCache.current = grouped;

        if (sorted.length > 0) {
          const firstId = sorted[0].id;
          setCategory(firstId);
          setCurrentItems(grouped[firstId] ?? []);
        }
      })
      .catch(() => setError('QR kodu geçersiz veya süresi dolmuş.'))
      .finally(() => setLoading(false));
  }, [token, setSession]);

  // ── Step 2: switch category tab from cache (no extra request) ───────────────
  useEffect(() => {
    if (!activeCategory) return;
    setCurrentItems(itemsCache.current[activeCategory] ?? []);
  }, [activeCategory]);

  // ── Step 3: WebSocket — menu availability changes ───────────────────────────
  useEffect(() => {
    if (!qrData) return;
    connect(qrData.tenantId, qrData.sessionId);

    const unsub = subscribe(`/topic/menu/${qrData.tenantId}`, (data) => {
      const upd = data as MenuUpdate;

      // Update ALL cached categories
      Object.keys(itemsCache.current).forEach((catId) => {
        itemsCache.current[+catId] = itemsCache.current[+catId].map((item) =>
          item.id === upd.menuItemId ? { ...item, isAvailable: upd.isAvailable } : item
        );
      });

      // Update current view immediately
      setCurrentItems((prev) =>
        prev.map((item) =>
          item.id === upd.menuItemId ? { ...item, isAvailable: upd.isAvailable } : item
        )
      );
    });

    return () => { unsub(); disconnect(); };
  }, [qrData, connect, subscribe, disconnect]);

  // ── Render states ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4 text-center bg-gray-50">
        <span className="text-6xl">❌</span>
        <p className="text-gray-600 font-medium">{error}</p>
        <p className="text-xs text-gray-400">Lütfen QR kodu tekrar okutun.</p>
      </div>
    );
  }

  const cartCount = itemCount();

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">
              ☕ {qrData?.tableName}
            </h1>
            <p className="text-xs text-gray-400">Siparişinizi seçin</p>
          </div>
          <button
            onClick={() => router.push(`/qr/${token}/bill`)}
            className="text-sm text-orange-600 font-semibold hover:text-orange-700 transition-colors"
          >
            Hesabım
          </button>
        </div>

        {/* Category tabs */}
        <div className="border-t border-gray-100 px-4 pb-2 pt-1.5 max-w-xl mx-auto">
          <CategoryTabs
            categories={categories}
            activeId={activeCategory}
            onSelect={(id) => {
              setCategory(id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      </header>

      {/* ── Menu items ─────────────────────────────────────────────────────── */}
      <main className="max-w-xl mx-auto px-4 pt-4">
        {currentItems.length === 0 ? (
          <p className="text-center text-gray-400 py-16 text-sm">
            Bu kategoride ürün bulunmuyor.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {currentItems.map((item) => (
              <MenuCard key={item.id} {...item} nutrition={item.nutrition} />
            ))}
          </div>
        )}
      </main>

      {/* ── Floating cart button (only when cart has items) ────────────────── */}
      {cartCount > 0 && (
        <button
          onClick={() => router.push(`/qr/${token}/cart`)}
          className="fixed bottom-6 right-4 left-4 max-w-sm mx-auto flex items-center justify-between
            bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white
            px-5 py-3.5 rounded-2xl shadow-xl transition-colors z-30 font-semibold"
        >
          <span className="bg-white/20 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">
            {cartCount}
          </span>
          <span>Sepeti Görüntüle</span>
          <span className="opacity-0 w-8">·</span>
        </button>
      )}
    </div>
  );
}
