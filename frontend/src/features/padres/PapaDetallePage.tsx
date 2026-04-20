import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/apiClient';
import { fechaLocalYYYYMMDD } from '../../shared/fechaLocal';
import { Modal } from '../../shared/components/Modal';

type PapaDetalle = {
  id: number;
  nombre: string;
  cedula: string;
  ti?: string;
  fechaNacimiento?: string | null;
  semanasGestacion?: number | null;
  telefono?: string;
  biometricId?: string;
  grupo?: string;
  planesActivos: { id: number; tipo: string; nombre: string; servicios: { nombre: string }[] }[];
  asistenciaHoy: {
    horaEntrada?: string | null;
    horaSalida?: string | null;
    jornada?: string | null;
  } | null;
};

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

interface ServicioRow {
  id: number;
  nombre: string;
  precio: number;
}

interface PaqueteRow {
  id: number;
  nombre: string;
  precio: number;
}

interface AsistenciaRow {
  id: number;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
}

interface PlanEstado {
  id: number;
  nombre: string;
  tipo: string;
  fechaInicio: string;
  diasTotales: number;
  diasUsados: number;
  diasRestantes: number;
  precioPorDia: number;
  montoConsumido: number;
  montoRestante: number;
  finalizado: boolean;
  fechaTermino?: string;
  motivoTermino?: 'sesiones' | 'tiempo';
  historialCongelaciones: { id: number; fecha: string; dias: number; motivo?: string | null }[];
}

