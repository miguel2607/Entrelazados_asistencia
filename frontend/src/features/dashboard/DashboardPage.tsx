import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../../shared/api/apiClient';
import { fechaLocalYYYYMMDD } from '../../shared/fechaLocal';
import { Modal } from '../../shared/components/Modal';

type AlertaPlan = {
  idPlan: number;
  idNino: number;
  nombreNino: string;
  nombrePlan: string;
  tipo: string;
  vencido: boolean;
  venceHoy: boolean;
  sesionesRestantes: number;
  mensaje: string;
};

type DashboardResponse = {
  totalNinos: number;
  totalAsistenciaHoy: number;
  totalPlanesActivosHoy: number;
  asistenciaHoy: { id: number; idNino: number; horaEntrada?: string | null; nino: { nombre: string } }[];
  planesActivosHoy: { idNino?: number; nombreNino?: string; tipo: string; nombre: string; sesionesRestantes: number; servicios: { nombre: string }[] }[];
  alertasPlanes: AlertaPlan[];
  cumpleanosHoy: { id: number; nombre: string; fechaNacimiento: string; edadCumplida: number; mensaje: string }[];
};

type NinoResumen = { id: number; nombre: string; biometricId?: string };
type Step1Form = { nombre: string; ti: string; fechaNacimiento: string; biometricId: string };
type Step2Form = { nombre: string; cc: string; telefono: string; parentesco: string };

