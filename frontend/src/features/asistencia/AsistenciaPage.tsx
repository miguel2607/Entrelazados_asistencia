import { useEffect, useState } from 'react';
import { api } from '../../shared/api/apiClient';

type Nino = { id: number; nombre: string };
type AsistenciaItem = {
  id: number;
  idNino: number;
  idPlan: number | null;
  idServicio: number | null;
  nombrePlan: string | null;
  nombreServicio?: string | null;
  fecha?: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  observacion: string | null;
  nino: { nombre: string };
};
type PlanNino = { id: number; nombrePlan?: string; tipo: string; fechaInicio: string; fechaFin?: string | null; totalSesiones: number; sesionesConsumidas: number };
type ServicioPaquete = { id: number; nombre: string; precio: number };
type AsistenciaHistorialItem = { id: number; fecha: string; horaEntrada: string | null; horaSalida: string | null; observacion: string | null };

export function AsistenciaPage() {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [ninos, setNinos] = useState<Nino[]>([]);
  const [asistencia, setAsistencia] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [historialNinoId, setHistorialNinoId] = useState<string>('');
  const [historialDesde, setHistorialDesde] = useState(() => new Date().toISOString().slice(0, 10));
  const [historialHasta, setHistorialHasta] = useState(() => new Date().toISOString().slice(0, 10));
  const [historialData, setHistorialData] = useState<AsistenciaHistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [observacionPorAsistenciaId, setObservacionPorAsistenciaId] = useState<Record<number, string>>({});
  const [editandoObservacionId, setEditandoObservacionId] = useState<number | null>(null);
  const [nuevaAsistenciaNinoId, setNuevaAsistenciaNinoId] = useState<string>('');
  const [nuevaAsistenciaPlanId, setNuevaAsistenciaPlanId] = useState<string>('');
  const [nuevaAsistenciaServicioId, setNuevaAsistenciaServicioId] = useState<string>('');
  const [planesDelNino, setPlanesDelNino] = useState<PlanNino[]>([]);
  const [serviciosDePaquete, setServiciosDePaquete] = useState<ServicioPaquete[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<Nino[]>('/ninos'),
      api.get<AsistenciaItem[]>('/asistencia/por-fecha', { fecha }),
    ])
      .then(([n, a]) => {
        setNinos(n);
        setAsistencia(a);
        if (n.length > 0 && !historialNinoId) setHistorialNinoId(String(n[0].id));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    setEditandoObservacionId(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha]);

  const verHistorial = () => {
    if (!historialNinoId) return;
    setLoadingHistorial(true);
    setError(null);
    api
      .get<AsistenciaHistorialItem[]>('/asistencia/historial', {
        idNino: historialNinoId,
        desde: historialDesde,
        hasta: historialHasta,
      })
      .then(setHistorialData)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingHistorial(false));
  };

  const planesActivosEnFecha = planesDelNino.filter((p) => {
    const vigentePorFecha = p.fechaInicio <= fecha && (!p.fechaFin || p.fechaFin >= fecha);
    const sesionesDisponibles = p.sesionesConsumidas < p.totalSesiones;
    return vigentePorFecha && sesionesDisponibles;
  });

  useEffect(() => {
    if (!nuevaAsistenciaNinoId) {
      setPlanesDelNino([]);
      return;
    }
    api.get<PlanNino[]>(`/planes/nino/${nuevaAsistenciaNinoId}`).then(setPlanesDelNino).catch(() => setPlanesDelNino([]));
  }, [nuevaAsistenciaNinoId]);

  // Cuando se selecciona un plan, si es PAQUETE cargar sus servicios
  useEffect(() => {
    setNuevaAsistenciaServicioId('');
    setServiciosDePaquete([]);
    if (!nuevaAsistenciaPlanId) return;
    const plan = planesActivosEnFecha.find(p => String(p.id) === nuevaAsistenciaPlanId);
    if (plan && plan.tipo === 'PAQUETE') {
      // Obtener id del paquete desde el plan
      api.get<{ idPaquete?: number; idServicio?: number }>(`/planes/${nuevaAsistenciaPlanId}`)
        .then(planDetail => {
          if (planDetail.idPaquete) {
            api.get<{ servicios: ServicioPaquete[] }>(`/paquetes/${planDetail.idPaquete}`)
              .then(paq => setServiciosDePaquete(paq.servicios ?? []))
              .catch(() => setServiciosDePaquete([]));
          }
        })
        .catch(() => setServiciosDePaquete([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuevaAsistenciaPlanId]);

  const buildParams = (idNino: number, idPlan: number | null, idServicio: number | null, obs: string) => {
    const p = new URLSearchParams();
    p.set('idNino', String(idNino));
    p.set('fecha', fecha);
    if (idPlan != null) p.set('idPlan', String(idPlan));
    if (idServicio != null) p.set('idServicio', String(idServicio));
    const o = obs?.trim();
    if (o) p.set('observacion', o);
    return p.toString();
  };

  const registrarEntrada = (idNino: number, idPlan: number | null, idServicio: number | null, obs: string) => {
    return api
      .post('/asistencia/entrada?' + buildParams(idNino, idPlan, idServicio, obs))
      .then(() => {
        load();
        setNuevaAsistenciaNinoId('');
        setNuevaAsistenciaPlanId('');
        setNuevaAsistenciaServicioId('');
        setServiciosDePaquete([]);
      })
      .catch((e) => setError(e.message));
  };

  const registrarSalida = (idNino: number, idPlan: number | null, idAsistencia: number) => {
    const obs = observacionPorAsistenciaId[idAsistencia] ?? '';
    return api
      .post('/asistencia/salida?' + buildParams(idNino, idPlan, null, obs))
      .then(load)
      .catch((e) => setError(e.message));
  };

  const setObservacion = (idAsistencia: number, value: string) => {
    setObservacionPorAsistenciaId((prev) => ({ ...prev, [idAsistencia]: value }));
  };

  const guardarObservacion = (idAsistencia: number) => {
    const obs = observacionPorAsistenciaId[idAsistencia] ?? '';
    return api
      .patch('/asistencia/' + idAsistencia, { observacion: obs.trim() })
      .then(() => {
        load();
        setEditandoObservacionId(null);
      })
      .catch((e) => setError(e.message));
  };

  const abrirEditarObservacion = (idAsistencia: number, valorActual: string) => {
    setObservacionPorAsistenciaId((prev) => ({ ...prev, [idAsistencia]: valorActual }));
    setEditandoObservacionId(idAsistencia);
  };

  const cancelarEditarObservacion = (idAsistencia: number, valorOriginal: string) => {
    setObservacionPorAsistenciaId((prev) => ({ ...prev, [idAsistencia]: valorOriginal }));
    setEditandoObservacionId(null);
  };

  const submitNuevaAsistencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaAsistenciaNinoId) return;
    const idPlan = nuevaAsistenciaPlanId ? Number(nuevaAsistenciaPlanId) : null;
    const idServicio = nuevaAsistenciaServicioId ? Number(nuevaAsistenciaServicioId) : null;
    registrarEntrada(Number(nuevaAsistenciaNinoId), idPlan, idServicio, '');
  };

  if (error) return <p className="text-[#d93025] font-medium">{error}</p>;

  return (
    <div className="max-w-6xl space-y-10">
      <header>
        <h2 className="text-2xl font-normal text-[#202124]">Asistencia Diaria</h2>
        <p className="mt-1 text-sm text-[#5f6368]">
          Monitorea y registra los tiempos de entrada y salida de todos los estudiantes activos en tiempo real.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Main Attendance Section */}
        <section className="lg:col-span-12 space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between bg-white p-6 rounded-xl border border-[#dadce0] shadow-sm">
            <div className="space-y-4 flex-1">
              <h3 className="text-sm font-medium text-[#202124] uppercase tracking-wider">Control de Registros</h3>
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#5f6368] uppercase">Fecha de Visualización</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="rounded-md border border-[#dadce0] bg-[#f8f9fa] px-3 py-2 text-sm focus:border-[#1a73e8] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a73e8] transition-all"
                  />
                </div>
              </div>
            </div>

            <form onSubmit={submitNuevaAsistencia} className="flex flex-wrap items-end gap-3 p-4 bg-[#f8f9fa] rounded-lg border border-[#e8eaed]">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#5f6368] uppercase">Estudiante</label>
                <select
                  value={nuevaAsistenciaNinoId}
                  onChange={(e) => setNuevaAsistenciaNinoId(e.target.value)}
                  className="w-48 rounded-md border border-[#dadce0] bg-white px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                >
                  <option value="">Seleccionar...</option>
                  {ninos.map((n) => (
                    <option key={n.id} value={n.id}>{n.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#5f6368] uppercase">Vinculación Plan</label>
                <select
                  value={nuevaAsistenciaPlanId}
                  onChange={(e) => { setNuevaAsistenciaPlanId(e.target.value); }}
                  className="w-48 rounded-md border border-[#dadce0] bg-white px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                >
                  <option value="">Sin plan asignado</option>
                  {planesActivosEnFecha.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombrePlan ?? `${p.tipo} #${p.id}`} ({p.totalSesiones - p.sesionesConsumidas} sesion(es) rest.)
                    </option>
                  ))}
                </select>
              </div>
              {/* Selector de servicio del paquete */}
              {serviciosDePaquete.length > 0 ? (
                <div className="space-y-1 animate-scale-in">
                  <label className="block text-[11px] font-bold text-[#2d1b69] uppercase">
                    Servicio del Paquete
                    <span className="ml-1 text-rose-500">*</span>
                  </label>
                  <select
                    value={nuevaAsistenciaServicioId}
                    onChange={(e) => setNuevaAsistenciaServicioId(e.target.value)}
                    className={`w-52 rounded-md border-2 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all ${nuevaAsistenciaServicioId ? 'border-indigo-200' : 'border-indigo-500 animate-pulse'
                      }`}
                    required
                  >
                    <option value="">-- Elige Servicio --</option>
                    {serviciosDePaquete.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              ) : (
                nuevaAsistenciaPlanId && planesActivosEnFecha.find(p => String(p.id) === nuevaAsistenciaPlanId)?.tipo === 'PAQUETE' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-md border border-indigo-100">
                    <div className="h-3 w-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-purple-700 font-medium italic">Buscando servicios...</span>
                  </div>
                )
              )}
              <button
                type="submit"
                disabled={!nuevaAsistenciaNinoId || (serviciosDePaquete.length > 0 && !nuevaAsistenciaServicioId)}
                className="google-button-primary h-[38px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Registrar Entrada
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-8 space-y-4">
                <div className="h-4 w-full bg-[#f1f3f4] animate-pulse rounded" />
                <div className="h-4 w-5/6 bg-[#f1f3f4] animate-pulse rounded" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#f1f3f4]">
                  <thead className="bg-[#f8f9fa]">
                    <tr>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">Estudiante</th>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">Plan / Referencia</th>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">Entrada</th>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">Salida</th>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">Observaciones</th>
                      <th className="px-6 py-4 text-right text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#f1f3f4]">
                    {asistencia.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#5f6368]">
                          No se han encontrado registros para esta fecha.
                        </td>
                      </tr>
                    ) : asistencia.map((a) => {
                      const observacionValue = a.id in observacionPorAsistenciaId ? observacionPorAsistenciaId[a.id] : (a.observacion ?? '');
                      const estaEditando = editandoObservacionId === a.id;
                      return (
                        <tr key={a.id} className="hover:bg-[#f8f9fa] transition-colors group">
                          <td className="px-6 py-4 text-sm font-medium text-[#202124]">{a.nino?.nombre ?? a.idNino}</td>
                          <td className="px-6 py-4 text-sm text-[#5f6368]">
                            {a.nombreServicio
                              ? <span className="font-medium text-[#2d1b69]">{a.nombrePlan} <span className="text-[10px] text-[#4b5563]">›</span> {a.nombreServicio}</span>
                              : (a.nombrePlan ?? 'Servicio Individual')}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono text-[#5f6368]">{a.horaEntrada ?? '--:--'}</td>
                          <td className="px-6 py-4 text-sm font-mono text-[#5f6368]">{a.horaSalida ?? '--:--'}</td>
                          <td className="px-6 py-4 max-w-xs">
                            {estaEditando ? (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  value={observacionValue}
                                  onChange={(e) => setObservacion(a.id, e.target.value)}
                                  className="w-full rounded-md border border-[#dadce0] p-2 text-xs focus:border-[#1a73e8] focus:outline-none"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => guardarObservacion(a.id)} className="text-[10px] bg-[#1a73e8] text-white px-2 py-1 rounded hover:bg-[#1557b0]">Guardar</button>
                                  <button onClick={() => cancelarEditarObservacion(a.id, a.observacion ?? '')} className="text-[10px] text-[#5f6368] px-2 py-1 hover:bg-[#e8eaed] rounded">Cerrar</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs text-[#5f6368] line-clamp-2 italic">{a.observacion?.trim() || 'Sin notas'}</span>
                                <button onClick={() => abrirEditarObservacion(a.id, a.observacion ?? '')} className="opacity-0 group-hover:opacity-100 text-[#1a73e8] p-1 rounded hover:bg-[#e8f0fe] transition-all">
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {a.horaEntrada && !a.horaSalida && (
                              <button
                                onClick={() => registrarSalida(a.idNino, a.idPlan, a.id)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#fbbc04] hover:bg-[#f57c00] focus:outline-none transition-colors"
                              >
                                Registrar Salida
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* History Section */}
        <section className="lg:col-span-12 mt-4">
          <div className="bg-white rounded-xl border border-[#dadce0] shadow-sm p-6 space-y-8">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-normal text-[#202124]">Historial de Asistencia Integral</h3>
              <p className="text-sm text-[#5f6368]">Consulta el registro histórico de un estudiante específico entre un rango de fechas determinado.</p>
            </div>

            <div className="flex flex-wrap items-end gap-6 pb-6 border-b border-[#f1f3f4]">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5f6368] uppercase">Estudiante</label>
                <select
                  id="historial-nino"
                  value={historialNinoId}
                  onChange={(e) => setHistorialNinoId(e.target.value)}
                  className="w-64 rounded-md border border-[#dadce0] bg-white px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                >
                  {ninos.map((n) => (
                    <option key={n.id} value={n.id}>{n.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5f6368] uppercase">Fecha Inicio</label>
                <input
                  type="date"
                  value={historialDesde}
                  onChange={(e) => setHistorialDesde(e.target.value)}
                  className="rounded-md border border-[#dadce0] bg-white px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5f6368] uppercase">Fecha Fin</label>
                <input
                  type="date"
                  value={historialHasta}
                  onChange={(e) => setHistorialHasta(e.target.value)}
                  className="rounded-md border border-[#dadce0] bg-white px-3 py-2 text-sm focus:border-[#1a73e8] focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                />
              </div>
              <button
                onClick={verHistorial}
                disabled={loadingHistorial || !historialNinoId}
                className="google-button-secondary h-[38px] flex items-center gap-2"
              >
                {loadingHistorial ? 'Procesando...' : 'Consultar Historial'}
              </button>
            </div>

            {loadingHistorial ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-[#1a73e8] border-t-transparent rounded-full" />
              </div>
            ) : historialData.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-[#f1f3f4]">
                <table className="min-w-full divide-y divide-[#f1f3f4]">
                  <thead className="bg-[#f8f9fa]">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5f6368] uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5f6368] uppercase">Entrada</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5f6368] uppercase">Salida</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-[#5f6368] uppercase">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#f1f3f4]">
                    {historialData.map((r) => (
                      <tr key={r.id} className="hover:bg-[#f8f9fa]">
                        <td className="px-6 py-3 text-sm text-[#202124]">{r.fecha}</td>
                        <td className="px-6 py-3 text-sm text-[#5f6368] font-mono">{r.horaEntrada ?? '-'}</td>
                        <td className="px-6 py-3 text-sm text-[#5f6368] font-mono">{r.horaSalida ?? '-'}</td>
                        <td className="px-6 py-3 text-sm text-[#5f6368] italic max-w-sm truncate" title={r.observacion ?? ''}>
                          {r.observacion ?? '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center bg-[#f8f9fa] rounded-lg border border-dashed border-[#dadce0]">
                <p className="text-sm text-[#5f6368]">No se encontró información histórica con los parámetros seleccionados.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

