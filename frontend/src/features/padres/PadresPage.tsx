import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/apiClient';
import { Table } from '../../shared/components/Table';
import { Modal } from '../../shared/components/Modal';
import { ConfirmModal } from '../../shared/components/ConfirmModal';

interface Papa {
  id: number;
  nombre: string;
  cedula: string;
  ti?: string;
  semanasGestacion?: number | null;
  telefono?: string;
  biometricId?: string;
  grupo?: string;
}

type FormState = {
  nombre: string;
  ti: string;
  cedula: string;
  semanasGestacion: string;
  telefono: string;
  biometricId: string;
  grupo: string;
};

export function PadresPage() {
  const [list, setList] = useState<Papa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    nombre: '',
    ti: '',
    cedula: '',
    semanasGestacion: '',
    telefono: '',
    biometricId: '',
    grupo: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [suggestingBiometricId, setSuggestingBiometricId] = useState(false);
  const [similar, setSimilar] = useState<{ id: number; nombre: string }[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get<Papa[]>('/papas', buscar ? { nombre: buscar } : undefined)
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [buscar]);

  const searchSimilar = (nombre: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!nombre.trim() || nombre.length < 3) {
      setSimilar([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      api.get<{ id: number; nombre: string }[]>('/papas', { nombre }).then(setSimilar);
    }, 500);
  };

  const calcularSiguienteBiometricId = (ninos: { biometricId?: string }[], papas: { biometricId?: string }[]): string => {
    const usados = new Set(
      [...ninos, ...papas]
        .map((n) => Number.parseInt((n.biometricId ?? '').trim(), 10))
        .filter((id) => Number.isInteger(id) && id > 0)
    );
    let candidato = 2;
    while (usados.has(candidato)) candidato += 1;
    return String(candidato);
  };

  const autocompletarBiometricId = async () => {
    if (editingId) return;
    setSuggestingBiometricId(true);
    try {
      const [ninos, papas] = await Promise.all([
        api.get<{ biometricId?: string }[]>('/ninos'),
        api.get<{ biometricId?: string }[]>('/papas'),
      ]);
      const sugerido = calcularSiguienteBiometricId(ninos, papas);
      setForm((prev) => (prev.biometricId ? prev : { ...prev, biometricId: sugerido }));
    } catch {
      /* manual */
    } finally {
      setSuggestingBiometricId(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      nombre: '',
      ti: '',
      cedula: '',
      semanasGestacion: '',
      telefono: '',
      biometricId: '',
      grupo: '',
    });
    setSimilar([]);
    setError(null);
    setModalOpen(true);
    autocompletarBiometricId();
  };

  const openEdit = (p: Papa) => {
    setEditingId(p.id);
    setForm({
      nombre: p.nombre,
      ti: p.ti ?? '',
      cedula: p.cedula,
      semanasGestacion: p.semanasGestacion != null ? String(p.semanasGestacion) : '',
      telefono: p.telefono ?? '',
      biometricId: p.biometricId ?? '',
      grupo: p.grupo ?? '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const sem = form.semanasGestacion.trim() ? Number.parseInt(form.semanasGestacion, 10) : undefined;
    if (form.semanasGestacion.trim() && (Number.isNaN(sem!) || sem! < 1 || sem! > 45)) {
      setError('Semanas de gestación debe estar entre 1 y 45 (o déjalo vacío).');
      setSaving(false);
      return;
    }
    const body = {
      nombre: form.nombre,
      cedula: form.cedula,
      ti: form.ti || undefined,
      semanasGestacion: sem,
      telefono: form.telefono || undefined,
      biometricId: form.biometricId || undefined,
      grupo: form.grupo || undefined,
    };
    try {
      if (editingId) {
        await api.put<Papa>(`/papas/${editingId}`, body);
      } else {
        await api.post<Papa>('/papas', body);
      }
      closeModal();
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: number) => {
    setIdToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const confirmarEliminacion = () => {
    if (!idToDelete) return;
    api.delete(`/papas/${idToDelete}`).then(load).catch((e) => setError(e.message));
  };

  if (error && !modalOpen) return <p className="text-[#d93025] font-medium">{error}</p>;

  return (
    <div className="max-w-6xl space-y-10">
      <div className="animate-fade-in">
        <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">Gestión de Padres</h2>
        <p className="mt-2 text-sm text-[#4b5563]">
          Registro independiente de padres (embarazo: semanas de gestación), biométrico Hikvision y datos de contacto.
          No está vinculado a acudientes de niños.
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border border-[#e2e8f0] shadow-sm">
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4b5563]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full rounded-full border border-[#e2e8f0] bg-[#fcfaff] py-3 pl-12 pr-6 text-sm font-medium focus:border-[#2d1b69] focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
          />
        </div>
        <button type="button" onClick={openCreate} className="google-button-primary flex items-center justify-center gap-2">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo padre
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center animate-pulse">
          <div className="mx-auto h-12 w-12 border-4 border-[#2d1b69] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-bold text-[#4b5563] uppercase tracking-widest">Cargando…</p>
        </div>
      ) : (
        <Table<Papa>
          keyExtractor={(p) => p.id}
          data={list}
          columns={[
            {
              key: 'nombre',
              header: 'Nombre',
              render: (p) => (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-[#2d1b69] font-bold text-xs">
                    {p.nombre.charAt(0)}
                  </div>
                  <span className="font-bold">{p.nombre}</span>
                </div>
              ),
            },
            { key: 'cedula', header: 'Cédula' },
            { key: 'ti', header: 'TI', render: (p) => p.ti || '—' },
            {
              key: 'semanasGestacion',
              header: 'Sem. gestación',
              render: (p) => (p.semanasGestacion != null ? `${p.semanasGestacion} sem.` : '—'),
            },
            { key: 'grupo', header: 'Grupo', render: (p) => p.grupo || '—' },
            {
              key: 'id',
              header: 'Acciones',
              render: (p) => (
                <div className="flex flex-wrap gap-4">
                  <Link
                    to={`/padres/gestion/${p.id}/detalle`}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#2d1b69] transition-colors hover:text-[#4c1d95] hover:underline"
                  >
                    Detalle
                  </Link>
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#4b5563] transition-colors hover:text-[#111827]"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="text-[10px] font-bold uppercase tracking-widest text-rose-600 transition-colors hover:text-rose-800"
                  >
                    Eliminar
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editingId ? 'Editar padre' : 'Nuevo padre'} alignTop>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">{error}</div>
        )}
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Nombre completo</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, nombre: v }));
                searchSimilar(v);
              }}
              className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50"
            />
            {similar.length > 0 && (
              <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Posibles coincidencias: {similar.map((s) => s.nombre).join(', ')}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Cédula</label>
              <input
                required
                value={form.cedula}
                onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">TI (opcional)</label>
              <input
                value={form.ti}
                onChange={(e) => setForm((f) => ({ ...f, ti: e.target.value }))}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Semanas de gestación</label>
              <input
                type="number"
                min={1}
                max={45}
                placeholder="Ej: 32"
                value={form.semanasGestacion}
                onChange={(e) => setForm((f) => ({ ...f, semanasGestacion: e.target.value }))}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Teléfono</label>
              <input
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Grupo</label>
            <select
              value={form.grupo}
              onChange={(e) => setForm((f) => ({ ...f, grupo: e.target.value }))}
              className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm bg-white"
            >
              <option value="">—</option>
              <option value="APRENDER JUGANDO">APRENDER JUGANDO</option>
              <option value="ESTIMULACION Y NURODESARROLLO">ESTIMULACION Y NURODESARROLLO</option>
              <option value="CLASES EXTRACURRICULARES">CLASES EXTRACURRICULARES</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">ID biométrico (Hikvision)</label>
            <input
              value={form.biometricId}
              onChange={(e) => setForm((f) => ({ ...f, biometricId: e.target.value }))}
              className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm"
              placeholder={suggestingBiometricId ? 'Calculando…' : 'Ej: 105'}
            />
            <p className="text-[10px] text-[#6b7280]">Se sugiere el siguiente ID libre entre niños y padres (reservado 1 para admin).</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
            <button type="button" onClick={closeModal} className="google-button-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="google-button-primary disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={confirmarEliminacion}
        title="¿Eliminar padre?"
        message="Se eliminará el registro y sus planes/asistencias asociados."
        confirmLabel="Eliminar"
      />
    </div>
  );
}
