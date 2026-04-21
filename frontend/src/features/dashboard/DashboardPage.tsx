import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../../shared/api/apiClient';
import { fechaLocalYYYYMMDD } from '../../shared/fechaLocal';
import { Modal } from '../../shared/components/Modal';
import { AsistenciaReportesSection } from './AsistenciaReportesSection';
import { actualizarGrupo, crearGrupo, crearSubgrupo, eliminarGrupo, listarGrupos, listarSubgrupos, type GrupoOption, type SubgrupoOption } from '../../shared/grupos';

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

type AlertaTiempo = {
  idNino: number;
  idPlan: number | null;
  nombreNino: string;
  nombrePlan: string;
  tipoComposicion: string;
  umbralHoras: number;
  duracion: string;
  mensaje: string;
};

type DashboardResponse = {
  totalNinos: number;
  totalAsistenciaHoy: number;
  totalPlanesActivosHoy: number;
  asistenciaHoy: { id: number; idNino: number; horaEntrada?: string | null; nino: { nombre: string; grupo?: string; subgrupo?: string } }[];
  planesActivosHoy: { idNino?: number; nombreNino?: string; tipo: string; nombre: string; sesionesRestantes: number; servicios: { nombre: string }[] }[];
  alertasPlanes: AlertaPlan[];
  alertasTiempo: AlertaTiempo[];
  cumpleanosHoy: { id: number; nombre: string; fechaNacimiento: string; edadCumplida: number; mensaje: string }[];
};

type NinoResumen = { id: number; nombre: string; biometricId?: string };
type Step1Form = { nombre: string; ti: string; fechaNacimiento: string; biometricId: string; grupo: string; subgrupo: string };
type Step2Form = { nombre: string; cc: string; telefono: string; parentesco: string };

