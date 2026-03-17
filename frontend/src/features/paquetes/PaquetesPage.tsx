import { useEffect, useState } from 'react';
import { api } from '../../shared/api/apiClient';
import { Table } from '../../shared/components/Table';
import { ConfirmModal } from '../../shared/components/ConfirmModal';

type Servicio = { id: number; nombre: string; precio: number };
type Paquete = { id: number; nombre: string; precio: number; cantidadDias?: number; servicios: Servicio[] };

export function PaquetesPage() {
  const [list, setList] = useState<Paquete[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', precio: '', cantidadDias: 1, idServicios: [] as number[] });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Confirm delete modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  const [buscarServicio, setBuscarServicio] = useState('');

  const load = () => { setLoading(true); Promise.all([api.get<Paquete[]>('/paquetes'), api.get<Servicio[]>('/servicios')]).then(([p, s]) => { setList(p); setServicios(s); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingId(null); setForm({ nombre: '', precio: '', cantidadDias: 1, idServicios: [] }); setModalOpen(true); };
  const openEdit = (p: Paquete) => { setEditingId(p.id); setForm({ nombre: p.nombre, precio: String(p.precio), cantidadDias: p.cantidadDias ?? 1, idServicios: p.servicios?.map((s) => s.id) ?? [] }); setModalOpen(true); };
  const toggle = (id: number) => { setForm((f) => ({ ...f, idServicios: f.idServicios.includes(id) ? f.idServicios.filter((x) => x !== id) : [...f.idServicios, id] })); };
  const submit = (e: React.FormEvent) => { e.preventDefault(); const body = { nombre: form.nombre, precio: Number(form.precio), cantidadDias: form.cantidadDias, idServicios: form.idServicios }; (editingId ? api.put<Paquete>('/paquetes/' + editingId, body) : api.post<Paquete>('/paquetes', body)).then(() => { setModalOpen(false); load(); }).catch((e) => setError(e.message)); };
  const remove = (id: number) => {
    setIdToDelete(id);
    setConfirmDeleteOpen(true);
  };

  const confirmarEliminacion = () => {
    if (!idToDelete) return;
    api.delete('/paquetes/' + idToDelete).then(load).catch((e) => setError(e.message));
  };

  const totalServicios = form.idServicios.reduce((acc, id) => {
    const s = servicios.find(x => x.id === id);
    return acc + (s?.precio || 0);
  }, 0);
  const ahorro = Math.max(0, totalServicios - Number(form.precio));

  const serviciosFiltrados = servicios.filter(s => s.nombre.toLowerCase().includes(buscarServicio.toLowerCase()));

  if (error) return <p className="text-[#d93025] font-medium">{error}</p>;

  return (
    <div className="max-w-6xl space-y-10">
      <div className="flex flex-col gap-2 animate-fade-in">
        <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">Ventas y Paquetes</h2>
        <p className="mt-1 text-sm text-[#4b5563]">
          Personaliza tus ofertas comerciales combinando servicios con un esquema de precios competitivo.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded bg-[#f1f3f4]" />
          <div className="h-64 w-full animate-pulse rounded bg-[#f1f3f4]" />
        </div>
      ) : (
        <div className="space-y-8 animate-scale-in">
          {/* Barra de acciones */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openCreate}
              className="google-button-primary flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Paquete
            </button>
          </div>
          <Table<Paquete>
            keyExtractor={(p) => p.id}
            data={list}
            columns={[
              {
                key: 'nombre',
                header: 'Nombre del Paquete',
                render: (p) => <span className="font-bold text-[#111827]">{p.nombre}</span>,
              },
              {
                key: 'precio',
                header: 'Precio Total',
                render: (p) => (
                  <span className="font-extrabold text-[#2d1b69]">
                    ${p.precio.toLocaleString('es-CO')}
                  </span>
                ),
              },
              {
                key: 'dias',
                header: 'Período',
                render: (p) => (
                  <span className="px-3 py-1 bg-indigo-50 text-[#2d1b69] text-[10px] font-extrabold uppercase tracking-widest rounded-full border border-indigo-100">
                    {p.cantidadDias ?? 1} {(p.cantidadDias ?? 1) === 1 ? 'Día' : 'Días'}
                  </span>
                ),
              },
              {
                key: 'servicios',
                header: 'Composición',
                render: (p) => (
                  <div className="flex flex-wrap gap-1.5 max-w-sm">
                    {p.servicios?.map((s) => (
                      <span
                        key={s.id}
                        className="text-[9px] bg-white text-[#4b5563] px-2 py-0.5 rounded-md border border-[#e2e8f0] font-bold uppercase tracking-tighter"
                      >
                        {s.nombre}
                      </span>
                    )) ?? '-'}
                  </div>
                ),
              },
              {
                key: 'id',
                header: 'Panel de Control',
                render: (p) => (
                  <span className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="text-[#2d1b69] font-bold text-xs uppercase hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="text-rose-600 font-bold text-xs uppercase hover:underline"
                    >
                      Eliminar
                    </button>
                  </span>
                ),
              },
            ]}
          />

          {modalOpen && (
            <div className="rounded-2xl border border-[#e2e8f0] bg-white shadow-xl p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-[#111827]">
                    {editingId ? 'Actualizar paquete' : 'Crear nuevo paquete'}
                  </h3>
                  <p className="mt-1 text-xs text-[#6b7280]">
                    Define el nombre, precio y los servicios que componen este paquete.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-sm font-semibold text-[#6b7280] hover:text-[#111827]"
                >
                  Cerrar
                </button>
              </div>

              <form onSubmit={submit} className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest">
                        Identificador del Paquete
                      </label>
                      <input
                        required
                        placeholder="Ej: Paquete Mensual VIP"
                        value={form.nombre}
                        onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                        className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm focus:border-[#2d1b69] focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest">
                          Precio Total del Paquete
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2d1b69] font-bold">
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={form.precio}
                            onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                            className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-8 pr-4 py-3 text-sm focus:border-[#2d1b69] focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-bold text-[#111827]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest">
                          Días de Cobertura
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={form.cantidadDias}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              cantidadDias: Math.max(1, parseInt(String(e.target.value), 10) || 1),
                            }))
                          }
                          className="w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm focus:border-[#2d1b69] focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="bg-[#f1f5f9]/50 rounded-2xl p-4 border border-[#e2e8f0] space-y-3">
                      <div className="flex justify-between text-xs font-bold text-[#4b5563]">
                        <span>Suma total servicios:</span>
                        <span>${totalServicios.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-[#2d1b69]">
                        <span>Ahorro del cliente:</span>
                        <span>${ahorro.toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest">
                        Seleccionar Servicios
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Filtrar servicios..."
                          value={buscarServicio}
                          onChange={(e) => setBuscarServicio(e.target.value)}
                          className="text-[10px] py-1 pl-7 pr-3 border border-[#e2e8f0] rounded-full focus:outline-none focus:border-[#2d1b69]"
                        />
                        <svg
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#94a3b8]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-3 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9] custom-scrollbar">
                      {serviciosFiltrados.length === 0 && (
                        <p className="text-xs text-[#94a3b8] w-full text-center py-4 italic">
                          No se encontraron servicios
                        </p>
                      )}
                      {serviciosFiltrados.map((s) => (
                        <label
                          key={s.id}
                          className={`group flex items-center gap-3 rounded-xl border px-4 py-2.5 text-xs font-bold cursor-pointer transition-all duration-200 ${form.idServicios.includes(s.id)
                              ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-indigo-200'
                              : 'bg-white border-[#e2e8f0] text-[#4b5563] hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={form.idServicios.includes(s.id)}
                            onChange={() => toggle(s.id)}
                          />
                          {s.nombre}
                          <span
                            className={`text-[10px] ${form.idServicios.includes(s.id)
                                ? 'text-indigo-200'
                                : 'text-[#94a3b8] group-hover:text-purple-400'
                              }`}
                          >
                            ${s.precio.toLocaleString('es-CO')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#f1f5f9]">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-[#64748b] hover:bg-[#f1f5f9] transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-[#2d1b69] to-[#4c1d95] shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  >
                    Finalizar Configuración
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={confirmarEliminacion}
        title="¿Eliminar Paquete?"
        message="Esta acción eliminará el paquete de forma permanente. Los servicios individuales no se verán afectados."
        confirmLabel="Eliminar Paquete"
      />
    </div>
  );
}

