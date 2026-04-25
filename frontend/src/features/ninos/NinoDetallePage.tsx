import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/apiClient';
import { Modal } from '../../shared/components/Modal';
import { listarGrupos } from '../../shared/grupos';

interface NinoDetalle {
  id: number;
  nombre: string;
  ti: string;
  fechaNacimiento: string;
  biometricId?: string;
  grupo?: string;
  subgrupo?: string;
  acudientes: { id: number; nombre: string; telefono: string; parentesco: string }[];
  planesActivos: { tipo: string; nombre: string; servicios: { nombre: string }[] }[];
  asistenciaHoy: { horaEntrada: string; horaSalida: string } | null;
}

interface NinoPlanRow {
  id: number;
  idNino: number;
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

export function NinoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<NinoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [savingParent, setSavingParent] = useState(false);
  const [parentForm, setParentForm] = useState({ nombre: '', telefono: '', cc: '', parentesco: 'madre' });
  const [estadoPlanes, setEstadoPlanes] = useState<PlanEstado[]>([]);
  const [loadingEstado, setLoadingEstado] = useState(true);
  const [toDelete, setToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [grupoColorMap, setGrupoColorMap] = useState<Map<string, string>>(new Map());

  // Modal para añadir sesiones
  const [addSessionsModalOpen, setAddSessionsModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [sessionsToAdd, setSessionsToAdd] = useState(1);
  const [isSavingSessions, setIsSavingSessions] = useState(false);

  // Congelamiento
  const [isFreezing, setIsFreezing] = useState<number | null>(null);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezePlanId, setFreezePlanId] = useState<number | null>(null);
  const [freezeDias, setFreezeDias] = useState<number>(7);
  const [freezeMotivo, setFreezeMotivo] = useState('');
  const [editFechaModalOpen, setEditFechaModalOpen] = useState(false);
  const [editFechaPlanId, setEditFechaPlanId] = useState<number | null>(null);
  const [editFechaValue, setEditFechaValue] = useState('');
  const [savingFechaAsignacion, setSavingFechaAsignacion] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    api
      .get<NinoDetalle>(`/ninos/${id}/detalle`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    listarGrupos()
      .then((grupos) => setGrupoColorMap(new Map(grupos.map((g) => [g.nombre, g.color]))))
      .catch(() => setGrupoColorMap(new Map()));
  }, []);

  const diffDias = useCallback((desde: string, hasta: string | null) => {
    if (!hasta) return 30; // Valor por defecto si no hay fin (indefinido)
    const a = new Date(desde);
    const b = new Date(hasta);
    return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  }, []);