/** Intervalo de actualización del listado en sala (dashboard completo; equilibrio entre “en vivo” y carga al servidor). */
const LIVE_POLL_INTERVAL = 2000;

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live update state for "En Sala Ahora"
  const [liveAsistencia, setLiveAsistencia] = useState<DashboardResponse['asistenciaHoy']>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [clockNow, setClockNow] = useState<Date>(new Date());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wizard añadir niño
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [step1, setStep1] = useState<Step1Form>({ nombre: '', ti: '', fechaNacimiento: '', biometricId: '' });
  const [step2, setStep2] = useState<Step2Form>({ nombre: '', cc: '', telefono: '', parentesco: '' });
  const [wizardSaving, setWizardSaving] = useState(false);
  const [suggestingBiometricId, setSuggestingBiometricId] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [createdNinoId, setCreatedNinoId] = useState<number | null>(null);

  // Similar names search state
  const [similarNinos, setSimilarNinos] = useState<{ id: number; nombre: string }[]>([]);
  const [similarAcudientes, setSimilarAcudientes] = useState<{ id: number; nombre: string; telefono?: string; cc?: string }[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchSimilarNinos = (nombre: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!nombre.trim() || nombre.length < 3) {
      setSimilarNinos([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      api.get<{ id: number; nombre: string }[]>('/ninos', { nombre })
        .then(setSimilarNinos);
    }, 500);
  };

  const searchSimilarAcudientes = (nombre: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!nombre.trim() || nombre.length < 3) {
      setSimilarAcudientes([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      api.get<{ id: number; nombre: string; telefono?: string; cc?: string }[]>('/acudientes', { nombre })
        .then(setSimilarAcudientes);
    }, 500);
  };

  const calcularSiguienteBiometricId = (ninos: NinoResumen[]): string => {
    const usados = new Set(
      ninos
        .map((n) => Number.parseInt((n.biometricId ?? '').trim(), 10))
        .filter((id) => Number.isInteger(id) && id > 0)
    );
    let candidato = 2;
    while (usados.has(candidato)) candidato += 1;
    return String(candidato);
  };

  const autocompletarBiometricId = async () => {
    setSuggestingBiometricId(true);
    try {
      const ninos = await api.get<NinoResumen[]>('/ninos');
      const sugerido = calcularSiguienteBiometricId(ninos);
      setStep1((prev) => (prev.biometricId ? prev : { ...prev, biometricId: sugerido }));
    } catch {
      // Si falla la sugerencia, el campo sigue editable manualmente.
    } finally {
      setSuggestingBiometricId(false);
    }
  };

  const openWizard = () => {
    setWizardStep(1);
    setStep1({ nombre: '', ti: '', fechaNacimiento: '', biometricId: '' });
    setStep2({ nombre: '', cc: '', telefono: '', parentesco: '' });
    setWizardError(null);
    setCreatedNinoId(null);
    setSimilarNinos([]);
    setSimilarAcudientes([]);
    setWizardOpen(true);
    autocompletarBiometricId();
  };

  const closeWizard = () => { setWizardOpen(false); };

  const submitWizardStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setWizardSaving(true);
    setWizardError(null);
    try {
      const nino = await api.post<{ id: number }>('/ninos', {
        nombre: step1.nombre,
        ti: step1.ti || undefined,
        fechaNacimiento: step1.fechaNacimiento,
        biometricId: step1.biometricId || undefined,
      });
      setCreatedNinoId(nino.id);
      setWizardStep(2);
    } catch (err: any) {
      setWizardError(err.message);
    } finally {
      setWizardSaving(false);
    }
  };

  const submitWizardStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdNinoId) return;
    setWizardSaving(true);
    setWizardError(null);
    try {
      const acudiente = await api.post<{ id: number }>('/acudientes', {
        nombre: step2.nombre,
        cc: step2.cc || undefined,
        telefono: step2.telefono || undefined,
      });
      await api.post('/ninos-acudientes', {
        idNino: createdNinoId,
        idAcudiente: acudiente.id,
        parentesco: step2.parentesco || 'Familiar',
      });
      closeWizard();
      api.get<DashboardResponse>('/dashboard', { fecha: fechaLocalYYYYMMDD() }).then(setData);
    } catch (err: any) {
      setWizardError(err.message);
    } finally {
      setWizardSaving(false);
    }
  };

  const omitirAcudienteWizard = () => {
    closeWizard();
    api.get<DashboardResponse>('/dashboard', { fecha: fechaLocalYYYYMMDD() }).then(setData);
  };

  // Fetch live attendance data
  const fetchLiveData = useCallback(() => {
    api.get<DashboardResponse>('/dashboard', { fecha: fechaLocalYYYYMMDD() })
      .then((newData) => {
        setLiveAsistencia(newData.asistenciaHoy);
        setData(newData);
        setLastUpdated(new Date());
      })
      .catch(() => { /* silently fail for live updates */ });
  }, []);

  useEffect(() => {
    api.get<DashboardResponse>('/dashboard', { fecha: fechaLocalYYYYMMDD() })
      .then((d) => {
        setData(d);
        setLiveAsistencia(d.asistenciaHoy);
        setLastUpdated(new Date());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Live polling for "En Sala Ahora"
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

  const formatTiempoEnSala = useCallback((horaEntrada?: string | null) => {
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
  }, [clockNow]);

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
    return (h * 3600) + (m * 60) + s;
  }, []);

  const asistenciaOrdenada = [...liveAsistencia].sort((a, b) => segundosDelDia(a.horaEntrada) - segundosDelDia(b.horaEntrada));

  const desestimarAlerta = (id: number) => {
    api.post(`/planes/${id}/desestimar-alerta`, {}).then(() => {
      setData(prev => prev ? { ...prev, alertasPlanes: prev.alertasPlanes.filter(a => a.idPlan !== id) } : null);
    });
  };

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
          <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">
            Panel de Gestión
          </h2>
          <p className="mt-1 text-sm text-[#4b5563]">
            Bienvenido de nuevo. Aquí tienes un resumen de la actividad de hoy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openWizard}
            className="google-button-primary flex items-center gap-2 text-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Añadir Niño
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-semibold text-[#4b5563] shadow-sm">
            <svg className="h-4 w-4 text-[#2d1b69]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="animate-scale-in stagger-1">
          <StatCard
            label="Niños Registrados"
            value={data.totalNinos}
            accent="bg-[#2d1b69]"
            description="Población total estudiantil"
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

      {/* EN SALA AHORA — bloque destacado a ancho completo */}
      <section className="animate-fade-in stagger-4 relative overflow-hidden rounded-3xl border-2 border-cyan-100/80 bg-gradient-to-br from-white via-[#f8fdff] to-[#f0f9ff] p-6 shadow-xl shadow-cyan-100/40 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[#2d1b69]/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-extrabold tracking-tight text-[#111827] sm:text-3xl">En sala ahora</h3>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[#0891b2]">
                <span className="h-2 w-2 rounded-full bg-[#06b6d4] animate-ping" />
                En vivo
              </span>
            </div>
            <p className="max-w-xl text-sm text-[#4b5563]">
              Estudiantes con entrada registrada y sin salida en el día. Se actualiza automáticamente.
            </p>
            {lastUpdated && (
              <p className="text-sm font-semibold text-[#6b7280]">
                Última actualización:{' '}
                <span className="font-mono text-[#111827]">{lastUpdated.toLocaleTimeString('es-CO')}</span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <div className="rounded-2xl border border-cyan-100 bg-white/90 px-6 py-4 text-center shadow-sm backdrop-blur-sm">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#6b7280]">Total adentro</p>
              <p className="mt-1 text-5xl font-black tabular-nums leading-none text-[#06b6d4] sm:text-6xl">
                {liveAsistencia.length}
              </p>
            </div>
            <button
              type="button"
              onClick={fetchLiveData}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-cyan-200 bg-white px-5 py-3 text-sm font-extrabold uppercase tracking-widest text-[#0891b2] shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar ahora
            </button>
          </div>
        </div>

        <div className="relative mt-8 min-h-[640px] rounded-2xl border border-[#e0f2fe] bg-white/60 p-4 backdrop-blur-sm sm:p-6">
          {liveAsistencia.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-10 text-center text-[#9ca3af]">
              <svg className="h-16 w-16 text-[#e2e8f0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg font-bold text-[#6b7280]">Nadie en sala en este momento</p>
              <p className="text-sm">Cuando registren entrada, aparecerán aquí con letra grande.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {asistenciaOrdenada.map((a, idx) => (
                <li
                  key={a.id}
                  className={`flex min-h-[96px] items-center gap-3 rounded-2xl border-2 border-white bg-gradient-to-br from-[#f0fdfa] to-white p-4 shadow-md shadow-cyan-100/50 transition hover:border-cyan-200 hover:shadow-lg animate-slide-in-right stagger-${(idx % 5) + 1}`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#2d1b69] text-xl font-black text-white shadow-inner">
                    {(a.nino?.nombre ?? 'E').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal break-words text-lg font-extrabold leading-tight text-[#111827]">
                      {a.nino?.nombre ?? 'Estudiante'}
                    </p>
                    <span className="mt-1 inline-block rounded-lg bg-cyan-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-[#0e7490]">
                      {formatTiempoEnSala(a.horaEntrada)}
                    </span>
                    <p className="mt-1 text-xs font-semibold text-[#4b5563]">
                      Entró: <span className="font-mono text-[#111827]">{formatHoraEntrada(a.horaEntrada)}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="google-card animate-fade-in stagger-5">
        <h3 className="text-xs font-bold text-[#4b5563] uppercase tracking-widest mb-8">Flujo de Actividad</h3>
        <div className="flex items-end justify-around h-48 gap-4 px-4">
          {[
            { label: 'Asistencia', value: data.totalAsistenciaHoy, color: 'bg-gradient-to-t from-[#06b6d4] to-[#22d3ee]' },
            { label: 'Planes', value: data.totalPlanesActivosHoy, color: 'bg-gradient-to-t from-[#c026d3] to-[#e879f9]' },
            { label: 'Niños', value: data.totalNinos, color: 'bg-gradient-to-t from-[#2d1b69] to-[#6d28d9]' },
          ].map((item, idx) => {
            const max = Math.max(data.totalNinos, data.totalAsistenciaHoy, data.totalPlanesActivosHoy, 1);
            const height = (item.value / max) * 100;
            return (
              <div key={item.label} className="flex flex-col items-center gap-3 w-full max-w-[120px]">
                <div className="relative flex h-32 w-full items-end overflow-hidden rounded-full bg-[#f8f9fa]">
                  <div
                    className={`${item.color} w-full transition-all duration-1000 ease-out animate-fade-in stagger-${idx + 1}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-[#4b5563] uppercase truncate w-full tracking-tighter">{item.label}</p>
                  <p className="text-sm font-extrabold text-[#111827]">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="google-card animate-fade-in stagger-5">
        <h3 className="text-xs font-bold text-[#4b5563] uppercase tracking-widest mb-6">
          Suscripciones Activas
        </h3>
        <div className="flex flex-wrap gap-4">
          {data.planesActivosHoy.length === 0 && (
            <p className="text-sm text-[#4b5563] italic">No hay planes activos actualmente.</p>
          )}
          {data.planesActivosHoy.map((p, i) => (
            <div
              key={i}
              className={`group rounded-xl border border-[#e2e8f0] bg-white px-5 py-4 shadow-sm transition-all duration-300 hover:border-[#2d1b69] hover:shadow-lg hover:shadow-indigo-50 animate-scale-in stagger-${(i % 5) + 1}`}
            >
              {p.nombreNino && <p className="text-xs font-extrabold text-[#2d1b69] mb-2 uppercase tracking-tighter">{p.nombreNino}</p>}
              <p className="text-sm font-bold text-[#111827] group-hover:text-[#4c1d95] transition-colors">{p.nombre}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-md bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[9px] font-extrabold text-[#2d1b69] uppercase tracking-widest leading-none">
                  {p.tipo}
                </span>
                <span className="text-[10px] font-bold text-[#4b5563]">
                  {p.sesionesRestantes} SESIONES RESTANTES
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(data.alertasPlanes?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6 shadow-sm animate-scale-in stagger-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-rose-800 uppercase tracking-widest">
              Sesiones por Agotarse
            </h3>
          </div>
          <div className="space-y-3">
            {data.alertasPlanes.map((a, idx) => (
              <div
                key={a.idPlan}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white border border-rose-100 px-5 py-4 shadow-sm hover:border-rose-300 transition-colors animate-slide-in-right stagger-${(idx % 5) + 1}`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 font-bold text-xs ring-2 ring-white">
                    {a.nombreNino.charAt(0)}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#111827]">{a.nombreNino}</span>
                    <p className="text-[10px] text-[#4b5563] font-medium uppercase tracking-tighter">{a.nombrePlan}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${a.vencido ? 'text-rose-600' : 'text-amber-600'}`}>{a.mensaje}</p>
                    <p className="text-[10px] text-[#4b5563] font-bold uppercase tracking-widest">Atención Requerida</p>
                  </div>
                  <button
                    onClick={() => desestimarAlerta(a.idPlan)}
                    className="h-8 w-8 rounded-lg hover:bg-rose-100 flex items-center justify-center text-rose-400 transition-colors"
                    title="Desestimar por 24 horas"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data.cumpleanosHoy?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 shadow-sm animate-scale-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v5m0 0l3-3m-3 3l-3-3m0 9h6a2 2 0 002-2v-5a2 2 0 00-2-2h-1l-1-2h-4l-1 2H7a2 2 0 00-2 2v5a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-widest">
              Cumpleaños de Hoy
            </h3>
          </div>
          <div className="space-y-3">
            {data.cumpleanosHoy.map((c, idx) => (
              <div
                key={c.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white border border-amber-100 px-5 py-4 shadow-sm hover:border-amber-300 transition-colors animate-slide-in-right stagger-${(idx % 5) + 1}`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-xs ring-2 ring-white">
                    {c.nombre.charAt(0)}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#111827]">{c.nombre}</span>
                    <p className="text-[10px] text-[#4b5563] font-medium uppercase tracking-tighter">
                      {c.mensaje}
                    </p>
                  </div>
                </div>
                <span className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-extrabold text-amber-700 border border-amber-100 uppercase tracking-widest">
                  Feliz Cumple
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WIZARD MODAL: Añadir Niño */}
      <Modal
        open={wizardOpen}
        onClose={closeWizard}
        title={wizardStep === 1 ? 'Añadir Niño – Paso 1 de 2' : 'Añadir Niño – Paso 2 de 2'}
      >
        {/* Progress */}
        <div className="flex gap-2 mb-6">
          <div className={`h-1.5 flex-1 rounded-full transition-all ${wizardStep >= 1 ? 'bg-[#2d1b69]' : 'bg-[#e2e8f0]'}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-all ${wizardStep >= 2 ? 'bg-[#2d1b69]' : 'bg-[#e2e8f0]'}`} />
        </div>

        {wizardError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {wizardError}
          </div>
        )}

        {wizardStep === 1 && (
          <form onSubmit={submitWizardStep1} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Nombre Completo</label>
              <input
                required
                value={step1.nombre}
                onChange={(e) => {
                  const val = e.target.value;
                  setStep1((f) => ({ ...f, nombre: val }));
                  searchSimilarNinos(val);
                }}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                placeholder="Ej: Juan Pérez"
              />
              {similarNinos.length > 0 && (
                <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 animate-fade-in">
                  <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Registros con nombres similares:
                  </p>
                  <ul className="space-y-1">
                    {similarNinos.map(n => (
                      <li key={n.id} className="text-xs font-bold text-amber-900 border-l-2 border-amber-300 pl-2">
                        {n.nombre} <span className="text-[10px] font-medium text-amber-600 block">(Ya existe en el sistema)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Documento (TI)</label>
                <input
                  value={step1.ti}
                  onChange={(e) => setStep1((f) => ({ ...f, ti: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                  placeholder="00000000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Nacimiento</label>
                <input
                  type="date"
                  required
                  value={step1.fechaNacimiento}
                  onChange={(e) => setStep1((f) => ({ ...f, fechaNacimiento: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">ID Biométrico (Equipo Hikvision)</label>
              <input
                value={step1.biometricId}
                onChange={(e) => setStep1((f) => ({ ...f, biometricId: e.target.value }))}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                placeholder={suggestingBiometricId ? 'Buscando ID disponible...' : 'Ej: 105'}
              />
              <p className="text-[10px] text-[#6b7280]">
                {suggestingBiometricId
                  ? 'Calculando siguiente ID biométrico disponible...'
                  : 'Se sugiere automáticamente y puedes modificarlo si lo necesitas.'}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
              <button type="button" onClick={closeWizard} className="google-button-secondary">Cancelar</button>
              <button type="submit" disabled={wizardSaving} className="google-button-primary disabled:opacity-50">
                {wizardSaving ? 'Guardando...' : 'Siguiente: Acudiente →'}
              </button>
            </div>
          </form>
        )}

        {wizardStep === 2 && (
          <form onSubmit={submitWizardStep2} className="space-y-5">
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 font-medium">
              ✅ Niño registrado. Ahora puedes vincular un acudiente (opcional).
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Nombre del Acudiente</label>
              <input
                required
                value={step2.nombre}
                onChange={(e) => {
                  const val = e.target.value;
                  setStep2((f) => ({ ...f, nombre: val }));
                  searchSimilarAcudientes(val);
                }}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                placeholder="Ej: María González"
              />
              {similarAcudientes.length > 0 && (
                <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 animate-fade-in">
                  <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Acudientes similares:
                  </p>
                  <ul className="space-y-1">
                    {similarAcudientes.map(a => (
                      <li key={a.id} className="text-xs font-bold text-amber-900 border-l-2 border-amber-300 pl-2">
                        {a.nombre} {a.telefono && <span className="text-[9px] font-medium text-amber-600 ml-1">({a.telefono})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Cédula (CC)</label>
                <input
                  value={step2.cc}
                  onChange={(e) => setStep2((f) => ({ ...f, cc: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                  placeholder="00000000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Teléfono</label>
                <input
                  value={step2.telefono}
                  onChange={(e) => setStep2((f) => ({ ...f, telefono: e.target.value }))}
                  className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                  placeholder="300 000 0000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Parentesco</label>
              <select
                value={step2.parentesco}
                onChange={(e) => setStep2((f) => ({ ...f, parentesco: e.target.value }))}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all bg-white"
              >
                <option value="">Seleccionar parentesco...</option>
                <option value="Madre">Madre</option>
                <option value="Padre">Padre</option>
                <option value="Abuelo/a">Abuelo/a</option>
                <option value="Tío/a">Tío/a</option>
                <option value="Hermano/a">Hermano/a</option>
                <option value="Otro familiar">Otro familiar</option>
                <option value="Acudiente legal">Acudiente legal</option>
              </select>
            </div>
            <div className="flex justify-between gap-3 pt-4 border-t border-[#e2e8f0]">
              <button type="button" onClick={omitirAcudienteWizard} className="google-button-secondary">
                Omitir acudiente
              </button>
              <button type="submit" disabled={wizardSaving || !step2.nombre} className="google-button-primary disabled:opacity-50">
                {wizardSaving ? 'Guardando...' : 'Guardar y Vincular Acudiente'}
              </button>
            </div>
          </form>
        )}
      </Modal>
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
    <div className="google-card group cursor-default relative overflow-hidden">
      <div className={`absolute top-0 right-0 h-24 w-24 translate-x-12 -translate-y-12 rounded-full ${accent} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#4b5563]">{label}</p>
          <p className="mt-2 text-4xl font-extrabold text-[#111827] tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">{value}</p>
        </div>
        <div className={`mt-1 h-3 w-3 rounded-full ${accent} shadow-lg shadow-current/20 animate-pulse`} />
      </div>
      <p className="mt-6 text-[11px] font-bold text-[#4b5563] border-t border-[#f1f3f4] pt-4 uppercase tracking-tighter">{description}</p>
    </div>
  );
}
