import { useEffect, useState } from 'react';
import { api } from '../../shared/api/apiClient';
import { Table } from '../../shared/components/Table';
import { Modal } from '../../shared/components/Modal';
import { ConfirmModal } from '../../shared/components/ConfirmModal';

interface Acudiente {
  id: number;
  nombre: string;
  telefono: string;
  cc: string;
}

export function AcudientesPage() {
  const [list, setList] = useState<Acudiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', telefono: '', cc: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Confirm delete modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.get<Acudiente[]>('/acudientes', buscar ? { nombre: buscar } : undefined).then(setList).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [buscar]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ nombre: '', telefono: '', cc: '' });
    setModalOpen(true);
  };

  const openEdit = (a: Acudiente) => {
    setEditingId(a.id);
    setForm({ nombre: a.nombre, telefono: a.telefono ?? '', cc: a.cc ?? '' });
    setModalOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = { nombre: form.nombre, telefono: form.telefono || undefined, cc: form.cc || undefined };
    (editingId ? api.put<Acudiente>(`/acudientes/${editingId}`, body) : api.post<Acudiente>('/acudientes', body))
      .then(() => { setModalOpen(false); load(); })
      .catch((err) => setError(err.message))
      .finally(() => setSaving(false));
  };

  const remove = (id: number) => {
    setIdToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const confirmarEliminacion = () => {
    if (!idToDelete) return;
    api.delete(`/acudientes/${idToDelete}`).then(load).catch((e) => setError(e.message));
  };

  if (error) return <p className="text-[#d93025] font-medium">{error}</p>;

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h2 className="text-2xl font-normal text-[#202124]">Gestión de Acudientes</h2>
        <p className="mt-1 text-sm text-[#5f6368]">
          Registra y administra a los padres, tutores y responsables legales de los estudiantes.
        </p>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg border border-[#dadce0]">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5f6368]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            placeholder="Buscar por nombre..." 
            value={buscar} 
            onChange={(e) => setBuscar(e.target.value)} 
            className="w-full rounded-md border border-[#dadce0] bg-[#f8f9fa] py-2 pl-10 pr-4 text-sm focus:border-[#1a73e8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-all" 
          />
        </div>
        <button 
          type="button" 
          onClick={openCreate} 
          className="google-button-primary flex items-center justify-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Acudiente
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded bg-[#f1f3f4]" />
          <div className="h-64 w-full animate-pulse rounded bg-[#f1f3f4]" />
        </div>
      ) : (
        <Table<Acudiente>
          keyExtractor={(a) => a.id}
          data={list}
          columns={[
            { key: 'nombre', header: 'Nombre Completo' },
            { key: 'telefono', header: 'Teléfono de Contacto' },
            { key: 'cc', header: 'Documento (CC)' },
            { key: 'id', header: 'Acciones', render: (a) => (
              <span className="flex gap-4">
                <button type="button" onClick={() => openEdit(a)} className="text-[#1a73e8] font-medium hover:underline">Editar</button>
                <button type="button" onClick={() => remove(a.id)} className="text-[#d93025] font-medium hover:underline">Eliminar</button>
              </span>
            ) },
          ]}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Actualizar Acudiente' : 'Nuevo Acudiente'}>
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">Nombre Completo</label>
            <input 
              required 
              value={form.nombre} 
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} 
              className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]" 
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">Teléfono</label>
            <input 
              value={form.telefono} 
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} 
              className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]" 
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">Cédula (CC)</label>
            <input 
              value={form.cc} 
              onChange={(e) => setForm((f) => ({ ...f, cc: e.target.value }))} 
              className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]" 
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#f1f3f4]">
            <button type="button" onClick={() => setModalOpen(false)} className="google-button-secondary">
              Cancelar
            </button>
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
        title="¿Eliminar Acudiente?"
        message="¿Estás seguro de que deseas eliminar este acudiente? Esta acción desvinculará al acudiente de todos los niños asociados."
        confirmLabel="Eliminar permanentemente"
      />
    </div>
  );
}
