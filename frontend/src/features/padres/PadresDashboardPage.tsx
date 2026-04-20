import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/apiClient';
import { fechaLocalYYYYMMDD } from '../../shared/fechaLocal';
import { AsistenciaReportesSection } from '../dashboard/AsistenciaReportesSection';

const LIVE_POLL_INTERVAL = 10000;

type AlertaPlanPadres = {
  idPlan: number;
  idPapa: number;
  nombrePapa: string;
  nombrePlan: string;
  tipo: string;
  vencido: boolean;
  venceHoy: boolean;
  sesionesRestantes: number;
  mensaje: string;
};

type AlertaTiempoPadres = {
  idPapa: number;
  idPlan: number | null;
  nombrePapa: string;
  nombrePlan: string;
  tipoComposicion: string;
  umbralHoras: number;
  duracion: string;
  mensaje: string;
};

type DashboardPadresResponse = {
  totalPapas: number;
  totalAsistenciaHoy: number;
  totalPlanesActivosHoy: number;
  asistenciaHoy: {
    id: number;
    idPapa: number;
    horaEntrada?: string | null;
    nombrePlan?: string | null;
    papa?: { id: number; nombre: string; cedula?: string };
  }[];
  planesActivosHoy: {
    idPapa?: number;
    nombrePapa?: string;
    tipo: string;
    nombre: string;
    sesionesRestantes: number;
    servicios?: { nombre: string }[];
  }[];
  alertasPlanes: AlertaPlanPadres[];
  alertasTiempo: AlertaTiempoPadres[];
  cumpleanosHoy: { id: number; nombre: string; mensaje: string }[];
};

