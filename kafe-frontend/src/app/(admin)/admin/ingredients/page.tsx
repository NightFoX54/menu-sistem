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
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading]         = useState(true);

  // Stock modal
  const [stockModal, setStockModal]   = useState<Ingredient | null>(null);
  const [stockMode, setStockMode]     = useState<'add' | 'deduct'>('add');
  const [amount, setAmount]           = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError]   = useState('');

  // Add ingredient modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState({
    name: '', unit: 'kg', currentStock: '', minimumThreshold: '',
  });
  const [addSaving, setAddSaving] = useState(false);

  useEffect(() => {
    api.get<Ingredient[]>('/api/admin/ingredients')
      .then(({ data }) => setIngredients(data))
      .finally(() => setLoading(false));
  }, []);

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
            ? { ...i, stockQuantity: stockMode === 'add'
                ? i.stockQuantity + val
                : i.stockQuantity - val }
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

  const handleAddIngredient = async () => {
    if (!newForm.name.trim()) return;
    setAddSaving(true);
    try {
      const { data } = await api.post<Ingredient>('/api/admin/ingredients', {
        name:              newForm.name.trim(),
        unit:              newForm.unit,
        stockQuantity:     parseFloat(newForm.currentStock) || 0,
        lowStockThreshold: parseFloat(newForm.minimumThreshold) || 0,
      });
      setIngredients((prev) => [...prev, data]);
      setShowAddModal(false);
      setNewForm({ name: '', unit: 'kg', currentStock: '', minimumThreshold: '' });
    } finally {
      setAddSaving(false);
    }
  };

  const isLow = (i: Ingredient) => i.stockQuantity < i.lowStockThreshold;

  return (
    <>
      <StaffHeader title="Malzeme Stoku" />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4 max-w-4xl">
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
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            + Malzeme Ekle
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="max-w-4xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="col-span-4">Malzeme</div>
              <div className="col-span-2 text-right">Mevcut Stok</div>
              <div className="col-span-2 text-right">Eşik Değeri</div>
              <div className="col-span-2 text-center">Durum</div>
              <div className="col-span-2 text-right">İşlem</div>
            </div>

            {ingredients.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                Henüz malzeme eklenmemiş.
              </div>
            ) : (
              ingredients.map((ing) => (
                <div
                  key={ing.id}
                  className={`grid grid-cols-12 gap-4 px-4 py-3.5 items-center border-b border-gray-100 last:border-b-0 transition-colors ${
                    isLow(ing) ? 'bg-red-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="col-span-4">
                    <p className={`font-medium ${isLow(ing) ? 'text-red-700' : 'text-gray-900'}`}>
                      {ing.name}
                    </p>
                    <p className="text-xs text-gray-400">{ing.unit}</p>
                  </div>

                  <div className="col-span-2 text-right">
                    <span className={`font-semibold ${isLow(ing) ? 'text-red-600' : 'text-gray-800'}`}>
                      {ing.stockQuantity.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{ing.unit}</span>
                  </div>

                  <div className="col-span-2 text-right">
                    <span className="text-gray-600">
                      {ing.lowStockThreshold.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{ing.unit}</span>
                  </div>

                  <div className="col-span-2 text-center">
                    {isLow(ing) ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        ⚠ Düşük
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        ✓ Yeterli
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 text-right">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={isLow(ing) ? 'primary' : 'secondary'}
                        onClick={() => { setStockModal(ing); setStockMode('add'); setAmount(''); setStockError(''); }}
                      >
                        + Ekle
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setStockModal(ing); setStockMode('deduct'); setAmount(''); setStockError(''); }}
                      >
                        − Fire
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* ── Add Stock Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={!!stockModal}
        onClose={() => setStockModal(null)}
        title={stockMode === 'add' ? `Stok Ekle: ${stockModal?.name}` : `Fire Gir: ${stockModal?.name}`}
      >
        <div className="space-y-4">
          {stockModal && (
            <>
              {/* Add / Deduct toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    stockMode === 'add'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setStockMode('add')}
                >
                  + Stok Ekle
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    stockMode === 'deduct'
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setStockMode('deduct')}
                >
                  − Fire / Kayıp
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                Mevcut:{' '}
                <strong>
                  {stockModal.stockQuantity.toFixed(2)} {stockModal.unit}
                </strong>
                {isLow(stockModal) && (
                  <span className="ml-2 text-red-500 text-xs">(eşik altında)</span>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {stockMode === 'add' ? 'Eklenecek' : 'Düşülecek'} Miktar ({stockModal?.unit})
            </label>
            <input
              autoFocus
              type="number"
              min="0.01"
              step="0.01"
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
            <Button
              onClick={handleStockChange}
              loading={stockSaving}
              variant={stockMode === 'deduct' ? 'secondary' : 'primary'}
            >
              {stockMode === 'add' ? 'Stok Ekle' : 'Fire Kaydet'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Add Ingredient Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Yeni Malzeme"
      >
        <div className="space-y-3">
          {[
            { label: 'Malzeme Adı *', key: 'name',             type: 'text',   placeholder: 'Örn: Un'  },
            { label: 'Birim *',       key: 'unit',             type: 'text',   placeholder: 'kg, litre, adet...' },
            { label: 'Başlangıç Stok', key: 'currentStock',   type: 'number', placeholder: '0.00' },
            { label: 'Eşik Değeri',   key: 'minimumThreshold', type: 'number', placeholder: '0.00' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type={type}
                value={newForm[key as keyof typeof newForm]}
                onChange={(e) => setNewForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder={placeholder}
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>İptal</Button>
            <Button onClick={handleAddIngredient} loading={addSaving}>Ekle</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
