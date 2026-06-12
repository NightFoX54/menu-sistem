'use client';

import { useEffect, useState } from 'react';
import StaffHeader from '@/components/layout/StaffHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import api from '@/lib/api';

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'WAITER' | 'KITCHEN';
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN:   'Admin',
  WAITER:  'Garson',
  KITCHEN: 'Mutfak',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN:   'bg-purple-100 text-purple-700',
  WAITER:  'bg-blue-100 text-blue-700',
  KITCHEN: 'bg-orange-100 text-orange-700',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'WAITER' };

export default function StaffPage() {
  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [loading, setLoading]     = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const [toggling, setToggling]   = useState<number | null>(null);

  useEffect(() => {
    api.get<StaffMember[]>('/api/admin/staff')
      .then(({ data }) => setStaff(data))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) return;
    setSaving(true);
    setFormError('');
    try {
      const { data } = await api.post<StaffMember>('/api/admin/staff', form);
      setStaff((prev) => [data, ...prev]);
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg ?? 'Personel eklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    setToggling(id);
    try {
      const { data } = await api.patch<StaffMember>(`/api/admin/staff/${id}/toggle`);
      setStaff((prev) => prev.map((s) => s.id === id ? data : s));
    } catch { /* ignore */ } finally {
      setToggling(null);
    }
  };

  return (
    <>
      <StaffHeader title="Personel" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4 max-w-3xl">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Personel</h2>
            {!loading && (
              <p className="text-sm text-gray-400 mt-0.5">{staff.length} kayıtlı personel</p>
            )}
          </div>
          <Button size="sm" onClick={() => setShowModal(true)}>+ Personel Ekle</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="col-span-4">İsim</div>
              <div className="col-span-4">E-posta</div>
              <div className="col-span-2">Rol</div>
              <div className="col-span-2 text-right">İşlem</div>
            </div>

            {staff.length === 0 ? (
              <div className="py-16 text-center text-gray-400">Henüz personel eklenmemiş.</div>
            ) : (
              staff.map((member) => (
                <div
                  key={member.id}
                  className={`grid grid-cols-12 gap-4 px-4 py-3.5 items-center border-b border-gray-100 last:border-b-0 ${
                    !member.isActive ? 'opacity-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="col-span-4">
                    <p className="font-medium text-gray-900">{member.name}</p>
                    {!member.isActive && (
                      <p className="text-xs text-gray-400">Pasif</p>
                    )}
                  </div>
                  <div className="col-span-4 text-sm text-gray-500 truncate">{member.email}</div>
                  <div className="col-span-2">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[member.role]}`}>
                      {ROLE_LABELS[member.role]}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={toggling === member.id}
                      onClick={() => handleToggle(member.id)}
                    >
                      {member.isActive ? 'Pasif Yap' : 'Aktif Et'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Yeni Personel">
        <div className="space-y-3">
          {[
            { label: 'İsim *',    key: 'name',     type: 'text',     placeholder: 'Ad Soyad' },
            { label: 'E-posta *', key: 'email',    type: 'email',    placeholder: 'ornek@kafe.com' },
            { label: 'Şifre *',   key: 'password', type: 'password', placeholder: 'En az 6 karakter' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder={placeholder}
                autoFocus={key === 'name'}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Rol *</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="WAITER">Garson</option>
              <option value="KITCHEN">Mutfak</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>İptal</Button>
            <Button onClick={handleCreate} loading={saving}>Ekle</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
