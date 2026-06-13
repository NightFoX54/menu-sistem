'use client';

import { useEffect, useState } from 'react';
import StaffHeader from '@/components/layout/StaffHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import api from '@/lib/api';

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
  caloriesPer?: number;
  proteinPer?: number;
  fatPer?: number;
  carbsPer?: number;
}

const UNITS = ['GRAM', 'ML', 'PIECE', 'KG', 'LITRE'];

const UNIT_LABEL: Record<string, string> = {
  GRAM: 'g', ML: 'ml', PIECE: 'adet', KG: 'kg', LITRE: 'L',
};

const UNIT_NUTRITION_LABEL: Record<string, string> = {
  GRAM: '100g', ML: '100ml', PIECE: '1 adet', KG: '100g', LITRE: '100ml',
};

const blankForm = () => ({
  name: '', unit: 'GRAM', currentStock: '', minimumThreshold: '',
  caloriesPer: '', proteinPer: '', fatPer: '', carbsPer: '',
});

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading]         = useState(true);

  // Stock modal
  const [stockModal, setStockModal]   = useState<Ingredient | null>(null);
  const [stockMode, setStockMode]     = useState<'add' | 'deduct'>('add');
  const [amount, setAmount]           = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError]   = useState('');

  // Add / Edit ingredient modal
  const [editModal, setEditModal]     = useState<Ingredient | null | 'new'>('new' as never);
  const [showEditModal, setShowEditModal] = useState(false);
  const [form, setForm]               = useState(blankForm());
  const [formSaving, setFormSaving]   = useState(false);

  useEffect(() => {
    api.get<Ingredient[]>('/api/admin/ingredients')
      .then(({ data }) => setIngredients(data))
      .finally(() => setLoading(false));
  }, []);

  // ── Stock modal ─────────────────────────────────────────────────────────────

  const handleStockChange = async () => {
    const val = parseFloat(amount);
    if (!stockModal || !amount || val <= 0) return;
    setStockSaving(true);
    setStockError('');
    try {
      const endpoint = stockMode === 'add'
        ? `/api/admin/ingredients/${stockModal.id}/stock`
        : `/api/admin/ingredients/${stockModal.id}/deduct`;
      await api.patch(endpoint, { amount: val });
      setIngredients((prev) =>
        prev.map((i) =>
          i.id === stockModal.id
            ? { ...i, stockQuantity: stockMode === 'add' ? i.stockQuantity + val : i.stockQuantity - val }
            : i
        )
      );
      setStockModal(null);
      setAmount('');
    } catch {
      setStockError('Stok güncellenemedi.');
    } finally {
      setStockSaving(false);
    }
  };

  // ── Add / Edit ingredient modal ─────────────────────────────────────────────

  const openAdd = () => {
    setEditModal(null);
    setForm(blankForm());
    setShowEditModal(true);
  };

  const openEdit = (ing: Ingredient) => {
    setEditModal(ing);
    setForm({
      name: ing.name,
      unit: ing.unit,
      currentStock: String(ing.stockQuantity),
      minimumThreshold: String(ing.lowStockThreshold),
      caloriesPer: ing.caloriesPer != null ? String(ing.caloriesPer) : '',
      proteinPer:  ing.proteinPer  != null ? String(ing.proteinPer)  : '',
      fatPer:      ing.fatPer      != null ? String(ing.fatPer)      : '',
      carbsPer:    ing.carbsPer    != null ? String(ing.carbsPer)    : '',
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setFormSaving(true);
    const payload = {
      name:              form.name.trim(),
      unit:              form.unit,
      stockQuantity:     parseFloat(form.currentStock) || 0,
      lowStockThreshold: parseFloat(form.minimumThreshold) || 0,
      caloriesPer:       form.caloriesPer !== '' ? parseFloat(form.caloriesPer) : null,
      proteinPer:        form.proteinPer  !== '' ? parseFloat(form.proteinPer)  : null,
      fatPer:            form.fatPer      !== '' ? parseFloat(form.fatPer)      : null,
      carbsPer:          form.carbsPer    !== '' ? parseFloat(form.carbsPer)    : null,
    };
    try {
      if (editModal && (editModal as Ingredient).id) {
        const ing = editModal as Ingredient;
        const { data } = await api.put<Ingredient>(`/api/admin/ingredients/${ing.id}`, payload);
        setIngredients((prev) => prev.map((i) => (i.id === ing.id ? data : i)));
      } else {
        const { data } = await api.post<Ingredient>('/api/admin/ingredients', payload);
        setIngredients((prev) => [...prev, data]);
      }
      setShowEditModal(false);
    } finally {
      setFormSaving(false);
    }
  };

  const isLow = (i: Ingredient) => i.stockQuantity < i.lowStockThreshold;

  return (
    <>
      <StaffHeader title="Malzeme Stoku" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4 max-w-5xl">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Malzemeler</h2>
            {!loading && (
              <p className="text-sm text-gray-400 mt-0.5">
                {ingredients.filter(isLow).length > 0 && (
                  <span className="text-red-500 font-medium">
                    {ingredients.filter(isLow).length} malzeme düşük stokta ·{' '}
                  </span>
                )}
                {ingredients.length} toplam
              </p>
            )}
          </div>
          <Button size="sm" onClick={openAdd}>+ Malzeme Ekle</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="max-w-5xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="col-span-3">Malzeme</div>
              <div className="col-span-2 text-right">Stok</div>
              <div className="col-span-2 text-right">Eşik</div>
              <div className="col-span-2 text-center">Besin (kcal)</div>
              <div className="col-span-1 text-center">Durum</div>
              <div className="col-span-2 text-right">İşlem</div>
            </div>

            {ingredients.length === 0 ? (
              <div className="py-16 text-center text-gray-400">Henüz malzeme eklenmemiş.</div>
            ) : (
              ingredients.map((ing) => (
                <div
                  key={ing.id}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-gray-100 last:border-b-0 ${
                    isLow(ing) ? 'bg-red-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="col-span-3">
                    <p className={`font-medium text-sm ${isLow(ing) ? 'text-red-700' : 'text-gray-900'}`}>
                      {ing.name}
                    </p>
                    <p className="text-xs text-gray-400">{UNIT_LABEL[ing.unit] ?? ing.unit}</p>
                  </div>

                  <div className="col-span-2 text-right">
                    <span className={`font-semibold text-sm ${isLow(ing) ? 'text-red-600' : 'text-gray-800'}`}>
                      {ing.stockQuantity.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{UNIT_LABEL[ing.unit] ?? ing.unit}</span>
                  </div>

                  <div className="col-span-2 text-right text-sm text-gray-600">
                    {ing.lowStockThreshold.toFixed(2)}
                    <span className="text-xs text-gray-400 ml-1">{UNIT_LABEL[ing.unit] ?? ing.unit}</span>
                  </div>

                  <div className="col-span-2 text-center">
                    {ing.caloriesPer != null ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        🔥 {ing.caloriesPer} kcal
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>

                  <div className="col-span-1 text-center">
                    {isLow(ing) ? (
                      <span className="inline-flex text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">⚠</span>
                    ) : (
                      <span className="inline-flex text-xs font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">✓</span>
                    )}
                  </div>

                  <div className="col-span-2 flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEdit(ing)}
                    >
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant={isLow(ing) ? 'primary' : 'secondary'}
                      onClick={() => { setStockModal(ing); setStockMode('add'); setAmount(''); setStockError(''); }}
                    >
                      Stok
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* ── Stock Modal ──────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!stockModal}
        onClose={() => setStockModal(null)}
        title={stockMode === 'add' ? `Stok Ekle: ${stockModal?.name}` : `Fire Gir: ${stockModal?.name}`}
      >
        <div className="space-y-4">
          {stockModal && (
            <>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${stockMode === 'add' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => setStockMode('add')}
                >+ Stok Ekle</button>
                <button
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${stockMode === 'deduct' ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => setStockMode('deduct')}
                >− Fire / Kayıp</button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                Mevcut: <strong>{stockModal.stockQuantity.toFixed(2)} {UNIT_LABEL[stockModal.unit] ?? stockModal.unit}</strong>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {stockMode === 'add' ? 'Eklenecek' : 'Düşülecek'} Miktar ({UNIT_LABEL[stockModal?.unit ?? ''] ?? stockModal?.unit})
            </label>
            <input
              autoFocus
              type="number" min="0.01" step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStockChange()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="0.00"
            />
          </div>
          {stockError && <p className="text-sm text-red-500">{stockError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setStockModal(null)}>İptal</Button>
            <Button onClick={handleStockChange} loading={stockSaving} variant={stockMode === 'deduct' ? 'secondary' : 'primary'}>
              {stockMode === 'add' ? 'Stok Ekle' : 'Fire Kaydet'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Add / Edit Ingredient Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={editModal && (editModal as Ingredient).id ? `Düzenle: ${(editModal as Ingredient).name}` : 'Yeni Malzeme'}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Malzeme Adı *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
                placeholder="Örn: Un"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Birim *</label>
              <select
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                className={inputCls}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u} ({UNIT_LABEL[u]})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Başlangıç Stok</label>
              <input
                type="number" min="0" step="0.001"
                value={form.currentStock}
                onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))}
                className={inputCls}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Eşik Değeri</label>
              <input
                type="number" min="0" step="0.001"
                value={form.minimumThreshold}
                onChange={(e) => setForm((f) => ({ ...f, minimumThreshold: e.target.value }))}
                className={inputCls}
                placeholder="0"
              />
            </div>
          </div>

          {/* Nutritional values */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Besin Değerleri (per {UNIT_NUTRITION_LABEL[form.unit] ?? form.unit}) — opsiyonel
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Kalori (kcal)', key: 'caloriesPer', placeholder: '0' },
                { label: 'Protein (g)',   key: 'proteinPer',  placeholder: '0' },
                { label: 'Yağ (g)',       key: 'fatPer',      placeholder: '0' },
                { label: 'Karbonhidrat (g)', key: 'carbsPer', placeholder: '0' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                  <input
                    type="number" min="0" step="0.1"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={inputCls}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>İptal</Button>
          <Button onClick={handleSave} loading={formSaving}>
            {editModal && (editModal as Ingredient).id ? 'Kaydet' : 'Ekle'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300';