/** Intervalo de actualización del dashboard para disminuir carga en Render. */
const LIVE_POLL_INTERVAL = 10000;

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live update state for "En Sala Ahora"
  const [liveAsistencia, setLiveAsistencia] = useState<DashboardResponse['asistenciaHoy']>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [clockNow, setClockNow] = useState<Date>(new Date());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dashboardRequestInFlightRef = useRef(false);

  // Wizard añadir niño
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [step1, setStep1] = useState<Step1Form>({ nombre: '', ti: '', fechaNacimiento: '', biometricId: '', grupo: '', subgrupo: '' });
  const [step2, setStep2] = useState<Step2Form>({ nombre: '', cc: '', telefono: '', parentesco: '' });
  const [wizardSaving, setWizardSaving] = useState(false);
  const [suggestingBiometricId, setSuggestingBiometricId] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [createdNinoId, setCreatedNinoId] = useState<number | null>(null);

  // Similar names search state
  const [similarNinos, setSimilarNinos] = useState<{ id: number; nombre: string }[]>([]);
  const [similarAcudientes, setSimilarAcudientes] = useState<{ id: number; nombre: string; telefono?: string; cc?: string }[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [grupos, setGrupos] = useState<GrupoOption[]>([]);
  const [grupoModalOpen, setGrupoModalOpen] = useState(false);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');
  const [nuevoGrupoColor, setNuevoGrupoColor] = useState('#2563EB');
  const [grupoError, setGrupoError] = useState<string | null>(null);
  const [savingGrupo, setSavingGrupo] = useState(false);
  const [editingGrupoId, setEditingGrupoId] = useState<number | null>(null);
  const [editGrupoNombre, setEditGrupoNombre] = useState('');
  const [editGrupoColor, setEditGrupoColor] = useState('#2563EB');
  const [subgruposCatalogo, setSubgruposCatalogo] = useState<Record<number, SubgrupoOption[]>>({});
  const [showNuevoSubgrupo, setShowNuevoSubgrupo] = useState(false);
  const [nuevoSubgrupoNombre, setNuevoSubgrupoNombre] = useState('');
  const grupoColorMap = new Map(grupos.map((g) => [g.nombre, g.color]));
  const grupoSeleccionadoId = grupos.find((g) => g.nombre === step1.grupo)?.id;

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
    setStep1({ nombre: '', ti: '', fechaNacimiento: '', biometricId: '', grupo: '', subgrupo: '' });
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
        grupo: step1.grupo || undefined,
        subgrupo: step1.subgrupo || undefined,
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
      fetchLiveData();
    } catch (err: any) {
      setWizardError(err.message);
    } finally {
      setWizardSaving(false);
    }
  };

  const omitirAcudienteWizard = () => {
    closeWizard();
    fetchLiveData();
  };

  const agregarGrupo = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const nombre = nuevoGrupoNombre.trim().replaceAll(/\s+/g, ' ');
    if (!nombre) {
      setGrupoError('Debes ingresar un nombre de grupo.');
      return;
    }
    setSavingGrupo(true);
    setGrupoError(null);
    try {
      const creado = await crearGrupo({ nombre, color: nuevoGrupoColor });
      const actualizados = [...grupos, creado].sort((a, b) => a.nombre.localeCompare(b.nombre));
      setGrupos(actualizados);
      setStep1((prev) => ({ ...prev, grupo: creado.nombre }));
      setNuevoGrupoNombre('');
      setNuevoGrupoColor('#2563EB');
      setGrupoModalOpen(false);
    } catch (err: any) {
      setGrupoError(err?.message ?? 'No se pudo crear el grupo.');
    } finally {
      setSavingGrupo(false);
    }
  };

  const iniciarEdicionGrupo = (grupo: GrupoOption) => {
    setGrupoError(null);
    setEditingGrupoId(grupo.id);
    setEditGrupoNombre(grupo.nombre);
    setEditGrupoColor(grupo.color);
  };

  const cancelarEdicionGrupo = () => {
    setEditingGrupoId(null);
    setEditGrupoNombre('');
    setEditGrupoColor('#2563EB');
  };

  const guardarEdicionGrupo = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (editingGrupoId == null) return;
    const nombre = editGrupoNombre.trim().replaceAll(/\s+/g, ' ');
    if (!nombre) {
      setGrupoError('Debes ingresar un nombre de grupo.');
      return;
    }
    setSavingGrupo(true);
    setGrupoError(null);
    try {
      const actualizado = await actualizarGrupo(editingGrupoId, { nombre, color: editGrupoColor });
      const previo = grupos.find((g) => g.id === editingGrupoId);
      const actualizados = grupos
        .map((g) => (g.id === editingGrupoId ? actualizado : g))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setGrupos(actualizados);
      if (step1.grupo === previo?.nombre) {
        setStep1((prev) => ({ ...prev, grupo: actualizado.nombre }));
      }
      cancelarEdicionGrupo();
    } catch (err: any) {
      setGrupoError(err?.message ?? 'No se pudo actualizar el grupo.');
    } finally {
      setSavingGrupo(false);
    }
  };

  const borrarGrupo = async (grupo: GrupoOption) => {
    const ok = globalThis.confirm(`¿Eliminar el grupo "${grupo.nombre}"?`);
    if (!ok) return;
    setSavingGrupo(true);
    setGrupoError(null);
    try {
      await eliminarGrupo(grupo.id);
      setGrupos((prev) => prev.filter((g) => g.id !== grupo.id));
      if (step1.grupo === grupo.nombre) {
        setStep1((prev) => ({ ...prev, grupo: '' }));
      }
    } catch (err: any) {
      setGrupoError(err?.message ?? 'No se pudo eliminar el grupo.');
    } finally {
      setSavingGrupo(false);
    }
  };

  const guardarNuevoSubgrupo = async () => {
    if (!grupoSeleccionadoId) {
      setGrupoError('Primero debes seleccionar un grupo.');
      return;
    }
    const nombre = nuevoSubgrupoNombre.trim();
    if (!nombre) {
      setGrupoError('Escribe el nombre del subgrupo.');
      return;
    }
    setSavingGrupo(true);
    setGrupoError(null);
    try {
      const nuevo = await crearSubgrupo(grupoSeleccionadoId, nombre);
      setSubgruposCatalogo((prev) => ({
        ...prev,
        [grupoSeleccionadoId]: [...(prev[grupoSeleccionadoId] ?? []), nuevo],
      }));
      setStep1((f) => ({ ...f, subgrupo: nuevo.nombre }));
      setNuevoSubgrupoNombre('');
      setShowNuevoSubgrupo(false);
    } catch (err: any) {
      setGrupoError(err?.message ?? 'No se pudo crear el subgrupo.');
    } finally {
      setSavingGrupo(false);
    }
  };

  // Fetch live attendance data
  const fetchLiveData = useCallback((opts?: { showLoader?: boolean; showError?: boolean }) => {
    if (dashboardRequestInFlightRef.current) return;
    dashboardRequestInFlightRef.current = true;
    if (opts?.showLoader) setLoading(true);

    api.get<DashboardResponse>('/dashboard', { fecha: fechaLocalYYYYMMDD() })
      .then((newData) => {
        setLiveAsistencia(newData.asistenciaHoy);
        setData(newData);
        setLastUpdated(new Date());
        setError(null);
      })
      .catch((e) => {
        if (opts?.showError) setError(e?.message ?? 'No se pudo cargar el dashboard.');
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
    listarGrupos()
      .then(setGrupos)
      .catch(() => setGrupoError('No se pudieron cargar los grupos.'));
  }, []);
  useEffect(() => {
    if (!grupoSeleccionadoId || subgruposCatalogo[grupoSeleccionadoId]) return;
    listarSubgrupos(grupoSeleccionadoId)
      .then((rows) => setSubgruposCatalogo((prev) => ({ ...prev, [grupoSeleccionadoId]: rows })))
      .catch(() => undefined);
  }, [grupoSeleccionadoId, subgruposCatalogo]);

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
  const alertasCriticas = data
    ? [
        ...data.alertasPlanes.map((a) => ({
          tipo: 'sesiones' as const,
          key: `plan-${a.idPlan}`,
          idPlan: a.idPlan,
          nombreNino: a.nombreNino,
          nombrePlan: a.nombrePlan,
          mensaje: a.mensaje,
          detalle: 'Atención requerida',
          colorMensaje: a.vencido ? 'text-rose-600' : 'text-amber-600',
        })),
        ...data.alertasTiempo.map((a, idx) => ({
          tipo: 'tiempo' as const,
          key: `tiempo-${a.idNino}-${a.idPlan ?? 'null'}-${idx}`,
          idPlan: null,
          nombreNino: a.nombreNino,
          nombrePlan: a.nombrePlan,
          mensaje: `${a.duracion} (umbral: ${a.umbralHoras}h)`,
          detalle: 'Exceso de tiempo',
          colorMensaje: 'text-amber-700',
        })),
      ]
    : [];

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
    <div className="mx-auto w-full max-w-[min(100%,92rem)] space-y-10 px-1 sm:px-0">
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

      {/* EN SALA AHORA — cabecera unificada + fichas alineadas (5 cols xl) */}
      <section className="animate-fade-in stagger-4 relative overflow-hidden rounded-[1.75rem] border border-violet-200/50 bg-gradient-to-br from-[#faf8ff] via-white to-[#f3e8ff] p-1 shadow-[0_20px_50px_-12px_rgba(76,29,149,0.15)] sm:rounded-3xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_0%_-20%,rgba(124,58,237,0.08),transparent),radial-gradient(700px_circle_at_100%_100%,rgba(249,115,22,0.06),transparent)]" />
        <div className="pointer-events-none absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-violet-300/20 blur-3xl" />

        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-md sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <h3 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">En sala ahora</h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-md shadow-orange-200/50">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60" />
                    <span className="relative h-2 w-2 rounded-full bg-white" />
                  </span>
                  <span>En vivo</span>
                </span>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                Entrada hoy sin salida registrada. La lista se actualiza sola; puedes forzar un refresco cuando quieras.
              </p>
              {lastUpdated && (
                <p className="text-xs font-medium text-slate-500">
                  Última actualización · <span className="font-mono text-slate-700">{lastUpdated.toLocaleTimeString('es-CO')}</span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="flex min-w-[8.5rem] flex-col justify-center rounded-2xl border border-violet-200/60 bg-gradient-to-br from-[#4c1d95] via-[#5b21b6] to-[#4c1d95] px-5 py-4 text-center text-white shadow-lg shadow-violet-900/25">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/90">Total adentro</span>
                <span className="mt-1 text-4xl font-black tabular-nums leading-none sm:text-5xl">{liveAsistencia.length}</span>
              </div>
              <button
                type="button"
                onClick={() => fetchLiveData()}
                className="inline-flex items-center justify-center gap-2 self-stretch rounded-2xl border-2 border-orange-400/80 bg-gradient-to-br from-amber-400 to-orange-500 px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-white shadow-md shadow-orange-200/60 transition hover:brightness-105 active:scale-[0.98] sm:min-w-[10rem]"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
            </div>
          </div>

          <div className="relative mt-5 rounded-2xl border border-slate-200/60 bg-slate-50/40 p-2 sm:mt-6 sm:p-3">
            {liveAsistencia.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-inner ring-1 ring-violet-100">
                  <svg className="h-8 w-8 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-700">Nadie en sala</p>
                  <p className="mt-1 text-sm text-slate-500">Las fichas aparecerán aquí al registrar entrada.</p>
                </div>
              </div>
            ) : (
              <ul className="grid auto-rows-fr grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {asistenciaOrdenada.map((a, idx) => {
                  const accent = a.nino?.grupo ? (grupoColorMap.get(a.nino.grupo) ?? '#7c3aed') : '#a78bfa';
                  return (
                    <li
                      key={a.id}
                      className={`group relative flex h-full min-h-[188px] flex-col overflow-hidden rounded-xl border border-white/90 bg-white shadow-sm shadow-slate-200/40 ring-1 ring-slate-100/80 transition duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-violet-200/30 animate-slide-in-right stagger-${(idx % 5) + 1}`}
                    >
                      <div
                        className="h-0.5 w-full shrink-0"
                        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}66, transparent)` }}
                      />
                      <div className="flex flex-1 flex-col p-2.5 pt-2">
                        <div className="flex gap-2">
                          <div
                            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white shadow-sm ring-1 ring-white/80"
                            style={{
                              background: `linear-gradient(135deg, ${accent}, #2d1b69)`,
                            }}
                          >
                            {(a.nino?.nombre ?? 'E').charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight text-slate-900 sm:min-h-[2.65rem] sm:text-[0.9375rem]">
                              {a.nino?.nombre ?? 'Estudiante'}
                            </p>
                            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                              Entrada
                            </p>
                            <p className="font-mono text-[11px] font-semibold leading-tight text-slate-800">
                              {formatHoraEntrada(a.horaEntrada)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 rounded-lg border border-amber-100/90 bg-gradient-to-b from-amber-50/90 to-orange-50/80 px-1.5 py-1.5 text-center shadow-inner">
                          <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-amber-900/70">Lleva en sala</p>
                          <p className="mt-px font-mono text-sm font-black tracking-tight text-amber-950">
                            {formatTiempoEnSala(a.horaEntrada)}
                          </p>
                        </div>
                        <div className="mt-2 flex min-h-[2.65rem] flex-1 flex-col justify-end gap-1 border-t border-slate-100 pt-1.5">
                          {a.nino?.grupo ? (
                            <>
                              <span
                                className="inline-flex max-w-full items-center truncate rounded-md border bg-slate-50/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-violet-950"
                                style={{ borderColor: `${accent}99` }}
                              >
                                {a.nino.grupo}
                              </span>
                              <span className="line-clamp-1 rounded-md border border-slate-200/80 bg-white px-1.5 py-0.5 text-[8px] font-semibold text-slate-600">
                                {a.nino.subgrupo ? (
                                  <>Subgrupo · <span className="font-bold text-slate-800">{a.nino.subgrupo}</span></>
                                ) : (
                                  <span className="text-slate-400">Sin subgrupo</span>
                                )}
                              </span>
                            </>
                          ) : (
                            <span className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-1.5 py-1 text-center text-[8px] font-medium text-slate-400">
                              Sin grupo asignado
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* INFORMES DE ASISTENCIA */}
      <AsistenciaReportesSection />

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

      {alertasCriticas.length > 0 && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6 shadow-sm animate-scale-in stagger-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-rose-800 uppercase tracking-widest">
              Alertas de Planes
            </h3>
          </div>
          <div className="space-y-3">
            {alertasCriticas.map((a, idx) => (
              <div
                key={a.key}
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
                    <p className={`text-sm font-bold ${a.colorMensaje}`}>{a.mensaje}</p>
                    <p className="text-[10px] text-[#4b5563] font-bold uppercase tracking-widest">
                      {a.tipo === 'sesiones' ? 'Por sesiones' : 'Por tiempo'}
                    </p>
                  </div>
                  {a.tipo === 'sesiones' && a.idPlan != null ? (
                    <button
                      onClick={() => desestimarAlerta(a.idPlan)}
                      className="h-8 w-8 rounded-lg hover:bg-rose-100 flex items-center justify-center text-rose-400 transition-colors"
                      title="Desestimar por 24 horas"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    </button>
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              <div className="flex items-center justify-between gap-3">
                <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Grupo</label>
                <button
                  type="button"
                  onClick={() => setGrupoModalOpen(true)}
                  className="text-[10px] font-extrabold uppercase tracking-widest text-[#2d1b69] hover:text-[#4c1d95]"
                >
                  + Administrar grupos
                </button>
              </div>
              <select
                required
                value={step1.grupo}
                onChange={(e) => {
                  setStep1((f) => ({ ...f, grupo: e.target.value, subgrupo: '' }));
                  setShowNuevoSubgrupo(false);
                  setNuevoSubgrupoNombre('');
                }}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all bg-white"
              >
                <option value="">Seleccionar grupo...</option>
                {grupos.map((grupo) => (
                  <option key={grupo.nombre} value={grupo.nombre}>{grupo.nombre}</option>
                ))}
              </select>
              {step1.grupo && (
                <p className="text-[10px] font-bold text-[#4b5563] flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: grupoColorMap.get(step1.grupo) ?? '#94A3B8' }} />
                  Color asignado a {step1.grupo}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dashboard-nino-subgrupo" className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Subgrupo</label>
              <select
                id="dashboard-nino-subgrupo"
                value={showNuevoSubgrupo ? '__nuevo__' : step1.subgrupo}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '__nuevo__') {
                    setShowNuevoSubgrupo(true);
                    setStep1((f) => ({ ...f, subgrupo: '' }));
                    return;
                  }
                  setShowNuevoSubgrupo(false);
                  setNuevoSubgrupoNombre('');
                  setStep1((f) => ({ ...f, subgrupo: value }));
                }}
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all bg-white"
                disabled={!grupoSeleccionadoId}
              >
                <option value="">{grupoSeleccionadoId ? 'Seleccionar subgrupo...' : 'Selecciona primero un grupo'}</option>
                {(grupoSeleccionadoId ? (subgruposCatalogo[grupoSeleccionadoId] ?? []) : []).map((s) => (
                  <option key={s.id} value={s.nombre}>{s.nombre}</option>
                ))}
                {grupoSeleccionadoId && <option value="__nuevo__">+ Crear subgrupo</option>}
              </select>
              {showNuevoSubgrupo && (
                <div className="flex gap-2">
                  <input
                    value={nuevoSubgrupoNombre}
                    onChange={(e) => setNuevoSubgrupoNombre(e.target.value)}
                    placeholder="Nombre del nuevo subgrupo"
                    className="flex-1 rounded-xl border border-[#e2e8f0] px-4 py-2 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                  />
                  <button type="button" onClick={guardarNuevoSubgrupo} disabled={savingGrupo} className="google-button-secondary disabled:opacity-50">
                    {savingGrupo ? 'Guardando...' : 'Crear'}
                  </button>
                </div>
              )}
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

      <Modal
        open={grupoModalOpen}
        onClose={() => {
          setGrupoModalOpen(false);
          setGrupoError(null);
        }}
        title="Administrar grupos"
      >
        <div className="space-y-5">
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-[#e2e8f0] p-3">
            {grupos.map((grupo) => (
              <div key={grupo.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#fcfaff] px-3 py-2 text-sm font-bold text-[#111827]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: grupo.color }} />
                  <span>{grupo.nombre}</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <button type="button" onClick={() => iniciarEdicionGrupo(grupo)} className="text-[10px] font-extrabold text-[#2d1b69] uppercase">Editar</button>
                  <button type="button" onClick={() => borrarGrupo(grupo)} className="text-[10px] font-extrabold text-rose-600 uppercase">Eliminar</button>
                </span>
              </div>
            ))}
          </div>

          {editingGrupoId != null && (
            <form onSubmit={guardarEdicionGrupo} className="space-y-3 rounded-xl border border-[#e2e8f0] p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#4b5563]">Editar grupo</p>
              <div className="space-y-1.5">
                <label htmlFor="dashboard-editar-grupo-nombre" className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Nombre</label>
                <input
                  id="dashboard-editar-grupo-nombre"
                  value={editGrupoNombre}
                  onChange={(e) => setEditGrupoNombre(e.target.value)}
                  className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="dashboard-editar-grupo-color" className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Color</label>
                <input
                  id="dashboard-editar-grupo-color"
                  type="color"
                  value={editGrupoColor}
                  onChange={(e) => setEditGrupoColor(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-2 py-1"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={cancelarEdicionGrupo} className="google-button-secondary">Cancelar</button>
                <button type="submit" disabled={savingGrupo} className="google-button-primary disabled:opacity-50">Guardar</button>
              </div>
            </form>
          )}

          <form onSubmit={agregarGrupo} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="dashboard-nuevo-grupo-nombre" className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Nombre del grupo</label>
              <input
                id="dashboard-nuevo-grupo-nombre"
                value={nuevoGrupoNombre}
                onChange={(e) => setNuevoGrupoNombre(e.target.value)}
                placeholder="Ej: Pre-jardín A"
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="dashboard-nuevo-grupo-color" className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Color</label>
              <input
                id="dashboard-nuevo-grupo-color"
                type="color"
                value={nuevoGrupoColor}
                onChange={(e) => setNuevoGrupoColor(e.target.value)}
                className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-white px-2 py-1"
              />
            </div>
            {grupoError && <p className="text-xs font-bold text-rose-700">{grupoError}</p>}
            <div className="flex justify-end gap-3 pt-3 border-t border-[#e2e8f0]">
              <button type="button" onClick={() => setGrupoModalOpen(false)} className="google-button-secondary">Cerrar</button>
              <button type="submit" disabled={savingGrupo} className="google-button-primary disabled:opacity-50">
                {savingGrupo ? 'Guardando...' : 'Agregar grupo'}
              </button>
            </div>
          </form>
        </div>
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
