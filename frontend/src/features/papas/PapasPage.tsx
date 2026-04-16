import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/apiClient';
import { Table } from '../../shared/components/Table';
import { Modal } from '../../shared/components/Modal';
import { ConfirmModal } from '../../shared/components/ConfirmModal';

interface Papa {
  id: number;
  nombre: string;
  cedula: string;
  fechaNacimiento?: string;
  semanasGestacion?: number;
  telefono?: string;
  biometricId?: string;
  enabled: boolean;
}

export function PapasPage() {
  const [list, setList] = useState<Papa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    cedula: '',
    semanasGestacion: 0,
    telefono: '',
    biometricId: '',
    enabled: true,
  });

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

  const openCreate = () => {
    setEditingId(null);
    setForm({
      nombre: '',
      cedula: '',
      semanasGestacion: 0,
      telefono: '',
      biometricId: '',
      enabled: true,
    });
    setModalOpen(true);
  };

  const openEdit = (p: Papa) => {
    setEditingId(p.id);
    setForm({
      nombre: p.nombre ?? '',
      cedula: p.cedula ?? '',
      semanasGestacion: p.semanasGestacion ?? 0,
      telefono: p.telefono ?? '',
      biometricId: p.biometricId ?? '',
      enabled: p.enabled ?? true,
    });
    setModalOpen(true);
  };

  const submit = (e: any) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      nombre: form.nombre,
      cedula: form.cedula,
      semanasGestacion: form.semanasGestacion > 0 ? form.semanasGestacion : null,
      telefono: form.telefono || undefined,
      biometricId: form.biometricId || undefined,
      enabled: form.enabled,
    };
    (editingId ? api.put<Papa>(`/papas/${editingId}`, body) : api.post<Papa>('/papas', body))
      .then(() => {
        setModalOpen(false);
        load();
      })
      .catch((e) => setError(e.message))
      .finally(() => setSaving(false));
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
        <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">Gestión de Papás</h2>
        <p className="mt-2 text-sm text-[#4b5563]">
          Módulo independiente para padres en formación. Registra cédula e identificación biométrica.
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border border-[#e2e8f0] shadow-sm animate-scale-in stagger-1">
        <div className="relative flex-1 max-w-md group">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4b5563] group-focus-within:text-[#2d1b69] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          Nuevo Papá
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded bg-[#f1f3f4]" />
          <div className="h-64 w-full animate-pulse rounded bg-[#f1f3f4]" />
        </div>
      ) : (
        <div className="animate-scale-in stagger-2">
          <Table<Papa>
          keyExtractor={(p) => p.id}
          data={list}
          columns={[
            {
              key: 'nombre',
              header: 'Nombre Completo',
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
            { key: 'semanasGestacion', header: 'Semanas Gestación', render: (p) => p.semanasGestacion ?? '-' },
            { key: 'telefono', header: 'Teléfono' },
            { key: 'biometricId', header: 'ID Biométrico', render: (p) => p.biometricId ?? '-' },
            {
              key: 'id',
              header: 'Acciones',
              render: (p) => (
                <div className="flex gap-4">
                  <Link to={`/papas/${p.id}/detalle`} className="text-[#2d1b69] font-bold text-xs uppercase tracking-widest hover:text-[#4c1d95] transition-colors hover:underline">Detalle</Link>
                  <button type="button" onClick={() => openEdit(p)} className="text-[#4b5563] font-bold text-xs uppercase tracking-widest hover:text-[#111827] transition-colors">Editar</button>
                  <button type="button" onClick={() => remove(p.id)} className="text-rose-600 font-bold text-xs uppercase tracking-widest hover:text-rose-800 transition-colors">Borrar</button>
                </div>
              ),
            },
          ]}
        />
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Actualizar Papá' : 'Nuevo Papá'}
        alignTop
      >
        <form onSubmit={submit} className="space-y-6">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2d1b69]">Datos personales</p>
            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <label htmlFor="papa-nombre" className="block text-[11px] font-extrabold text-[#5f6368] uppercase tracking-widest">Nombre Completo</label>
                <input id="papa-nombre" required value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className="w-full rounded-xl border-2 border-[#f1f3f4] bg-white px-4 py-3 text-sm font-bold text-[#111827] focus:border-[#2d1b69] focus:outline-none transition-all" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="papa-cedula" className="block text-[11px] font-extrabold text-[#5f6368] uppercase tracking-widest">Cédula</label>
                  <input id="papa-cedula" required value={form.cedula} onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))} className="w-full rounded-xl border-2 border-[#f1f3f4] bg-white px-4 py-3 text-sm font-bold text-[#111827] focus:border-[#2d1b69] focus:outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="papa-semanas" className="block text-[11px] font-extrabold text-[#5f6368] uppercase tracking-widest">Semanas de gestación</label>
                  <input id="papa-semanas" type="number" min={0} value={form.semanasGestacion} onChange={(e) => setForm((f) => ({ ...f, semanasGestacion: Math.max(0, Number(e.target.value) || 0) }))} className="w-full rounded-xl border-2 border-[#f1f3f4] bg-white px-4 py-3 text-sm font-bold text-[#111827] focus:border-[#2d1b69] focus:outline-none transition-all" />
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#f1f3f4] bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4b5563]">Contacto y biometría</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="papa-telefono" className="block text-[11px] font-extrabold text-[#5f6368] uppercase tracking-widest">Teléfono</label>
                <input id="papa-telefono" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} className="w-full rounded-xl border-2 border-[#f1f3f4] bg-white px-4 py-3 text-sm font-bold text-[#111827] focus:border-[#2d1b69] focus:outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label htmlFor="papa-biometrico" className="block text-[11px] font-extrabold text-[#5f6368] uppercase tracking-widest">ID Biométrico</label>
                <input id="papa-biometrico" value={form.biometricId} onChange={(e) => setForm((f) => ({ ...f, biometricId: e.target.value }))} className="w-full rounded-xl border-2 border-[#f1f3f4] bg-white px-4 py-3 text-sm font-bold text-[#111827] focus:border-[#2d1b69] focus:outline-none transition-all" />
              </div>
            </div>
            <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#4b5563]">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />
              Activo
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#f1f3f4]">
            <button type="button" onClick={() => setModalOpen(false)} className="google-button-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="google-button-primary disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={confirmarEliminacion}
        title="¿Eliminar Papá?"
        message="Esta acción elimina el perfil del papá y su historial de asistencias."
        confirmLabel="Eliminar permanentemente"
      />
    </div>
  );
}

