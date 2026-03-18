import { useEffect, useState } from 'react';
import { api } from '../../shared/api/apiClient';
import { Table } from '../../shared/components/Table';
import { ConfirmModal } from '../../shared/components/ConfirmModal';

type Servicio = { id: number; nombre: string; precio: number; cantidadDias: number };

export function ServiciosPage() {
  const [list, setList] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', precio: '', cantidadDias: '1' });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Confirm delete modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    api.get<Servicio[]>('/servicios').then(setList).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = { nombre: form.nombre, precio: Number(form.precio), cantidadDias: Number(form.cantidadDias) || 1 };
    const req = editingId ? api.put<Servicio>('/servicios/' + editingId, body) : api.post<Servicio>('/servicios', body);
    req.then(() => { setPanelOpen(false); load(); }).catch((e) => setError(e.message));
  };

  if (error) return <p className="text-[#d93025] font-medium">{error}</p>;

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-normal text-[#202124]">Portafolio de Servicios</h2>
          <p className="mt-1 text-sm text-[#5f6368]">
            Define y gestiona los servicios educativos e institucionales ofrecidos.
          </p>
        </div>
      </div>

      {/* Panel inline (crear/editar) */}
      {panelOpen && (
        <div className="animate-scale-in rounded-2xl border border-[#e0e3e7] bg-white shadow-sm">
          <div className="sticky top-0 z-10 rounded-t-2xl border-b border-[#f1f3f4] bg-white/95 px-6 py-4 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-[#202124]">
                  {editingId ? 'Configuración de Servicio' : 'Nuevo Servicio'}
                </h3>
                <p className="mt-1 text-sm text-[#5f6368]">
                  {editingId ? 'Actualiza la información del servicio.' : 'Registra un nuevo servicio en el portafolio.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="rounded-md p-2 text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={submit} className="px-6 py-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">Nombre del Servicio</label>
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">Tarifa (COP)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.precio}
                  onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                  className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">Cantidad de Días</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.cantidadDias}
                  onChange={(e) => setForm((f) => ({ ...f, cantidadDias: e.target.value }))}
                  className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                />
                <p className="mt-1 text-[10px] text-[#5f6368]">Días consecutivos que dura este servicio al asignar un plan.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#f1f3f4] pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPanelOpen(false)} className="google-button-secondary">
                Cancelar
              </button>
              <button type="submit" className="google-button-primary">
                Guardar Servicio
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded bg-[#f1f3f4]" />
          <div className="h-48 w-full animate-pulse rounded bg-[#f1f3f4]" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[#5f6368]">
              {list.length} {list.length === 1 ? 'servicio' : 'servicios'}
            </div>
            <button
              type="button"
              onClick={() => { setError(null); setEditingId(null); setForm({ nombre: '', precio: '', cantidadDias: '1' }); setPanelOpen(true); }}
              className="google-button-primary flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Servicio
            </button>
          </div>

          <Table<Servicio>
            keyExtractor={(s) => s.id}
            data={list}
            columns={[
              { key: 'nombre', header: 'Descripción del Servicio' },
              {
                key: 'precio',
                header: 'Precio Total',
                render: (s) => (
                  <span className="font-medium text-[#202124]">
                    ${s.precio.toLocaleString('es-CO')}
                  </span>
                ),
              },
              {
                key: 'cantidadDias',
                header: 'Días',
                render: (s) => (
                  <span className="font-medium text-[#202124]">
                    {s.cantidadDias} {s.cantidadDias === 1 ? 'día' : 'días'}
                  </span>
                ),
              },
              {
                key: 'id',
                header: 'Gestión',
                render: (s) => (
                  <span className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setEditingId(s.id);
                        setForm({ nombre: s.nombre, precio: String(s.precio), cantidadDias: String(s.cantidadDias) });
                        setPanelOpen(true);
                      }}
                      className="text-[#1a73e8] font-medium hover:underline"
                    >
                      Configurar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIdToDelete(s.id); setConfirmDeleteOpen(true); }}
                      className="text-[#d93025] font-medium hover:underline"
                    >
                      Eliminar
                    </button>
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          if (idToDelete) api.delete('/servicios/' + idToDelete).then(load).catch((e) => setError(e.message));
        }}
        title="¿Eliminar Servicio?"
        message="¿Estás seguro de que deseas eliminar este servicio del portafolio?"
        confirmLabel="Eliminar Servicio"
      />
    </div>
  );
}