export function PadresDashboardPage() {
  const [data, setData] = useState<DashboardPadresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [liveAsistencia, setLiveAsistencia] = useState<DashboardPadresResponse['asistenciaHoy']>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [clockNow, setClockNow] = useState<Date>(new Date());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dashboardRequestInFlightRef = useRef(false);

  const fetchLiveData = useCallback((opts?: { showLoader?: boolean; showError?: boolean }) => {
    if (dashboardRequestInFlightRef.current) return;
    dashboardRequestInFlightRef.current = true;
    if (opts?.showLoader) setLoading(true);

    api
      .get<DashboardPadresResponse>('/dashboard/padres', { fecha: fechaLocalYYYYMMDD() })
      .then((newData) => {
        setLiveAsistencia(newData.asistenciaHoy);
        setData(newData);
        setLastUpdated(new Date());
        setError(null);
      })
      .catch((e) => {
        if (opts?.showError) setError(e?.message ?? 'No se pudo cargar el panel de padres.');
      })
      .finally(() => {
        if (opts?.showLoader) setLoading(false);
        dashboardRequestInFlightRef.current = false;
      });
  }, []);

  useEffect(() => {
    fetchLiveData({ showLoader: true, showError: true });
  }, [fetchLiveData]);

  useEffect(() => {
    pollRef.current = setInterval(fetchLiveData, LIVE_POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchLiveData]);

  useEffect(() => {
    const clockRef = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(clockRef);
  }, []);

  const formatTiempoEnSala = useCallback(
    (horaEntrada?: string | null) => {
      if (!horaEntrada) return 'Tiempo no disponible';
      const [h, m, s] = horaEntrada.split(':').map((part) => Number.parseInt(part, 10));
      if ([h, m, s].some((value) => Number.isNaN(value))) return 'Tiempo no disponible';

      const inicio = new Date(clockNow);
      inicio.setHours(h, m, s, 0);
      let diffMs = clockNow.getTime() - inicio.getTime();
      if (diffMs < 0) diffMs = 0;

      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return `${hours}h ${String(minutes).padStart(2, '0')}m`;
      }
      return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    },
    [clockNow]
  );

  const formatHoraEntrada = useCallback((horaEntrada?: string | null) => {
    if (!horaEntrada) return 'Hora no disponible';
    const [h, m, s] = horaEntrada.split(':').map((part) => Number.parseInt(part, 10));
    if ([h, m, s].some((value) => Number.isNaN(value))) return horaEntrada;

    const fecha = new Date();
    fecha.setHours(h, m, s, 0);
    return fecha.toLocaleTimeString('es-CO');
  }, []);

  const segundosDelDia = useCallback((hora?: string | null) => {
    if (!hora) return Number.MAX_SAFE_INTEGER;
    const [h, m, s] = hora.split(':').map((part) => Number.parseInt(part, 10));
    if ([h, m, s].some((value) => Number.isNaN(value))) return Number.MAX_SAFE_INTEGER;
    return h * 3600 + m * 60 + s;
  }, []);

  const asistenciaOrdenada = [...liveAsistencia].sort(
    (a, b) => segundosDelDia(a.horaEntrada) - segundosDelDia(b.horaEntrada)
  );

  const alertasCriticas =
    data != null
      ? [
          ...data.alertasPlanes.map((a) => ({
            tipo: 'sesiones' as const,
            key: `plan-${a.idPlan}`,
            idPlan: a.idPlan,
            nombrePersona: a.nombrePapa,
            nombrePlan: a.nombrePlan,
            mensaje: a.mensaje,
            detalle: 'Atención requerida',
            colorMensaje: a.vencido ? 'text-rose-600' : 'text-amber-600',
          })),
          ...data.alertasTiempo.map((a, idx) => ({
            tipo: 'tiempo' as const,
            key: `tiempo-${a.idPapa}-${a.idPlan ?? 'null'}-${idx}`,
            idPlan: null as number | null,
            nombrePersona: a.nombrePapa,
            nombrePlan: a.nombrePlan,
            mensaje: `${a.duracion} (umbral: ${a.umbralHoras}h)`,
            detalle: 'Exceso de tiempo',
            colorMensaje: 'text-amber-700',
          })),
        ]
      : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-[#f1f3f4]" />
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-[#f1f3f4]" />
          ))}
        </div>
      </div>
    );
  }
  if (error) return <p className="text-[#d93025]">{error}</p>;
  if (!data) return null;

  return (
    <div className="space-y-10 max-w-7xl">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end animate-fade-in">
        <div>
          <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">Panel de Gestión (Padres)</h2>
          <p className="mt-1 text-sm text-[#4b5563]">
            Bienvenido de nuevo. Aquí tienes un resumen de la actividad de hoy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/padres/gestion"
            className="google-button-primary flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Añadir padre
          </Link>
          <div className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-[#4b5563] shadow-sm">
            <svg className="h-4 w-4 text-[#2d1b69]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {new Date().toLocaleDateString('es-CO', {
              weekday: 'long',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="animate-scale-in stagger-1">
          <StatCard
            label="Padres registrados"
            value={data.totalPapas}
            accent="bg-[#2d1b69]"
            description="Población total de padres"
          />
        </div>
        <div className="animate-scale-in stagger-2">
          <StatCard
            label="Asistencias hoy"
            value={data.totalAsistenciaHoy}
            accent="bg-[#06b6d4]"
            description="Ingresos registrados hoy"
          />
        </div>
        <div className="animate-scale-in stagger-3">
          <StatCard
            label="Planes activos"
            value={data.totalPlanesActivosHoy}
            accent="bg-[#c026d3]"
            description="Servicios vigentes a la fecha"
          />
        </div>
      </div>

      <section className="animate-fade-in stagger-4 relative overflow-hidden rounded-3xl border-2 border-indigo-100/80 bg-gradient-to-br from-white via-[#f5f3ff] to-[#ede9fe] p-6 shadow-xl shadow-indigo-100/40 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#4c1d95]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#2d1b69]/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-extrabold tracking-tight text-[#111827] sm:text-3xl">En sala ahora</h3>
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-orange-700">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
                En vivo
              </span>
            </div>
            <p className="max-w-xl text-sm text-[#4b5563]">
              Padres con entrada registrada y sin salida en el día. Se actualiza automáticamente.
            </p>
            {lastUpdated && (
              <p className="text-sm font-semibold text-[#6b7280]">
                Última actualización: {lastUpdated.toLocaleTimeString('es-CO')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => fetchLiveData()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-orange-300 bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-extrabold uppercase tracking-widest text-white shadow-sm transition hover:from-amber-500 hover:to-orange-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Actualizar ahora
          </button>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <div className="rounded-2xl border border-indigo-100 bg-white/90 px-6 py-4 text-center shadow-sm backdrop-blur-sm">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#6b7280]">Total adentro</p>
              <p className="mt-1 text-5xl font-black tabular-nums leading-none text-[#4c1d95] sm:text-6xl">
                {liveAsistencia.length}
              </p>
            </div>
          </div>
        </div>
        <div className="relative mt-8 min-h-[640px] rounded-2xl border border-indigo-100 bg-white/60 p-4 backdrop-blur-sm sm:p-6">
          {liveAsistencia.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-10 text-center text-[#9ca3af]">
              <svg className="h-16 w-16 text-[#e2e8f0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-lg font-bold text-[#6b7280]">Nadie en sala en este momento</p>
              <p className="text-sm">Cuando registren entrada, aparecerán aquí.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {asistenciaOrdenada.map((a, idx) => (
                <li
                  key={a.id}
                  className={`flex min-h-[96px] items-center gap-3 rounded-2xl border-2 border-white bg-gradient-to-br from-[#f3e8ff] to-white p-4 shadow-md shadow-indigo-100/50 transition hover:border-indigo-200 hover:shadow-lg animate-slide-in-right stagger-${(idx % 5) + 1}`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4c1d95] to-[#2d1b69] text-xl font-black text-white shadow-inner">
                    {(a.papa?.nombre ?? 'P').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal break-words text-lg font-extrabold leading-tight text-[#111827]">
                      {a.papa?.nombre ?? 'Padre'}
                    </p>
                    <span className="mt-1 inline-block rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-orange-700">
                      {formatTiempoEnSala(a.horaEntrada)}
                    </span>
                    <p className="mt-1 text-xs font-semibold text-[#4b5563]">
                      Entró:{' '}
                      <span className="font-mono text-[#111827]">{formatHoraEntrada(a.horaEntrada)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <AsistenciaReportesSection variant="padres" />

      <div className="google-card animate-fade-in stagger-5">
        <h3 className="text-xs font-bold text-[#4b5563] uppercase tracking-widest mb-8">Flujo de Actividad</h3>
        <div className="flex h-48 items-end justify-around gap-4 px-4">
          {[
            { label: 'Asistencia', value: data.totalAsistenciaHoy, color: 'bg-gradient-to-t from-[#06b6d4] to-[#22d3ee]' },
            { label: 'Planes', value: data.totalPlanesActivosHoy, color: 'bg-gradient-to-t from-[#c026d3] to-[#e879f9]' },
            { label: 'Padres', value: data.totalPapas, color: 'bg-gradient-to-t from-[#2d1b69] to-[#6d28d9]' },
          ].map((item, idx) => {
            const max = Math.max(data.totalPapas, data.totalAsistenciaHoy, data.totalPlanesActivosHoy, 1);
            const height = (item.value / max) * 100;
            return (
              <div key={item.label} className="flex w-full max-w-[120px] flex-col items-center gap-3">
                <div className="relative flex h-32 w-full items-end overflow-hidden rounded-full bg-[#f8f9fa]">
                  <div
                    className={`${item.color} w-full transition-all duration-1000 ease-out animate-fade-in stagger-${idx + 1}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="w-full truncate text-[10px] font-bold uppercase tracking-tighter text-[#4b5563]">
                    {item.label}
                  </p>
                  <p className="text-sm font-extrabold text-[#111827]">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="google-card animate-fade-in stagger-5">
        <h3 className="text-xs font-bold text-[#4b5563] uppercase tracking-widest mb-6">Suscripciones Activas</h3>
        <div className="flex flex-wrap gap-4">
          {data.planesActivosHoy.length === 0 && (
            <p className="text-sm italic text-[#4b5563]">No hay planes activos actualmente.</p>
          )}
          {data.planesActivosHoy.map((p, i) => (
            <div
              key={`${p.nombre}-${p.idPapa}-${i}`}
              className={`group rounded-xl border border-[#e2e8f0] bg-white px-5 py-4 shadow-sm transition-all duration-300 hover:border-[#2d1b69] hover:shadow-lg hover:shadow-indigo-50 animate-scale-in stagger-${(i % 5) + 1}`}
            >
              {p.nombrePapa && (
                <p className="mb-2 text-xs font-extrabold uppercase tracking-tighter text-[#2d1b69]">{p.nombrePapa}</p>
              )}
              <p className="text-sm font-bold text-[#111827] transition-colors group-hover:text-[#4c1d95]">{p.nombre}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold uppercase leading-none tracking-widest text-[#2d1b69]">
                  {p.tipo}
                </span>
                <span className="text-[10px] font-bold text-[#4b5563]">{p.sesionesRestantes} SESIONES RESTANTES</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {alertasCriticas.length > 0 && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6 shadow-sm animate-scale-in stagger-5">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-rose-800">Notificaciones y alertas</h3>
          </div>
          <div className="space-y-3">
            {alertasCriticas.map((a, idx) => (
              <div
                key={a.key}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-100 bg-white px-5 py-4 shadow-sm transition-colors hover:border-rose-300 animate-slide-in-right stagger-${(idx % 5) + 1}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-500 ring-2 ring-white">
                    {a.nombrePersona.charAt(0)}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#111827]">{a.nombrePersona}</span>
                    <p className="text-[10px] font-medium uppercase tracking-tighter text-[#4b5563]">{a.nombrePlan}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${a.colorMensaje}`}>{a.mensaje}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#4b5563]">
                      {a.tipo === 'sesiones' ? 'Por sesiones' : 'Por tiempo'}
                    </p>
                  </div>
                  {a.tipo === 'sesiones' ? (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-400"
                      title="Desestimar alertas próximamente"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data.cumpleanosHoy?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 shadow-sm animate-scale-in">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v5m0 0l3-3m-3 3l-3-3m0 9h6a2 2 0 002-2v-5a2 2 0 00-2-2h-1l-1-2h-4l-1 2H7a2 2 0 00-2 2v5a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-amber-800">Destacados de hoy</h3>
          </div>
          <div className="space-y-3">
            {data.cumpleanosHoy.map((c, idx) => (
              <div
                key={c.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-100 bg-white px-5 py-4 shadow-sm transition-colors hover:border-amber-300 animate-slide-in-right stagger-${(idx % 5) + 1}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-600 ring-2 ring-white">
                    {c.nombre.charAt(0)}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#111827]">{c.nombre}</span>
                    <p className="text-[10px] font-medium uppercase tracking-tighter text-[#4b5563]">{c.mensaje}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  description: string;
  accent: string;
}

function StatCard({ label, value, description, accent }: StatCardProps) {
  return (
    <div className="google-card group relative cursor-default overflow-hidden">
      <div
        className={`absolute right-0 top-0 h-24 w-24 translate-x-12 -translate-y-12 rounded-full ${accent} opacity-5 transition-opacity duration-500 group-hover:opacity-10`}
      />
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#4b5563]">{label}</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight text-[#111827] transition-transform duration-300 group-hover:origin-left group-hover:scale-105">
            {value}
          </p>
        </div>
        <div className={`mt-1 h-3 w-3 animate-pulse rounded-full ${accent} shadow-lg shadow-current/20`} />
      </div>
      <p className="mt-6 border-t border-[#f1f3f4] pt-4 text-[11px] font-bold uppercase tracking-tighter text-[#4b5563]">
        {description}
      </p>
    </div>
  );
}
