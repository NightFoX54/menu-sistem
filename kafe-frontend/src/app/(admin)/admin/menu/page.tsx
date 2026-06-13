'use client';

import { useEffect, useRef, useState } from 'react';
import StaffHeader from '@/components/layout/StaffHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import api from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: number;
  name: string;
  displayOrder: number;
}

interface IngredientInfo {
  ingredientId: number;
  ingredientName: string;
  unit: string;
  quantity: number;
}

interface NutritionInfo {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  prepTimeMins?: number;
  categoryId: number;
  nutrition?: NutritionInfo;
  ingredients?: IngredientInfo[];
}

interface IngredientOption {
  id: number;
  name: string;
  unit: string;
}

interface IngredientRow { ingredientId: number; quantity: string; }

const UNIT_LABEL: Record<string, string> = {
  GRAM: 'g', ML: 'ml', PIECE: 'adet', KG: 'kg', LITRE: 'L',
};

// ── Blank form helpers ────────────────────────────────────────────────────────

const blankItem = (): Omit<MenuItem, 'id'> => ({
  name: '', description: '', price: 0, imageUrl: '', isAvailable: true,
  prepTimeMins: undefined, categoryId: 0,
});

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MenuManagementPage() {
  const [categories, setCategories]     = useState<Category[]>([]);
  const [activeCategory, setActive]     = useState<number | null>(null);
  const [items, setItems]               = useState<MenuItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Available ingredients for picker (loaded lazily once)
  const ingredientOptions = useRef<IngredientOption[]>([]);
  const [ingredientsLoaded, setIngredientsLoaded] = useState(false);

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName]           = useState('');
  const [catSaving, setCatSaving]       = useState(false);

  // Item modal (add/edit)
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem]     = useState<MenuItem | null>(null);
  const [itemForm, setItemForm]           = useState(blankItem());
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([]);
  const [itemSaving, setItemSaving]       = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    api.get<Category[]>('/api/admin/categories')
      .then(({ data }) => {
        const sorted = [...data].sort((a, b) => a.displayOrder - b.displayOrder);
        setCategories(sorted);
        if (sorted.length > 0) setActive(sorted[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeCategory) return;
    setItemsLoading(true);
    api.get<MenuItem[]>(`/api/admin/categories/${activeCategory}/items`)
      .then(({ data }) => setItems(data))
      .finally(() => setItemsLoading(false));
  }, [activeCategory]);

  const ensureIngredients = async () => {
    if (ingredientsLoaded) return;
    const { data } = await api.get<IngredientOption[]>('/api/admin/ingredients');
    ingredientOptions.current = data.map((i) => ({ id: i.id, name: i.name, unit: (i as unknown as Record<string,string>).unit }));
    setIngredientsLoaded(true);
  };

  // ── Category actions ──────────────────────────────────────────────────────

  const handleAddCategory = async () => {
    if (!catName.trim()) return;
    setCatSaving(true);
    try {
      const { data: created } = await api.post<Category>('/api/admin/categories', {
        name: catName.trim(),
        displayOrder: categories.length + 1,
      });
      setCategories((prev) => [...prev, created]);
      setCatName('');
      setShowCatModal(false);
    } finally { setCatSaving(false); }
  };

  // ── Item actions ──────────────────────────────────────────────────────────

  const openAddItem = async () => {
    await ensureIngredients();
    setEditingItem(null);
    setItemForm({ ...blankItem(), categoryId: activeCategory ?? 0 });
    setIngredientRows([]);
    setShowItemModal(true);
  };

  const openEditItem = async (item: MenuItem) => {
    await ensureIngredients();
    setEditingItem(item);
    setItemForm({
      name:         item.name,
      description:  item.description ?? '',
      price:        item.price,
      imageUrl:     item.imageUrl ?? '',
      isAvailable:  item.isAvailable,
      prepTimeMins: item.prepTimeMins,
      categoryId:   item.categoryId,
    });
    setIngredientRows(
      item.ingredients?.map((ing) => ({
        ingredientId: ing.ingredientId,
        quantity: String(ing.quantity),
      })) ?? []
    );
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price) return;
    setItemSaving(true);
    try {
      const payload = {
        name:         itemForm.name.trim(),
        description:  itemForm.description || null,
        price:        itemForm.price,
        categoryId:   itemForm.categoryId || activeCategory,
        imageUrl:     itemForm.imageUrl || null,
        prepTimeMins: itemForm.prepTimeMins || null,
        displayOrder: 0,
        ingredients: ingredientRows
          .filter((r) => r.ingredientId && parseFloat(r.quantity) > 0)
          .map((r) => ({ ingredientId: r.ingredientId, quantity: parseFloat(r.quantity) })),
      };

      if (editingItem) {
        const { data: updated } = await api.put<MenuItem>(`/api/admin/items/${editingItem.id}`, payload);
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
      } else {
        const { data: created } = await api.post<MenuItem>('/api/admin/items', payload);
        if (created.categoryId === activeCategory) setItems((prev) => [...prev, created]);
      }
      setShowItemModal(false);
    } finally { setItemSaving(false); }
  };

  const toggleAvailability = async (item: MenuItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i)));
    try {
      await api.patch(`/api/admin/items/${item.id}/availability`, { isAvailable: !item.isAvailable });
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i)));
    }
  };

  // ── Ingredient rows ───────────────────────────────────────────────────────

  const addIngredientRow = () =>
    setIngredientRows((prev) => [...prev, { ingredientId: ingredientOptions.current[0]?.id ?? 0, quantity: '' }]);

  const removeIngredientRow = (idx: number) =>
    setIngredientRows((prev) => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, patch: Partial<IngredientRow>) =>
    setIngredientRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <StaffHeader title="Menü Yönetimi" />

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left: Categories ──────────────────────────────────────────── */}
          <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Kategoriler</span>
              <button
                onClick={() => setShowCatModal(true)}
                className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-xl flex items-center justify-center hover:bg-orange-200 transition-colors"
              >+</button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActive(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-orange-500 text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Henüz kategori yok</p>
              )}
            </nav>
          </aside>

          {/* ── Right: Items ──────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                {categories.find((c) => c.id === activeCategory)?.name ?? 'Kategori seçin'}
              </h2>
              {activeCategory && (
                <Button size="sm" onClick={openAddItem}>+ Yeni Ürün</Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {itemsLoading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-16">
                  <span className="text-5xl">🍽️</span>
                  <p className="text-gray-400 text-sm">Bu kategoride ürün yok.</p>
                  {activeCategory && <Button size="sm" onClick={openAddItem}>Ürün Ekle</Button>}
                </div>
              ) : (
                <div className="space-y-3 max-w-3xl">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-opacity ${
                        !item.isAvailable ? 'opacity-60' : 'border-gray-100'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : '🍽️'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                          {!item.isAvailable && <Badge color="red">Tükendi</Badge>}
                          {item.ingredients && item.ingredients.length > 0 && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                              {item.ingredients.length} malzeme
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <p className="text-sm font-bold text-orange-600">
                            ₺{item.price.toFixed(2)}
                            {item.prepTimeMins && (
                              <span className="text-gray-400 font-normal ml-2 text-xs">~{item.prepTimeMins} dk</span>
                            )}
                          </p>
                          {item.nutrition && (
                            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                              🔥 {Math.round(item.nutrition.calories)} kcal
                              {item.nutrition.protein > 0 && ` · ${item.nutrition.protein.toFixed(1)}g P`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => toggleAvailability(item)}
                          className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
                            item.isAvailable ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              item.isAvailable ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <Button size="sm" variant="secondary" onClick={() => openEditItem(item)}>Düzenle</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Category Modal ────────────────────────────────────────────── */}
      <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title="Yeni Kategori">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Adı</label>
            <input
              autoFocus type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              className={inputCls}
              placeholder="Örn: İçecekler"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowCatModal(false)}>İptal</Button>
            <Button onClick={handleAddCategory} loading={catSaving}>Ekle</Button>
          </div>
        </div>
      </Modal>

      {/* ── Add / Edit Item Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        title={editingItem ? 'Ürünü Düzenle' : 'Yeni Ürün'}
      >
        <div className="space-y-3 max-h-[72vh] overflow-y-auto pr-1">
          <Field label="Ürün Adı *">
            <input
              autoFocus
              value={itemForm.name}
              onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
              className={inputCls}
              placeholder="Örn: Türk Kahvesi"
            />
          </Field>

          <Field label="Açıklama">
            <textarea
              value={itemForm.description}
              onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
              className={`${inputCls} h-20 resize-none`}
              placeholder="Kısa ürün açıklaması"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fiyat (₺) *">
              <input
                type="number" min="0" step="0.01"
                value={itemForm.price || ''}
                onChange={(e) => setItemForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                className={inputCls}
                placeholder="0.00"
              />
            </Field>
            <Field label="Hazırlık Süresi (dk)">
              <input
                type="number" min="0"
                value={itemForm.prepTimeMins ?? ''}
                onChange={(e) => setItemForm((f) => ({ ...f, prepTimeMins: parseInt(e.target.value) || undefined }))}
                className={inputCls}
                placeholder="Örn: 10"
              />
            </Field>
          </div>

          <Field label="Kategori">
            <select
              value={itemForm.categoryId || activeCategory || 0}
              onChange={(e) => setItemForm((f) => ({ ...f, categoryId: parseInt(e.target.value) }))}
              className={inputCls}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Görsel URL">
            <input
              value={itemForm.imageUrl}
              onChange={(e) => setItemForm((f) => ({ ...f, imageUrl: e.target.value }))}
              className={inputCls}
              placeholder="https://..."
            />
          </Field>

          {/* ── Ingredient recipe ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Malzeme Tarifi
              </label>
              <button
                type="button"
                onClick={addIngredientRow}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
              >
                + Malzeme Ekle
              </button>
            </div>

            {ingredientRows.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                Henüz malzeme eklenmedi — besin değerleri hesaplanamaz
              </p>
            ) : (
              <div className="space-y-2">
                {ingredientRows.map((row, idx) => {
                  const opt = ingredientOptions.current.find((o) => o.id === row.ingredientId);
                  return (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={row.ingredientId}
                        onChange={(e) => updateRow(idx, { ingredientId: parseInt(e.target.value) })}
                        className={`flex-1 ${inputCls}`}
                      >
                        {ingredientOptions.current.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number" min="0.001" step="0.001"
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                          className="w-24 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-400 w-8">
                          {UNIT_LABEL[opt?.unit ?? ''] ?? opt?.unit ?? ''}
                        </span>
                      </div>
                      <button
                        onClick={() => removeIngredientRow(idx)}
                        className="text-gray-300 hover:text-red-400 transition-colors text-lg font-bold leading-none"
                      >×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setShowItemModal(false)}>İptal</Button>
          <Button onClick={handleSaveItem} loading={itemSaving}>
            {editingItem ? 'Kaydet' : 'Ekle'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
