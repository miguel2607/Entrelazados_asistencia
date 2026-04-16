import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/apiClient';
import { Modal } from '../../shared/components/Modal';

interface PapaDetalle {
  id: number;
  nombre: string;
  cedula: string;
  fechaNacimiento?: string;
  semanasGestacion?: number;
  telefono?: string;
  biometricId?: string;
}

interface PapaPlanRow {
  id: number;
  idPapa: number;
  tipo: string;
  idServicio: number | null;
  idPaquete: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  nombrePlan: string | null;
  totalSesiones: number;
  sesionesConsumidas: number;
}

interface ServicioRow { id: number; nombre: string; precio: number; }
interface PaqueteRow { id: number; nombre: string; precio: number; }
interface PlanEstado {
  id: number;
  nombre: string;
  tipo: string;
  diasTotales: number;
  diasUsados: number;
  diasRestantes: number;
  precioPorDia: number;
  montoConsumido: number;
  montoRestante: number;
  finalizado: boolean;
  fechaTermino?: string;
  motivoTermino?: 'sesiones' | 'tiempo';
}

export function PapaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PapaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadoPlanes, setEstadoPlanes] = useState<PlanEstado[]>([]);
  const [loadingEstado, setLoadingEstado] = useState(true);
  const [toDelete, setToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [addSessionsModalOpen, setAddSessionsModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [sessionsToAdd, setSessionsToAdd] = useState(1);
  const [isSavingSessions, setIsSavingSessions] = useState(false);

  const [asistenciaHoy, setAsistenciaHoy] = useState<{ horaEntrada: string; horaSalida: string | null } | null>(null);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api.get<PapaDetalle>(`/papas/${id}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!id) return;
    const hoy = new Date().toISOString().split('T')[0];
    api.get<any[]>('/asistencia-papas/por-fecha', { fecha: hoy })
      .then((list) => {
        const mio = list.find((a) => a.idPapa === Number(id) && a.horaEntrada && !a.horaSalida);
        if (mio) {
          setAsistenciaHoy({ horaEntrada: mio.horaEntrada, horaSalida: mio.horaSalida });
        } else {
          const ultimo = list.filter((a) => a.idPapa === Number(id)).pop();
          if (ultimo) setAsistenciaHoy({ horaEntrada: ultimo.horaEntrada, horaSalida: ultimo.horaSalida });
          else setAsistenciaHoy(null);
        }
      })
      .catch(() => setAsistenciaHoy(null));
  }, [id]);

  const diffDias = useCallback((desde: string, hasta: string | null) => {
    if (!hasta) return 30;
    const a = new Date(desde);
    const b = new Date(hasta);
    return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  }, []);

  useEffect(() => {
    if (!id || !data) { setEstadoPlanes([]); return; }
    const today = new Date().toISOString().slice(0, 10);
    setLoadingEstado(true);
    Promise.all([
      api.get<PapaPlanRow[]>(`/planes-papas/papa/${id}`),
      api.get<ServicioRow[]>('/servicios'),
      api.get<PaqueteRow[]>('/paquetes'),
    ])
      .then(([planes, servicios, paquetes]) => {
        if (planes.length === 0) { setEstadoPlanes([]); setLoadingEstado(false); return; }
        const estados = planes.map((plan) => {
          const diasTotales = plan.totalSesiones;
          const diasUsados = plan.sesionesConsumidas;
          const diasRestantes = Math.max(0, diasTotales - diasUsados);
          let nombre = plan.nombrePlan || '';
          let precioPorDia = 0;
          if (plan.tipo.toLowerCase() === 'servicio' && plan.idServicio) {
            const s = servicios.find((x) => x.id === plan.idServicio);
            if (!nombre) nombre = s?.nombre ?? 'Servicio';
            const totalPrecio = s?.precio ?? 0;
            precioPorDia = diasTotales > 0 ? totalPrecio / diasTotales : totalPrecio;
          } else if (plan.tipo.toLowerCase() === 'paquete' && plan.idPaquete) {
            const pa = paquetes.find((x) => x.id === plan.idPaquete);
            if (!nombre) nombre = pa?.nombre ?? 'Paquete';
            const totalPrecio = pa?.precio ?? 0;
            precioPorDia = diasTotales > 0 ? totalPrecio / diasTotales : totalPrecio;
          }
          const finalizadoPorSesiones = diasRestantes === 0;
          const finalizadoPorTiempo = plan.fechaFin ? plan.fechaFin < today : false;
          const finalizado = finalizadoPorSesiones || finalizadoPorTiempo;
          let fechaTermino: string | undefined;
          let motivoTermino: 'sesiones' | 'tiempo' | undefined;
          if (finalizadoPorSesiones) { motivoTermino = 'sesiones'; fechaTermino = plan.fechaInicio; }
          else if (finalizadoPorTiempo) { motivoTermino = 'tiempo'; fechaTermino = plan.fechaFin || undefined; }
          return { id: plan.id, nombre, tipo: plan.tipo, diasTotales, diasUsados, diasRestantes, precioPorDia, montoConsumido: diasUsados * precioPorDia, montoRestante: diasRestantes * precioPorDia, finalizado, fechaTermino, motivoTermino } as PlanEstado;
        });
        setEstadoPlanes(estados);
        setLoadingEstado(false);
      })
      .catch(() => { setEstadoPlanes([]); setLoadingEstado(false); });
  }, [id, data, diffDias]);

  const eliminarPlan = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/planes-papas/${toDelete}`);
      setToDelete(null);
      load();
      window.location.reload();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    } finally { setDeleting(false); }
  };

  const handleAgregarSesiones = (idPlan: number) => {
    setSelectedPlanId(idPlan);
    setSessionsToAdd(1);
    setAddSessionsModalOpen(true);
  };

  const quitarUnaSesion = async (idPlan: number, diasRestantes: number) => {
    if (diasRestantes <= 0) return;
    if (!window.confirm('¿Seguro que deseas quitar 1 sesión a este plan?')) return;
    try {
      await api.patch(`/planes-papas/${idPlan}/quitar-sesiones?cantidad=1`, {});
      window.location.reload();
    } catch (err: any) {
      alert('Error al quitar sesión: ' + (err?.message ?? String(err)));
    }
  };

  const confirmarAdicionSesiones = async () => {
    if (!selectedPlanId || sessionsToAdd <= 0) return;
    setIsSavingSessions(true);
    try {
      await api.patch(`/planes-papas/${selectedPlanId}/agregar-sesiones?cantidad=${sessionsToAdd}`, {});
      setAddSessionsModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert('Error al añadir sesiones: ' + err.message);
    } finally { setIsSavingSessions(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-in shadow-none">
      <div className="animate-spin h-10 w-10 border-4 border-[#2d1b69] border-t-transparent rounded-full mb-4" />
      <p className="text-xs font-bold text-[#4b5563] uppercase tracking-widest">Cargando Perfil...</p>
    </div>
  );
  if (error) return <p className="text-rose-600 font-bold p-4 bg-rose-50 rounded-xl border border-rose-100">{error}</p>;
  if (!data) return null;

  return (
    <div className="max-w-6xl space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div className="flex items-center gap-5">
          <Link to="/papas" className="group p-3 rounded-full hover:bg-white hover:shadow-md text-[#4b5563] transition-all border border-transparent hover:border-[#e2e8f0]">
            <svg className="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-[#2d1b69] to-[#4c1d95] flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-indigo-200 animate-scale-in">
            {data.nombre.charAt(0)}
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">{data.nombre}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              <p className="text-xs text-[#4b5563] uppercase tracking-widest font-bold">Resumen del Papá</p>
            </div>
          </div>
        </div>
        <Link to={`/planes-papas?idPapa=${data.id}`} className="google-button-primary flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Asignar Plan</span>
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-4 space-y-6">
          <div className="google-card animate-scale-in stagger-1">
            <h3 className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest mb-6">Información Básica</h3>
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#fcfaff] border border-[#f3e8ff]">
                <p className="text-[9px] text-[#2d1b69] font-extrabold uppercase tracking-widest mb-1">Cédula</p>
                <p className="text-sm font-bold text-[#111827]">{data.cedula || 'Sin documento'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#fcfaff] border border-[#f3e8ff]">
                <p className="text-[9px] text-[#2d1b69] font-extrabold uppercase tracking-widest mb-1">Semanas de Gestación</p>
                <p className="text-sm font-bold text-[#111827] font-mono">{data.semanasGestacion ?? 'No registrado'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#fcfaff] border border-[#f3e8ff]">
                <p className="text-[9px] text-[#2d1b69] font-extrabold uppercase tracking-widest mb-1">Teléfono</p>
                <p className="text-sm font-bold text-[#111827]">{data.telefono || 'No registrado'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#fcfaff] border border-[#f3e8ff]">
                <p className="text-[9px] text-[#2d1b69] font-extrabold uppercase tracking-widest mb-1">ID Biométrico</p>
                <p className="text-sm font-bold text-[#111827] font-mono">{data.biometricId || 'No asignado'}</p>
              </div>
            </div>
          </div>

          <div className="google-card animate-scale-in stagger-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest">Estado Hoy</h3>
              <span className={`flex h-2.5 w-2.5 rounded-full ${asistenciaHoy && !asistenciaHoy.horaSalida ? 'bg-[#10b981] shadow-[0_0_8px_rgb(16,185,129)]' : 'bg-[#e2e8f0]'}`} />
            </div>
            {asistenciaHoy ? (
              <div className="bg-[#f0fdf4] rounded-2xl p-4 border border-emerald-100 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#059669] font-bold text-xs uppercase">Entrada</span>
                  <span className="font-mono font-extrabold text-[#065f46] bg-white px-2 py-1 rounded-md shadow-sm">{asistenciaHoy.horaEntrada ?? '--:--'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#059669] font-bold text-xs uppercase">Salida</span>
                  <span className="font-mono font-extrabold text-[#065f46] bg-white px-2 py-1 rounded-md shadow-sm">{asistenciaHoy.horaSalida ?? '--:--'}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center bg-[#fcfaff] rounded-2xl border border-dashed border-[#e2e8f0]">
                <p className="text-xs text-[#4b5563] font-bold italic">Sin ingresos hoy</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-8 space-y-6">
          <div className="google-card animate-scale-in stagger-3">
            <h3 className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest mb-6">Planes y Membresías Activas</h3>
            {loadingEstado ? (
              <div className="space-y-4">
                <div className="h-24 bg-[#fcfaff] animate-pulse rounded-2xl" />
                <div className="h-24 bg-[#fcfaff] animate-pulse rounded-2xl" />
              </div>
            ) : estadoPlanes.length === 0 ? (
              <div className="py-12 text-center bg-[#fcfaff] rounded-2xl border border-dashed border-[#e2e8f0]">
                <p className="text-sm text-[#4b5563] font-bold mb-4">No hay planes activos.</p>
                <Link to={`/planes-papas?idPapa=${data.id}`} className="google-button-secondary inline-flex text-xs">Asignar Plan Ahora</Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {estadoPlanes.map((e) => (
                  <div
                    key={e.id}
                    className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:shadow-xl ${e.finalizado ? 'bg-rose-50/50 border-rose-200 shadow-rose-100/50' : 'bg-white border-[#e2e8f0]'}`}
                  >
                    <button onClick={() => setToDelete(e.id)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-rose-100 text-[#9ca3af] hover:text-rose-600 transition-colors" title="Eliminar Plan">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>

                    <div className="absolute top-0 left-0 h-1.5 w-full bg-indigo-50">
                      <div className={`h-full rounded-full transition-all duration-1000 ${e.finalizado ? 'bg-rose-500' : 'bg-gradient-to-r from-[#2d1b69] to-[#c026d3]'}`} style={{ width: `${(e.diasUsados / e.diasTotales) * 100}%` }} />
                    </div>
                    <div className="flex items-start justify-between mb-6 pt-2">
                      <div>
                        <p className={`text-[10px] font-extrabold uppercase tracking-widest leading-none mb-2 ${e.finalizado ? 'text-rose-600' : 'text-[#2d1b69]'}`}>
                          {e.tipo} {e.finalizado ? '— FINALIZADO' : ''}
                        </p>
                        <h4 className="text-lg font-extrabold text-[#111827] leading-tight">{e.nombre}</h4>
                        {e.finalizado && e.fechaTermino && (
                          <p className="mt-1 text-xs font-bold text-rose-700">
                            Terminó el {new Date(e.fechaTermino + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-[#111827] tracking-tighter">{e.diasRestantes}</p>
                        <p className="text-[9px] text-[#4b5563] uppercase font-extrabold tracking-tighter">Sesiones Libres</p>
                      </div>
                    </div>
                    <div className="space-y-3 mt-4 pt-5 border-t border-[#f1f3f4]">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#4b5563] font-bold uppercase tracking-widest">Invertido</span>
                        <span className="font-extrabold text-[#059669] bg-emerald-50 px-2 py-0.5 rounded shadow-sm">${e.montoConsumido.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-[#4b5563] font-bold uppercase tracking-widest">Disponible</span>
                        <span className="font-extrabold text-[#2d1b69] bg-indigo-50 px-2 py-0.5 rounded shadow-sm">${e.montoRestante.toLocaleString('es-CO')}</span>
                      </div>
                    </div>

                    <button onClick={() => handleAgregarSesiones(e.id)} className="mt-5 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-[#e2e8f0] text-[10px] font-extrabold text-[#2d1b69] uppercase tracking-widest hover:bg-indigo-50 hover:border-[#2d1b69] transition-all">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                      Añadir Sesiones
                    </button>
                    <button type="button" onClick={() => quitarUnaSesion(e.id, e.diasRestantes)} disabled={e.diasRestantes <= 0} className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-rose-200 text-rose-700 text-[10px] font-extrabold uppercase tracking-widest hover:bg-rose-50 hover:border-rose-300 transition-all disabled:opacity-50" title={e.diasRestantes <= 0 ? 'No hay sesiones libres' : 'Quitar 1 sesión'}>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 12H5" /></svg>
                      Quitar 1 Sesión
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={addSessionsModalOpen} onClose={() => setAddSessionsModalOpen(false)} title="Añadir Sesiones al Plan">
        <div className="space-y-6 animate-scale-in">
          <div className="text-center pb-2">
            <p className="text-xs font-bold text-[#4b5563] uppercase tracking-widest">¿Cuántas sesiones deseas agregar?</p>
            <p className="text-[10px] text-[#2d1b69] font-extrabold mt-1">ESTO SE SUMARÁ AL TOTAL ACTUAL DEL PLAN</p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button type="button" onClick={() => setSessionsToAdd(Math.max(1, sessionsToAdd - 1))} className="h-12 w-12 rounded-full border border-[#e2e8f0] flex items-center justify-center text-[#2d1b69] hover:bg-indigo-50 transition-all font-bold text-xl">−</button>
            <div className="relative">
              <input type="number" value={sessionsToAdd} onChange={(e) => setSessionsToAdd(Math.max(1, parseInt(e.target.value) || 1))} className="w-24 text-center text-3xl font-extrabold text-[#111827] border-b-2 border-[#2d1b69] focus:outline-none bg-transparent" />
            </div>
            <button type="button" onClick={() => setSessionsToAdd(sessionsToAdd + 1)} className="h-12 w-12 rounded-full border border-[#e2e8f0] flex items-center justify-center text-[#2d1b69] hover:bg-indigo-50 transition-all font-bold text-xl">+</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 5, 10].map(n => (
              <button key={n} type="button" onClick={() => setSessionsToAdd(n)} className={`py-2 rounded-xl border text-[10px] font-extrabold transition-all uppercase tracking-widest ${sessionsToAdd === n ? 'bg-[#2d1b69] text-white border-[#2d1b69] shadow-lg shadow-indigo-200' : 'bg-white text-[#4b5563] border-[#e2e8f0] hover:border-[#2d1b69]'}`}>
                +{n} {n === 1 ? 'Sesión' : 'Sesiones'}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-[#e2e8f0]">
            <button type="button" onClick={() => setAddSessionsModalOpen(false)} className="google-button-secondary">Cancelar</button>
            <button type="button" onClick={confirmarAdicionSesiones} disabled={isSavingSessions} className="google-button-primary disabled:opacity-50 min-w-[160px]">
              {isSavingSessions ? 'Guardando...' : 'Confirmar Adición'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={toDelete !== null} onClose={() => setToDelete(null)} title="Confirmar Eliminación">
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-rose-50 border border-rose-100">
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <p className="text-sm font-bold text-rose-900 leading-tight">¿Estás seguro de que deseas eliminar este plan? Esta acción no se puede deshacer.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setToDelete(null)} className="google-button-secondary">Cancelar</button>
            <button onClick={eliminarPlan} disabled={deleting} className="px-6 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-extrabold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50">
              {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
