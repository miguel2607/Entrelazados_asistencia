import { useEffect, useState } from 'react';
import { api } from '../../shared/api/apiClient';

interface PlanActivo {
  idNino?: number;
  nombreNino?: string;
  tipo: string;
  nombre: string;
  servicios: { nombre: string }[];
}
interface Nino { id: number; nombre: string; }
interface Servicio { id: number; nombre: string; precio: number; cantidadDias: number; }
interface Paquete { id: number; nombre: string; precio: number; cantidadDias: number; }

export function PlanesPage() {
  const [activos, setActivos] = useState<PlanActivo[]>([]);
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    tipo: 'SERVICIO' as 'SERVICIO' | 'PAQUETE',
    idNino: 0,
    idServicio: 0,
    idPaquete: 0,
    fechaInicio: '',
    totalSesiones: 1
  });
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<PlanActivo[]>('/planes/activos-hoy'),
      api.get<Nino[]>('/ninos'),
      api.get<Servicio[]>('/servicios'),
      api.get<Paquete[]>('/paquetes'),
    ]).then(([a, n, s, p]) => { setActivos(a); setNinos(n); setServicios(s); setPaquetes(p); }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.idNino || (!form.idServicio && form.tipo === 'SERVICIO') || (!form.idPaquete && form.tipo === 'PAQUETE') || !form.fechaInicio || !form.totalSesiones) return;
    setSending(true);
    setError(null);
    setSuccessMessage(null);
    const body = { fechaInicio: form.fechaInicio, totalSesiones: form.totalSesiones };
    const q = form.tipo === 'SERVICIO' ? `idNino=${form.idNino}&idServicio=${form.idServicio}` : `idNino=${form.idNino}&idPaquete=${form.idPaquete}`;
    const nombreNino = ninos.find((n) => n.id === form.idNino)?.nombre ?? 'el niño';
    const promise = form.tipo === 'SERVICIO' ? api.post('/planes/servicio?' + q, body) : api.post('/planes/paquete?' + q, body);
    promise
      .then(() => {
        load();
        setForm((f) => ({ ...f, fechaInicio: '', totalSesiones: 1 }));
        setSuccessMessage(`Plan asignado correctamente a ${nombreNino}.`);
      })
      .catch((e) => setError(e.message))
      .finally(() => setSending(false));
  };

  // Lógica de sesiones
  const selectedServicio = servicios.find((s) => s.id === form.idServicio) || null;
  const selectedPaquete = paquetes.find((p) => p.id === form.idPaquete) || null;

  const totalSesiones = form.totalSesiones;
  const precioPorDia = form.tipo === 'SERVICIO' ? (selectedServicio?.precio || 0) : (selectedPaquete?.precio || 0);
  const totalEstimado = totalSesiones * precioPorDia;

  // Calcular fecha de fin
  const fechaFinCalculada = (() => {
    if (!form.fechaInicio || !totalSesiones || totalSesiones < 1) return null;
    const inicio = new Date(form.fechaInicio + 'T00:00:00');
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + totalSesiones - 1);
    return fin;
  })();

  const formatFecha = (date: Date | null) => {
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (error) return <p className="text-[#d93025] font-medium">{error}</p>;

  return (
    <div className="max-w-6xl space-y-10">
      <header>
        <h2 className="text-2xl font-normal text-[#202124]">Asignación de Planes</h2>
        <p className="mt-1 text-sm text-[#5f6368]">
          Gestiona las suscripciones y planes activos para los estudiantes de la institución.
        </p>
      </header>

      {successMessage && (
        <div className="rounded-xl border border-[#81c995] bg-[#e6f4ea] px-4 py-3 text-sm text-[#137333] flex items-center gap-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {successMessage}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Assignment Form */}
        <section className="lg:col-span-8">
          <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#f1f3f4]">
              <h3 className="font-medium text-[#202124]">Configurar Nuevo Plan</h3>
            </div>
            <form onSubmit={submit} className="p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">Estudiante</label>
                  <select
                    required
                    value={form.idNino}
                    onChange={(e) => setForm((f) => ({ ...f, idNino: Number(e.target.value) }))}
                    className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none"
                  >
                    <option value={0}>Seleccionar Estudiante...</option>
                    {ninos.map((n) => (
                      <option key={n.id} value={n.id}>{n.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">Tipo de Plan</label>
                  <div className="flex rounded-md border border-[#dadce0] p-1 bg-[#f8f9fa]">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tipo: 'SERVICIO' }))}
                      className={`flex-1 py-1.5 text-xs font-medium rounded ${form.tipo === 'SERVICIO' ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-[#5f6368] hover:text-[#202124]'}`}
                    >
                      Servicio Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tipo: 'PAQUETE' }))}
                      className={`flex-1 py-1.5 text-xs font-medium rounded ${form.tipo === 'PAQUETE' ? 'bg-white shadow-sm text-[#1a73e8]' : 'text-[#5f6368] hover:text-[#202124]'}`}
                    >
                      Paquete Mensual/Multiservicio
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">
                  {form.tipo === 'SERVICIO' ? 'Servicio Seleccionado' : 'Paquete Seleccionado'}
                </label>
                <select
                  required
                  value={form.tipo === 'SERVICIO' ? form.idServicio : form.idPaquete}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const item = (form.tipo === 'SERVICIO' ? servicios : paquetes).find(x => x.id === id);
                    let dias = 1;
                    if (form.tipo === 'PAQUETE' && item) dias = (item as Paquete).cantidadDias;
                    if (form.tipo === 'SERVICIO' && item) dias = (item as Servicio).cantidadDias;
                    setForm((f) => ({
                      ...f,
                      [form.tipo === 'SERVICIO' ? 'idServicio' : 'idPaquete']: id,
                      totalSesiones: dias
                    }));
                  }}
                  className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none"
                >
                  <option value={0}>Elegir opción de la lista...</option>
                  {(form.tipo === 'SERVICIO' ? servicios : paquetes).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre} — ${item.precio.toLocaleString('es-CO')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">Fecha de Inicio</label>
                  <input
                    type="date"
                    required
                    value={form.fechaInicio}
                    onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                    className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">Duración (Días)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.totalSesiones}
                    onChange={(e) => setForm((f) => ({ ...f, totalSesiones: Number(e.target.value) }))}
                    className="w-full rounded-md border border-[#dadce0] px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-[#5f6368] uppercase tracking-wider">Fecha de Fin</label>
                  <div className={`w-full rounded-md border px-3 py-2 text-sm ${
                    fechaFinCalculada ? 'border-[#34a853] bg-[#e6f4ea] text-[#137333] font-medium' : 'border-[#dadce0] bg-[#f8f9fa] text-[#5f6368]'
                  }`}>
                    {fechaFinCalculada ? formatFecha(fechaFinCalculada) : 'Seleccione fecha de inicio'}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-[#f1f3f4]">
                <div className="text-sm text-[#5f6368]">
                  {totalSesiones > 0 && <span>Resumen: <strong className="text-[#202124]">{totalSesiones} días</strong> consecutivos{fechaFinCalculada ? <> — hasta el <strong className="text-[#137333]">{formatFecha(fechaFinCalculada)}</strong></> : ''}.</span>}
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="google-button-primary min-w-[140px]"
                >
                  {sending ? 'Procesando...' : 'Asignar Plan'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Estimation Sidebar */}
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-[#f8f9fa] rounded-xl border border-[#dadce0] p-6 shadow-sm">
            <h3 className="text-xs font-bold text-[#5f6368] uppercase tracking-widest mb-6">Cotización en Tiempo Real</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#5f6368]">Tarifa por jornada</span>
                <span className="text-sm font-medium text-[#202124]">
                  {precioPorDia.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#5f6368]">Duración</span>
                <span className="text-sm font-medium text-[#202124]">{totalSesiones || 0} días</span>
              </div>
              {form.fechaInicio && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5f6368]">Fecha inicio</span>
                  <span className="text-sm font-medium text-[#202124]">{formatFecha(new Date(form.fechaInicio + 'T00:00:00'))}</span>
                </div>
              )}
              {fechaFinCalculada && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#5f6368]">Fecha fin</span>
                  <span className="text-sm font-medium text-[#137333]">{formatFecha(fechaFinCalculada)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-[#e8eaed] flex justify-between items-center">
                <span className="text-sm font-bold text-[#202124]">Inversión Total</span>
                <span className="text-lg font-bold text-[#1a73e8]">
                  {totalEstimado.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
            {totalSesiones === 0 && (
              <p className="mt-6 text-[11px] text-[#5f6368] leading-relaxed">
                Seleccione un tipo de plan y una fecha de inicio para generar la estimación automática de costos.
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#dadce0] p-6 shadow-sm">
            <h3 className="text-xs font-bold text-[#5f6368] uppercase tracking-widest mb-4">Vigentes Hoy</h3>
            <div className="space-y-1">
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 w-full bg-[#f1f3f4] rounded" />
                  <div className="h-3 w-4/5 bg-[#f1f3f4] rounded" />
                </div>
              ) : activos.length === 0 ? (
                <p className="text-xs text-[#5f6368] italic py-2">No se registran planes activos el día de hoy.</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                  {activos.map((p, i) => (
                    <div key={i} className="group p-3 rounded-lg hover:bg-[#f1f3f4] transition-colors border border-transparent hover:border-[#dadce0]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#34a853]" />
                        <span className="text-xs font-bold text-[#202124]">{p.nombreNino}</span>
                      </div>
                      <div className="pl-3.5">
                        <p className="text-[11px] text-[#1a73e8] font-medium">{p.nombre}</p>
                        {p.servicios?.length > 0 && (
                          <p className="text-[10px] text-[#5f6368] mt-1">{p.servicios.map((s) => s.nombre).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