  useEffect(() => {
    if (!id || !data) {
      setEstadoPlanes([]);
      return;
    }
    const ninoId = Number(id);
    const today = new Date().toISOString().slice(0, 10);
    setLoadingEstado(true);
    Promise.all([
      api.get<NinoPlanRow[]>(`/planes/nino/${id}`),
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
            const historyUrl = `/asistencia/historial?idNino=${ninoId}&desde=${plan.fechaInicio}${plan.fechaFin ? `&hasta=${plan.fechaFin}` : ''}`;
            return Promise.allSettled([
              api.get<AsistenciaRow[]>(historyUrl),
              api.get<{ id: number; fecha: string; dias: number; motivo?: string | null }[]>(`/planes/${plan.id}/congelaciones`)
            ])
              .then((results) => {
                const historial = results[0].status === 'fulfilled' ? results[0].value : [];
                const congelaciones = results[1].status === 'fulfilled' ? results[1].value : [];

                if (results[1].status === 'rejected') {
                  console.error(`Error fetching congelaciones for plan ${plan.id}:`, results[1].reason);
                }

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
                
                let fechaTermino = undefined;
                let motivoTermino: 'sesiones' | 'tiempo' | undefined = undefined;

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
                  historialCongelaciones: congelaciones
                } as PlanEstado;
              });
          })
        )
.then((estados) => {
          setEstadoPlanes(estados);
          setLoadingEstado(false);
        });
      })
      .catch(() => {
        setEstadoPlanes([]);
        setLoadingEstado(false);
      });
  }, [id, data, diffDias]);
  

  const eliminarPlan = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/planes/${toDelete}`);
      setToDelete(null);
      load();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleAgregarSesiones = (idPlan: number) => {
    setSelectedPlanId(idPlan);
    setSessionsToAdd(1);
    setAddSessionsModalOpen(true);
  };

  const quitarUnaSesion = async (idPlan: number, diasRestantes: number) => {
    if (diasRestantes <= 0) return;
    const ok = globalThis.confirm('¿Seguro que deseas quitar 1 sesión a este plan?');
    if (!ok) return;
    try {
      await api.patch(`/planes/${idPlan}/quitar-sesiones?cantidad=1`, {});
      globalThis.location.reload();
    } catch (err: any) {
      alert('Error al quitar sesión: ' + (err?.message ?? String(err)));
    }
  };

  const confirmarAdicionSesiones = async () => {
    if (!selectedPlanId || sessionsToAdd <= 0) return;
    setIsSavingSessions(true);
    try {
      await api.patch(`/planes/${selectedPlanId}/agregar-sesiones?cantidad=${sessionsToAdd}`, {});
      setAddSessionsModalOpen(false);
      // Recargar datos
      globalThis.location.reload(); 
    } catch (err: any) {
      alert('Error al añadir sesiones: ' + err.message);
    } finally {
      setIsSavingSessions(false);
    }
  };

  const abrirCongelarModal = (idPlan: number, dias: number) => {
    setFreezePlanId(idPlan);
    setFreezeDias(dias);
    setFreezeMotivo('');
    setFreezeModalOpen(true);
  };

  const confirmarCongelar = async () => {
    if (!freezePlanId) return;
    setIsFreezing(freezePlanId);
    try {
      await api.post(`/planes/${freezePlanId}/congelar?dias=${freezeDias}`, {
        motivo: freezeMotivo.trim() || undefined,
      });
      setFreezeModalOpen(false);
      globalThis.location.reload();
    } catch (err: any) {
      alert('Error al congelar: ' + err.message);
    } finally {
      setIsFreezing(null);
    }
  };

  const abrirAgregarAcudiente = () => {
    setParentForm({ nombre: '', telefono: '', cc: '', parentesco: 'madre' });
    setParentModalOpen(true);
  };

  const abrirEditarFechaAsignacion = (idPlan: number, fechaInicio: string) => {
    setEditFechaPlanId(idPlan);
    setEditFechaValue(fechaInicio);
    setEditFechaModalOpen(true);
  };

  const confirmarCambioFechaAsignacion = async () => {
    if (!editFechaPlanId || !editFechaValue) return;
    setSavingFechaAsignacion(true);
    try {
      await api.patch(`/planes/${editFechaPlanId}/fecha-asignacion`, { fechaInicio: editFechaValue });
      setEditFechaModalOpen(false);
      setEditFechaPlanId(null);
      load();
    } catch (err: any) {
      alert('Error al actualizar la fecha de asignación: ' + (err?.message ?? String(err)));
    } finally {
      setSavingFechaAsignacion(false);
    }
  };

  const guardarAcudienteYAsociar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setSavingParent(true);
      // 1) Crear acudiente
      const acudiente = await api.post<{ id: number }>('/acudientes', {
        nombre: parentForm.nombre,
        telefono: parentForm.telefono || undefined,
        cc: parentForm.cc || undefined,
      });
      // 2) Asociar con el niño
      await api.post('/ninos-acudientes', {
        idNino: Number(id),
        idAcudiente: acudiente.id,
        parentesco: parentForm.parentesco || 'acudiente',
      });
      setParentModalOpen(false);
      load();
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar acudiente');
    } finally {
      setSavingParent(false);
    }
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
          <Link to="/ninos" className="group p-3 rounded-full hover:bg-white hover:shadow-md text-[#4b5563] transition-all border border-transparent hover:border-[#e2e8f0]">
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
              <p className="text-xs text-[#4b5563] uppercase tracking-widest font-bold">Resumen del Estudiante</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={abrirAgregarAcudiente}
          className="google-button-primary flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Vincular Acudiente</span>
        </button>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        {/* Left Column - Core Info */}
        <div className="md:col-span-4 space-y-6">
          <div className="google-card animate-scale-in stagger-1">
            <h3 className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest mb-6">Información Básica</h3>
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#fcfaff] border border-[#f3e8ff]">
                <p className="text-[9px] text-[#2d1b69] font-extrabold uppercase tracking-widest mb-1">Identificación</p>
                <p className="text-sm font-bold text-[#111827]">{data.ti || 'Sin documento'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#fcfaff] border border-[#f3e8ff]">
                <p className="text-[9px] text-[#2d1b69] font-extrabold uppercase tracking-widest mb-1">F. de Nacimiento</p>
                <p className="text-sm font-bold text-[#111827] font-mono">{data.fechaNacimiento}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#fcfaff] border border-[#f3e8ff]">
                <p className="text-[9px] text-[#2d1b69] font-extrabold uppercase tracking-widest mb-1">ID Biométrico</p>
                <p className="text-sm font-bold text-[#111827] font-mono">{data.biometricId || 'No asignado'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#fcfaff] border border-[#f3e8ff]">
                <p className="text-[9px] text-[#2d1b69] font-extrabold uppercase tracking-widest mb-1">Grupo</p>
                {data.grupo ? (
                  <div className="space-y-2">
                    <p className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-sm font-bold text-[#111827]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: grupoColorMap.get(data.grupo) ?? '#94A3B8' }} />
                      {data.grupo}
                    </p>
                    {data.subgrupo && (
                      <p className="text-xs font-bold text-[#4b5563]">
                        Subgrupo: <span className="text-[#111827]">{data.subgrupo}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-[#111827]">No asignado</p>
                )}
              </div>
            </div>
          </div>

          <div className="google-card animate-scale-in stagger-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest">Estado Hoy</h3>
              <span className={`flex h-2.5 w-2.5 rounded-full ${data.asistenciaHoy ? 'bg-[#10b981] shadow-[0_0_8px_rgb(16,185,129)]' : 'bg-[#e2e8f0]'}`} />
            </div>
            {data.asistenciaHoy ? (
              <div className="bg-[#f0fdf4] rounded-2xl p-4 border border-emerald-100 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#059669] font-bold text-xs uppercase">Entrada</span>
                  <span className="font-mono font-extrabold text-[#065f46] bg-white px-2 py-1 rounded-md shadow-sm">{data.asistenciaHoy.horaEntrada ?? '--:--'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#059669] font-bold text-xs uppercase">Salida</span>
                  <span className="font-mono font-extrabold text-[#065f46] bg-white px-2 py-1 rounded-md shadow-sm">{data.asistenciaHoy.horaSalida ?? '--:--'}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center bg-[#fcfaff] rounded-2xl border border-dashed border-[#e2e8f0]">
                <p className="text-xs text-[#4b5563] font-bold italic">Sin ingresos hoy</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Relations and State */}
        <div className="md:col-span-8 space-y-6">
          <div className="google-card animate-scale-in stagger-3">
            <h3 className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest mb-6">Contactos de Emergencia</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {data.acudientes?.length === 0 ? (
                <div className="col-span-2 py-10 text-center bg-[#fcfaff] rounded-2xl border border-dashed border-[#e2e8f0]">
                  <p className="text-sm text-[#4b5563] font-medium">No hay responsables vinculados.</p>
                </div>
              ) : (
                data.acudientes?.map((a, idx) => (
                  <div key={a.id} className={`flex flex-col p-5 rounded-2xl border border-[#e2e8f0] bg-white hover:border-[#2d1b69] hover:shadow-lg hover:shadow-indigo-50 transition-all group animate-slide-in-right stagger-${idx+1}`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest rounded-full border ${
                        a.parentesco === 'madre' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        a.parentesco === 'padre' ? 'bg-indigo-50 text-purple-600 border-indigo-100' : 
                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {a.parentesco}
                      </span>
                      <button className="h-8 w-8 rounded-full flex items-center justify-center text-[#4b5563] hover:bg-indigo-50 hover:text-[#2d1b69] transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </button>
                    </div>
                    <p className="text-sm font-extrabold text-[#111827]">{a.nombre}</p>
                    <p className="text-xs text-[#4b5563] font-bold mt-1.5 opacity-70">{a.telefono || 'Sin número'}</p>
                  </div>
                )
              )
              )}
            </div>
          </div>

          <div className="google-card animate-scale-in stagger-4">
            <h3 className="text-[10px] font-extrabold text-[#4b5563] uppercase tracking-widest mb-6">Planes y Membresías Activas</h3>
            {loadingEstado ? (
              <div className="space-y-4">
                <div className="h-24 bg-[#fcfaff] animate-pulse rounded-2xl" />
                <div className="h-24 bg-[#fcfaff] animate-pulse rounded-2xl" />
              </div>
            ) : estadoPlanes.length === 0 ? (
              <div className="py-12 text-center bg-[#fcfaff] rounded-2xl border border-dashed border-[#e2e8f0]">
                <p className="text-sm text-[#4b5563] font-bold mb-4">No hay planes activos.</p>
                <Link to="/planes" className="google-button-secondary inline-flex text-xs">Asignar Plan Ahora</Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {estadoPlanes.map((e) => (
                  <div
                    key={e.id}
                    className={`relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:shadow-xl ${
                      e.finalizado 
                        ? 'bg-rose-50/50 border-rose-200 shadow-rose-100/50' 
                        : 'bg-white border-[#e2e8f0]'
                    }`}
                  >
                    {/* Trash Button */}
                    <button
                      onClick={() => setToDelete(e.id)}
                      className="absolute top-4 right-4 p-2 rounded-full hover:bg-rose-100 text-[#9ca3af] hover:text-rose-600 transition-colors"
                      title="Eliminar Plan"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    <div className="absolute top-0 left-0 h-1.5 w-full bg-indigo-50">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          e.finalizado ? 'bg-rose-500' : 'bg-gradient-to-r from-[#2d1b69] to-[#c026d3]'
                        }`}
                        style={{ width: `${(e.diasUsados / e.diasTotales) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-start justify-between mb-6 pt-2">
                      <div>
                        <p className={`text-[10px] font-extrabold uppercase tracking-widest leading-none mb-2 ${e.finalizado ? 'text-rose-600' : 'text-[#2d1b69]'}`}>
                          {e.tipo} {e.finalizado ? '— FINALIZADO' : ''}
                        </p>
                        <h4 className="text-lg font-extrabold text-[#111827] leading-tight">{e.nombre}</h4>
                        <p className="mt-1 text-[10px] font-bold text-[#4b5563] uppercase tracking-widest">
                          Asignado: {new Date(e.fechaInicio + 'T00:00:00').toLocaleDateString('es-CO')}
                        </p>
                        {e.tipo.toLowerCase() === 'paquete' && (
                          <button
                            type="button"
                            onClick={() => abrirEditarFechaAsignacion(e.id, e.fechaInicio)}
                            className="mt-2 inline-flex items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#2d1b69] hover:border-indigo-300 hover:bg-indigo-100"
                          >
                            Editar fecha
                          </button>
                        )}
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
                    
                    <div className="mt-5 grid grid-cols-2 gap-3 pb-4 border-b border-[#f1f3f4]">
                      <button
                        onClick={() => abrirCongelarModal(e.id, 7)}
                        disabled={isFreezing !== null}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#e2e8f0] bg-white text-[9px] font-extrabold text-[#c026d3] uppercase tracking-widest hover:bg-fuchsia-50 hover:border-[#c026d3] transition-all disabled:opacity-50"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Congelar 7d
                      </button>
                      <button
                        onClick={() => abrirCongelarModal(e.id, 14)}
                        disabled={isFreezing !== null}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#e2e8f0] bg-white text-[9px] font-extrabold text-[#c026d3] uppercase tracking-widest hover:bg-fuchsia-50 hover:border-[#c026d3] transition-all disabled:opacity-50"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Congelar 14d
                      </button>
                    </div>

                    {e.historialCongelaciones?.length > 0 && (
                      <div className="mt-4 p-4 rounded-2xl bg-fuchsia-50/50 border border-fuchsia-100">
                        <p className="text-[8px] font-extrabold text-fuchsia-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Historial de Congelamientos
                        </p>
                        <ul className="space-y-1.5">
                          {e.historialCongelaciones.map(c => (
                            <li key={c.id} className="text-[9px] font-bold text-fuchsia-900 border-l-2 border-fuchsia-200 pl-2 py-1">
                              <div className="flex justify-between items-center">
                                <span>{new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}</span>
                                <span className="bg-white px-1.5 py-0.5 rounded shadow-sm">+{c.dias} días</span>
                              </div>
                              <p className="mt-1 text-[9px] font-medium text-fuchsia-700 normal-case tracking-normal">
                                Nota: {c.motivo?.trim() ? c.motivo : 'Sin nota registrada'}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleAgregarSesiones(e.id)}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-[#e2e8f0] text-[10px] font-extrabold text-[#2d1b69] uppercase tracking-widest hover:bg-indigo-50 hover:border-[#2d1b69] transition-all disabled:opacity-50"
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
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-rose-200 text-rose-700 text-[10px] font-extrabold uppercase tracking-widest hover:bg-rose-50 hover:border-rose-300 transition-all disabled:opacity-50"
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
        </div>
      </div>

      <Modal open={parentModalOpen} onClose={() => setParentModalOpen(false)} title="Nueva Asignación de Acudiente">
        <form onSubmit={guardarAcudienteYAsociar} className="space-y-6 animate-scale-in">
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Nombre del Responsable</label>
            <input
              required
              value={parentForm.nombre}
              onChange={(e) => setParentForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: María García"
              className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Teléfono</label>
              <input
                value={parentForm.telefono}
                onChange={(e) => setParentForm((f) => ({ ...f, telefono: e.target.value }))}
                placeholder="300 000 0000"
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Identificación</label>
              <input
                value={parentForm.cc}
                onChange={(e) => setParentForm((f) => ({ ...f, cc: e.target.value }))}
                placeholder="CC 000000"
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">Relación / Vínculo</label>
            <select
              value={parentForm.parentesco}
              onChange={(e) => setParentForm((f) => ({ ...f, parentesco: e.target.value }))}
              className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
            >
              <option value="madre">Madre</option>
              <option value="padre">Padre</option>
              <option value="tutor">Tutor Legal</option>
              <option value="abuelo/a">Abuelo/a</option>
              <option value="otro">Otro Allegado</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-[#e2e8f0]">
            <button type="button" onClick={() => setParentModalOpen(false)} className="google-button-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={savingParent} className="google-button-primary disabled:opacity-50 min-w-[160px]">
              {savingParent ? 'Guardando...' : 'Confirmar Vínculo'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={freezeModalOpen}
        onClose={() => setFreezeModalOpen(false)}
        title="Congelar Plan"
      >
        <div className="space-y-5">
          <p className="text-sm text-[#4b5563]">
            Vas a congelar este plan por <span className="font-extrabold text-[#2d1b69]">{freezeDias} días</span>.
          </p>
          <div className="space-y-2">
            <label htmlFor="freeze-motivo" className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">
              Nota del congelamiento (opcional)
            </label>
            <textarea
              id="freeze-motivo"
              value={freezeMotivo}
              onChange={(e) => setFreezeMotivo(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej: Viaje familiar, incapacidad médica, vacaciones..."
              className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => setFreezeModalOpen(false)}
              className="google-button-secondary"
            >
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

      <Modal
        open={editFechaModalOpen}
        onClose={() => setEditFechaModalOpen(false)}
        title="Editar Fecha de Asignación"
      >
        <div className="space-y-5">
          <p className="text-sm text-[#4b5563]">
            Cambia la fecha de asignación del paquete para corregir el inicio real.
          </p>
          <div className="space-y-2">
            <label htmlFor="fecha-asignacion-plan" className="block text-[11px] font-extrabold text-[#4b5563] uppercase tracking-widest">
              Fecha de asignación
            </label>
            <input
              id="fecha-asignacion-plan"
              type="date"
              value={editFechaValue}
              onChange={(e) => setEditFechaValue(e.target.value)}
              className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-sm font-medium focus:border-[#2d1b69] focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => setEditFechaModalOpen(false)}
              className="google-button-secondary"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarCambioFechaAsignacion}
              disabled={savingFechaAsignacion || !editFechaValue}
              className="google-button-primary disabled:opacity-50"
            >
              {savingFechaAsignacion ? 'Guardando...' : 'Guardar fecha'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Añadir Sesiones con Animación */}
      <Modal 
        open={addSessionsModalOpen} 
        onClose={() => setAddSessionsModalOpen(false)} 
        title="Añadir Sesiones al Plan"
      >
        <div className="space-y-6 animate-scale-in">
          <div className="text-center pb-2">
            <p className="text-xs font-bold text-[#4b5563] uppercase tracking-widest">¿Cuántas sesiones deseas agregar?</p>
            <p className="text-[10px] text-[#2d1b69] font-extrabold mt-1">ESTO SE SUMARÁ AL TOTAL ACTUAL DEL PLAN</p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button 
              type="button"
              onClick={() => setSessionsToAdd(Math.max(1, sessionsToAdd - 1))}
              className="h-12 w-12 rounded-full border border-[#e2e8f0] flex items-center justify-center text-[#2d1b69] hover:bg-indigo-50 transition-all font-bold text-xl"
            >
              −
            </button>
            <div className="relative">
              <input 
                type="number" 
                value={sessionsToAdd}
                onChange={(e) => setSessionsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 text-center text-3xl font-extrabold text-[#111827] border-b-2 border-[#2d1b69] focus:outline-none bg-transparent"
              />
            </div>
            <button 
              type="button"
              onClick={() => setSessionsToAdd(sessionsToAdd + 1)}
              className="h-12 w-12 rounded-full border border-[#e2e8f0] flex items-center justify-center text-[#2d1b69] hover:bg-indigo-50 transition-all font-bold text-xl"
            >
              +
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 5, 10].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setSessionsToAdd(n)}
                className={`py-2 rounded-xl border text-[10px] font-extrabold transition-all uppercase tracking-widest ${sessionsToAdd === n ? 'bg-[#2d1b69] text-white border-[#2d1b69] shadow-lg shadow-indigo-200' : 'bg-white text-[#4b5563] border-[#e2e8f0] hover:border-[#2d1b69]'}`}
              >
                +{n} {n === 1 ? 'Día' : 'Días'}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-[#e2e8f0]">
            <button 
              type="button" 
              onClick={() => setAddSessionsModalOpen(false)} 
              className="google-button-secondary"
            >
              Cancelar
            </button>
            <button 
              type="button" 
              onClick={confirmarAdicionSesiones}
              disabled={isSavingSessions}
              className="google-button-primary disabled:opacity-50 min-w-[160px]"
            >
              {isSavingSessions ? 'Guardando...' : 'Confirmar Adición'}
            </button>
          </div>
        </div>
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Confirmar Eliminación"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-rose-50 border border-rose-100">
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-rose-900 leading-tight">
              ¿Estás seguro de que deseas eliminar este plan? Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setToDelete(null)}
              className="google-button-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={eliminarPlan}
              disabled={deleting}
              className="px-6 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-extrabold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