export function PapaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PapaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fecha, setFecha] = useState(() => fechaLocalYYYYMMDD());
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [estadoPlanes, setEstadoPlanes] = useState<PlanEstado[]>([]);
  const [loadingEstado, setLoadingEstado] = useState(true);
  const [toDelete, setToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [addSessionsModalOpen, setAddSessionsModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [sessionsToAdd, setSessionsToAdd] = useState(1);
  const [isSavingSessions, setIsSavingSessions] = useState(false);

  const [isFreezing, setIsFreezing] = useState<number | null>(null);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezePlanId, setFreezePlanId] = useState<number | null>(null);
  const [freezeDias, setFreezeDias] = useState<number>(7);
  const [freezeMotivo, setFreezeMotivo] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api
      .get<PapaDetalle>(`/papas/${id}/detalle`, { fecha })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, fecha]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id || !data) {
      setEstadoPlanes([]);
      return;
    }
    const papaId = Number(id);
    const today = new Date().toISOString().slice(0, 10);
    setLoadingEstado(true);
    Promise.all([
      api.get<PapaPlanRow[]>(`/planes-papa/papa/${id}`),
      api.get<ServicioRow[]>('/servicios'),
      api.get<PaqueteRow[]>('/paquetes'),
    ])
      .then(([planes, servicios, paquetes]) => {
        if (planes.length === 0) {
          setEstadoPlanes([]);
          setLoadingEstado(false);
          return;
        }
        return Promise.all(
          planes.map((plan) => {
            const hastaHistorial = plan.fechaFin ?? today;
            const historyUrl = `/asistencia-papa/historial?idPapa=${papaId}&desde=${plan.fechaInicio}&hasta=${hastaHistorial}`;
            return Promise.allSettled([
              api.get<AsistenciaRow[]>(historyUrl),
              api.get<{ id: number; fecha: string; dias: number; motivo?: string | null }[]>(
                `/planes-papa/${plan.id}/congelaciones`
              ),
            ]).then((results) => {
              const historial = results[0].status === 'fulfilled' ? results[0].value : [];
              const congelaciones = results[1].status === 'fulfilled' ? results[1].value : [];

              const diasTotales = plan.totalSesiones;
              const diasUsados = plan.sesionesConsumidas ?? historial.length;
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

              if (finalizadoPorSesiones) {
                motivoTermino = 'sesiones';
                fechaTermino = historial.length > 0 ? historial[historial.length - 1].fecha : plan.fechaInicio;
              } else if (finalizadoPorTiempo) {
                motivoTermino = 'tiempo';
                fechaTermino = plan.fechaFin || undefined;
              }

              return {
                id: plan.id,
                nombre,
                tipo: plan.tipo,
                fechaInicio: plan.fechaInicio,
                diasTotales,
                diasUsados,
                diasRestantes,
                precioPorDia,
                montoConsumido: diasUsados * precioPorDia,
                montoRestante: diasRestantes * precioPorDia,
                finalizado,
                fechaTermino,
                motivoTermino,
                historialCongelaciones: congelaciones,
              } as PlanEstado;
            });
          })
        ).then((estados) => {
          if (estados) {
            setEstadoPlanes(estados);
          }
          setLoadingEstado(false);
        });
      })
      .catch(() => {
        setEstadoPlanes([]);
        setLoadingEstado(false);
      });
  }, [id, data]);

  const eliminarPlan = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/planes-papa/${toDelete}`);
      setToDelete(null);
      globalThis.location.reload();
    } catch (err: unknown) {
      alert('Error al eliminar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeleting(false);
    }
  };

  const handleAgregarSesiones = (planId: number) => {
    setSelectedPlanId(planId);
    setSessionsToAdd(1);
    setAddSessionsModalOpen(true);
  };

  const quitarUnaSesion = async (planId: number, diasRestantes: number) => {
    if (diasRestantes <= 0) return;
    const ok = globalThis.confirm('¿Seguro que deseas quitar 1 sesión a este plan?');
    if (!ok) return;
    try {
      await api.patch(`/planes-papa/${planId}/quitar-sesiones?cantidad=1`, {});
      globalThis.location.reload();
    } catch (err: unknown) {
      alert('Error al quitar sesión: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const confirmarAdicionSesiones = async () => {
    if (!selectedPlanId || sessionsToAdd <= 0) return;
    setIsSavingSessions(true);
    try {
      await api.patch(`/planes-papa/${selectedPlanId}/agregar-sesiones?cantidad=${sessionsToAdd}`, {});
      setAddSessionsModalOpen(false);
      globalThis.location.reload();
    } catch (err: unknown) {
      alert('Error al añadir sesiones: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSavingSessions(false);
    }
  };

  const abrirCongelarModal = (planId: number, dias: number) => {
    setFreezePlanId(planId);
    setFreezeDias(dias);
    setFreezeMotivo('');
    setFreezeModalOpen(true);
  };

  const confirmarCongelar = async () => {
    if (!freezePlanId) return;
    setIsFreezing(freezePlanId);
    try {
      await api.post(`/planes-papa/${freezePlanId}/congelar?dias=${freezeDias}`, {
        motivo: freezeMotivo.trim() || undefined,
      });
      setFreezeModalOpen(false);
      globalThis.location.reload();
    } catch (err: unknown) {
      alert('Error al congelar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsFreezing(null);
    }
  };

  const sincronizarHikvision = () => {
    if (!id) return;
    setSyncing(true);
    setSyncMsg(null);
    api
      .post<{ mensaje: string }>(`/papas/${id}/sincronizar`, {})
      .then((r) => setSyncMsg(r.mensaje))
      .catch((e) => setError(e.message))
      .finally(() => setSyncing(false));
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[400px] animate-fade-in flex-col items-center justify-center shadow-none">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#2d1b69] border-t-transparent" />
        <p className="text-xs font-bold uppercase tracking-widest text-[#4b5563]">Cargando perfil…</p>
      </div>
    );
  }
  if (error && !data) {
    return (
      <p className="rounded-xl border border-rose-100 bg-rose-50 p-4 font-bold text-rose-600">{error}</p>
    );
  }
  if (!data) return null;

  return (
    <div className="relative max-w-6xl space-y-10">
      {loading && data && (
        <div className="absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-white/60 pt-20">
          <p className="text-sm font-bold text-[#2d1b69]">Actualizando…</p>
        </div>
      )}

      <div className="animate-fade-in flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <Link
            to="/padres/gestion"
            className="group rounded-full border border-transparent p-3 text-[#4b5563] transition-all hover:border-[#e2e8f0] hover:bg-white hover:shadow-md"
          >
            <svg
              className="h-6 w-6 transition-transform group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#2d1b69] to-[#4c1d95] text-3xl font-extrabold text-white shadow-lg shadow-indigo-200 animate-scale-in">
            {data.nombre.charAt(0)}
          </div>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827]">{data.nombre}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#10b981]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#4b5563]">Resumen del padre</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#9ca3af]">Fecha de consulta</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-2xl border-2 border-[#f1f3f4] bg-white px-4 py-2 text-sm font-bold shadow-sm focus:border-[#2d1b69] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={sincronizarHikvision}
            disabled={syncing}
            className="google-button-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar Hikvision'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-900">
          {syncMsg}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-12">
        <div className="space-y-6 md:col-span-4">
          <div className="google-card animate-scale-in stagger-1">
            <h3 className="mb-6 text-[10px] font-extrabold uppercase tracking-widest text-[#4b5563]">
              Información básica
            </h3>
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#f3e8ff] bg-[#fcfaff] p-4">
                <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-[#2d1b69]">Cédula</p>
                <p className="text-sm font-bold text-[#111827]">{data.cedula || '—'}</p>
              </div>
              <div className="rounded-2xl border border-[#f3e8ff] bg-[#fcfaff] p-4">
                <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-[#2d1b69]">TI</p>
                <p className="text-sm font-bold text-[#111827]">{data.ti || '—'}</p>
              </div>
              <div className="rounded-2xl border border-[#f3e8ff] bg-[#fcfaff] p-4">
                <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-[#2d1b69]">
                  Semanas de gestación
                </p>
                <p className="text-sm font-bold text-[#111827]">
                  {data.semanasGestacion != null ? `${data.semanasGestacion} sem.` : '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-[#f3e8ff] bg-[#fcfaff] p-4">
                <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-[#2d1b69]">Teléfono</p>
                <p className="text-sm font-bold text-[#111827]">{data.telefono || '—'}</p>
              </div>
              <div className="rounded-2xl border border-[#f3e8ff] bg-[#fcfaff] p-4">
                <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-[#2d1b69]">ID biométrico</p>
                <p className="font-mono text-sm font-bold text-[#111827]">{data.biometricId || 'No asignado'}</p>
              </div>
              <div className="rounded-2xl border border-[#f3e8ff] bg-[#fcfaff] p-4">
                <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-[#2d1b69]">Grupo</p>
                <p className="text-sm font-bold text-[#111827]">{data.grupo || 'No asignado'}</p>
              </div>
            </div>
          </div>

          <div className="google-card animate-scale-in stagger-2">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[#4b5563]">Estado hoy</h3>
              <span
                className={`flex h-2.5 w-2.5 rounded-full ${data.asistenciaHoy ? 'bg-[#10b981] shadow-[0_0_8px_rgb(16,185,129)]' : 'bg-[#e2e8f0]'}`}
              />
            </div>
            {data.asistenciaHoy ? (
              <div className="space-y-3 rounded-2xl border border-emerald-100 bg-[#f0fdf4] p-4">
                {data.asistenciaHoy.jornada && (
                  <p className="text-center text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    {data.asistenciaHoy.jornada === 'MAÑANA' ? '☀️ Mañana' : '🌙 Tarde'}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs font-bold uppercase text-[#059669]">Entrada</span>
                  <span className="rounded-md bg-white px-2 py-1 font-mono font-extrabold text-[#065f46] shadow-sm">
                    {data.asistenciaHoy.horaEntrada ?? '--:--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs font-bold uppercase text-[#059669]">Salida</span>
                  <span className="rounded-md bg-white px-2 py-1 font-mono font-extrabold text-[#065f46] shadow-sm">
                    {data.asistenciaHoy.horaSalida ?? '--:--'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#fcfaff] py-6 text-center">
                <p className="text-xs font-bold italic text-[#4b5563]">Sin ingresos en esta fecha</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 md:col-span-8">
          <div className="google-card animate-scale-in stagger-3">
            <h3 className="mb-6 text-[10px] font-extrabold uppercase tracking-widest text-[#4b5563]">
              Planes y Membresías Activas
            </h3>
            {loadingEstado ? (
              <div className="space-y-4">
                <div className="h-24 animate-pulse rounded-2xl bg-[#fcfaff]" />
                <div className="h-24 animate-pulse rounded-2xl bg-[#fcfaff]" />
              </div>
            ) : estadoPlanes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#fcfaff] py-12 text-center">
                <p className="mb-4 text-sm font-bold text-[#4b5563]">No hay planes activos.</p>
                <Link to="/padres/planes" className="google-button-secondary inline-flex text-xs">
                  Asignar plan ahora
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {estadoPlanes.map((e) => (
                  <div
                    key={e.id}
                    className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:shadow-xl ${
                      e.finalizado
                        ? 'border-rose-200 bg-rose-50/50 shadow-rose-100/50'
                        : 'border-[#e2e8f0] bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setToDelete(e.id)}
                      className="absolute right-4 top-4 rounded-full p-2 text-[#9ca3af] transition-colors hover:bg-rose-100 hover:text-rose-600"
                      title="Eliminar plan"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>

                    <div className="absolute left-0 top-0 h-1.5 w-full bg-indigo-50">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          e.finalizado ? 'bg-rose-500' : 'bg-gradient-to-r from-[#2d1b69] to-[#c026d3]'
                        }`}
                        style={{ width: `${(e.diasUsados / Math.max(e.diasTotales, 1)) * 100}%` }}
                      />
                    </div>
                    <div className="mb-6 flex items-start justify-between pt-2">
                      <div>
                        <p
                          className={`mb-2 text-[10px] font-extrabold uppercase leading-none tracking-widest ${e.finalizado ? 'text-rose-600' : 'text-[#2d1b69]'}`}
                        >
                          {e.tipo} {e.finalizado ? '— FINALIZADO' : ''}
                        </p>
                        <h4 className="text-lg font-extrabold leading-tight text-[#111827]">{e.nombre}</h4>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#4b5563]">
                          Asignado: {new Date(e.fechaInicio + 'T00:00:00').toLocaleDateString('es-CO')}
                        </p>
                        {e.finalizado && e.fechaTermino && (
                          <p className="mt-1 text-xs font-bold text-rose-700">
                            Terminó el{' '}
                            {new Date(e.fechaTermino + 'T00:00:00').toLocaleDateString('es-CO', {
                              day: 'numeric',
                              month: 'long',
                            })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-extrabold tracking-tighter text-[#111827]">{e.diasRestantes}</p>
                        <p className="text-[9px] font-extrabold uppercase tracking-tighter text-[#4b5563]">
                          Sesiones Libres
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 border-t border-[#f1f3f4] pt-5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold uppercase tracking-widest text-[#4b5563]">Invertido</span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 font-extrabold text-[#059669] shadow-sm">
                          ${e.montoConsumido.toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold uppercase tracking-widest text-[#4b5563]">Disponible</span>
                        <span className="rounded bg-indigo-50 px-2 py-0.5 font-extrabold text-[#2d1b69] shadow-sm">
                          ${e.montoRestante.toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-b border-[#f1f3f4] pb-4">
                      <button
                        type="button"
                        onClick={() => abrirCongelarModal(e.id, 7)}
                        disabled={isFreezing !== null}
                        className="flex items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white py-2.5 text-[9px] font-extrabold uppercase tracking-widest text-[#c026d3] transition-all hover:border-[#c026d3] hover:bg-fuchsia-50 disabled:opacity-50"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Congelar 7d
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirCongelarModal(e.id, 14)}
                        disabled={isFreezing !== null}
                        className="flex items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] bg-white py-2.5 text-[9px] font-extrabold uppercase tracking-widest text-[#c026d3] transition-all hover:border-[#c026d3] hover:bg-fuchsia-50 disabled:opacity-50"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Congelar 14d
                      </button>
                    </div>

                    {e.historialCongelaciones?.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-fuchsia-100 bg-fuchsia-50/50 p-4">
                        <p className="mb-2 flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-widest text-fuchsia-700">
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Historial de Congelamientos
                        </p>
                        <ul className="space-y-1.5">
                          {e.historialCongelaciones.map((c) => (
                            <li
                              key={c.id}
                              className="border-l-2 border-fuchsia-200 py-1 pl-2 text-[9px] font-bold text-fuchsia-900"
                            >
                              <div className="flex items-center justify-between">
                                <span>
                                  {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-CO', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}
                                </span>
                                <span className="rounded bg-white px-1.5 py-0.5 shadow-sm">+{c.dias} días</span>
                              </div>
                              <p className="mt-1 text-[9px] font-medium normal-case tracking-normal text-fuchsia-700">
                                Nota: {c.motivo?.trim() ? c.motivo : 'Sin nota registrada'}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAgregarSesiones(e.id)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e2e8f0] py-2 text-[10px] font-extrabold uppercase tracking-widest text-[#2d1b69] transition-all hover:border-[#2d1b69] hover:bg-indigo-50 disabled:opacity-50"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                      </svg>
                      Añadir Sesiones
                    </button>

                    <button
                      type="button"
                      onClick={() => quitarUnaSesion(e.id, e.diasRestantes)}
                      disabled={e.diasRestantes <= 0}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-rose-200 py-2 text-[10px] font-extrabold uppercase tracking-widest text-rose-700 transition-all hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                      title={e.diasRestantes <= 0 ? 'No hay sesiones libres para quitar' : 'Quitar 1 sesión'}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 12H5" />
                      </svg>
                      Quitar 1 Sesión
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="google-card animate-scale-in stagger-4">
            <h3 className="mb-6 text-[10px] font-extrabold uppercase tracking-widest text-[#4b5563]">
              Acciones rápidas
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link to="/padres/gestion" className="google-button-secondary text-sm">
                Volver a la lista
              </Link>
              <Link to="/padres/asistencia" className="google-button-primary text-sm">
                Ir a asistencia padres
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Modal open={freezeModalOpen} onClose={() => setFreezeModalOpen(false)} title="Congelar Plan">
        <div className="space-y-5">
          <p className="text-sm text-[#4b5563]">
            Vas a congelar este plan por <span className="font-extrabold text-[#2d1b69]">{freezeDias} días</span>.
          </p>
          <div className="space-y-2">
            <label htmlFor="freeze-motivo-papa" className="block text-[11px] font-extrabold uppercase tracking-widest text-[#4b5563]">
              Nota del congelamiento (opcional)
            </label>
            <textarea
              id="freeze-motivo-papa"
              value={freezeMotivo}
              onChange={(e) => setFreezeMotivo(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej: Viaje familiar, incapacidad médica, vacaciones..."
              className="w-full resize-none rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium shadow-sm transition-all focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-[#e2e8f0] pt-4">
            <button type="button" onClick={() => setFreezeModalOpen(false)} className="google-button-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarCongelar}
              disabled={isFreezing !== null}
              className="google-button-primary disabled:opacity-50"
            >
              {isFreezing !== null ? 'Congelando...' : 'Confirmar congelación'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={addSessionsModalOpen} onClose={() => setAddSessionsModalOpen(false)} title="Añadir Sesiones al Plan">
        <div className="animate-scale-in space-y-6">
          <div className="pb-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-[#4b5563]">¿Cuántas sesiones deseas agregar?</p>
            <p className="mt-1 text-[10px] font-extrabold text-[#2d1b69]">ESTO SE SUMARÁ AL TOTAL ACTUAL DEL PLAN</p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setSessionsToAdd(Math.max(1, sessionsToAdd - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e2e8f0] text-xl font-bold text-[#2d1b69] transition-all hover:bg-indigo-50"
            >
              −
            </button>
            <input
              type="number"
              value={sessionsToAdd}
              onChange={(e) => setSessionsToAdd(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
              className="w-24 border-b-2 border-[#2d1b69] bg-transparent text-center text-3xl font-extrabold text-[#111827] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setSessionsToAdd(sessionsToAdd + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e2e8f0] text-xl font-bold text-[#2d1b69] transition-all hover:bg-indigo-50"
            >
              +
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 5, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSessionsToAdd(n)}
                className={`rounded-xl border py-2 text-[10px] font-extrabold uppercase tracking-widest transition-all ${
                  sessionsToAdd === n
                    ? 'border-[#2d1b69] bg-[#2d1b69] text-white shadow-lg shadow-indigo-200'
                    : 'border-[#e2e8f0] bg-white text-[#4b5563] hover:border-[#2d1b69]'
                }`}
              >
                +{n} {n === 1 ? 'Día' : 'Días'}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 border-t border-[#e2e8f0] pt-6">
            <button type="button" onClick={() => setAddSessionsModalOpen(false)} className="google-button-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarAdicionSesiones}
              disabled={isSavingSessions}
              className="google-button-primary min-w-[160px] disabled:opacity-50"
            >
              {isSavingSessions ? 'Guardando...' : 'Confirmar Adición'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={toDelete !== null} onClose={() => setToDelete(null)} title="Confirmar Eliminación">
        <div className="space-y-6">
          <div className="flex items-center gap-4 rounded-xl border border-rose-100 bg-rose-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-sm font-bold leading-tight text-rose-900">
              ¿Estás seguro de que deseas eliminar este plan? Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setToDelete(null)} className="google-button-secondary">
              Cancelar
            </button>
            <button
              type="button"
              onClick={eliminarPlan}
              disabled={deleting}
              className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-rose-200 transition-all hover:bg-rose-700 disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
